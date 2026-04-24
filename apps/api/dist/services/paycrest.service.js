"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paycrest = exports.PaycrestService = void 0;
const crypto_1 = __importDefault(require("crypto"));
// ── Service ──────────────────────────────────────────────────────────────────
class PaycrestService {
    baseUrl;
    apiKey;
    webhookSecret;
    constructor() {
        this.baseUrl = (process.env.PAYCREST_API_URL || 'https://api.paycrest.io/v2').replace(/\/$/, '');
        this.apiKey = process.env.PAYCREST_API_KEY || '';
        this.webhookSecret = process.env.PAYCREST_WEBHOOK_SECRET || '';
    }
    async request(method, path, body, auth = true) {
        const headers = { 'Content-Type': 'application/json' };
        if (auth)
            headers['API-Key'] = this.apiKey;
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        if (!res.ok)
            throw new Error(`Paycrest ${res.status}: ${text}`);
        return JSON.parse(text).data;
    }
    /** GET /v2/rates/{network}/{token}/{amount}/{fiat} — no auth. */
    async getRate(network, token, amount, fiat) {
        return this.request('GET', `/rates/${network}/${token}/${amount}/${fiat}`, undefined, false);
    }
    /** GET /v2/institutions/{currency} — no auth. */
    async getInstitutions(currency) {
        return this.request('GET', `/institutions/${currency.toUpperCase()}`, undefined, false);
    }
    /** POST /v2/sender/orders — offramp (crypto → fiat). */
    async createOfframpOrder(params) {
        return this.request('POST', '/sender/orders', {
            amount: params.amount,
            ...(params.amountIn ? { amountIn: params.amountIn } : {}),
            source: {
                type: 'crypto',
                currency: params.token,
                network: params.network,
                refundAddress: params.refundAddress,
            },
            destination: {
                type: 'fiat',
                currency: params.fiatCurrency,
                recipient: params.recipient,
            },
            reference: params.reference,
        });
    }
    /** POST /v2/sender/orders — onramp (fiat → crypto). */
    async createOnrampOrder(params) {
        return this.request('POST', '/sender/orders', {
            amount: params.amount,
            amountIn: 'fiat',
            source: {
                type: 'fiat',
                currency: params.fiatCurrency,
                refundAccount: params.refundAccount,
            },
            destination: {
                type: 'crypto',
                currency: params.cryptoCurrency,
                recipient: {
                    address: params.cryptoRecipient,
                    network: params.cryptoNetwork,
                },
            },
            reference: params.reference,
        });
    }
    /** GET /v2/sender/orders/{id} */
    async getOrder(orderId) {
        return this.request('GET', `/sender/orders/${orderId}`);
    }
    /** HMAC-SHA256(secret, rawBody). Accepts optional `sha256=` prefix. */
    verifyWebhookSignature(rawBody, signature) {
        if (!this.webhookSecret) {
            console.error('[security] PAYCREST_WEBHOOK_SECRET not set. Rejecting all webhooks.');
            return false;
        }
        if (!signature)
            return false;
        const expected = crypto_1.default.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
        const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
        try {
            return crypto_1.default.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
        }
        catch {
            return false;
        }
    }
}
exports.PaycrestService = PaycrestService;
exports.paycrest = new PaycrestService();
