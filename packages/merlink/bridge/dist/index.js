"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
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
