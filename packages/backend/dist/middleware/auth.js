"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bridgeAuth = bridgeAuth;
exports.adminAuth = adminAuth;
exports.userAuth = userAuth;
exports.selfOrAdmin = selfOrAdmin;
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
function userAuth(req, res, next) {
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
        if (!decoded.id || decoded.role !== 'user') {
            res.status(403).json({ error: 'Forbidden', code: 'NOT_A_USER_TOKEN' });
            return;
        }
        req.user = { id: decoded.id, role: 'user' };
        next();
    }
    catch {
        res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
    }
}
function selfOrAdmin(req, res, next) {
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
        if (decoded.role === 'admin') {
            req.admin = decoded;
            next();
            return;
        }
        if (decoded.role === 'user' && decoded.id === req.params.id) {
            req.user = { id: decoded.id, role: 'user' };
            next();
            return;
        }
        res.status(403).json({ error: 'Forbidden', code: 'ACCESS_DENIED' });
    }
    catch {
        res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
    }
}
