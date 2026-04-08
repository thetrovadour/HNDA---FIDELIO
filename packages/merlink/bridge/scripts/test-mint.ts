/**
 * test-mint.ts
 *
 * Live mint() test against CATRToken v2 on Base Sepolia.
 *
 * Usage:
 *   npx ts-node scripts/test-mint.ts [recipient_wallet]
 *
 * If no recipient is provided, defaults to the minter wallet itself.
 *
 * Requires .env to have:
 *   BASE_SEPOLIA_RPC_URL
 *   PRIVATE_KEY
 *   CONTRACT_ADDRESS
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';

const MINT_ABI = [
  'function mint(address to, uint256 amount)',
  'function balanceOf(address account) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

const TEST_AMOUNT_LEMPIRAS = 10; // 10 lempiras → 10 CATR (1:1 ratio)

async function main(): Promise<void> {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    console.error('❌  Missing env vars. Check .env for BASE_SEPOLIA_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS.');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, MINT_ABI, wallet);

  const recipient: string = process.argv[2] ?? wallet.address;

  console.log('=== FIDELIO — Live mint() test ===');
  console.log(`Contract  : ${contractAddress}`);
  console.log(`Minter    : ${wallet.address}`);
  console.log(`Recipient : ${recipient}`);
  console.log(`Amount    : ${TEST_AMOUNT_LEMPIRAS} CATR`);
  console.log('');

  // Fetch token metadata
  const decimals: number = Number(await contract.decimals());
  const symbol: string = await contract.symbol();
  console.log(`Token decimals    : ${decimals}`);

  // Pre-flight: check minter ETH balance
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`Minter ETH balance : ${ethers.formatEther(ethBalance)} ETH`);
  if (ethBalance === 0n) {
    console.error('❌  Minter wallet has no ETH. Fund it with Base Sepolia ETH before running this script.');
    process.exit(1);
  }

  // Pre-flight: recipient CATR balance before
  const balanceBefore: bigint = await contract.balanceOf(recipient);
  console.log(`Recipient CATR before : ${ethers.formatUnits(balanceBefore, decimals)} ${symbol}`);
  console.log('');

  // Send mint transaction
  console.log('Sending mint() transaction...');
  const amountWei = ethers.parseUnits(TEST_AMOUNT_LEMPIRAS.toString(), decimals);
  const tx = await contract.mint(recipient, amountWei);
  console.log(`Tx hash   : ${tx.hash}`);
  console.log(`BaseScan  : https://sepolia.basescan.org/tx/${tx.hash}`);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait(2); // wait 2 confirmations for RPC indexing
  if (receipt.status === 0) {
    console.error(`❌  Transaction REVERTED in block ${receipt.blockNumber} (gas used: ${receipt.gasUsed.toString()})`);
    console.error('    Check BaseScan link above for revert reason.');
    process.exit(1);
  }
  console.log(`✅  Confirmed in block ${receipt.blockNumber} (gas used: ${receipt.gasUsed.toString()})`);
  console.log('');

  // Post-check: recipient CATR balance after
  const balanceAfter: bigint = await contract.balanceOf(recipient);
  console.log(`Recipient CATR after  : ${ethers.formatUnits(balanceAfter, decimals)} ${symbol}`);
  console.log(`Delta                 : +${ethers.formatUnits(balanceAfter - balanceBefore, decimals)} ${symbol}`);
  console.log(`Token symbol          : ${symbol}`);
  console.log('');
  console.log('=== Test complete ===');
}

main().catch((err) => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
