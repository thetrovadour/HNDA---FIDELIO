import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const treasuryAddress = process.env.TREASURY_ADDRESS;
  const rewardPoolAddress = process.env.REWARD_POOL_ADDRESS;
  const adminAddress = process.env.ADMIN_ADDRESS;
  const minterAddress = process.env.MINTER_ADDRESS;
  const burnerAddress = process.env.BURNER_ADDRESS;

  if (!treasuryAddress || !rewardPoolAddress || !adminAddress || !minterAddress || !burnerAddress) {
    throw new Error(
      "Missing required env vars: TREASURY_ADDRESS, REWARD_POOL_ADDRESS, ADMIN_ADDRESS, MINTER_ADDRESS, BURNER_ADDRESS"
    );
  }

  console.log("Deploying CATRToken...");
  console.log("  Treasury:   ", treasuryAddress);
  console.log("  RewardPool: ", rewardPoolAddress);
  console.log("  Admin:      ", adminAddress);
  console.log("  Minter:     ", minterAddress);
  console.log("  Burner:     ", burnerAddress);

  const CATRToken = await ethers.getContractFactory("CATRToken");
  const token = await CATRToken.deploy(treasuryAddress, rewardPoolAddress, adminAddress, minterAddress, burnerAddress);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("CATRToken deployed to:", tokenAddress);
  console.log("MINTER_ROLE granted to:", minterAddress);
  console.log("BURNER_ROLE granted to:", burnerAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
