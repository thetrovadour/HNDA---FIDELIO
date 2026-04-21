"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const minter_1 = require("./minter");
const socket_server_1 = require("./socket_server");
const http_server_1 = require("./http_server");
const SOCKET_PATH = process.env.SOCKET_PATH ?? '/tmp/merlink.sock';
const minter = minter_1.Minter.createFromEnv();
if (!minter) {
    console.warn('[bridge] WARNING: BASE_SEPOLIA_RPC_URL, PRIVATE_KEY, or CONTRACT_ADDRESS not set. ' +
        'Mint calls will fail. Set these in .env for production use.');
}
// createFromEnv returns null only when env vars are missing; we need a Minter instance.
// In dev without env vars we still start the server so the socket protocol can be tested.
// A Minter with a placeholder contract that always rejects is used in that case.
class NoopContractLike {
    async mint(_to, _amount) {
        throw new Error('No contract configured — set env vars');
    }
    async burn(_from, _amount) {
        throw new Error('No contract configured — set env vars');
    }
}
const effectiveMinter = minter ?? new minter_1.Minter(new NoopContractLike());
const HTTP_PORT = parseInt(process.env.BRIDGE_HTTP_PORT ?? '3002', 10);
const server = new socket_server_1.SocketServer(effectiveMinter, SOCKET_PATH);
const httpServer = new http_server_1.HttpServer(effectiveMinter, HTTP_PORT);
server.listen();
httpServer.listen();
function shutdown() {
    console.log('[bridge] Shutting down...');
    Promise.all([server.close(), httpServer.close()]).then(() => {
        process.exit(0);
    });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
