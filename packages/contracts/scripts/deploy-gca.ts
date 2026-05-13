import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const founderAddress   = process.env.ADMIN_ADDRESS;
  const treasuryAddress  = process.env.TREASURY_ADDRESS;
  const adminAddress     = process.env.ADMIN_ADDRESS;
  const minterAddress    = process.env.MINTER_ADDRESS;
  const burnerAddress    = process.env.BURNER_ADDRESS;

  if (!founderAddress || !treasuryAddress || !adminAddress || !minterAddress || !burnerAddress) {
    throw new Error(
      "Missing required env vars: ADMIN_ADDRESS, TREASURY_ADDRESS, MINTER_ADDRESS, BURNER_ADDRESS"
    );
  }

  console.log("\n  Deploying GCAToken (GUACA)...\n");
  console.log("  Founder:   ", founderAddress, "(300,000 GCA)");
  console.log("  Treasury:  ", treasuryAddress, "(1,500,000 GCA — investors + team + ecosystem)");
  console.log("  Admin:     ", adminAddress);
  console.log("  Minter:    ", minterAddress);
  console.log("  Burner:    ", burnerAddress);
  console.log("  Cap:        3,000,000 GCA");
  console.log("  Minted at deploy: 1,800,000 GCA");
  console.log("  Reserved for merchants: 1,200,000 GCA (minted on demand)\n");

  const GCAToken = await ethers.getContractFactory("GCAToken");
  const token = await GCAToken.deploy(
    founderAddress,
    treasuryAddress,
    adminAddress,
    minterAddress,
    burnerAddress
  );

  await token.waitForDeployment();
  const address = await token.getAddress();

  console.log("  ✓ GCAToken deployed at:", address);
  console.log("\n  Add to packages/contracts/.env:");
  console.log(`  GCA_CONTRACT_ADDRESS=${address}`);
  console.log("\n  Add to packages/backend/.env:");
  console.log(`  GCA_CONTRACT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
