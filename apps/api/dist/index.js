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
const merchant_1 = require("./lib/merchant");
// Start BullMQ workers (webhook-driven + NEAR Intents poller)
require("./queues/webhooks");
require("./queues/nearintents_poller");
const app = (0, express_1.default)();
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
app.use((0, cors_1.default)({ origin: allowedOrigins.length ? allowedOrigins : true }));
// Raw body needed for webhook signature verification
app.use('/api/v1/webhooks', express_1.default.raw({ type: 'application/json' }));
app.use(express_1.default.json());
app.use('/api/v1/quotes', quotes_1.default);
app.use('/api/v1/orders', orders_1.default);
app.use('/api/v1/webhooks', webhooks_1.default);
app.use('/api/v1/institutions', institutions_1.default);
app.use('/api/v1/ramp/countries', countries_1.default);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Weave API v1' }));
const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
    console.log(`Weave API listening on :${PORT}`);
    try {
        await (0, merchant_1.ensureMerchantDefaultInstruments)();
    }
    catch (err) {
        console.warn('[bootstrap] ensureMerchantDefaultInstruments failed:', err.message);
    }
});
