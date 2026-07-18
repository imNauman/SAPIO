/**
 * Profile photo domain types shared across the service, repository, controller,
 * and route layers. These mirror the `public.profile_photos` table columns.
 */
export interface ProfilePhoto {
  id: string;
  userId: string;
  photoUrl: string;
  storagePath: string;
  displayOrder: number;
  isPrimary: boolean;
  uploadedAt: string | null;
  updatedAt: string | null;
}

/** A photo as returned to clients (no internal storage path leakage needed). */
export interface PhotoPublic {
  id: string;
  photoUrl: string;
  displayOrder: number;
  isPrimary: boolean;
  uploadedAt: string | null;
}

/** Body for reordering: an ordered list of photo ids. */
export interface ReorderInput {
  orderedIds: string[];
}

/** Body for setting the primary photo. */
export interface PrimaryInput {
  photoId: string;
}
