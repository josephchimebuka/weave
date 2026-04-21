export const DASHBOARD_SESSION_KEY = 'weave_dashboard_session_token';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({ success: false, error: 'Unexpected response from server' }));
    if (!res.ok || json?.success === false) {
      return { success: false, error: json?.error || 'Request failed. Please try again.' };
    }
    return { success: true, data: json.data as T };
  } catch {
    return { success: false, error: 'Unable to reach auth service. Check your connection and try again.' };
  }
}

export type AuthSuccessData = {
  session: { token: string; expiresAt: string };
  user: { id: string; email: string | null };
};

export function storeSessionToken(token: string) {
  if (typeof window !== 'undefined') window.localStorage.setItem(DASHBOARD_SESSION_KEY, token);
}

export function readSessionToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(DASHBOARD_SESSION_KEY) || '';
}

export function clearSessionToken() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(DASHBOARD_SESSION_KEY);
}

export function signup(email: string, password: string) {
  return postJson<AuthSuccessData>('/auth/signup', { email, password });
}

export function login(email: string, password: string) {
  return postJson<AuthSuccessData>('/auth/login', { email, password });
}

export function forgotPassword(email: string) {
  return postJson<{ message: string; resetToken?: string; otpCode?: string; expiresAt?: string }>('/auth/forgot-password', { email });
}

export function resetPassword(resetToken: string, otp: string, newPassword: string) {
  return postJson<AuthSuccessData>('/auth/reset-password', { resetToken, otp, newPassword });
}

export function logout(sessionToken: string) {
  return postJson<{ loggedOut: boolean }>('/auth/logout', { sessionToken });
}
