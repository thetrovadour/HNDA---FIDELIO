import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const bridgeWallet   = process.env.MINTER_ADDRESS;

  if (!contractAddress || !bridgeWallet) {
    throw new Error("Missing CONTRACT_ADDRESS or MINTER_ADDRESS in .env");
  }

  const MINTER_ROLE_ABI = [
    "function MINTER_ROLE() view returns (bytes32)",
    "function grantRole(bytes32 role, address account)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
  ];

  const [signer] = await ethers.getSigners();
  console.log("Signing with:", signer.address);

  const token = new ethers.Contract(contractAddress, MINTER_ROLE_ABI, signer);

  const MINTER_ROLE = await token.MINTER_ROLE();
  console.log("MINTER_ROLE:", MINTER_ROLE);

  const alreadyHas = await token.hasRole(MINTER_ROLE, bridgeWallet);
  if (alreadyHas) {
    console.log(`${bridgeWallet} already has MINTER_ROLE — nothing to do.`);
    return;
  }

  console.log(`Granting MINTER_ROLE to ${bridgeWallet}...`);
  const tx = await token.grantRole(MINTER_ROLE, bridgeWallet);
  await tx.wait();
  console.log("Done. tx:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
