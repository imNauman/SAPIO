import { supabaseAdmin } from '../../config/supabase';
import { adminRepository } from './admin.repository';

/**
 * Admin subscription service.
 *
 * Why: Read-only listing of subscriptions and boost sessions for the Premium
 * management pages. Payments are explicitly OUT OF SCOPE, so there is no
 * activate/cancel mutation here — only visibility into current state.
 */
export const adminSubscriptionService = {
  listSubscriptions(limit = 50) {
    return adminRepository.listSubscriptions(supabaseAdmin, limit);
  },

  listBoostSessions(limit = 50) {
    return adminRepository.listBoostSessions(supabaseAdmin, limit);
  },
};
