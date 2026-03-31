import * as net from 'net';
import * as fs from 'fs';
import { PaymentEvent, BridgeResponse } from './types';
import { Minter } from './minter';

export class SocketServer {
  private server: net.Server;
  private minter: Minter;
  private socketPath: string;

  constructor(minter: Minter, socketPath: string) {
    this.minter = minter;
    this.socketPath = socketPath;
    this.server = net.createServer((socket) => this.handleConnection(socket));
  }

  private handleConnection(socket: net.Socket): void {
    let buffer = '';

    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        this.processLine(trimmed, socket);
      }
    });

    socket.on('error', () => {
      // ignore socket errors (client disconnected)
    });
  }

  private processLine(line: string, socket: net.Socket): void {
    let event: PaymentEvent;

    try {
      event = JSON.parse(line) as PaymentEvent;
    } catch {
      const nack: BridgeResponse = {
        status: 'NACK',
        reference_code: '',
        reason: 'Invalid JSON',
      };
      socket.write(JSON.stringify(nack) + '\n');
      return;
    }

    this.minter.mint(event).then((outcome) => {
      let response: BridgeResponse;
      if (outcome.success) {
        response = { status: 'ACK', reference_code: event.reference_code };
      } else {
        response = {
          status: 'NACK',
          reference_code: event.reference_code,
          reason: outcome.reason,
        };
      }
      socket.write(JSON.stringify(response) + '\n');
    }).catch((err: unknown) => {
      const reason = err instanceof Error ? err.message : String(err);
      const nack: BridgeResponse = {
        status: 'NACK',
        reference_code: event.reference_code,
        reason,
      };
      socket.write(JSON.stringify(nack) + '\n');
    });
  }

  listen(): void {
    if (fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }

    this.server.listen(this.socketPath, () => {
      console.log(`[bridge] Listening on ${this.socketPath}`);
    });
  }

  close(): Promise<void> {
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
