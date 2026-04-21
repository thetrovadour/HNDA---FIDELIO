import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const bridgeWallet   = process.env.BRIDGE_WALLET ?? process.env.MINTER_ADDRESS;

  if (!contractAddress || !bridgeWallet) {
    throw new Error("Missing CONTRACT_ADDRESS or BRIDGE_WALLET in .env");
  }

  const BURNER_ROLE_ABI = [
    "function BURNER_ROLE() view returns (bytes32)",
    "function grantRole(bytes32 role, address account)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
  ];

  const [signer] = await ethers.getSigners();
  console.log("Signing with:", signer.address);

  const token = new ethers.Contract(contractAddress, BURNER_ROLE_ABI, signer);

  const BURNER_ROLE = await token.BURNER_ROLE();
  console.log("BURNER_ROLE:", BURNER_ROLE);

  const alreadyHas = await token.hasRole(BURNER_ROLE, bridgeWallet);
  if (alreadyHas) {
    console.log(`${bridgeWallet} already has BURNER_ROLE — nothing to do.`);
    return;
  }

  console.log(`Granting BURNER_ROLE to ${bridgeWallet}...`);
  const tx = await token.grantRole(BURNER_ROLE, bridgeWallet);
  await tx.wait();
  console.log("Done. tx:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
