"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const quotes_1 = __importDefault(require("./routes/quotes"));
const orders_1 = __importDefault(require("./routes/orders"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const institutions_1 = __importDefault(require("./routes/institutions"));
const countries_1 = __importDefault(require("./routes/countries"));
const auth_1 = __importDefault(require("./routes/auth"));
const merchant_1 = __importDefault(require("./routes/merchant"));
const links_1 = __importDefault(require("./routes/links"));
const verification_1 = __importDefault(require("./routes/verification"));
const admin_1 = __importDefault(require("./routes/admin"));
const merchant_2 = require("./lib/merchant");
const prisma_1 = require("./lib/prisma");
// Start BullMQ workers (webhook-driven + NEAR Intents poller + outgoing dispatch)
require("./queues/webhooks");
require("./queues/nearintents_poller");
require("./queues/outgoing_webhooks");
const app = (0, express_1.default)();
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
app.use((0, cors_1.default)({ origin: allowedOrigins.length ? allowedOrigins : true }));
// Apply broad rate limiting to all API requests
const rate_limit_1 = require("./middleware/rate-limit");
app.use('/api', rate_limit_1.apiLimiter);
// Raw body needed for webhook signature verification
app.use('/api/v1/webhooks', express_1.default.raw({ type: 'application/json' }));
app.use(express_1.default.json());
app.use('/api/v1/quotes', quotes_1.default);
app.use('/api/v1/orders', orders_1.default);
app.use('/api/v1/webhooks', webhooks_1.default);
app.use('/api/v1/institutions', institutions_1.default);
app.use('/api/v1/ramp/countries', countries_1.default);
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/merchant', merchant_1.default);
app.use('/api/v1/links', links_1.default);
app.use('/api/v1/verification', verification_1.default);
app.use('/api/v1/admin', admin_1.default);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Weave API v1' }));
// ── Global error handler ─────────────────────────────────────────────────────
// Catches any unhandled errors thrown inside route handlers / middleware.
// Without this, Express would silently hang the request.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    console.error('[unhandled error]', err?.message ?? err);
    if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// ── Startup ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, async () => {
    console.log(`Weave API listening on :${PORT}`);
    try {
        await (0, merchant_2.ensureMerchantDefaultInstruments)();
    }
    catch (err) {
        console.warn('[bootstrap] ensureMerchantDefaultInstruments failed:', err.message);
    }
});
// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
    console.log(`[shutdown] received ${signal}; closing…`);
    server.close(async () => {
        try {
            await prisma_1.prisma.$disconnect();
        }
        catch { }
        process.exit(0);
    });
    // Force exit if graceful close takes too long
    setTimeout(() => process.exit(1), 10_000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
