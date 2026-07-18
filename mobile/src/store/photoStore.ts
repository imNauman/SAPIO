import { create } from 'zustand';
import { photoApi, PhotoPublic } from '../lib/api/photo.api';

/**
 * Photo store (Zustand).
 *
 * Why: Single source of truth for the current user's photo gallery. Screens
 * read `photos` / `loading` / `uploading` and call the actions. Business logic
 * (HTTP) lives in `photo.api`, keeping the store a thin state container. Photos
 * are kept sorted by `displayOrder` so the grid renders in the right sequence.
 */
interface PhotoState {
  photos: PhotoPublic[];
  loading: boolean;
  uploading: boolean;
  uploadProgress: number; // 0..1
  error: string | null;

  /** Load the authenticated user's photos. */
  refreshPhotos: () => Promise<void>;
  /** Upload a local image (uri) after compression/resize. */
  uploadPhoto: (uri: string) => Promise<void>;
  /** Reorder photos by id sequence. */
  reorderPhotos: (orderedIds: string[]) => Promise<void>;
  /** Promote a photo to primary. */
  setPrimaryPhoto: (photoId: string) => Promise<void>;
  /** Delete a photo by id. */
  deletePhoto: (photoId: string) => Promise<void>;
  /** Clear photo state (e.g. on logout). */
  clear: () => void;
}

function sortByOrder(photos: PhotoPublic[]): PhotoPublic[] {
  return [...photos].sort((a, b) => a.displayOrder - b.displayOrder);
}

export const usePhotoStore = create<PhotoState>((set) => ({
  photos: [],
  loading: false,
  uploading: false,
  uploadProgress: 0,
  error: null,

  refreshPhotos: async () => {
    set({ loading: true, error: null });
    try {
      const photos = await photoApi.getMine();
      set({ photos: sortByOrder(photos), loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load photos',
      });
    }
  },

  uploadPhoto: async (uri: string) => {
    set({ uploading: true, uploadProgress: 0, error: null });
    try {
      const photo = await photoApi.upload(uri, (f) =>
        set({ uploadProgress: f }),
      );
      set((s) => ({
        photos: sortByOrder([...s.photos, photo]),
        uploading: false,
        uploadProgress: 1,
      }));
    } catch (e) {
      set({
        uploading: false,
        error: e instanceof Error ? e.message : 'Upload failed',
      });
      throw e;
    }
  },

  reorderPhotos: async (orderedIds: string[]) => {
    set({ loading: true, error: null });
    try {
      const photos = await photoApi.reorder(orderedIds);
      set({ photos: sortByOrder(photos), loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Reorder failed',
      });
      throw e;
    }
  },

  setPrimaryPhoto: async (photoId: string) => {
    set({ loading: true, error: null });
    try {
      const photos = await photoApi.setPrimary(photoId);
      set({ photos: sortByOrder(photos), loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to set primary',
      });
      throw e;
    }
  },

  deletePhoto: async (photoId: string) => {
    set({ loading: true, error: null });
    try {
      await photoApi.remove(photoId);
      set((s) => ({
        photos: sortByOrder(s.photos.filter((p) => p.id !== photoId)),
        loading: false,
      }));
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Delete failed',
      });
      throw e;
    }
  },

  clear: () =>
    set({ photos: [], loading: false, uploading: false, uploadProgress: 0, error: null }),
}));
