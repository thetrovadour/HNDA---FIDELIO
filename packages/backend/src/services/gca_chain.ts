import { ethers } from 'ethers';

const GCA_ABI = [
  'function mint(address to, uint256 amount) external',
  'function burn(address from, uint256 amount) external',
  'function balanceOf(address account) view returns (uint256)',
];

function getGcaContract(signingKey: string) {
  const rpc     = process.env.BASE_SEPOLIA_RPC_URL;
  const address = process.env.GCA_CONTRACT_ADDRESS;

  if (!rpc || !signingKey || !address) {
    throw new Error('Missing env: BASE_SEPOLIA_RPC_URL, MINTER_PRIVATE_KEY, or GCA_CONTRACT_ADDRESS');
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const signer   = new ethers.Wallet(signingKey, provider);
  return new ethers.Contract(address, GCA_ABI, signer);
}

export async function mintGca(toAddress: string, amountGca: number): Promise<string> {
  const key = process.env.MINTER_PRIVATE_KEY;
  if (!key) throw new Error('Missing env: MINTER_PRIVATE_KEY');
  const contract = getGcaContract(key);
  const amount   = ethers.parseUnits(String(amountGca), 18);
  const tx       = await contract.mint(toAddress, amount);
  const receipt  = await tx.wait();
  return receipt.hash as string;
}

export async function burnGca(fromAddress: string, amountGca: number): Promise<string> {
  const key = process.env.MINTER_PRIVATE_KEY;
  if (!key) throw new Error('Missing env: MINTER_PRIVATE_KEY');
  const contract = getGcaContract(key);
  const amount   = ethers.parseUnits(String(amountGca), 18);
  const tx       = await contract.burn(fromAddress, amount);
  const receipt  = await tx.wait();
  return receipt.hash as string;
}
