"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSearchQuery = toSearchQuery;
exports.orderMatches = orderMatches;
exports.sortOrders = sortOrders;
exports.applyOrderFilter = applyOrderFilter;
// Shared order-filtering and sorting logic.
const assets_1 = require("./assets");
// Returns a URLSearchParams query string from a filter object, omitting empty values.
function toSearchQuery(params) {
    return new URLSearchParams(Object.entries(params).filter(([, v]) => typeof v === 'string' && v.length > 0)).toString();
}
// Direction helper removed — now using assets.ts version via getDirection.
function orderMatches(order, filter) {
    const q = (filter.q || '').trim().toLowerCase();
    if (q) {
        const hay = [
            order.id,
            order.sourceAssetKey,
            order.destAssetKey,
            order.status,
            ...(order.steps || []).map((s) => s.provider),
        ].join(' ').toLowerCase();
        if (!hay.includes(q))
            return false;
    }
    if (filter.status && filter.status !== 'all' && order.status !== filter.status)
        return false;
    if (filter.direction && filter.direction !== 'all' && (0, assets_1.directionOf)(order.sourceAssetKey, order.destAssetKey) !== filter.direction)
        return false;
    if (filter.provider && filter.provider !== 'all' && !(order.steps || []).some((s) => s.provider === filter.provider))
        return false;
    if (filter.corridor && filter.corridor !== 'all') {
        if (`${order.sourceAssetKey}→${order.destAssetKey}` !== filter.corridor)
            return false;
    }
    const orderDate = order.createdAt.slice(0, 10);
    if (filter.fromDate && orderDate < filter.fromDate)
        return false;
    if (filter.toDate && orderDate > filter.toDate)
        return false;
    if (filter.amountMin) {
        const min = Number(filter.amountMin);
        if (Number.isFinite(min) && (order.sourceAmount ?? 0) < min)
            return false;
    }
    if (filter.amountMax) {
        const max = Number(filter.amountMax);
        if (Number.isFinite(max) && (order.sourceAmount ?? 0) > max)
            return false;
    }
    return true;
}
function sortOrders(orders, sort) {
    return [...orders].sort((a, b) => {
        if (sort === 'createdAt_asc')
            return +new Date(a.createdAt) - +new Date(b.createdAt);
        if (sort === 'amount_asc')
            return (a.sourceAmount ?? 0) - (b.sourceAmount ?? 0);
        if (sort === 'amount_desc')
            return (b.sourceAmount ?? 0) - (a.sourceAmount ?? 0);
        return +new Date(b.createdAt) - +new Date(a.createdAt); // default: newest first
    });
}
function applyOrderFilter(orders, filter) {
    return sortOrders(orders.filter((o) => orderMatches(o, filter)), filter.sort);
}
