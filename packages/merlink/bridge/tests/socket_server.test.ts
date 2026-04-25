import * as net from 'net';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SocketServer } from '../src/socket_server';
import { Minter, ContractLike } from '../src/minter';
import { PaymentEvent, BridgeResponse } from '../src/types';

const TEST_SOCKET = path.join(os.tmpdir(), `merlink-test-${process.pid}.sock`);

function makeEvent(overrides: Partial<PaymentEvent> = {}): PaymentEvent {
  return {
    reference_code: 'CATR-0xABCD-1711800000',
    amount_lempiras: 250,
    client_wallet: '0xABCD1234ABCD1234ABCD1234ABCD1234ABCD1234',
    source: 'WEBHOOK',
    received_at: 1711800000,
    ...overrides,
  };
}

function sendAndReceive(line: string): Promise<BridgeResponse> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(TEST_SOCKET, () => {
      client.write(line + '\n');
    });

    let buf = '';
    client.on('data', (chunk) => {
      buf += chunk.toString();
      const idx = buf.indexOf('\n');
      if (idx !== -1) {
        client.destroy();
        try {
          resolve(JSON.parse(buf.slice(0, idx)) as BridgeResponse);
        } catch (e) {
          reject(e);
        }
      }
    });

    client.on('error', reject);
    setTimeout(() => reject(new Error('timeout')), 3000);
  });
}

describe('SocketServer', () => {
  let server: SocketServer;
  let minter: Minter;

  beforeAll((done) => {
    // Create a Minter with a stub contract; we'll spy on minter.mint directly
    const contract: ContractLike = {
      mint: jest.fn(),
      burn: jest.fn(),
    };
    minter = new Minter(contract);
    server = new SocketServer(minter, TEST_SOCKET);
    server.listen();
    setTimeout(done, 100);
  });

  afterAll(async () => {
    await server.close();
    if (fs.existsSync(TEST_SOCKET)) {
      fs.unlinkSync(TEST_SOCKET);
    }
  });

  it('responds with ACK for a valid PaymentEvent', async () => {
    jest.spyOn(minter, 'mint').mockResolvedValueOnce({ success: true, tx_hash: '0xabc' });
    const event = makeEvent();
    const response = await sendAndReceive(JSON.stringify(event));
    expect(response.status).toBe('ACK');
    expect(response.reference_code).toBe(event.reference_code);
  });

  it('responds with NACK when minter returns failure', async () => {
    jest.spyOn(minter, 'mint').mockResolvedValueOnce({ success: false, reason: 'tx reverted' });
    const event = makeEvent({ reference_code: 'CATR-0xDEAD-9999' });
    const response = await sendAndReceive(JSON.stringify(event));
    expect(response.status).toBe('NACK');
    expect(response.reference_code).toBe('CATR-0xDEAD-9999');
    expect((response as { reason?: string }).reason).toBe('tx reverted');
  });

  it('responds with NACK for invalid JSON', async () => {
    const response = await sendAndReceive('not valid json{{');
    expect(response.status).toBe('NACK');
    expect((response as { reason?: string }).reason).toBe('Invalid JSON');
  });
});
