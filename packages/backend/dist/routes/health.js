"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = healthRouter;
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
function healthRouter() {
    const router = (0, express_1.Router)();
    router.get('/', async (_req, res) => {
        try {
            await db_1.default.$queryRaw `SELECT 1`;
            res.status(200).json({ status: 'ok', db: 'ok' });
        }
        catch {
            res.status(200).json({ status: 'ok', db: 'error' });
        }
    });
    return router;
}
