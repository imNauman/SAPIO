import { apiClient } from '../apiClient';

/**
 * Photo API module.
 *
 * Why: Wraps calls to the SAPIO backend `/api/photos` endpoints. The mobile app
 * sends the Supabase JWT via the `apiClient` interceptor. These functions are
 * the only place that knows about photo HTTP details — screens call the Zustand
 * store, which in turn calls these. Upload uses `FormData` (multipart).
 */
export interface PhotoPublic {
  id: string;
  photoUrl: string;
  displayOrder: number;
  isPrimary: boolean;
  uploadedAt: string | null;
}

export const photoApi = {
  /** Get the authenticated user's own photos. */
  async getMine(): Promise<PhotoPublic[]> {
    const { data } = await apiClient.get<{ data: { photos: PhotoPublic[] } }>(
      '/photos/me',
    );
    return data.data.photos;
  },

  /** Upload a photo (multipart/form-data). `onProgress` reports 0–1. */
  async upload(
    uri: string,
    onProgress?: (fraction: number) => void,
  ): Promise<PhotoPublic> {
    const form = new FormData();
    // React Native FormData expects a file object with uri/name/type.
    form.append('photo', {
      uri,
      name: uri.split('/').pop() ?? 'photo.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);

    const { data } = await apiClient.post<{ data: { photo: PhotoPublic } }>(
      '/photos/upload',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(e.loaded / e.total);
        },
      },
    );
    return data.data.photo;
  },

  /** Reorder photos by passing the full ordered list of ids. */
  async reorder(orderedIds: string[]): Promise<PhotoPublic[]> {
    const { data } = await apiClient.patch<{ data: { photos: PhotoPublic[] } }>(
      '/photos/reorder',
      { orderedIds },
    );
    return data.data.photos;
  },

  /** Set a photo as primary. */
  async setPrimary(photoId: string): Promise<PhotoPublic[]> {
    const { data } = await apiClient.patch<{ data: { photos: PhotoPublic[] } }>(
      '/photos/primary',
      { photoId },
    );
    return data.data.photos;
  },

  /** Delete a photo by id. */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/photos/${id}`);
  },

  /** Get another user's public photos (for discovery later). */
  async getByUser(userId: string): Promise<PhotoPublic[]> {
    const { data } = await apiClient.get<{ data: { photos: PhotoPublic[] } }>(
      `/photos/user/${userId}`,
    );
    return data.data.photos;
  },
};
