import * as dotenv from 'dotenv';
dotenv.config();

import { Minter } from './minter';
import { SocketServer } from './socket_server';

const SOCKET_PATH = process.env.SOCKET_PATH ?? '/tmp/merlink.sock';

const minter = Minter.createFromEnv();

if (!minter) {
  console.warn(
    '[bridge] WARNING: BASE_SEPOLIA_RPC_URL, PRIVATE_KEY, or CONTRACT_ADDRESS not set. ' +
    'Mint calls will fail. Set these in .env for production use.'
  );
}

// createFromEnv returns null only when env vars are missing; we need a Minter instance.
// In dev without env vars we still start the server so the socket protocol can be tested.
// A Minter with a placeholder contract that always rejects is used in that case.
class NoopContractLike {
  async mint(_to: string, _amount: bigint): Promise<{ wait(): Promise<unknown> }> {
    throw new Error('No contract configured — set env vars');
  }
}

const effectiveMinter = minter ?? new Minter(new NoopContractLike());
const server = new SocketServer(effectiveMinter, SOCKET_PATH);

server.listen();

function shutdown(): void {
  console.log('[bridge] Shutting down...');
  server.close().then(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
