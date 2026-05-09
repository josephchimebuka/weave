'use client';

export type ApiSuccess<T> = { ok: true;  data: T };
export type ApiFailure   = { ok: false; status: number; error: string };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function apiFetch<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, {
      ...init,
      headers: {
        ...(init?.body && !(init?.headers as any)?.['Content-Type']
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...init?.headers,
      },
    });
  } catch (err: any) {
    return { ok: false, status: 0, error: err?.message ?? 'Network error — check your connection.' };
  }

  let body: ApiEnvelope<T> | T | string | null = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }

  if (!res.ok) {
    const fromEnvelope = (body && typeof body === 'object' && 'error' in (body as any))
      ? (body as ApiEnvelope<T>).error
      : undefined;
    const fromMessage  = (body && typeof body === 'object' && 'message' in (body as any))
      ? (body as ApiEnvelope<T>).message
      : undefined;
    return {
      ok: false,
      status: res.status,
      error: fromEnvelope ?? fromMessage ?? defaultMessageForStatus(res.status),
    };
  }

  if (body && typeof body === 'object' && 'success' in (body as any)) {
    const env = body as ApiEnvelope<T>;
    if (env.success === false) {
      return { ok: false, status: res.status, error: env.error ?? defaultMessageForStatus(res.status) };
    }
    return { ok: true, data: (env.data as T) ?? (undefined as unknown as T) };
  }

  return { ok: true, data: body as T };
}

function defaultMessageForStatus(status: number): string {
  if (status === 0)   return 'Network error — check your connection.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'Not found.';
  if (status === 409) return 'Conflict — this resource already exists.';
  if (status === 413) return 'File too large.';
  if (status === 429) return 'Too many requests — please slow down.';
  if (status >= 500)  return 'Server error. Please try again in a moment.';
  return `Request failed (${status}).`;
}
