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
export type OrderWithProviderStatus<Order> = Order & {
    paycrestStatus?: string | null;
    nearStatus?: string | null;
};
export declare function toSearchQuery(params: Record<string, string | undefined>): string;
export declare function orderMatches<Order extends {
    id: string;
    sourceAssetKey: string;
    destAssetKey: string;
    status: string;
    sourceAmount?: number | null;
    createdAt: string;
    steps?: Array<{
        provider: string;
    }> | null;
}>(order: Order, filter: OrderFilter): boolean;
export declare function sortOrders<Order extends {
    createdAt: string;
    sourceAmount?: number | null;
}>(orders: Order[], sort: OrderFilter['sort']): Order[];
export declare function applyOrderFilter<Order extends {
    id: string;
    sourceAssetKey: string;
    destAssetKey: string;
    status: string;
    sourceAmount?: number | null;
    createdAt: string;
    steps?: Array<{
        provider: string;
    }> | null;
}>(orders: Order[], filter: OrderFilter): Order[];
