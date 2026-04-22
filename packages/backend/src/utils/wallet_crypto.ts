import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Wallet } from 'ethers';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const hex = process.env.WALLET_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error('WALLET_ENCRYPTION_KEY must be a 64-char hex string');
  return Buffer.from(hex, 'hex');
}

export function generateWallet(): { address: string; privateKeyEncrypted: string } {
  const wallet = Wallet.createRandom();
  const iv = randomBytes(12);
  const key = getKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(wallet.privateKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // format: iv(24 hex) + tag(32 hex) + ciphertext(hex)
  const privateKeyEncrypted = iv.toString('hex') + tag.toString('hex') + encrypted.toString('hex');
  return { address: wallet.address, privateKeyEncrypted };
}

export function decryptPrivateKey(privateKeyEncrypted: string): string {
  const iv = Buffer.from(privateKeyEncrypted.slice(0, 24), 'hex');
  const tag = Buffer.from(privateKeyEncrypted.slice(24, 56), 'hex');
  const ciphertext = Buffer.from(privateKeyEncrypted.slice(56), 'hex');
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}
