import { apiRequest } from '@/api/base44Client';

export type PaidPlan = 'pro' | 'premium';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type SubscriptionPlan = 'free' | PaidPlan;

export interface PixPaymentRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  plan: PaidPlan;
  amount_cents: number;
  pix_reference: string;
  pix_payload: string;
  qr_code_data_url?: string;
  status: PaymentStatus;
  expires_at: string;
  paid_at: string | null;
  approved_at: string | null;
  approved_by_admin_id: string | null;
  rejected_at: string | null;
  admin_note: string | null;
  created_at: string;
}

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  subscription_status: 'inactive' | 'active' | 'expired' | string;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  pending_payment: PixPaymentRequest | null;
}

export interface AdminDecisionPayload {
  paid_at?: string;
  admin_note?: string;
}

const request = apiRequest;

export const subscriptionsApi = {
  createPixPayment(plan: PaidPlan): Promise<PixPaymentRequest> {
    return request<PixPaymentRequest>('POST', '/api/subscriptions/pix', { plan });
  },

  getStatus(): Promise<SubscriptionStatus> {
    return request<SubscriptionStatus>('GET', '/api/subscriptions/status');
  },

  listAdminPaymentRequests(params: { q?: string; status?: string; limit?: number }): Promise<PixPaymentRequest[]> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.status) searchParams.set('status', params.status);
    if (params.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return request<PixPaymentRequest[]>('GET', `/api/subscriptions/admin/payment-requests${qs ? `?${qs}` : ''}`);
  },

  approvePaymentRequest(id: string, payload: AdminDecisionPayload): Promise<PixPaymentRequest> {
    return request<PixPaymentRequest>('POST', `/api/subscriptions/admin/payment-requests/${id}/approve`, payload);
  },

  rejectPaymentRequest(id: string, payload: AdminDecisionPayload): Promise<PixPaymentRequest> {
    return request<PixPaymentRequest>('POST', `/api/subscriptions/admin/payment-requests/${id}/reject`, payload);
  },
};
