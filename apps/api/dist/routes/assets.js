"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assets_1 = require("../lib/assets");
const router = (0, express_1.Router)();
// GET /api/v1/assets — returns all supported fiat and crypto assets
router.get('/', (req, res) => {
    res.json({
        success: true,
        data: {
            fiat: assets_1.SUPPORTED_FIAT,
            crypto: assets_1.SUPPORTED_CRYPTO,
        }
    });
});
exports.default = router;
