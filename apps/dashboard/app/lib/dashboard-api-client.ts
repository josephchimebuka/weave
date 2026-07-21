'use client';

import { Order, directionOf } from '../types';
import type { OrderTimeline } from './order-events';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

export type OrderFilter = {
  q?: string;
  status?: string;
  direction?: string;
  provider?: string;
  corridor?: string;
  fromDate?: string;
  toDate?: string;
  amountMin?: string;
  amountMax?: string;
  sort?: 'createdAt_desc' | 'createdAt_asc' | 'amount_desc' | 'amount_asc';
};

export type OrderWithProviderStatus = Order & {
  paycrestStatus?: string | null;
  nearStatus?: string | null;
};

function toSearchQuery(params: Record<string, string | undefined>): string {
  return new URLSearchParams(
    Object.entries(params).filter(([, v]) => typeof v === 'string' && v.length > 0) as Array<[string, string]>,
  ).toString();
}

function orderMatches(order: Order, filter: OrderFilter): boolean {
  const q = (filter.q || '').trim().toLowerCase();
  if (q) {
    const hay = [
      order.id,
      order.sourceAssetKey,
      order.destAssetKey,
      order.status,
      ...(order.steps || []).map((s) => s.provider),
    ].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }

  if (filter.status && filter.status !== 'all' && order.status !== filter.status) return false;
  if (filter.direction && filter.direction !== 'all' && directionOf(order) !== filter.direction) return false;
  if (filter.provider && filter.provider !== 'all' && !(order.steps || []).some((s) => s.provider === filter.provider)) return false;
  if (filter.corridor && filter.corridor !== 'all') {
    const corridor = `${order.sourceAssetKey}→${order.destAssetKey}`;
    if (corridor !== filter.corridor) return false;
  }
  const orderDate = order.createdAt.slice(0, 10);
  if (filter.fromDate) {
    if (orderDate < filter.fromDate) return false;
  }
  if (filter.toDate) {
    if (orderDate > filter.toDate) return false;
  }
  if (filter.amountMin) {
    const min = Number(filter.amountMin);
    if (Number.isFinite(min) && (order.sourceAmount ?? 0) < min) return false;
  }
  if (filter.amountMax) {
    const max = Number(filter.amountMax);
    if (Number.isFinite(max) && (order.sourceAmount ?? 0) > max) return false;
  }
  return true;
}

function sortOrders(orders: Order[], sort: OrderFilter['sort']) {
  return [...orders].sort((a, b) => {
    if (sort === 'createdAt_asc') return +new Date(a.createdAt) - +new Date(b.createdAt);
    if (sort === 'amount_asc') return (a.sourceAmount ?? 0) - (b.sourceAmount ?? 0);
    if (sort === 'amount_desc') return (b.sourceAmount ?? 0) - (a.sourceAmount ?? 0);
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });
}

export function applyOrderFilter(orders: Order[], filter: OrderFilter): Order[] {
  return sortOrders(orders.filter((o) => orderMatches(o, filter)), filter.sort);
}

export function toSearchQueryExport(params: Record<string, string | undefined>): string {
  return toSearchQuery(params);
}

// Client-side fetch that uses API endpoint directly
export async function fetchOrdersClient(revalidateSeconds = 10): Promise<Order[]> {
  try {
    // Call a server action or API route to get the session token
    const res = await fetch(`/api/orders`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: revalidateSeconds <= 0 ? 'no-store' : undefined,
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchOrderClient(id: string, revalidateSeconds = 10): Promise<OrderWithProviderStatus | null> {
  try {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: revalidateSeconds <= 0 ? 'no-store' : undefined,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchOrderEventsClient(id: string): Promise<OrderTimeline | null> {
  try {
    const res = await fetch(`/api/orders/${id}/events`, { method: 'GET', cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
