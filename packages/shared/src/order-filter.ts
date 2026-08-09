// Shared order-filtering and sorting logic.
import { directionOf as getDirection } from './assets';

export type OrderFilter = {
  q?:         string;
  status?:    string;
  direction?: string;
  provider?:  string;
  corridor?:  string;
  fromDate?:  string;
  toDate?:    string;
  amountMin?: string;
  amountMax?: string;
  sort?:      'createdAt_desc' | 'createdAt_asc' | 'amount_desc' | 'amount_asc';
};

export type OrderWithProviderStatus<Order> = Order & {
  paycrestStatus?:  string | null;
  nearStatus?:      string | null;
  bachsSplitStatus?: string | null;
  bachsPayoutStatus?: string | null;
  bachsPayoutAt?:   string | null;
};

// Returns a URLSearchParams query string from a filter object, omitting empty values.
export function toSearchQuery(params: Record<string, string | undefined>): string {
  return new URLSearchParams(
    Object.entries(params).filter(([, v]) => typeof v === 'string' && v.length > 0) as Array<[string, string]>,
  ).toString();
}

// Direction helper removed — now using assets.ts version via getDirection.

export function orderMatches<Order extends {
  id: string;
  sourceAssetKey: string;
  destAssetKey:   string;
  status:         string;
  sourceAmount?:  number | null;
  createdAt:      string;
  steps?:         Array<{ provider: string }> | null;
}>(order: Order, filter: OrderFilter): boolean {
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

  if (filter.status    && filter.status    !== 'all' && order.status                !== filter.status)    return false;
  if (filter.direction && filter.direction !== 'all' && getDirection(order.sourceAssetKey, order.destAssetKey) !== filter.direction) return false;
  if (filter.provider  && filter.provider  !== 'all' && !(order.steps || []).some((s) => s.provider === filter.provider)) return false;

  if (filter.corridor && filter.corridor !== 'all') {
    if (`${order.sourceAssetKey}→${order.destAssetKey}` !== filter.corridor) return false;
  }

  const orderDate = order.createdAt.slice(0, 10);
  if (filter.fromDate && orderDate < filter.fromDate) return false;
  if (filter.toDate   && orderDate > filter.toDate)   return false;

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

export function sortOrders<Order extends { createdAt: string; sourceAmount?: number | null }>(
  orders: Order[],
  sort:   OrderFilter['sort'],
): Order[] {
  return [...orders].sort((a, b) => {
    if (sort === 'createdAt_asc') return +new Date(a.createdAt) - +new Date(b.createdAt);
    if (sort === 'amount_asc')    return (a.sourceAmount ?? 0)  - (b.sourceAmount ?? 0);
    if (sort === 'amount_desc')   return (b.sourceAmount ?? 0)  - (a.sourceAmount ?? 0);
    return +new Date(b.createdAt) - +new Date(a.createdAt); // default: newest first
  });
}

export function applyOrderFilter<Order extends {
  id: string;
  sourceAssetKey: string;
  destAssetKey:   string;
  status:         string;
  sourceAmount?:  number | null;
  createdAt:      string;
  steps?:         Array<{ provider: string }> | null;
}>(orders: Order[], filter: OrderFilter): Order[] {
  return sortOrders(orders.filter((o) => orderMatches(o, filter)), filter.sort);
}
