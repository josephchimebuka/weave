// Session cookie name — shared between client and server
export const DASHBOARD_SESSION_COOKIE = 'weave_session';

const API_BASE = '/api/auth';

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<ApiResult<T>> {
  try {
    // Note: path already starts with / e.g. /login
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

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return;
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function storeSessionToken(token: string, expiresAt?: string) {
  if (typeof window === 'undefined') return;
  const maxAge = expiresAt
    ? Math.max(60, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    : 24 * 60 * 60;
  setCookie(DASHBOARD_SESSION_COOKIE, token, maxAge);
}

export function storeUserEmail(email: string | null) {
  if (typeof window === 'undefined' || !email) return;
  sessionStorage.setItem('weave_dashboard_user_email', email);
}

export function readSessionToken(): string {
  if (typeof document === 'undefined') return '';
  // Try to read from cookie (which the server also uses)
  const name = DASHBOARD_SESSION_COOKIE + '=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookies = decodedCookie.split(';');
  for (const cookie of cookies) {
    const c = cookie.trim();
    if (c.indexOf(name) === 0) return c.substring(name.length);
  }
  return '';
}

export function clearSessionToken() {
  if (typeof document !== 'undefined') {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('weave_dashboard_user_email');
    }
  }
  clearCookie(DASHBOARD_SESSION_COOKIE);
}

export function signup(email: string, password: string) {
  return postJson<AuthSuccessData>('/auth/signup', { email, password });
}

export function login(email: string, password: string) {
  return postJson<AuthSuccessData>('/auth/login', { email, password });
}

export function forgotPassword(email: string) {
  return postJson<{ message: string; resetToken?: string; otpCode?: string; expiresAt?: string }>(
    '/auth/forgot-password',
    { email },
  );
}

export function resetPassword(resetToken: string, otp: string, newPassword: string) {
  return postJson<AuthSuccessData>('/auth/reset-password', { resetToken, otp, newPassword });
}

export function logout(sessionToken: string) {
  return postJson<{ loggedOut: boolean }>('/auth/logout', { sessionToken });
}
