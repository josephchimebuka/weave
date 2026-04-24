"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../lib/prisma");
/**
 * Service for dispatching cryptographically signed webhooks to merchant servers.
 */
class WebhookService {
    /**
     * Signs a payload using the merchant's webhook secret.
     * Signature is sent in the 'x-weave-signature' header.
     */
    sign(payload, secret) {
        return crypto_1.default.createHmac('sha256', secret).update(payload).digest('hex');
    }
    /**
     * Dispatches an event to a merchant.
     * In production, this should be called through a BullMQ worker to handle retries.
     */
    async dispatch(merchantId, event) {
        const merchant = await prisma_1.prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { webhookUrl: true, webhookSecret: true },
        });
        if (!merchant?.webhookUrl || !merchant?.webhookSecret) {
            return; // Merchant hasn't configured webhooks
        }
        const payload = JSON.stringify(event);
        const signature = this.sign(payload, merchant.webhookSecret);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            const res = await fetch(merchant.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Weave-Signature': signature,
                    'X-Weave-Event': event.type,
                    'User-Agent': 'Weave-Webhook-Dispatcher/1.0',
                },
                body: payload,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
                throw new Error(`Merchant webhook responded with ${res.status}`);
            }
            console.log(`[webhook] dispatched ${event.type} to merchant ${merchantId}`);
        }
        catch (err) {
            console.error(`[webhook] failed to dispatch to merchant ${merchantId}:`, err.message);
            // Re-throw so the BullMQ worker knows to retry
            throw err;
        }
    }
    /**
     * Enqueues an event for background dispatch.
     */
    async enqueue(merchantId, orderId, event) {
        const { outgoingWebhookQueue } = await Promise.resolve().then(() => __importStar(require('../queues/outgoing_webhooks')));
        await outgoingWebhookQueue.add(`${event.type}:${orderId}`, {
            merchantId,
            orderId,
            event
        });
    }
    /**
     * Convenience method to trigger a payment.succeeded event.
     */
    async triggerPaymentSucceeded(orderId) {
        const order = await prisma_1.prisma.order.findUnique({
            where: { id: orderId },
            include: { merchant: true },
        });
        if (!order)
            return;
        const event = {
            id: crypto_1.default.randomUUID(),
            type: 'payment.succeeded',
            timestamp: new Date().toISOString(),
            data: {
                id: order.id,
                reference: order.reference,
                status: order.status,
                sourceAsset: order.sourceAssetKey,
                sourceAmount: order.sourceAmount,
                destAsset: order.destAssetKey,
                destAmount: order.destAmount,
                completedAt: order.updatedAt,
            }
        };
        return this.enqueue(order.merchantId, order.id, event);
    }
}
exports.webhookService = new WebhookService();
