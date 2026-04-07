"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bridgeAuth = bridgeAuth;
exports.adminAuth = adminAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
function bridgeAuth(req, res, next) {
    const secret = process.env.BRIDGE_SECRET;
    const provided = req.headers['x-bridge-secret'];
    if (!secret || typeof provided !== 'string') {
        res.status(401).json({ error: 'Unauthorized', code: 'INVALID_BRIDGE_SECRET' });
        return;
    }
    const secretBuf = Buffer.from(secret);
    const providedBuf = Buffer.alloc(secretBuf.length);
    Buffer.from(provided).copy(providedBuf);
    if (!(0, crypto_1.timingSafeEqual)(secretBuf, providedBuf)) {
        res.status(401).json({ error: 'Unauthorized', code: 'INVALID_BRIDGE_SECRET' });
        return;
    }
    next();
}
function adminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized', code: 'MISSING_TOKEN' });
        return;
    }
    const token = authHeader.slice(7);
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        res.status(401).json({ error: 'Unauthorized', code: 'JWT_NOT_CONFIGURED' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret, { algorithms: ['HS256'] });
        req.admin = decoded;
        next();
    }
    catch {
        res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
    }
}
