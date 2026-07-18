import { Gender, RelationshipGoal } from '../profile/profile.types';
import { RecommendationScore, UserPreferences } from './recommendation.types';
import { haversineDistance } from '../../services/geo.service';

/**
 * Recommendation strategy abstraction.
 *
 * Why: The engine must be replaceable by a future AI model without changing the
 * controller, service, or mobile client. We define a stable interface:
 * `scoreCandidate` turns a raw candidate + the viewer's preferences into a
 * `RecommendationScore`, and `rank` orders candidates by `totalScore`
 * descending. The service depends ONLY on this interface, never on a concrete
 * implementation. Today we ship `DeterministicRecommendationStrategy` (pure
 * math, no ML/AI). A future `AiRecommendationStrategy` can implement the same
 * interface and be injected via the factory at the bottom.
 */

/** Raw candidate data the strategy needs to score (DB-shaped, pre-mapping). */
export interface CandidateFacts {
  userId: string;
  age: number | null;
  gender: Gender | null;
  interestedIn: Gender[];
  relationshipGoal: RelationshipGoal | null;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
  isPremium: boolean;
  lastActive: string | null;
  photoCount: number;
  profileCompleted: boolean;
  preferredLanguages: string[];
  /** Viewer coordinates, for distance scoring. */
  viewerLatitude: number | null;
  viewerLongitude: number | null;
  /** Active boost multiplier (1 = no boost). Read from `boost_sessions`. */
  boostMultiplier: number;
  /** True when this candidate has Super Liked the viewer (priority signal). */
  superLikedMe: boolean;
}

export interface RecommendationStrategy {
  /** Human-readable name (useful for logging / future A/B). */
  readonly name: string;
  /** Score a single candidate against the viewer's preferences. */
  scoreCandidate(
    candidate: CandidateFacts,
    preferences: UserPreferences,
  ): RecommendationScore;
  /** Rank candidates by total score, descending. Stable tiebreak by userId. */
  rank(
    candidates: Array<{ facts: CandidateFacts; preferences: UserPreferences }>,
  ): Array<{ facts: CandidateFacts; score: RecommendationScore }>;
}

/** Configurable weights — constants so they can be tuned in one place. */
export const WEIGHTS = {
  age: 0.25,
  distance: 0.25,
  activity: 0.15,
  profileCompletion: 0.15,
  photos: 0.1,
  verification: 0.05,
  compatibility: 0.05,
} as const;

/** A user is "active" if seen within this window (days). */
const ACTIVE_WITHIN_DAYS = 30;
const ACTIVE_WITHIN_MS = ACTIVE_WITHIN_DAYS * 24 * 60 * 60 * 1000;

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * DeterministicRecommendationStrategy — the production scorer.
 *
 * Why: Pure, explainable math. Each sub-score is normalized to 0..1 then
 * weighted per `WEIGHTS`; `totalScore` is the weighted sum scaled to 0..100.
 * No ML, no AI, no premium boosting. Designed so a future AI strategy can be
 * dropped in behind the same interface.
 */
export class DeterministicRecommendationStrategy implements RecommendationStrategy {
  readonly name = 'deterministic';

