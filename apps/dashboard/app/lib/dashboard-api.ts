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
    const res = await fetch(`${API_BASE}/orders`, {
      headers: { 'x-session-token': token },
      ...cacheOptions,
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
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
