"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhooks_1 = require("../queues/webhooks");
const chainrails_service_1 = require("../services/chainrails.service");
const paycrest_service_1 = require("../services/paycrest.service");
const router = (0, express_1.Router)();
// POST /api/v1/webhooks/chainrails
router.post('/chainrails', async (req, res) => {
    const rawBody = req.body.toString();
    const signature = req.headers['x-chainrails-signature'] ?? '';
    const timestamp = req.headers['x-chainrails-timestamp'] ?? '';
    if (!chainrails_service_1.chainRails.verifyWebhookSignature(rawBody, signature, timestamp)) {
        return res.status(401).json({ success: false, error: 'Invalid signature' });
    }
    let payload;
    try {
        payload = JSON.parse(rawBody);
    }
    catch {
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    }
    if (!payload?.type) {
        return res.status(400).json({ success: false, error: 'Missing event type' });
    }
    await webhooks_1.webhookQueue.add('chainrails_event', {
        source: 'chainrails',
        event: payload.type,
        data: payload,
    });
    res.json({ success: true });
});
// POST /api/v1/webhooks/paycrest
router.post('/paycrest', async (req, res) => {
    const rawBody = req.body.toString();
    const signature = req.headers['x-paycrest-signature'] ?? '';
    if (!paycrest_service_1.paycrest.verifyWebhookSignature(rawBody, signature)) {
        return res.status(401).json({ success: false, error: 'Invalid signature' });
    }
    let payload;
    try {
        payload = JSON.parse(rawBody);
    }
    catch {
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    }
    const event = payload?.event ?? payload?.type;
    if (!event) {
        return res.status(400).json({ success: false, error: 'Missing event field' });
    }
    await webhooks_1.webhookQueue.add('paycrest_event', {
        source: 'paycrest',
        event,
        data: payload,
    });
    res.json({ success: true });
});
exports.default = router;
