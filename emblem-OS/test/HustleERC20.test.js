const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("HustleERC20", function () {
  let hustleToken;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const HustleERC20 = await ethers.getContractFactory("HustleERC20");
    hustleToken = await upgrades.deployProxy(
      HustleERC20,
      [owner.address],
      { kind: "transparent", initializer: "initialize" }
    );
    await hustleToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct token name and symbol", async function () {
      expect(await hustleToken.name()).to.equal("Hustle");
      expect(await hustleToken.symbol()).to.equal("HUSTLE");
    });

    it("Should set the correct owner", async function () {
      expect(await hustleToken.owner()).to.equal(owner.address);
    });

    it("Should have zero initial supply", async function () {
      expect(await hustleToken.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      await hustleToken.mint(addr1.address, mintAmount);
      expect(await hustleToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should update total supply after minting", async function () {
      const mintAmount = ethers.parseEther("1000");
      await hustleToken.mint(addr1.address, mintAmount);
      expect(await hustleToken.totalSupply()).to.equal(mintAmount);
    });

    it("Should reject minting from non-owner", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(
        hustleToken.connect(addr1).mint(addr1.address, mintAmount)
      ).to.be.revertedWithCustomError(hustleToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      const mintAmount = ethers.parseEther("1000");
      await hustleToken.mint(addr1.address, mintAmount);
    });

    it("Should allow token holder to burn their tokens", async function () {
      const burnAmount = ethers.parseEther("500");
      await hustleToken.connect(addr1).burn(burnAmount);
      expect(await hustleToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("500"));
    });

    it("Should reduce total supply after burning", async function () {
      const burnAmount = ethers.parseEther("500");
      await hustleToken.connect(addr1).burn(burnAmount);
      expect(await hustleToken.totalSupply()).to.equal(ethers.parseEther("500"));
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      const mintAmount = ethers.parseEther("1000");
      await hustleToken.mint(addr1.address, mintAmount);
    });

    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseEther("100");
      await hustleToken.connect(addr1).transfer(addr2.address, transferAmount);
      expect(await hustleToken.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await hustleToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("900"));
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      await hustleToken.transferOwnership(addr1.address);
      expect(await hustleToken.owner()).to.equal(addr1.address);
    });

    it("Should reject ownership transfer from non-owner", async function () {
      await expect(
        hustleToken.connect(addr1).transferOwnership(addr2.address)
      ).to.be.revertedWithCustomError(hustleToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("Upgradeability", function () {
    it("Should maintain state after upgrade", async function () {
      // Mint some tokens first
      const mintAmount = ethers.parseEther("1000");
      await hustleToken.mint(addr1.address, mintAmount);

      // Get the proxy address
      const proxyAddress = await hustleToken.getAddress();

      // Upgrade to same contract (in real use, this would be a V2)
      const HustleERC20V2 = await ethers.getContractFactory("HustleERC20");
      const upgraded = await upgrades.upgradeProxy(proxyAddress, HustleERC20V2);

      // Verify state is maintained
      expect(await upgraded.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await upgraded.owner()).to.equal(owner.address);
      expect(await upgraded.name()).to.equal("Hustle");
    });
  });
});
