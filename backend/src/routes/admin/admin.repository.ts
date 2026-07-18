import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import {
  AdminActivityLog,
  AdminPermission,
  AdminPermissionDef,
  AdminRole,
  AdminRoleName,
  AdminUser,
} from './admin.types';
import { profileRepo } from '../profile/profile.repository';
import { verificationRepository } from '../verification/verification.repository';
import { subscriptionRepository } from '../subscription/subscription.repository';
import { boostRepository } from '../boost/boost.repository';

/**
 * Admin repository — the query layer for the Admin Dashboard Platform.
 *
 * Why: Owns all raw Supabase access for admin data (RBAC tables, audit log,
 * user lifecycle, cross-module listings). Where a domain module already owns a
 * table (profiles, verification, subscriptions, boosts, reports), we REUSE its
 * repository/service rather than re-querying here — this keeps a single source
 * of truth and avoids duplicating business logic. Direct queries are limited to
 * admin-only tables and read-only cross-module listings that the modules don't
 * expose.
 *
 * Uses the service-role client (`supabaseAdmin`) so it bypasses RLS and can act
 * on behalf of any user (suspend, ban, delete, reset verification).
 */

// ---- Admin RBAC tables -----------------------------------------------------
const ADMINS = 'admin_users';
const ROLES = 'admin_roles';
const PERMS = 'admin_permissions';
const ROLE_PERMS = 'admin_role_permissions';
const LOGS = 'admin_activity_logs';

// ---- Domain tables (read-only listings) ------------------------------------
const PROFILES = 'profiles';
const REPORTS = 'reports';
const REPORT_CATS = 'report_categories';
const REPORT_EVIDENCE = 'report_evidence';
const VERIF = 'verification_requests';
const VERIF_PHOTOS = 'verification_photos';
const SUBS = 'user_subscriptions';
const SUB_PLANS = 'subscription_plans';
const BOOSTS = 'boost_sessions';
const NOTIFS = 'notifications';
const AUTH_USERS = 'auth.users';

interface AdminRow {
  id: string;
  user_id: string;
  role_id: string;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  created_by: string | null;
}

interface RoleRow {
  id: string;
  name: AdminRoleName;
  description: string | null;
}

interface PermRow {
  id: string;
  key: AdminPermission;
  description: string | null;
}

function isMissingTable(err: unknown): boolean {
  return (
    err instanceof Error && /relation .* does not exist/i.test(err.message)
  );
}

// ---------------------------------------------------------------------------
// Admin principals
// ---------------------------------------------------------------------------

