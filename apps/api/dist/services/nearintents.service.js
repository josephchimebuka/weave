"use strict";
// NEAR Intents 1Click API client. Cross-chain swap protocol we use for the
// "send from another wallet" checkout flow, where the widget shows a deposit
// address (+ optional memo) and any third party can pay it. NEAR aggregates
// liquidity across ~30 chains and delivers the destination asset on the chain
// we ask for. We aim every route at crypto:BASE:USDC so Paycrest handles the
// fiat last mile.
//
// Unlike ChainRails there are no webhooks — state is pull-only via GET /status.
// The poller in queues/nearintents_poller.ts drives step transitions.
Object.defineProperty(exports, "__esModule", { value: true });
exports.nearIntents = exports.NearIntentsService = void 0;
exports.chainToNear = chainToNear;
exports.toSmallestUnit = toSmallestUnit;
exports.classifyNearStatus = classifyNearStatus;
const assets_1 = require("../lib/assets");
// ── Chain mapping ───────────────────────────────────────────────────────────
// Our canonical chain name (uppercase) → NEAR Intents `blockchain` enum.
// Source: GET /v0/tokens response + OpenAPI blockchain enum.
const CHAIN_TO_NEAR = {
    NEAR: 'near',
    ETHEREUM: 'eth',
    BASE: 'base',
    ARBITRUM: 'arb',
    OPTIMISM: 'op',
    POLYGON: 'pol',
    BSC: 'bsc',
    AVALANCHE: 'avax',
    SOLANA: 'sol',
    BITCOIN: 'btc',
    TON: 'ton',
    XRP: 'xrp',
    STELLAR: 'stellar',
    STARKNET: 'starknet',
    SUI: 'sui',
    APTOS: 'aptos',
    DOGE: 'doge',
    LITECOIN: 'ltc',
    CARDANO: 'cardano',
    TRON: 'tron',
    BERA: 'bera',
    GNOSIS: 'gnosis',
    MONAD: 'monad',
    SCROLL: 'scroll',
    XLAYER: 'xlayer',
    ZEC: 'zec',
    BCH: 'bch',
    DASH: 'dash',
};
function chainToNear(chain) {
    const k = chain.toUpperCase();
    const v = CHAIN_TO_NEAR[k];
    if (!v)
        throw new Error(`NEAR Intents does not support chain ${chain}`);
    return v;
}
// ── Helpers ─────────────────────────────────────────────────────────────────
/** Human amount → smallest-unit integer string. */
function toSmallestUnit(amount, decimals) {
    const [whole, frac = ''] = String(amount).split('.');
    const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
    const combined = (whole + fracPadded).replace(/^0+/, '');
    return combined || '0';
}
// ── Service ─────────────────────────────────────────────────────────────────
class NearIntentsService {
    baseUrl;
    jwt;
    tokenCache = null;
    cacheAt = 0;
    CACHE_TTL_MS = 10 * 60 * 1000;
    constructor() {
        this.baseUrl = (process.env.NEAR_INTENTS_API_URL || 'https://1click.chaindefuser.com/v0').replace(/\/$/, '');
        this.jwt = process.env.NEAR_INTENTS_JWT || '';
    }
    async request(method, path, body, auth = true) {
        const headers = { 'Content-Type': 'application/json' };
        if (auth && this.jwt)
            headers['Authorization'] = `Bearer ${this.jwt}`;
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        if (!res.ok)
            throw new Error(`NEAR Intents ${res.status}: ${text}`);
        return JSON.parse(text);
    }
    /** GET /v0/tokens — cached for 10 min. */
    async listTokens() {
        if (this.tokenCache && Date.now() - this.cacheAt < this.CACHE_TTL_MS)
            return this.tokenCache;
        const tokens = await this.request('GET', '/tokens', undefined, false);
        this.tokenCache = tokens;
        this.cacheAt = Date.now();
        return tokens;
    }
    /**
     * Resolve a canonical asset key (`crypto:BASE:USDC`) to the full NEAR token
     * row from /tokens. Includes `price` (USD) which we rely on to convert a
     * USD-equivalent quote into a source-asset-denominated deposit amount.
     */
    async resolveToken(key) {
        const a = (0, assets_1.parseAsset)(key);
        if (a.kind !== 'crypto')
            throw new Error(`NEAR Intents: fiat asset ${key} not supported`);
        const blockchain = chainToNear(a.chain);
        const symbol = a.token.toUpperCase();
        const tokens = await this.listTokens();
        const hit = tokens.find(t => t.blockchain === blockchain && t.symbol.toUpperCase() === symbol);
        if (!hit)
            throw new Error(`NEAR Intents: no token for ${blockchain}/${symbol}`);
        return hit;
    }
    async resolveAssetId(key) {
        const t = await this.resolveToken(key);
        return { assetId: t.assetId, decimals: t.decimals };
    }
    /** POST /v0/quote */
    async createQuote(params) {
        const src = await this.resolveAssetId(params.sourceAssetKey);
        const dst = await this.resolveAssetId(params.destAssetKey);
        const amountRaw = toSmallestUnit(params.amount, src.decimals);
        const deadline = new Date(Date.now() + (params.deadlineSecs ?? 30 * 60) * 1000).toISOString();
        const body = {
            dry: params.dry ?? false,
            swapType: 'EXACT_INPUT',
            slippageTolerance: params.slippageBps ?? 100,
            originAsset: src.assetId,
            destinationAsset: dst.assetId,
            amount: amountRaw,
            depositType: 'ORIGIN_CHAIN',
            refundType: 'ORIGIN_CHAIN',
            refundTo: params.refundTo,
            recipient: params.recipient,
            recipientType: 'DESTINATION_CHAIN',
            deadline,
            ...(params.referral ? { referral: params.referral } : {}),
        };
        return this.request('POST', '/quote', body);
    }
    /** GET /v0/status */
    async getStatus(depositAddress, depositMemo) {
        const qs = new URLSearchParams({ depositAddress });
        if (depositMemo)
            qs.set('depositMemo', depositMemo);
        return this.request('GET', `/status?${qs.toString()}`);
    }
    /** POST /v0/deposit/submit — optional nudge to speed detection. */
    async submitDepositTx(params) {
        return this.request('POST', '/deposit/submit', params);
    }
    /** Does NEAR Intents support this asset (chain + token)? */
    async supports(assetKey) {
        try {
            await this.resolveAssetId(assetKey);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Synchronous sanity check — does the chain appear in our mapping at all?
     * Useful for router edges that must decide without hitting the network.
     */
    chainIsKnown(chain) {
        return CHAIN_TO_NEAR[chain.toUpperCase()] != null;
    }
}
exports.NearIntentsService = NearIntentsService;
exports.nearIntents = new NearIntentsService();
function classifyNearStatus(status) {
    switch (status) {
        case 'SUCCESS': return 'done';
        case 'FAILED':
        case 'REFUNDED': return 'failed';
        case 'KNOWN_DEPOSIT_TX':
        case 'PENDING_DEPOSIT':
        case 'INCOMPLETE_DEPOSIT':
        case 'PROCESSING': return 'progress';
    }
}
