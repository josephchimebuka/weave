import { readSessionCookie } from './auth-server';
import { Order, directionOf } from '../types';
import {
  OrderFilter,
  OrderWithProviderStatus as _OrderWithProviderStatus,
  toSearchQuery,
  applyOrderFilter,
} from '@weave/shared';

export type { OrderFilter };
export type OrderWithProviderStatus = _OrderWithProviderStatus<Order>;
export { toSearchQuery, applyOrderFilter };

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

async function getSessionToken(): Promise<string> {
  const cookie = await readSessionCookie();
  return cookie || '';
}

function getCacheOptions(revalidateSeconds: number) {
  return revalidateSeconds <= 0
    ? ({ cache: 'no-store' } as const)
    : ({ next: { revalidate: revalidateSeconds } } as const);
}

export async function fetchOrders(revalidateSeconds = 10): Promise<Order[]> {
  try {
    const cacheOptions = getCacheOptions(revalidateSeconds);
    const token = await getSessionToken();
    if (!token) return [];
    const res = await fetch(`${API_BASE}/orders?limit=100`, {
      headers: { 'x-session-token': token },
      ...cacheOptions,
    });
    if (!res.ok) return [];
    const json = await res.json();
    const d = json.data ?? json;
    return Array.isArray(d) ? d : (d.orders ?? []);
  } catch {
    return [];
  }
}

// Export-oriented: pull the ENTIRE matching set by looping pages (the API caps
// a single page at 500). Server-side filters are applied by the API.
export async function fetchAllOrders(
  query: { status?: string; direction?: string; q?: string; fromDate?: string; toDate?: string } = {},
): Promise<Order[]> {
  const token = await getSessionToken();
  if (!token) return [];
  const all: Order[] = [];
  const pageSize = 500;
  let offset = 0;
  for (let i = 0; i < 500; i++) {
    const qs = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    for (const [k, v] of Object.entries(query)) if (v) qs.set(k, String(v));
    const res = await fetch(`${API_BASE}/orders?${qs.toString()}`, {
      headers: { 'x-session-token': token },
      cache: 'no-store',
    });
    if (!res.ok) break;
    const json = await res.json();
    const d = json.data ?? json;
    const orders: Order[] = Array.isArray(d) ? d : (d.orders ?? []);
    all.push(...orders);
    if (orders.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

export async function fetchOrder(id: string, revalidateSeconds = 10): Promise<OrderWithProviderStatus | null> {
  try {
    const cacheOptions = getCacheOptions(revalidateSeconds);
    const token = await getSessionToken();
    if (!token) return null;
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      headers: { 'x-session-token': token },
      ...cacheOptions,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export type { OrderEvent, OrderTimeline } from './order-events';
import type { OrderTimeline } from './order-events';

export async function fetchOrderEvents(id: string, revalidateSeconds = 10): Promise<OrderTimeline | null> {
  try {
    const cacheOptions = getCacheOptions(revalidateSeconds);
    const token = await getSessionToken();
    if (!token) return null;
    const res = await fetch(`${API_BASE}/orders/${id}/events`, {
      headers: { 'x-session-token': token },
      ...cacheOptions,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchMerchantProfile(): Promise<{
  id: string;
  name: string;
  email: string;
  publishableKey: string;
  kycLevel: string;
  createdAt: string;
} | null> {
  try {
    const token = await getSessionToken();
    if (!token) return null;
    const res = await fetch(`${API_BASE}/merchant/profile`, {
      headers: { 'x-session-token': token },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}
