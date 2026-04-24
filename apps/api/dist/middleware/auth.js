"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApiKey = requireApiKey;
exports.requireKeyPair = requireKeyPair;
exports.requireSession = requireSession;
exports.requireAuth = requireAuth;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../lib/prisma");
// ── API Key (publishable key) ────────────────────────────────────────────────
// Used by the browser widget. Looks up Merchant.publishableKey.
// Safe to expose in frontend JS — scoped to creating/reading own orders.
async function requireApiKey(req, res, next) {
    const key = req.headers['x-api-key']?.trim();
    if (!key) {
        return res.status(401).json({ success: false, error: 'Missing x-api-key header' });
    }
    try {
        const merchant = await prisma_1.prisma.merchant.findUnique({ where: { publishableKey: key } });
        if (!merchant) {
            return res.status(401).json({ success: false, error: 'Invalid API key' });
        }
        req.merchantId = merchant.id;
        return next();
    }
    catch (err) {
        return res.status(500).json({ success: false, error: 'Auth service error' });
    }
}
// ── KeyPair (secret key) ─────────────────────────────────────────────────────
// Used by server-to-server integrations: merchant's own backend → Weave API.
// x-public-key: pk_live_...  (identifies the key pair)
// x-secret-key: sk_live_...  (never stored plaintext; compared via hash)
async function requireKeyPair(req, res, next) {
    const publicKey = req.headers['x-public-key']?.trim();
    const secretKey = req.headers['x-secret-key']?.trim();
    if (!publicKey || !secretKey) {
        return res.status(401).json({
            success: false,
            error: 'Missing x-public-key and/or x-secret-key headers',
        });
    }
    try {
        const keyPair = await prisma_1.prisma.keyPair.findFirst({
            where: { publicKey, isActive: true },
        });
        if (!keyPair) {
            return res.status(401).json({ success: false, error: 'Invalid public key' });
        }
        const hashedSecretKey = crypto_1.default.createHash('sha256').update(secretKey).digest('hex');
        if (!crypto_1.default.timingSafeEqual(Buffer.from(keyPair.hashedSecretKey, 'hex'), Buffer.from(hashedSecretKey, 'hex'))) {
            return res.status(401).json({ success: false, error: 'Invalid secret key' });
        }
        req.merchantId = keyPair.merchantId;
        return next();
    }
    catch (err) {
        return res.status(500).json({ success: false, error: 'Auth service error' });
    }
}
// ── Session (dashboard) ──────────────────────────────────────────────────────
// Used by the dashboard UI. Session token issued at login.
async function requireSession(req, res, next) {
    const token = req.headers['x-session-token']?.trim();
    if (!token) {
        return res.status(401).json({ success: false, error: 'Missing x-session-token header' });
    }
    try {
        const session = await prisma_1.prisma.session.findUnique({
            where: { token },
            include: { merchant: true },
        });
        if (!session || session.expiresAt.getTime() <= Date.now()) {
            return res.status(401).json({ success: false, error: 'Invalid or expired session' });
        }
        req.merchantId = session.merchantId;
        return next();
    }
    catch (err) {
        return res.status(500).json({ success: false, error: 'Auth service error' });
    }
}
// ── Combined auth ────────────────────────────────────────────────────────────
// Tries: publishable API key → server keypair → session token.
async function requireAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    const sessionToken = req.headers['x-session-token'];
    const publicKey = req.headers['x-public-key'];
    const secretKey = req.headers['x-secret-key'];
    if (apiKey)
        return requireApiKey(req, res, next);
    if (publicKey && secretKey)
        return requireKeyPair(req, res, next);
    if (sessionToken)
        return requireSession(req, res, next);
    return res.status(401).json({
        success: false,
        error: 'Authentication required (x-api-key, x-public-key/x-secret-key, or x-session-token)',
    });
}
