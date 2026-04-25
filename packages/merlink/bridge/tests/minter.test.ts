import { ethers } from 'ethers';
import { Minter, ContractLike } from '../src/minter';
import { PaymentEvent } from '../src/types';

function makeEvent(overrides: Partial<PaymentEvent> = {}): PaymentEvent {
  return {
    reference_code: 'CATR-0xABCD-1711800000',
    amount_lempiras: 500,
    client_wallet: '0xABCD1234ABCD1234ABCD1234ABCD1234ABCD1234',
    source: 'EMAIL',
    received_at: 1711800000,
    ...overrides,
  };
}

describe('Minter', () => {
  let mintMock: jest.Mock;
  let waitMock: jest.Mock;
  let contract: ContractLike;
  let minter: Minter;

  beforeEach(() => {
    waitMock = jest.fn().mockResolvedValue(undefined);
    mintMock = jest.fn().mockResolvedValue({ wait: waitMock });
    contract = { mint: mintMock, burn: jest.fn() };
    minter = new Minter(contract);
  });

  it('converts 500 lempiras to 500 * 10^18 CATR units', async () => {
    await minter.mint(makeEvent({ amount_lempiras: 500 }));
    const expectedAmount = ethers.parseUnits('500', 18);
    expect(mintMock).toHaveBeenCalledWith(
      '0xABCD1234ABCD1234ABCD1234ABCD1234ABCD1234',
      expectedAmount,
      { gasLimit: 100_000 }
    );
  });

  it('calls mint with the correct client wallet address', async () => {
    const wallet = '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF';
    await minter.mint(makeEvent({ client_wallet: wallet }));
    expect(mintMock.mock.calls[0][0]).toBe(wallet);
  });

  it('returns success:true when mint resolves', async () => {
    const result = await minter.mint(makeEvent());
    expect(result.success).toBe(true);
  });

  it('returns success:false with reason when mint rejects', async () => {
    mintMock.mockRejectedValueOnce(new Error('network error'));
    const result = await minter.mint(makeEvent());
    expect(result).toEqual({ success: false, reason: 'network error' });
  });

  it('returns success:false with reason when wait rejects', async () => {
    waitMock.mockRejectedValueOnce(new Error('tx reverted'));
    const result = await minter.mint(makeEvent());
    expect(result).toEqual({ success: false, reason: 'tx reverted' });
  });
});
