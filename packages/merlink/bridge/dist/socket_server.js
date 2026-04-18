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
exports.SocketServer = void 0;
const net = __importStar(require("net"));
const fs = __importStar(require("fs"));
class SocketServer {
    constructor(minter, socketPath) {
        this.minter = minter;
        this.socketPath = socketPath;
        this.server = net.createServer((socket) => this.handleConnection(socket));
    }
    handleConnection(socket) {
        let buffer = '';
        socket.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                this.processLine(trimmed, socket);
            }
        });
        socket.on('error', () => {
            // ignore socket errors (client disconnected)
        });
    }
    processLine(line, socket) {
        let event;
        try {
            event = JSON.parse(line);
        }
        catch {
            const nack = {
                status: 'NACK',
                reference_code: '',
                reason: 'Invalid JSON',
            };
            socket.write(JSON.stringify(nack) + '\n');
            return;
        }
        this.minter.mint(event).then((outcome) => {
            let response;
            if (outcome.success) {
                response = { status: 'ACK', reference_code: event.reference_code };
            }
            else {
                response = {
                    status: 'NACK',
                    reference_code: event.reference_code,
                    reason: outcome.reason,
                };
            }
            socket.write(JSON.stringify(response) + '\n');
        }).catch((err) => {
            const reason = err instanceof Error ? err.message : String(err);
            const nack = {
                status: 'NACK',
                reference_code: event.reference_code,
                reason,
            };
            socket.write(JSON.stringify(nack) + '\n');
        });
    }
    listen() {
        if (fs.existsSync(this.socketPath)) {
            fs.unlinkSync(this.socketPath);
        }
        this.server.listen(this.socketPath, () => {
            console.log(`[bridge] Listening on ${this.socketPath}`);
        });
    }
    close() {
        return new Promise((resolve) => {
            this.server.close(() => {
                if (fs.existsSync(this.socketPath)) {
                    fs.unlinkSync(this.socketPath);
                }
                resolve();
            });
        });
    }
}
exports.SocketServer = SocketServer;
