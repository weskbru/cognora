import { apiRequest } from '@/api/base44Client';

export type AdminPlan = 'free' | 'pro' | 'premium';

export interface AdminProgress {
  plan: AdminPlan;
  subscription_status: string;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  xp: number;
  level: number;
  daily_generations_used: number;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  role: string;
  created_at: string | null;
  progress: AdminProgress;
}

export interface AdminAuditLog {
  id: string;
  admin_user_id: string | null;
  admin_email: string;
  action: string;
  target_user_email: string | null;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type SystemEventLevel = 'info' | 'warning' | 'error';

export interface SystemEvent {
  id: string;
  level: SystemEventLevel;
  event_type: string;
  user_email: string | null;
  request_id: string | null;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SystemEventsSummary {
  last_24h: {
    info: number;
    warning: number;
    error: number;
  };
  total_7d: number;
  by_type_7d: Record<string, number>;
  recent_errors: SystemEvent[];
  config: {
    retention_days: number;
    alert_email_enabled: boolean;
    alert_email_count: number;
    alert_error_threshold: number;
    alert_window_minutes: number;
    alert_cooldown_minutes: number;
  };
}

export interface AdminPaymentRequest {
  id: string;
  user_email: string;
  user_name: string | null;
  plan: 'pro' | 'premium';
  amount_cents: number;
  pix_reference: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: string;
}

export interface AdminOverview {
  total_users: number;
  active_pro_users: number;
  pending_pix: number;
  approved_this_month: number;
  revenue_cents_this_month: number;
  expiring_soon: number;
  recent_audit_logs: AdminAuditLog[];
  recent_payment_requests: AdminPaymentRequest[];
}

export interface GrantPlanPayload {
  plan: 'pro' | 'premium';
  days: number;
  starts_at?: string;
  note?: string;
}

const request = apiRequest;

export const adminApi = {
  overview(): Promise<AdminOverview> {
    return request<AdminOverview>('GET', '/api/admin/overview');
  },

  users(params: { q?: string; plan?: string; limit?: number }): Promise<AdminUser[]> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.plan) searchParams.set('plan', params.plan);
    if (params.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return request<AdminUser[]>('GET', `/api/admin/users${qs ? `?${qs}` : ''}`);
  },

  grantPlan(userId: string, payload: GrantPlanPayload): Promise<{ user_id: string; email: string; progress: AdminProgress }> {
    return request('POST', `/api/admin/users/${userId}/grant-plan`, payload);
  },

  revokePlan(userId: string, payload: { note?: string }): Promise<{ user_id: string; email: string; progress: AdminProgress }> {
    return request('POST', `/api/admin/users/${userId}/revoke-plan`, payload);
  },

  resetUserPassword(userId: string, payload: { new_password: string; note?: string }): Promise<{ user_id: string; email: string; password_reset: boolean }> {
    return request('POST', `/api/admin/users/${userId}/reset-password`, payload);
  },

  deleteUser(userId: string, payload: { confirm_email: string; note?: string }): Promise<{ user_id: string; email: string; deleted: boolean }> {
    return request('DELETE', `/api/admin/users/${userId}`, payload);
  },

  auditLogs(params: { q?: string; action?: string; limit?: number }): Promise<AdminAuditLog[]> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.action) searchParams.set('action', params.action);
    if (params.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return request<AdminAuditLog[]>('GET', `/api/admin/audit-logs${qs ? `?${qs}` : ''}`);
  },

  systemEvents(params: {
    q?: string;
    level?: string;
    event_type?: string;
    user_email?: string;
    request_id?: string;
    created_from?: string;
    created_to?: string;
    limit?: number;
  }): Promise<SystemEvent[]> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.level) searchParams.set('level', params.level);
    if (params.event_type) searchParams.set('event_type', params.event_type);
    if (params.user_email) searchParams.set('user_email', params.user_email);
    if (params.request_id) searchParams.set('request_id', params.request_id);
    if (params.created_from) searchParams.set('created_from', params.created_from);
    if (params.created_to) searchParams.set('created_to', params.created_to);
    if (params.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return request<SystemEvent[]>('GET', `/api/admin/system-events${qs ? `?${qs}` : ''}`);
  },

  systemEventsSummary(): Promise<SystemEventsSummary> {
    return request<SystemEventsSummary>('GET', '/api/admin/system-events/summary');
  },

  cleanupSystemEvents(payload: { retention_days?: number }): Promise<{ deleted: number; retention_days: number }> {
    return request('POST', '/api/admin/system-events/cleanup', payload);
  },
};
