"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_service_1 = require("../services/email.service");
const router = (0, express_1.Router)();
/**
 * POST /api/v1/support/contact
 * Receives a support request from the dashboard.
 */
router.post('/contact', async (req, res) => {
    const { name, email, topic, message } = req.body;
    if (!name || !email || !topic || !message) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    try {
        await (0, email_service_1.sendSupportEmail)({ name, email, topic, message });
        res.json({ success: true, message: 'Support message sent' });
    }
    catch (err) {
        console.error('[support-route] error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});
exports.default = router;
