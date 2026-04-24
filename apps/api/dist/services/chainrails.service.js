"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chainRails = exports.ChainRailsService = exports.TOKENS = exports.CHAIN_ENUM = void 0;
exports.resolveChain = resolveChain;
exports.resolveToken = resolveToken;
exports.toSmallestUnit = toSmallestUnit;
const crypto_1 = __importDefault(require("crypto"));
// ── Chain + token registry (demo scope) ──────────────────────────────────────
exports.CHAIN_ENUM = {
    BASE: 'BASE_MAINNET',
    ETHEREUM: 'ETHEREUM_MAINNET',
    OPTIMISM: 'OPTIMISM_MAINNET',
    ARBITRUM: 'ARBITRUM_MAINNET',
    POLYGON: 'POLYGON_MAINNET',
    BSC: 'BSC_MAINNET',
    AVALANCHE: 'AVALANCHE_MAINNET',
    LISK: 'LISK_MAINNET',
};
exports.TOKENS = {
    BASE_MAINNET: {
        USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
        USDT: { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 },
        ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
    },
    ETHEREUM_MAINNET: {
        USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
        ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
    },
    OPTIMISM_MAINNET: {
        USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
        USDT: { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 },
        ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
    },
    ARBITRUM_MAINNET: {
        USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
        USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
        ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
    },
    POLYGON_MAINNET: {
        USDC: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
        USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
    },
};
function resolveChain(symbol) {
    const e = exports.CHAIN_ENUM[symbol.toUpperCase()];
    if (!e)
        throw new Error(`Unsupported chain: ${symbol}`);
    return e;
}
function resolveToken(chainEnum, symbol) {
    const t = exports.TOKENS[chainEnum]?.[symbol.toUpperCase()];
    if (!t)
        throw new Error(`Unsupported token ${symbol} on ${chainEnum}`);
    return t;
}
/** Human amount → smallest-unit integer string (e.g., 100 USDC @ 6 dec → "100000000"). */
function toSmallestUnit(amount, decimals) {
    const [whole, frac = ''] = String(amount).split('.');
    const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
    const combined = (whole + fracPadded).replace(/^0+/, '');
    return combined || '0';
}
// ── Service ──────────────────────────────────────────────────────────────────
class ChainRailsService {
    baseUrl;
    apiKey;
    webhookSecret;
    constructor() {
        this.baseUrl = (process.env.CHAINRAILS_API_URL || 'https://api.chainrails.io/api/v1').replace(/\/$/, '');
        this.apiKey = process.env.CHAINRAILS_API_KEY || '';
        this.webhookSecret = process.env.CHAINRAILS_WEBHOOK_SECRET || '';
    }
    async request(method, path, body) {
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        if (!res.ok)
            throw new Error(`ChainRails ${res.status}: ${text}`);
        return JSON.parse(text);
    }
    /** GET /quotes/best — best quote across all bridges. */
    async getBestQuote(params) {
        const srcChain = resolveChain(params.sourceChain);
        const dstChain = resolveChain(params.destinationChain);
        const srcTok = resolveToken(srcChain, params.sourceToken);
        const dstTok = resolveToken(dstChain, params.destinationToken);
        const scaled = toSmallestUnit(params.amount, srcTok.decimals);
        const qs = new URLSearchParams({
            tokenIn: srcTok.address,
            tokenOut: dstTok.address,
            sourceChain: srcChain,
            destinationChain: dstChain,
            amount: scaled,
            amountSymbol: params.sourceToken.toUpperCase(),
            ...(params.recipient ? { recipient: params.recipient } : {}),
        }).toString();
        return this.request('GET', `/quotes/best?${qs}`);
    }
    /** POST /intents — create a new bridge intent. */
    async createIntent(params) {
        const srcChain = resolveChain(params.sourceChain);
        const dstChain = resolveChain(params.destinationChain);
        const srcTok = resolveToken(srcChain, params.sourceToken);
        const scaled = toSmallestUnit(params.amount, srcTok.decimals);
        return this.request('POST', '/intents', {
            amount: scaled,
            amountSymbol: params.sourceToken.toUpperCase(),
            tokenIn: srcTok.address,
            source_chain: srcChain,
            destination_chain: dstChain,
            recipient: params.recipient,
            ...(params.sender ? { sender: params.sender } : {}),
            ...(params.refundAddress ? { refund_address: params.refundAddress } : {}),
            ...(params.metadata ? { metadata: params.metadata } : {}),
        });
    }
    async getIntent(id) {
        return this.request('GET', `/intents/${id}`);
    }
    /**
     * ChainRails webhook signature: HMAC-SHA256(secret, `${timestamp}.${rawBody}`).
     * Also enforces the 5-minute timestamp window per docs.
     */
    verifyWebhookSignature(rawBody, signature, timestamp) {
        if (!this.webhookSecret) {
            console.error('[security] CHAINRAILS_WEBHOOK_SECRET not set. Rejecting all webhooks.');
            return false;
        }
        if (!signature || !timestamp)
            return false;
        const ts = Number(timestamp);
        if (!Number.isFinite(ts))
            return false;
        if (Math.abs(Date.now() - ts * 1000) > 5 * 60 * 1000)
            return false;
        const expected = crypto_1.default
            .createHmac('sha256', this.webhookSecret)
            .update(`${timestamp}.${rawBody}`)
            .digest('hex');
        const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
        try {
            return crypto_1.default.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
        }
        catch {
            return false;
        }
    }
}
exports.ChainRailsService = ChainRailsService;
exports.chainRails = new ChainRailsService();
