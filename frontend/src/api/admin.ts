import { getToken } from '@/lib/tokenStorage';

const API_URL = import.meta.env.VITE_API_URL as string;

if (!API_URL) {
  throw new Error('[Cognora] VITE_API_URL nao configurada.');
}

export type AdminPlan = 'free' | 'pro' | 'unlimited';

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
}

export interface AdminPaymentRequest {
  id: string;
  user_email: string;
  user_name: string | null;
  plan: 'pro' | 'unlimited';
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
  plan: 'pro' | 'unlimited';
  days: number;
  starts_at?: string;
  note?: string;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) {
    const detail = data.detail;
    const message = typeof detail === 'string' ? detail : detail?.message || 'Erro na requisicao';
    throw new Error(message);
  }
  return data as T;
}

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

  systemEvents(params: { q?: string; level?: string; event_type?: string; user_email?: string; limit?: number }): Promise<SystemEvent[]> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.level) searchParams.set('level', params.level);
    if (params.event_type) searchParams.set('event_type', params.event_type);
    if (params.user_email) searchParams.set('user_email', params.user_email);
    if (params.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return request<SystemEvent[]>('GET', `/api/admin/system-events${qs ? `?${qs}` : ''}`);
  },

  systemEventsSummary(): Promise<SystemEventsSummary> {
    return request<SystemEventsSummary>('GET', '/api/admin/system-events/summary');
  },
};
