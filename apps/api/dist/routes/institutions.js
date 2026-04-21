"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paycrest_service_1 = require("../services/paycrest.service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/v1/institutions — banks + mobile money for a fiat currency
router.get('/', auth_1.requireApiKey, async (req, res) => {
    try {
        const currency = req.query.currency;
        if (!currency) {
            return res.status(400).json({ success: false, error: 'currency query param required' });
        }
        const institutions = await paycrest_service_1.paycrest.getInstitutions(currency.toUpperCase());
        res.json({ success: true, data: institutions });
    }
    catch (err) {
        console.error('institutions error:', err.message);
        res.status(502).json({ success: false, error: err.message });
    }
});
exports.default = router;
