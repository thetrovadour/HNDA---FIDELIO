import { ethers } from 'ethers';
import { PaymentEvent } from './types';

const MINT_ABI = [
  'function mint(address to, uint256 amount)',
  'function burn(address from, uint256 amount)',
];

export interface MintResult {
  success: true;
  tx_hash: string;
}

export interface MintFailure {
  success: false;
  reason: string;
}

export type MintOutcome = MintResult | MintFailure;

export interface ContractLike {
  mint(to: string, amount: bigint): Promise<{ wait(): Promise<unknown> }>;
  burn(from: string, amount: bigint): Promise<{ wait(): Promise<unknown> }>;
}

export class Minter {
  private contract: ContractLike;

  constructor(contract: ContractLike) {
    this.contract = contract;
  }

  static createFromEnv(): Minter | null {
    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      return null;
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, MINT_ABI, wallet) as unknown as ContractLike;

    return new Minter(contract);
  }

  async mint(event: PaymentEvent): Promise<MintOutcome> {
    try {
      const amountCATR = ethers.parseUnits(event.amount_lempiras.toString(), 18);
      const tx = await (this.contract as any).mint(event.client_wallet, amountCATR, { gasLimit: 100_000 });
      const receipt = await tx.wait() as { hash?: string } | null;
      const tx_hash = (tx as unknown as { hash: string }).hash ?? receipt?.hash ?? '';
      return { success: true, tx_hash };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return { success: false, reason };
    }
  }

  async burn(walletAddress: string, amountCATR: number): Promise<MintOutcome> {
    try {
      const amount = ethers.parseUnits(amountCATR.toString(), 18);
      const tx = await (this.contract as any).burn(walletAddress, amount, { gasLimit: 100_000 });
      const receipt = await tx.wait() as { hash?: string } | null;
      const tx_hash = (tx as unknown as { hash: string }).hash ?? receipt?.hash ?? '';
      return { success: true, tx_hash };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return { success: false, reason };
    }
  }

  async transfer(fromWallet: string, toWallet: string, amountCATR: string): Promise<MintOutcome> {
    try {
      const amount = ethers.parseUnits(amountCATR, 18);
      const burnTx = await (this.contract as any).burn(fromWallet, amount, { gasLimit: 100_000 });
      await burnTx.wait();
      const mintTx = await (this.contract as any).mint(toWallet, amount, { gasLimit: 100_000 });
      const receipt = await mintTx.wait() as { hash?: string } | null;
      const tx_hash = (mintTx as unknown as { hash: string }).hash ?? receipt?.hash ?? '';
      return { success: true, tx_hash };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return { success: false, reason };
    }
  }
}
