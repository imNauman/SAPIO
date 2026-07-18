import { z } from 'zod';

/**
 * Validation schemas for the profile module.
 *
 * Why: Zod is the single source of truth for profile shape. The same schemas
 * drive backend request validation and (where useful) shared constants for the
 * mobile forms. Age is enforced at >= 18 via a refined birth_date.
 */
export const GENDERS = [
  'male',
  'female',
  'non_binary',
  'other',
] as const;

export const RELATIONSHIP_GOALS = [
  'casual',
  'dating',
  'serious',
  'friendship',
  'marriage',
] as const;

export const BIO_MAX = 500;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const DISPLAY_NAME_MAX = 50;
export const OCCUPATION_MAX = 80;
export const EDUCATION_MAX = 80;
export const CITY_MAX = 80;
export const COUNTRY_MAX = 80;
export const HEIGHT_MIN = 120;
export const HEIGHT_MAX = 250;

/** Must be at least 18 years old. */
function isAdult(date: string): boolean {
  const dob = new Date(date);
  if (Number.isNaN(dob.getTime())) return false;
  const eighteen = new Date();
  eighteen.setFullYear(eighteen.getFullYear() - 18);
  return dob <= eighteen;
}

export const profileCreateSchema = z.object({
  username: z
    .string()
    .min(USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters`)
    .max(USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters`)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username may only contain letters, numbers, and underscores',
    ),
  displayName: z.string().min(1).max(DISPLAY_NAME_MAX).optional(),
  bio: z.string().max(BIO_MAX, `Bio must be at most ${BIO_MAX} characters`).optional(),
  birthDate: z
    .string()
    .refine(isAdult, 'You must be at least 18 years old'),
  gender: z.enum(GENDERS),
  interestedIn: z.array(z.enum(GENDERS)).min(1, 'Select at least one option'),
  relationshipGoal: z.enum(RELATIONSHIP_GOALS).optional(),
  heightCm: z.number().int().min(HEIGHT_MIN).max(HEIGHT_MAX).optional(),
  occupation: z.string().max(OCCUPATION_MAX).optional(),
  education: z.string().max(EDUCATION_MAX).optional(),
  city: z.string().max(CITY_MAX).optional(),
  country: z.string().max(COUNTRY_MAX).optional(),
});

export const profileUpdateSchema = profileCreateSchema.partial();

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().max(CITY_MAX).optional(),
  country: z.string().max(COUNTRY_MAX).optional(),
});

export type ProfileCreateInput = z.infer<typeof profileCreateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
