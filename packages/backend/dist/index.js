"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const db_1 = __importDefault(require("./db"));
const reconciliation_1 = require("./jobs/reconciliation");
const PORT = process.env.PORT ?? 3001;
const BRIDGE_URL = process.env.BRIDGE_URL ?? 'http://localhost:3002';
const app = (0, app_1.createApp)();
const server = app.listen(PORT, () => {
    console.log(`FIDELIO backend running on port ${PORT}`);
});
// Daily reconciliation job (08:00 UTC = 02:00 CST Honduras)
const reconciliation = new reconciliation_1.ReconciliationJob(db_1.default, BRIDGE_URL);
reconciliation.schedule();
// Graceful shutdown
process.on('SIGINT', async () => {
    server.close();
    await db_1.default.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    server.close();
    await db_1.default.$disconnect();
    process.exit(0);
});