  scoreCandidate(
    candidate: CandidateFacts,
    preferences: UserPreferences,
  ): RecommendationScore {
    // --- Age score: 1 when inside the preferred band, decaying outside. ---
    let ageScore = 0;
    if (candidate.age != null) {
      const { minimumAge, maximumAge } = preferences;
      if (candidate.age >= minimumAge && candidate.age <= maximumAge) {
        ageScore = 1;
      } else {
        const dist = candidate.age < minimumAge
          ? minimumAge - candidate.age
          : candidate.age - maximumAge;
        // Decay over a 15-year tolerance window.
        ageScore = clamp01(1 - dist / 15);
      }
    }

    // --- Distance score: 1 within max distance, decaying beyond. ---
    const distanceKm = haversineDistance(
      candidate.viewerLatitude,
      candidate.viewerLongitude,
      candidate.latitude,
      candidate.longitude,
    );
    let distanceScore = 0;
    if (distanceKm != null) {
      const max = Math.max(1, preferences.maximumDistanceKm);
      distanceScore = clamp01(1 - distanceKm / (max * 2));
    }

    // --- Activity score: recency-based. ---
    let activityScore = 0;
    if (candidate.lastActive) {
      const ageMs = Date.now() - new Date(candidate.lastActive).getTime();
      if (ageMs >= 0) {
        activityScore = clamp01(1 - ageMs / ACTIVE_WITHIN_MS);
      }
    }

    // --- Profile completion: binary but weighted. ---
    const profileCompletionScore = candidate.profileCompleted ? 1 : 0;

    // --- Photos: more photos = better, saturating at 6. ---
    const photoScore = clamp01(candidate.photoCount / 6);

    // --- Verification: binary. ---
    const verificationScore = candidate.isVerified ? 1 : 0;

    // --- Compatibility: gender interest + relationship goal alignment. ---
    let compatibilityScore = 0;
    const genderOk =
      preferences.interestedIn.length === 0 ||
      (candidate.gender != null && preferences.interestedIn.includes(candidate.gender));
    const goalOk =
      preferences.relationshipGoal == null ||
      preferences.relationshipGoal === candidate.relationshipGoal;
    const langOk =
      preferences.preferredLanguages.length === 0 ||
      candidate.preferredLanguages.some((l) =>
        preferences.preferredLanguages.includes(l),
      );
    // Average the three compatibility signals.
    compatibilityScore =
      (Number(genderOk) + Number(goalOk) + Number(langOk)) / 3;

    const baseScore =
      ageScore * WEIGHTS.age +
      distanceScore * WEIGHTS.distance +
      activityScore * WEIGHTS.activity +
      profileCompletionScore * WEIGHTS.profileCompletion +
      photoScore * WEIGHTS.photos +
      verificationScore * WEIGHTS.verification +
      compatibilityScore * WEIGHTS.compatibility;

    // --- Boost: multiply the base score by the candidate's active multiplier.
    // The multiplier is stored per `boost_sessions` row and is the ONLY value
    // an A/B framework would vary — no change to this scoring math. ---
    const boosted = baseScore * (candidate.boostMultiplier || 1);

    // --- Super Like priority: a flat bonus when the candidate super-liked the
    // viewer, so they surface above otherwise-equal candidates. ---
    const superLikeBonus = candidate.superLikedMe ? 0.15 : 0;

    const totalScore = Math.round((boosted + superLikeBonus) * 100);

    return {
      totalScore,
      ageScore: Math.round(ageScore * 100),
      distanceScore: Math.round(distanceScore * 100),
      activityScore: Math.round(activityScore * 100),
      compatibilityScore: Math.round(compatibilityScore * 100),
      profileCompletionScore: Math.round(profileCompletionScore * 100),
      photoScore: Math.round(photoScore * 100),
      verificationScore: Math.round(verificationScore * 100),
    };
  }

  rank(
    candidates: Array<{ facts: CandidateFacts; preferences: UserPreferences }>,
  ): Array<{ facts: CandidateFacts; score: RecommendationScore }> {
    return candidates
      .map((c) => ({ facts: c.facts, score: this.scoreCandidate(c.facts, c.preferences) }))
      .sort((a, b) => {
        if (b.score.totalScore !== a.score.totalScore) {
          return b.score.totalScore - a.score.totalScore;
        }
        // Stable tiebreak by userId for deterministic ordering.
        return a.facts.userId.localeCompare(b.facts.userId);
      });
  }
}

/**
 * Strategy factory. Today it returns the deterministic scorer. A future AI
 * model would be selected here (e.g. by env flag) without any caller changes.
 */
export function createRecommendationStrategy(): RecommendationStrategy {
  return new DeterministicRecommendationStrategy();
}
