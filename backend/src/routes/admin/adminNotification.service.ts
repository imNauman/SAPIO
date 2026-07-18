import { supabaseAdmin } from '../../config/supabase';
import { adminRepository } from './admin.repository';

/**
 * Admin notification service.
 *
 * Why: Read-only listing of recent notifications across all users for the
 * Notifications page. Sending is delegated to the existing notification module
 * (out of scope for this milestone), so this is visibility only.
 */
export const adminNotificationService = {
  listNotifications(limit = 50) {
    return adminRepository.listNotifications(supabaseAdmin, limit);
  },
};
