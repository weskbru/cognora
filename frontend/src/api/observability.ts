import { API_URL } from './apiUrl';

export type FrontendEventType =
  | 'frontend_error'
  | 'frontend_unhandled_rejection'
  | 'frontend_api_failure';

export interface FrontendEventPayload {
  level: 'warning' | 'error';
  event_type: FrontendEventType;
  message: string;
  request_id?: string | null;
  metadata?: Record<string, unknown>;
}

let eventCount = 0;
const MAX_EVENTS_PER_SESSION = 30;

export async function reportFrontendEvent(payload: FrontendEventPayload): Promise<void> {
  if (eventCount >= MAX_EVENTS_PER_SESSION) return;

  eventCount += 1;
  await fetch(`${API_URL}/api/observability/frontend-events`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Cognora-CSRF': '1',
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
