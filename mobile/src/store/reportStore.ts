import { create } from 'zustand';
import {
  reportApi,
  Report,
  ReportCategory,
  ReportPayload,
} from '../lib/api/report.api';

/**
 * Report store (Zustand).
 *
 * Why: Single source of truth for the user's own reports and the category
 * picker. `myReports` powers `MyReportsScreen`; `categories` powers the report
 * picker. `refreshReports` loads the caller's reports; `refreshCategories`
 * loads the picker options; `submitProfile`/`submitMessage`/`submitPhoto` call
 * the matching API method and append the created report; `deleteReport` removes
 * one from the list. All HTTP lives in `report.api`; this store is a thin state
 * container. Reporting is independent of blocking — a blocked user may still be
 * reported (the backend enforces this).
 */
interface ReportState {
  myReports: Report[];
  categories: ReportCategory[];
  loading: boolean;
  error: string | null;

  /** Load the caller's own reports. */
  refreshReports: () => Promise<void>;
  /** Load the report categories for the picker. */
  refreshCategories: () => Promise<void>;
  /** Submit a profile report and append the result. */
  submitProfile: (userId: string, payload: ReportPayload) => Promise<Report>;
  /** Submit a message report and append the result. */
  submitMessage: (messageId: string, payload: ReportPayload) => Promise<Report>;
  /** Submit a photo report and append the result. */
  submitPhoto: (photoId: string, payload: ReportPayload) => Promise<Report>;
  /** Soft-delete one of the caller's reports and remove it from the list. */
  deleteReport: (id: string) => Promise<void>;
  /** Clear all report state (e.g. on logout). */
  clear: () => void;
}

export const useReportStore = create<ReportState>((set) => ({
  myReports: [],
  categories: [],
  loading: false,
  error: null,

  refreshReports: async () => {
    set({ loading: true, error: null });
    try {
      const myReports = await reportApi.listMine();
      set({ myReports, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load reports',
      });
    }
  },

  refreshCategories: async () => {
    set({ loading: true, error: null });
    try {
      const categories = await reportApi.listCategories();
      set({ categories, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load categories',
      });
    }
  },

  submitProfile: async (userId, payload) => {
    const report = await reportApi.reportProfile(userId, payload);
    set((state) => ({ myReports: [report, ...state.myReports] }));
    return report;
  },

  submitMessage: async (messageId, payload) => {
    const report = await reportApi.reportMessage(messageId, payload);
    set((state) => ({ myReports: [report, ...state.myReports] }));
    return report;
  },

  submitPhoto: async (photoId, payload) => {
    const report = await reportApi.reportPhoto(photoId, payload);
    set((state) => ({ myReports: [report, ...state.myReports] }));
    return report;
  },

  deleteReport: async (id) => {
    try {
      await reportApi.delete(id);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete report' });
      return;
    }
    set((state) => ({
      myReports: state.myReports.filter((r) => r.id !== id),
    }));
  },

  clear: () => set({ myReports: [], categories: [], loading: false, error: null }),
}));
