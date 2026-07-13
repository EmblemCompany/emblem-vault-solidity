const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * Unit tests for SolanaToHederaBridgeUpgradeable
 *
 * Note: HTS precompile calls will fail on Hardhat local network.
 * These tests verify access control, state management, and upgradeability.
 * Full integration tests must run on Hedera testnet.
 */
describe("SolanaToHederaBridgeUpgradeable", function () {
  // Test constants
  const MAX_PER_TX = ethers.parseUnits("1000000", 8); // 1M tokens (8 decimals)
  const DAILY_LIMIT = ethers.parseUnits("10000000", 8); // 10M tokens

  // Mock token address (not a real HTS token)
  const MOCK_TOKEN = "0x0000000000000000000000000000000000000167";

  // Sample deposit data
  const DEPOSIT_ID = ethers.keccak256(ethers.toUtf8Bytes("deposit-1"));
  const SOLANA_TX_HASH = ethers.keccak256(ethers.toUtf8Bytes("solana-tx-1"));
  const AMOUNT = ethers.parseUnits("1000", 8); // 1000 tokens

  async function deployBridgeFixture() {
    const [owner, relayer, recipient, other] = await ethers.getSigners();

    const Bridge = await ethers.getContractFactory("SolanaToHederaBridgeUpgradeable");

    const bridge = await upgrades.deployProxy(
      Bridge,
      [owner.address, MAX_PER_TX, DAILY_LIMIT],
      {
        kind: "uups",
        initializer: "initialize",
      }
    );

    await bridge.waitForDeployment();

    return { bridge, owner, relayer, recipient, other };
  }

  describe("Initialization", function () {
    it("Should set the correct owner", async function () {
      const { bridge, owner } = await loadFixture(deployBridgeFixture);
      expect(await bridge.owner()).to.equal(owner.address);
    });

    it("Should set owner as relayer", async function () {
      const { bridge, owner } = await loadFixture(deployBridgeFixture);
      expect(await bridge.isRelayer(owner.address)).to.be.true;
    });

    it("Should set rate limits correctly", async function () {
      const { bridge } = await loadFixture(deployBridgeFixture);
      expect(await bridge.maxPerTx()).to.equal(MAX_PER_TX);
      expect(await bridge.dailyLimit()).to.equal(DAILY_LIMIT);
    });

    it("Should have VERSION constant", async function () {
      const { bridge } = await loadFixture(deployBridgeFixture);
      expect(await bridge.VERSION()).to.equal("1.0.0");
    });

    it("Should not be paused initially", async function () {
      const { bridge } = await loadFixture(deployBridgeFixture);
      expect(await bridge.paused()).to.be.false;
    });

    it("Should have zero token address initially", async function () {
      const { bridge } = await loadFixture(deployBridgeFixture);
      expect(await bridge.token()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Token Configuration", function () {
    it("Should allow owner to set token", async function () {
      const { bridge, owner } = await loadFixture(deployBridgeFixture);

      await expect(bridge.connect(owner).setToken(MOCK_TOKEN))
        .to.emit(bridge, "TokenSet")
        .withArgs(MOCK_TOKEN);

      expect(await bridge.token()).to.equal(MOCK_TOKEN);
    });

    it("Should reject setting token by non-owner", async function () {
      const { bridge, other } = await loadFixture(deployBridgeFixture);

      await expect(bridge.connect(other).setToken(MOCK_TOKEN))
        .to.be.revertedWithCustomError(bridge, "OwnableUnauthorizedAccount");
    });

    it("Should reject setting token twice", async function () {
      const { bridge, owner } = await loadFixture(deployBridgeFixture);

      await bridge.connect(owner).setToken(MOCK_TOKEN);

      await expect(bridge.connect(owner).setToken(MOCK_TOKEN))
        .to.be.revertedWith("Token already set");
    });

    it("Should reject zero token address", async function () {
      const { bridge, owner } = await loadFixture(deployBridgeFixture);

      await expect(bridge.connect(owner).setToken(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid token address");
    });
  });

  describe("Relayer Management", function () {
    it("Should allow owner to add relayer", async function () {
      const { bridge, owner, relayer } = await loadFixture(deployBridgeFixture);

      await expect(bridge.connect(owner).setRelayer(relayer.address, true))
        .to.emit(bridge, "RelayerUpdated")
        .withArgs(relayer.address, true);

      expect(await bridge.isRelayer(relayer.address)).to.be.true;
    });

    it("Should allow owner to remove relayer", async function () {
      const { bridge, owner, relayer } = await loadFixture(deployBridgeFixture);

      await bridge.connect(owner).setRelayer(relayer.address, true);

      await expect(bridge.connect(owner).setRelayer(relayer.address, false))
        .to.emit(bridge, "RelayerUpdated")
        .withArgs(relayer.address, false);

      expect(await bridge.isRelayer(relayer.address)).to.be.false;
    });

    it("Should reject relayer changes by non-owner", async function () {
      const { bridge, relayer, other } = await loadFixture(deployBridgeFixture);

      await expect(bridge.connect(other).setRelayer(relayer.address, true))
        .to.be.revertedWithCustomError(bridge, "OwnableUnauthorizedAccount");
    });
  });

  describe("Rate Limits", function () {
    it("Should allow owner to update rate limits", async function () {
      const { bridge, owner } = await loadFixture(deployBridgeFixture);

      const newMaxPerTx = ethers.parseUnits("500000", 8);
      const newDailyLimit = ethers.parseUnits("5000000", 8);

      await expect(bridge.connect(owner).setRateLimits(newMaxPerTx, newDailyLimit))
        .to.emit(bridge, "RateLimitsUpdated")
        .withArgs(newMaxPerTx, newDailyLimit);

      expect(await bridge.maxPerTx()).to.equal(newMaxPerTx);
      expect(await bridge.dailyLimit()).to.equal(newDailyLimit);
    });

    it("Should reject rate limit changes by non-owner", async function () {
      const { bridge, other } = await loadFixture(deployBridgeFixture);

      await expect(bridge.connect(other).setRateLimits(100, 1000))
        .to.be.revertedWithCustomError(bridge, "OwnableUnauthorizedAccount");
    });

    it("Should report remaining daily limit", async function () {
      const { bridge } = await loadFixture(deployBridgeFixture);
      expect(await bridge.getRemainingDailyLimit()).to.equal(DAILY_LIMIT);
    });
  });

  describe("Access Control for finalizeSolanaDeposit", function () {
    it("Should reject finalize from non-relayer", async function () {
      const { bridge, owner, recipient, other } = await loadFixture(deployBridgeFixture);

      // Set token first
      await bridge.connect(owner).setToken(MOCK_TOKEN);

      await expect(
        bridge.connect(other).finalizeSolanaDeposit(
          DEPOSIT_ID,
          recipient.address,
          AMOUNT,
          SOLANA_TX_HASH
        )
      ).to.be.revertedWithCustomError(bridge, "OnlyRelayer");
    });

    it("Should reject finalize when paused", async function () {
      const { bridge, owner, recipient } = await loadFixture(deployBridgeFixture);

      await bridge.connect(owner).setToken(MOCK_TOKEN);
      await bridge.connect(owner).emergencyPause();

      await expect(
        bridge.connect(owner).finalizeSolanaDeposit(
          DEPOSIT_ID,
          recipient.address,
          AMOUNT,
          SOLANA_TX_HASH
        )
      ).to.be.revertedWithCustomError(bridge, "EnforcedPause");
    });

    it("Should reject finalize when token not set", async function () {
      const { bridge, owner, recipient } = await loadFixture(deployBridgeFixture);

      await expect(
        bridge.connect(owner).finalizeSolanaDeposit(
          DEPOSIT_ID,
          recipient.address,
          AMOUNT,
          SOLANA_TX_HASH
        )
      ).to.be.revertedWithCustomError(bridge, "TokenNotSet");
    });

    it("Should reject zero amount", async function () {
      const { bridge, owner, recipient } = await loadFixture(deployBridgeFixture);

      await bridge.connect(owner).setToken(MOCK_TOKEN);

      await expect(
        bridge.connect(owner).finalizeSolanaDeposit(
          DEPOSIT_ID,
          recipient.address,
          0,
          SOLANA_TX_HASH
        )
      ).to.be.revertedWithCustomError(bridge, "InvalidAmount");
    });

    it("Should reject amount exceeding per-tx limit", async function () {
      const { bridge, owner, recipient } = await loadFixture(deployBridgeFixture);

      await bridge.connect(owner).setToken(MOCK_TOKEN);

      const exceedingAmount = MAX_PER_TX + BigInt(1);

      await expect(
        bridge.connect(owner).finalizeSolanaDeposit(
          DEPOSIT_ID,
          recipient.address,
          exceedingAmount,
          SOLANA_TX_HASH
        )
      ).to.be.revertedWithCustomError(bridge, "ExceedsPerTxLimit");
    });
  });

  describe("Deposit State Management", function () {
    it("Should track deposit IDs", async function () {
      const { bridge } = await loadFixture(deployBridgeFixture);

      expect(await bridge.isDepositProcessed(DEPOSIT_ID)).to.be.false;
    });

    it("Should return empty claimable for unknown deposit", async function () {
      const { bridge } = await loadFixture(deployBridgeFixture);

      const [recipient, amount, claimed] = await bridge.getClaimableDeposit(DEPOSIT_ID);
      expect(recipient).to.equal(ethers.ZeroAddress);
      expect(amount).to.equal(0);
      expect(claimed).to.be.false;
    });
  });

  describe("Pause Functions", function () {
    it("Should allow owner to emergency pause", async function () {
      const { bridge, owner } = await loadFixture(deployBridgeFixture);

      await bridge.connect(owner).emergencyPause();
      expect(await bridge.paused()).to.be.true;
    });

    it("Should allow owner to emergency unpause", async function () {
      const { bridge, owner } = await loadFixture(deployBridgeFixture);

      await bridge.connect(owner).emergencyPause();
      await bridge.connect(owner).emergencyUnpause();
      expect(await bridge.paused()).to.be.false;
    });

    it("Should reject emergency pause by non-owner", async function () {
      const { bridge, other } = await loadFixture(deployBridgeFixture);

      await expect(bridge.connect(other).emergencyPause())
        .to.be.revertedWithCustomError(bridge, "OwnableUnauthorizedAccount");
    });

    it("Should reject pauseBridge when token not set", async function () {
      const { bridge, owner } = await loadFixture(deployBridgeFixture);

      await expect(bridge.connect(owner).pauseBridge())
        .to.be.revertedWithCustomError(bridge, "TokenNotSet");
    });

    it("Should reject unpauseBridge when token not set", async function () {
      const { bridge, owner } = await loadFixture(deployBridgeFixture);

      await expect(bridge.connect(owner).unpauseBridge())
        .to.be.revertedWithCustomError(bridge, "TokenNotSet");
    });
  });

  describe("Claim Deposit Access Control", function () {
    it("Should reject claim when paused", async function () {
      const { bridge, owner, recipient } = await loadFixture(deployBridgeFixture);

      await bridge.connect(owner).setToken(MOCK_TOKEN);
      await bridge.connect(owner).emergencyPause();

      await expect(bridge.connect(recipient).claimDeposit(DEPOSIT_ID))
        .to.be.revertedWithCustomError(bridge, "EnforcedPause");
    });

    it("Should reject claim when token not set", async function () {
      const { bridge, recipient } = await loadFixture(deployBridgeFixture);

      await expect(bridge.connect(recipient).claimDeposit(DEPOSIT_ID))
        .to.be.revertedWithCustomError(bridge, "TokenNotSet");
    });

    it("Should reject claim for unknown deposit", async function () {
      const { bridge, owner, recipient } = await loadFixture(deployBridgeFixture);

      await bridge.connect(owner).setToken(MOCK_TOKEN);

      await expect(bridge.connect(recipient).claimDeposit(DEPOSIT_ID))
        .to.be.revertedWithCustomError(bridge, "DepositNotFound");
    });
  });

  describe("UUPS Upgradeability", function () {
    it("Should be upgradeable by owner", async function () {
      const { bridge, owner } = await loadFixture(deployBridgeFixture);

      const BridgeV2 = await ethers.getContractFactory("SolanaToHederaBridgeUpgradeable");

      // This should not revert
      const upgraded = await upgrades.upgradeProxy(await bridge.getAddress(), BridgeV2, {
        kind: "uups",
      });

      expect(await upgraded.VERSION()).to.equal("1.0.0");
    });

    it("Should reject upgrade by non-owner", async function () {
      const { bridge, other } = await loadFixture(deployBridgeFixture);

      const BridgeV2 = await ethers.getContractFactory("SolanaToHederaBridgeUpgradeable", other);

      await expect(
        upgrades.upgradeProxy(await bridge.getAddress(), BridgeV2, {
          kind: "uups",
        })
      ).to.be.revertedWithCustomError(bridge, "OwnableUnauthorizedAccount");
    });

    it("Should preserve state after upgrade", async function () {
      const { bridge, owner, relayer } = await loadFixture(deployBridgeFixture);

      // Set up some state
      await bridge.connect(owner).setToken(MOCK_TOKEN);
      await bridge.connect(owner).setRelayer(relayer.address, true);

      // Upgrade
      const BridgeV2 = await ethers.getContractFactory("SolanaToHederaBridgeUpgradeable");
      const upgraded = await upgrades.upgradeProxy(await bridge.getAddress(), BridgeV2, {
        kind: "uups",
      });

      // Verify state preserved
      expect(await upgraded.token()).to.equal(MOCK_TOKEN);
      expect(await upgraded.isRelayer(relayer.address)).to.be.true;
      expect(await upgraded.owner()).to.equal(owner.address);
    });
  });

  describe("Cannot reinitialize", function () {
    it("Should reject reinitialization", async function () {
      const { bridge, owner, other } = await loadFixture(deployBridgeFixture);

      await expect(
        bridge.initialize(other.address, MAX_PER_TX, DAILY_LIMIT)
      ).to.be.revertedWithCustomError(bridge, "InvalidInitialization");
    });
  });
});
