import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("CATRToken", function () {
  async function deployFixture() {
    const [deployer, treasury, rewardPool, admin, minter, user1, user2] =
      await ethers.getSigners();

    const CATRToken = await ethers.getContractFactory("CATRToken");
    const token = await CATRToken.deploy(
      treasury.address,
      rewardPool.address,
      admin.address
    );
    await token.waitForDeployment();

    // Grant MINTER_ROLE to minter
    const MINTER_ROLE = await token.MINTER_ROLE();
    await token.connect(admin).grantRole(MINTER_ROLE, minter.address);

    return { token, deployer, treasury, rewardPool, admin, minter, user1, user2, MINTER_ROLE };
  }

  describe("Deployment", function () {
    it("should have correct name and symbol", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal("CATR Token");
      expect(await token.symbol()).to.equal("CATR");
    });

    it("should have correct cap", async function () {
      const { token } = await loadFixture(deployFixture);
      const cap = 50_000_000n * 10n ** 18n;
      expect(await token.cap()).to.equal(cap);
    });

    it("should start with zero supply", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.totalSupply()).to.equal(0n);
    });
  });

  describe("Mint", function () {
    it("minter can mint tokens", async function () {
      const { token, minter, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await token.connect(minter).mint(user1.address, amount);
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it("non-minter cannot mint", async function () {
      const { token, user1, user2 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await expect(
        token.connect(user1).mint(user2.address, amount)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Supply cap", function () {
    it("minting beyond cap reverts", async function () {
      const { token, minter, user1 } = await loadFixture(deployFixture);
      const cap = 50_000_000n * 10n ** 18n;
      await expect(
        token.connect(minter).mint(user1.address, cap + 1n)
      ).to.be.revertedWithCustomError(token, "ERC20ExceededCap");
    });
  });

  describe("Burn", function () {
    it("minter can burn tokens from an address", async function () {
      const { token, minter, user1 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await token.connect(minter).mint(user1.address, amount);
      await token.connect(minter).burn(user1.address, amount);
      expect(await token.balanceOf(user1.address)).to.equal(0n);
      expect(await token.totalSupply()).to.equal(0n);
    });

    it("non-minter cannot burn", async function () {
      const { token, minter, user1, user2 } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await token.connect(minter).mint(user1.address, amount);
      await expect(
        token.connect(user2).burn(user1.address, amount)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Commission on transfer", function () {
    it("applies 0.63% commission split correctly on transfer of 10,000 CATR", async function () {
      const { token, minter, treasury, rewardPool, user1, user2 } =
        await loadFixture(deployFixture);

      const amount = ethers.parseEther("10000");
      await token.connect(minter).mint(user1.address, amount);

      const treasuryBefore = await token.balanceOf(treasury.address);
      const rewardPoolBefore = await token.balanceOf(rewardPool.address);

      await token.connect(user1).transfer(user2.address, amount);

      // commission = 10000 * 63 / 10000 = 63 CATR
      // toTreasury = 63 * 75 / 100 = 47.25 CATR (63e18 * 75 / 100 = 47250000000000000000 wei)
      // toRewardPool = 63 - 47.25 = 15.75 CATR
      // recipient receives 10000 - 63 = 9937 CATR
      const toTreasury = 47250000000000000000n;   // 47.25 CATR in wei
      const toRewardPool = 15750000000000000000n; // 15.75 CATR in wei
      const toRecipient = ethers.parseEther("9937");

      expect(await token.balanceOf(user2.address)).to.equal(toRecipient);
      expect(await token.balanceOf(treasury.address)).to.equal(treasuryBefore + toTreasury);
      expect(await token.balanceOf(rewardPool.address)).to.equal(rewardPoolBefore + toRewardPool);
      expect(await token.balanceOf(user1.address)).to.equal(0n);
    });
  });

  describe("No commission on mint", function () {
    it("treasury and rewardPool balances unchanged after mint", async function () {
      const { token, minter, treasury, rewardPool, user1 } =
        await loadFixture(deployFixture);

      const treasuryBefore = await token.balanceOf(treasury.address);
      const rewardPoolBefore = await token.balanceOf(rewardPool.address);

      await token.connect(minter).mint(user1.address, ethers.parseEther("1000"));

      expect(await token.balanceOf(treasury.address)).to.equal(treasuryBefore);
      expect(await token.balanceOf(rewardPool.address)).to.equal(rewardPoolBefore);
    });
  });

  describe("No commission on burn", function () {
    it("treasury and rewardPool balances unchanged after burn", async function () {
      const { token, minter, treasury, rewardPool, user1 } =
        await loadFixture(deployFixture);

      await token.connect(minter).mint(user1.address, ethers.parseEther("1000"));

      const treasuryBefore = await token.balanceOf(treasury.address);
      const rewardPoolBefore = await token.balanceOf(rewardPool.address);

      await token.connect(minter).burn(user1.address, ethers.parseEther("1000"));

      expect(await token.balanceOf(treasury.address)).to.equal(treasuryBefore);
      expect(await token.balanceOf(rewardPool.address)).to.equal(rewardPoolBefore);
    });
  });

  describe("Admin role", function () {
    it("DEFAULT_ADMIN_ROLE holder can grant MINTER_ROLE", async function () {
      const { token, admin, user1, MINTER_ROLE } = await loadFixture(deployFixture);
      await token.connect(admin).grantRole(MINTER_ROLE, user1.address);
      expect(await token.hasRole(MINTER_ROLE, user1.address)).to.be.true;
    });

    it("non-admin cannot grant MINTER_ROLE", async function () {
      const { token, user1, user2, MINTER_ROLE } = await loadFixture(deployFixture);
      await expect(
        token.connect(user1).grantRole(MINTER_ROLE, user2.address)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });
});
