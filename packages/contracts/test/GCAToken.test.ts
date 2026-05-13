import { ethers } from "hardhat";
import { expect } from "chai";
import { GCAToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const E18 = (n: number) => ethers.parseUnits(String(n), 18);

describe("GCAToken", () => {
  let token: GCAToken;
  let admin: HardhatEthersSigner;
  let founder: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let minter: HardhatEthersSigner;
  let burner: HardhatEthersSigner;
  let merchant: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  beforeEach(async () => {
    [admin, founder, treasury, minter, burner, merchant, other] = await ethers.getSigners();
    const GCAToken = await ethers.getContractFactory("GCAToken");
    token = await GCAToken.deploy(
      founder.address,
      treasury.address,
      admin.address,
      minter.address,
      burner.address
    );
  });

  describe("Deployment", () => {
    it("should have correct name and symbol", async () => {
      expect(await token.name()).to.equal("GUACA");
      expect(await token.symbol()).to.equal("GCA");
    });

    it("should have correct cap of 3,000,000 GCA", async () => {
      expect(await token.cap()).to.equal(E18(3_000_000));
    });

    it("should mint 1,800,000 GCA at deploy", async () => {
      expect(await token.totalSupply()).to.equal(E18(1_800_000));
    });

    it("should mint 300,000 GCA to founder", async () => {
      expect(await token.balanceOf(founder.address)).to.equal(E18(300_000));
    });

    it("should mint 1,500,000 GCA to treasury (investors + team + ecosystem)", async () => {
      expect(await token.balanceOf(treasury.address)).to.equal(E18(1_500_000));
    });

    it("should leave 1,200,000 GCA unminted (merchant allocation)", async () => {
      const remaining = (await token.cap()) - (await token.totalSupply());
      expect(remaining).to.equal(E18(1_200_000));
    });
  });

  describe("Mint", () => {
    it("minter can mint GCA to merchant", async () => {
      await token.connect(minter).mint(merchant.address, E18(1_200));
      expect(await token.balanceOf(merchant.address)).to.equal(E18(1_200));
    });

    it("non-minter cannot mint", async () => {
      await expect(
        token.connect(other).mint(merchant.address, E18(1_200))
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Supply cap", () => {
    it("minting beyond 3,000,000 cap reverts", async () => {
      await expect(
        token.connect(minter).mint(merchant.address, E18(1_200_001))
      ).to.be.revertedWithCustomError(token, "ERC20ExceededCap");
    });

    it("minting exactly remaining 1,200,000 succeeds", async () => {
      await token.connect(minter).mint(merchant.address, E18(1_200_000));
      expect(await token.totalSupply()).to.equal(E18(3_000_000));
    });
  });

  describe("Burn", () => {
    beforeEach(async () => {
      await token.connect(minter).mint(merchant.address, E18(1_200));
    });

    it("burner can burn GCA from merchant", async () => {
      await token.connect(burner).burn(merchant.address, E18(500));
      expect(await token.balanceOf(merchant.address)).to.equal(E18(700));
    });

    it("non-burner cannot burn", async () => {
      await expect(
        token.connect(other).burn(merchant.address, E18(500))
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("minter cannot burn (BURNER_ROLE required)", async () => {
      await expect(
        token.connect(minter).burn(merchant.address, E18(500))
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Free transfers (no commission)", () => {
    beforeEach(async () => {
      await token.connect(minter).mint(merchant.address, E18(1_000));
    });

    it("transfers full amount with no commission", async () => {
      await token.connect(merchant).transfer(other.address, E18(500));
      expect(await token.balanceOf(merchant.address)).to.equal(E18(500));
      expect(await token.balanceOf(other.address)).to.equal(E18(500));
    });

    it("treasury balance unchanged after transfer", async () => {
      const before = await token.balanceOf(treasury.address);
      await token.connect(merchant).transfer(other.address, E18(500));
      expect(await token.balanceOf(treasury.address)).to.equal(before);
    });
  });

  describe("Admin role", () => {
    it("admin can grant MINTER_ROLE", async () => {
      const MINTER_ROLE = await token.MINTER_ROLE();
      await token.connect(admin).grantRole(MINTER_ROLE, other.address);
      expect(await token.hasRole(MINTER_ROLE, other.address)).to.be.true;
    });

    it("non-admin cannot grant MINTER_ROLE", async () => {
      const MINTER_ROLE = await token.MINTER_ROLE();
      await expect(
        token.connect(other).grantRole(MINTER_ROLE, other.address)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });
});
