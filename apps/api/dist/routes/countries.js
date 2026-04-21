"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/v1/ramp/countries
// Demo scope: NGN-only onramp via Paycrest. Expand when more corridors go live.
router.get('/', auth_1.requireApiKey, async (_req, res) => {
    res.json({
        success: true,
        data: [
            { code: 'NG', name: 'Nigeria', currency: 'NGN', paymentMethods: ['bank_transfer', 'mobile_money'] },
        ],
    });
});
exports.default = router;
