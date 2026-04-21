"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApiKey = requireApiKey;
const prisma_1 = require("../lib/prisma");
async function requireApiKey(req, res, next) {
    const key = req.headers['x-api-key'];
    if (!key) {
        return res.status(401).json({ success: false, error: 'Missing x-api-key header' });
    }
    const client = await prisma_1.prisma.client.findUnique({ where: { apiKey: key } });
    if (!client) {
        return res.status(401).json({ success: false, error: 'Invalid API key' });
    }
    req.clientId = client.id;
    next();
}
