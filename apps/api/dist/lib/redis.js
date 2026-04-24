"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
exports.redis = new ioredis_1.default({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
});
exports.redis.on('error', (err) => {
    console.error('[redis] connection error:', err.message);
});