export const adminRepository = {
  /** Resolve an admin by the linked auth user id (with permissions expanded). */
  async getAdminByUserId(
    client: SupabaseClient,
    userId: string,
  ): Promise<AdminUser | null> {
    const { data, error } = await client
      .from(ADMINS)
      .select('*, role:admin_roles(name)')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) return null;
      throw new AppError(500, error.message);
    }
    if (!data) return null;
    const row = data as AdminRow & { role: { name: AdminRoleName } | null };
    const permissions = await this.getRolePermissions(client, row.role_id);
    return {
      id: row.id,
      userId: row.user_id,
      roleId: row.role_id,
      roleName: row.role?.name ?? 'read_only',
      email: row.email,
      isActive: row.is_active,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      permissions,
    };
  },

  /** List all admins (with role name). */
  async listAdmins(client: SupabaseClient): Promise<AdminUser[]> {
    const { data, error } = await client
      .from(ADMINS)
      .select('*, role:admin_roles(name)')
      .order('created_at', { ascending: true });
    if (error) throw new AppError(500, error.message);
    const rows = (data as Array<AdminRow & { role: { name: AdminRoleName } | null }>) ?? [];
    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        userId: row.user_id,
        roleId: row.role_id,
        roleName: row.role?.name ?? 'read_only',
        email: row.email,
        isActive: row.is_active,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
        permissions: await this.getRolePermissions(client, row.role_id),
      })),
    );
  },

  /** Create an admin link for an existing auth user. */
  async createAdmin(
    client: SupabaseClient,
    input: {
      userId: string;
      roleId: string;
      email: string;
      createdBy?: string | null;
    },
  ): Promise<AdminUser> {
    const { data, error } = await client
      .from(ADMINS)
      .insert({
        user_id: input.userId,
        role_id: input.roleId,
        email: input.email,
        created_by: input.createdBy ?? null,
      })
      .select('*, role:admin_roles(name)')
      .single();
    if (error) {
      if (/duplicate key/i.test(error.message)) {
        throw new AppError(409, 'This user is already an admin');
      }
      throw new AppError(500, error.message);
    }
    const row = data as AdminRow & { role: { name: AdminRoleName } | null };
    return {
      id: row.id,
      userId: row.user_id,
      roleId: row.role_id,
      roleName: row.role?.name ?? 'read_only',
      email: row.email,
      isActive: row.is_active,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      permissions: await this.getRolePermissions(client, row.role_id),
    };
  },

  /** Reassign an admin's role. */
  async updateAdminRole(
    client: SupabaseClient,
    adminId: string,
    roleId: string,
  ): Promise<AdminUser> {
    const { data, error } = await client
      .from(ADMINS)
      .update({ role_id: roleId })
      .eq('id', adminId)
      .select('*, role:admin_roles(name)')
      .single();
    if (error) throw new AppError(500, error.message);
    if (!data) throw new AppError(404, 'Admin not found');
    const row = data as AdminRow & { role: { name: AdminRoleName } | null };
    return {
      id: row.id,
      userId: row.user_id,
      roleId: row.role_id,
      roleName: row.role?.name ?? 'read_only',
      email: row.email,
      isActive: row.is_active,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      permissions: await this.getRolePermissions(client, row.role_id),
    };
  },

  /** Record a successful admin login timestamp. */
  async touchLogin(
    client: SupabaseClient,
    adminId: string,
  ): Promise<void> {
    const { error } = await client
      .from(ADMINS)
      .update({ last_login_at: new Date().toISOString(), is_active: true })
      .eq('id', adminId);
    if (error) throw new AppError(500, error.message);
  },

  // -------------------------------------------------------------------------
  // Roles & permissions
  // -------------------------------------------------------------------------

  /** All roles with their expanded permission sets. */
  async listRoles(client: SupabaseClient): Promise<AdminRole[]> {
    const { data, error } = await client
      .from(ROLES)
      .select('*')
      .order('name', { ascending: true });
    if (error) throw new AppError(500, error.message);
    const rows = (data as RoleRow[]) ?? [];
    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        permissions: await this.getRolePermissions(client, row.id),
      })),
    );
  },

  /** All permission definitions. */
  async listPermissions(client: SupabaseClient): Promise<AdminPermissionDef[]> {
    const { data, error } = await client.from(PERMS).select('*');
    if (error) throw new AppError(500, error.message);
    return (data as PermRow[]).map((r) => ({
      key: r.key,
      description: r.description,
    }));
  },

  /** Expand a role id into its permission keys. */
  async getRolePermissions(
    client: SupabaseClient,
    roleId: string,
  ): Promise<AdminPermission[]> {
    const { data, error } = await client
      .from(ROLE_PERMS)
      .select('permission_key')
      .eq('role_id', roleId);
    if (error) throw new AppError(500, error.message);
    return (data as Array<{ permission_key: AdminPermission }>).map(
      (r) => r.permission_key,
    );
  },

  // -------------------------------------------------------------------------
  // Audit log
  // -------------------------------------------------------------------------

  /** Append an audit-log entry. */
  async logActivity(
    client: SupabaseClient,
    input: {
      adminId: string;
      action: string;
      targetType?: string | null;
      targetId?: string | null;
      metadata?: Record<string, unknown> | null;
      ipAddress?: string | null;
    },
  ): Promise<void> {
    const { error } = await client.from(LOGS).insert({
      admin_id: input.adminId,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? null,
      ip_address: input.ipAddress ?? null,
    });
    if (error) throw new AppError(500, error.message);
  },

  /** List recent audit-log entries (newest first), joined with admin email. */
  async listActivityLogs(
    client: SupabaseClient,
    limit = 100,
  ): Promise<Array<AdminActivityLog & { adminEmail: string }>> {
    const { data, error } = await client
      .from(LOGS)
      .select('*, admin:admin_users(email)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new AppError(500, error.message);
    return ((data as Array<
      AdminActivityLog & { admin: { email: string } | null }
    >) ?? []).map((row) => ({
      id: row.id,
      adminId: row.adminId,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      metadata: row.metadata,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt,
      adminEmail: row.admin?.email ?? 'unknown',
    }));
  },

  // -------------------------------------------------------------------------
  // User management (reuses profileRepo + auth admin)
  // -------------------------------------------------------------------------

  /**
   * Search profiles by username/display name. Emails are fetched from auth in a
   * single batched pass. `status` is read from auth user_metadata.
   */
  async searchUsers(
    client: SupabaseClient,
    query: string,
    limit = 25,
    offset = 0,
  ): Promise<
    Array<{
      userId: string;
      username: string | null;
      displayName: string | null;
      email: string | null;
      isVerified: boolean;
      isPremium: boolean;
      status: string;
      createdAt: string | null;
      lastActive: string | null;
    }>
  > {
    const like = `%${query}%`;
    const { data, error } = await client
      .from(PROFILES)
      .select(
        'user_id, username, display_name, is_verified, is_premium, created_at, last_active',
      )
      .or(`username.ilike.${like},display_name.ilike.${like}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new AppError(500, error.message);
    const rows = (data as Array<{
      user_id: string;
      username: string | null;
      display_name: string | null;
      is_verified: boolean;
      is_premium: boolean;
      created_at: string | null;
      last_active: string | null;
    }>) ?? [];

    // Batch-fetch auth users for email + status.
    const ids = rows.map((r) => r.user_id);
    const emails = new Map<string, { email: string; status: string }>();
    if (ids.length > 0) {
      const { data: authData, error: authErr } = await client
        .from(AUTH_USERS)
        .select('id, email, raw_user_meta_data')
        .in('id', ids);
      if (authErr) {
        if (!isMissingTable(authErr)) throw new AppError(500, authErr.message);
      }
      for (const u of (authData as Array<{
        id: string;
        email: string | null;
        raw_user_meta_data: { status?: string } | null;
      }>) ?? []) {
        emails.set(u.id, {
          email: u.email ?? null,
          status: u.raw_user_meta_data?.status ?? 'active',
        });
      }
    }

    return rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      displayName: r.display_name,
      email: emails.get(r.user_id)?.email ?? null,
      isVerified: r.is_verified,
      isPremium: r.is_premium,
      status: emails.get(r.user_id)?.status ?? 'active',
      createdAt: r.created_at,
      lastActive: r.last_active,
    }));
  },

  /**
   * Full user detail for the admin detail page. Reuses profileRepo and the
   * domain repositories so the data matches what the app sees.
   */
  async getUserDetails(
    client: SupabaseClient,
    userId: string,
  ): Promise<{
    profile: Awaited<ReturnType<typeof profileRepo.findByUserId>>;
    email: string | null;
    status: string;
    createdAt: string | null;
    lastSignInAt: string | null;
    subscription: Awaited<
      ReturnType<typeof subscriptionRepository.getActiveSubscription>
    >;
    activeBoost: Awaited<ReturnType<typeof boostRepository.getActiveBoost>>;
    verification: Awaited<
      ReturnType<typeof verificationRepository.findActive>
    >;
  }> {
    const profile = await profileRepo.findByUserId(userId);
    const subscription = await subscriptionRepository.getActiveSubscription(
      client,
      userId,
    );
    const activeBoost = await boostRepository.getActiveBoost(client, userId);
    const verification = await verificationRepository.findActive(
      client,
      userId,
    );

    let email: string | null = null;
    let status = 'active';
    let createdAt: string | null = null;
    let lastSignInAt: string | null = null;
    const { data: authData, error: authErr } = await client
      .from(AUTH_USERS)
      .select('email, created_at, last_sign_in_at, raw_user_meta_data')
      .eq('id', userId)
      .maybeSingle();
    if (authErr) {
      if (!isMissingTable(authErr)) throw new AppError(500, authErr.message);
    } else if (authData) {
      const u = authData as {
        email: string | null;
        created_at: string | null;
        last_sign_in_at: string | null;
        raw_user_meta_data: { status?: string } | null;
      };
      email = u.email;
      status = u.raw_user_meta_data?.status ?? 'active';
      createdAt = u.created_at;
      lastSignInAt = u.last_sign_in_at;
    }

    return {
      profile,
      email,
      status,
      createdAt,
      lastSignInAt,
      subscription,
      activeBoost,
      verification,
    };
  },

  /**
   * Suspend / ban / reactivate a user by writing `status` into auth
   * user_metadata. Uses the admin API so it works regardless of RLS.
   */
  async setUserStatus(
    client: SupabaseClient,
    userId: string,
    status: 'active' | 'suspended' | 'banned',
  ): Promise<void> {
    const { error } = await client.auth.admin.updateUserById(userId, {
      user_metadata: { status },
    });
    if (error) throw new AppError(500, error.message);
  },

  /** Permanently delete a user (profile + auth record). */
  async deleteUser(client: SupabaseClient, userId: string): Promise<void> {
    // Remove the profile row first (FK may not cascade).
    const { error: pErr } = await client
      .from(PROFILES)
      .delete()
      .eq('user_id', userId);
    if (pErr) throw new AppError(500, pErr.message);

    const { error } = await client.auth.admin.deleteUser(userId);
    if (error) throw new AppError(500, error.message);
  },

  /**
   * Reset a user's verification: clear the verified flag and cancel any active
   * request. Reuses the verification repository (no duplicated logic).
   */
  async resetVerification(client: SupabaseClient, userId: string): Promise<void> {
    await profileRepo.setVerified(userId, false);
    const active = await verificationRepository.findActive(client, userId);
    if (active) {
      await verificationRepository.cancel(client, userId, active.id);
    }
  },

  // -------------------------------------------------------------------------
  // Reports (read-only listing + status update; reuses report table)
  // -------------------------------------------------------------------------

  async listReports(
    client: SupabaseClient,
    opts: { status?: string; limit?: number; offset?: number } = {},
  ): Promise<
    Array<{
      id: string;
      reporterUserId: string;
      reportedUserId: string;
      categoryName: string | null;
      description: string | null;
      status: string;
      priority: string;
      createdAt: string;
      updatedAt: string;
    }>
  > {
    let query = client
      .from(REPORTS)
      .select(
        'id, reporter_user_id, reported_user_id, category_name, description, status, priority, created_at, updated_at',
      )
      .is('deleted_at', null);
    if (opts.status) query = query.eq('status', opts.status);
    query = query
      .order('created_at', { ascending: false })
      .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 25) - 1);
    const { data, error } = await query;
    if (error) throw new AppError(500, error.message);
    return (data as Array<{
      id: string;
      reporter_user_id: string;
      reported_user_id: string;
      category_name: string | null;
      description: string | null;
      status: string;
      priority: string;
      created_at: string;
      updated_at: string;
    }>) ?? [];
  },

  async getReport(
    client: SupabaseClient,
    reportId: string,
  ): Promise<{
    id: string;
    reporterUserId: string;
    reportedUserId: string;
    categoryName: string | null;
    description: string | null;
    status: string;
    priority: string;
    createdAt: string;
    updatedAt: string;
    evidence: Array<{ id: string; imageUrl: string }>;
  } | null> {
    const { data, error } = await client
      .from(REPORTS)
      .select(
        'id, reporter_user_id, reported_user_id, category_name, description, status, priority, created_at, updated_at',
      )
      .eq('id', reportId)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    if (!data) return null;
    const row = data as {
      id: string;
      reporter_user_id: string;
      reported_user_id: string;
      category_name: string | null;
      description: string | null;
      status: string;
      priority: string;
      created_at: string;
      updated_at: string;
    };
    const { data: ev } = await client
      .from(REPORT_EVIDENCE)
      .select('id, image_url')
      .eq('report_id', reportId);
    return {
      ...row,
      reporterUserId: row.reporter_user_id,
      reportedUserId: row.reported_user_id,
      categoryName: row.category_name,
      evidence: (ev as Array<{ id: string; image_url: string }>).map((e) => ({
        id: e.id,
        imageUrl: e.image_url,
      })),
    };
  },

  async updateReportStatus(
    client: SupabaseClient,
    reportId: string,
    status: string,
  ): Promise<void> {
    const { error, count } = await client
      .from(REPORTS)
      .update({ status })
      .eq('id', reportId)
      .is('deleted_at', null);
    if (error) throw new AppError(500, error.message);
    if (count === 0) throw new AppError(404, 'Report not found');
  },

  // -------------------------------------------------------------------------
  // Verification queue (reuses verification table)
  // -------------------------------------------------------------------------

  async listVerificationQueue(
    client: SupabaseClient,
    limit = 50,
  ): Promise<
    Array<{
      id: string;
      userId: string;
      status: string;
      submittedAt: string;
      photos: Array<{ id: string; photoUrl: string; photoType: string }>;
    }>
  > {
    const { data, error } = await client
      .from(VERIF)
      .select('id, user_id, status, submitted_at')
      .in('status', ['pending', 'under_review'])
      .order('submitted_at', { ascending: true })
      .limit(limit);
    if (error) throw new AppError(500, error.message);
    const rows = (data as Array<{
      id: string;
      user_id: string;
      status: string;
      submitted_at: string;
    }>) ?? [];
    return Promise.all(
      rows.map(async (row) => {
        const { data: photos } = await client
          .from(VERIF_PHOTOS)
          .select('id, photo_url, photo_type')
          .eq('verification_request_id', row.id);
        return {
          id: row.id,
          userId: row.user_id,
          status: row.status,
          submittedAt: row.submitted_at,
          photos: (photos as Array<{
            id: string;
            photo_url: string;
            photo_type: string;
          }>).map((p) => ({
            id: p.id,
            photoUrl: p.photo_url,
            photoType: p.photo_type,
          })),
        };
      }),
    );
  },

  // -------------------------------------------------------------------------
  // Subscriptions & boosts (read-only listings)
  // -------------------------------------------------------------------------

  async listSubscriptions(
    client: SupabaseClient,
    limit = 50,
  ): Promise<
    Array<{
      id: string;
      userId: string;
      planName: string;
      tier: string;
      status: string;
      platform: string;
      expiresAt: string | null;
      startedAt: string;
    }>
  > {
    const { data, error } = await client
      .from(SUBS)
      .select('*, plan:subscription_plans(name, tier)')
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) throw new AppError(500, error.message);
    return (data as Array<{
      id: string;
      user_id: string;
      status: string;
      platform: string;
      expires_at: string | null;
      started_at: string;
      plan: { name: string; tier: string } | null;
    }>)?.map((r) => ({
      id: r.id,
      userId: r.user_id,
      planName: r.plan?.name ?? 'Unknown',
      tier: r.plan?.tier ?? 'free',
      status: r.status,
      platform: r.platform,
      expiresAt: r.expires_at,
      startedAt: r.started_at,
    })) ?? [];
  },

  async listBoostSessions(
    client: SupabaseClient,
    limit = 50,
  ): Promise<
    Array<{
      id: string;
      userId: string;
      multiplier: number;
      status: string;
      startedAt: string;
      expiresAt: string;
    }>
  > {
    const { data, error } = await client
      .from(BOOSTS)
      .select('id, user_id, boost_multiplier, status, started_at, expires_at')
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) throw new AppError(500, error.message);
    return (data as Array<{
      id: string;
      user_id: string;
      boost_multiplier: number;
      status: string;
      started_at: string;
      expires_at: string;
    }>)?.map((r) => ({
      id: r.id,
      userId: r.user_id,
      multiplier: Number(r.boost_multiplier),
      status: r.status,
      startedAt: r.started_at,
      expiresAt: r.expires_at,
    })) ?? [];
  },

  // -------------------------------------------------------------------------
  // Notifications (recent, across all users)
  // -------------------------------------------------------------------------

  async listNotifications(
    client: SupabaseClient,
    limit = 50,
  ): Promise<
    Array<{
      id: string;
      userId: string;
      type: string;
      title: string;
      body: string;
      isRead: boolean;
      createdAt: string;
    }>
  > {
    const { data, error } = await client
      .from(NOTIFS)
      .select('id, user_id, type, title, body, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new AppError(500, error.message);
    return (data as Array<{
      id: string;
      user_id: string;
      type: string;
      title: string;
      body: string;
      is_read: boolean;
      created_at: string;
    }>)?.map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      body: r.body,
      isRead: r.is_read,
      createdAt: r.created_at,
    })) ?? [];
  },

  // -------------------------------------------------------------------------
  // System health
  // -------------------------------------------------------------------------

  async systemHealth(client: SupabaseClient): Promise<{
    database: 'ok' | 'error';
    latencyMs: number;
    counts: {
      users: number;
      reports: number;
      verifications: number;
      boosts: number;
      subscriptions: number;
      admins: number;
    };
  }> {
    const start = Date.now();
    let database: 'ok' | 'error' = 'ok';
    try {
      await client.from(PROFILES).select('user_id', { count: 'exact', head: true });
    } catch {
      database = 'error';
    }
    const latencyMs = Date.now() - start;

    const count = async (table: string): Promise<number> => {
      const { count: c, error } = await client
        .from(table)
        .select('*', { count: 'exact', head: true });
      if (error) return 0;
      return c ?? 0;
    };

    const [users, reports, verifications, boosts, subscriptions, admins] =
      await Promise.all([
        count(PROFILES),
        count(REPORTS),
        count(VERIF),
        count(BOOSTS),
        count(SUBS),
        count(ADMINS),
      ]);

    return {
      database,
      latencyMs,
      counts: {
        users,
        reports,
        verifications,
        boosts,
        subscriptions,
        admins,
      },
    };
  },
};

// Re-export so callers can reach the admin client if needed.
export { supabaseAdmin };
