const { ethers, helpers } = require('hardhat');
const { CID } = require('multiformats/cid');
const { expect } = require('chai')
const Util = require('./util.js')
const HDWalletProvider = require("@truffle/hdwallet-provider")
const Web3 = require('web3');
const { time } = require('console');
const util = new Util()


describe('Fixed Fees', () => {    
  beforeEach(async ()=>{
    await util.deployERC721AFees()
    await util.deploySimpleNFTBuyer()
  })
  it('should deploy vault', async ()=>{
    let emblemAddress = util.EmblemVault721AUpgradeableFees.address
    console.log(emblemAddress)
    expect(emblemAddress).to.exist
  })

  it('should deploy simple store', async ()=>{
    let simpleStore = util.simpleNFTBuyer.address
    console.log(simpleStore)
    expect(simpleStore).to.exist
  })

  it('should perform a standard user transfer and not emit ContractCall', async () => {
    let emblemContract = util.EmblemVault721AUpgradeableFees
    await emblemContract.mint(util.deployer.address, 123)
    console.log("emblem contract", emblemContract.address)
    console.log("store contract", util.simpleNFTBuyer.address)
    console.log("user", util.deployer.address)
    let balance = await emblemContract.balanceOf(util.deployer.address)
    expect(balance).to.equal(1)

    // Perform the transfer from the owner to the recipient
    const tx = await emblemContract.transferFrom(util.deployer.address, util.bob.address, 1);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();

    // Verify the new owner of the token
    const newOwner = await emblemContract.ownerOf(1);
    expect(newOwner).to.equal(util.bob.address);

    // Check that the ContractCall event was not emitted
    // const contractCallEvent = receipt.events?.find(e => e.event === 'ContractCall');
    // expect(contractCallEvent).to.be.undefined;
    console.log(receipt.events)
  });

  it('should perform contract buy with proper fee', async () => {
    let emblemContract = util.EmblemVault721AUpgradeableFees
    console.log("emblem contract", emblemContract.address)
    console.log("store contract", util.simpleNFTBuyer.address)
    console.log("user", util.deployer.address)
    await emblemContract.mint(util.simpleNFTBuyer.address, 123)
    let balance = await emblemContract.balanceOf(util.deployer.address)
    expect(balance).to.equal(0)

    balance = await emblemContract.balanceOf(util.simpleNFTBuyer.address)
    expect(balance).to.equal(1)

    const tx = await util.simpleNFTBuyer.buy(emblemContract.address, 1, { value: ethers.utils.parseEther("0.0031") })
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log(receipt.events)
  });

  it('should not allow contract buy with improper fee', async () => {
    let emblemContract = util.EmblemVault721AUpgradeableFees
    console.log("emblem contract", emblemContract.address)
    console.log("store contract", util.simpleNFTBuyer.address)
    console.log("user", util.deployer.address)
    await emblemContract.mint(util.simpleNFTBuyer.address, 123)
    let balance = await emblemContract.balanceOf(util.deployer.address)
    expect(balance).to.equal(0)

    balance = await emblemContract.balanceOf(util.simpleNFTBuyer.address)
    expect(balance).to.equal(1)

    const tx = util.simpleNFTBuyer.buy(emblemContract.address, 1, { value: ethers.utils.parseEther("0.0030") })
    await expect(tx).to.be.revertedWith("Transfer failed.")
  });

  it('should perform contract buy for zero fees when fee is zero', async () => {
    let emblemContract = util.EmblemVault721AUpgradeableFees
    console.log("emblem contract", emblemContract.address)
    console.log("store contract", util.simpleNFTBuyer.address)
    console.log("user", util.deployer.address)
    await emblemContract.mint(util.simpleNFTBuyer.address, 123)
    let balance = await emblemContract.balanceOf(util.deployer.address)
    expect(balance).to.equal(0)

    balance = await emblemContract.balanceOf(util.simpleNFTBuyer.address)
    expect(balance).to.equal(1)
    await emblemContract.setFee(0)
    const tx = await util.simpleNFTBuyer.buy(emblemContract.address, 1)
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log(receipt.events)
  });
  
})
