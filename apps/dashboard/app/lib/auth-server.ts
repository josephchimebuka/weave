import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const DASHBOARD_SESSION_COOKIE = 'weave_session';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export type SessionUser = {
  id:             string;
  email:          string;
  name:           string;
  publishableKey: string;
  createdAt:      string;
  updatedAt:      string;
};

export type ServerSession = {
  token: string;
  user:  SessionUser;
};

export async function readSessionCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(DASHBOARD_SESSION_COOKIE)?.value ?? null;
}

export async function getServerSession(): Promise<ServerSession | null> {
  const token = await readSessionCookie();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/session`, {
      headers: { 'x-session-token': token },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    if (!json?.success) return null;
    return { token, user: json.data.user };
  } catch {
    return null;
  }
}

/**
 * Require authentication for a server component.
 * Redirects to login if no valid session found.
 */
export async function requireServerSession(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    redirect('/auth/login');
  }
  return session;
}

export function displayNameFromEmail(email: string | null | undefined): string {
  if (!email) return 'there';
  const [local] = email.split('@');
  if (!local) return 'there';
  const first = local.split(/[.\-_+]/)[0] || local;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function initialsFromEmail(email: string | null | undefined): string {
  if (!email) return 'W';
  const [local] = email.split('@');
  if (!local) return 'W';
  const parts = local.split(/[.\-_+]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (local[0] + (local[1] ?? '')).toUpperCase();
}
