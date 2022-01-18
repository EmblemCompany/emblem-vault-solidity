const { ethers } = require('hardhat');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const util = new Util()



describe('Burn tokens', () => {
  beforeEach(async () => {
    await util.deploy();      
  })
  it('should burn directly via vault contract', async()=>{
    await util.cloneHandler(util.deployer.address)
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)    
    await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0)
    let owner = await emblemContract.ownerOf(1)
    await expect(owner).to.equal(util.deployer.address)
    await emblemContract.burn(1)
    owner = emblemContract.ownerOf(1)
    expect(owner).to.be.revertedWith("003002")    
  })
  it('should not claim via handler without permission', async()=>{
    await util.cloneHandler(util.deployer.address)
    await util.cloneClaimed(util.deployer.address)
    let claimedContract = util.getClaimed(util.claimer.address, util.deployer)
    await claimedContract.initialize()
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)    
    await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0)
    let owner = await emblemContract.ownerOf(1)
    await expect(owner).to.equal(util.deployer.address)
    let tx = util.claimer.claim(emblemAddress, 1)
    expect(tx).to.be.revertedWith("003004")
  })
  it('should claim via handler with permission', async()=>{
    await util.cloneHandler(util.deployer.address)
    await util.cloneClaimed(util.deployer.address)
    let claimedContract = util.getClaimed(util.claimer.address, util.deployer)
    await claimedContract.initialize()
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)    
    await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0)
    let owner = await emblemContract.ownerOf(1)
    expect(owner).to.equal(util.deployer.address)
    let approved = await emblemContract.isApprovedForAll(util.deployer.address, util.claimer.address)
    expect(approved).to.be.false
    await emblemContract.setApprovalForAll(util.claimer.address, true)
    approved = await emblemContract.isApprovedForAll(util.deployer.address, util.claimer.address)
    expect(approved).to.be.true
    let isClaimed = await util.claimer.isClaimed(emblemAddress, 1, [])
    expect(isClaimed).to.be.false
    await util.claimer.claim(emblemAddress,1)
    isClaimed = await util.claimer.isClaimed(emblemAddress, 1, [])
    expect(isClaimed).to.be.true
    let claimedBy = await util.claimer.claimedBy(emblemAddress, 1)
    expect(claimedBy[0]).to.equal(util.deployer.address)
    expect(claimedBy[1]).to.equal('record')
  })
  it('should not be able to mint previously claimed vault', async()=>{
    await util.cloneHandler(util.deployer.address)
    await util.cloneClaimed(util.deployer.address)
    let claimedContract = util.getClaimed(util.claimer.address, util.deployer)
    await claimedContract.initialize()
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0)
    await emblemContract.setApprovalForAll(util.claimer.address, true)
    await util.claimer.claim(emblemAddress,1)
    let isClaimed = await util.claimer.isClaimed(emblemAddress, 1, [])
    expect(isClaimed).to.be.true
    let tx = util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0)
    expect(tx).to.be.revertedWith("003006")
  })
  it('unminted should not return claimed', async()=>{
    await util.cloneHandler(util.deployer.address)
    await util.cloneClaimed(util.deployer.address)
    let claimedContract = util.getClaimed(util.claimer.address, util.deployer)
    await claimedContract.initialize()
    let emblemAddress = await util.factory.emblemImplementation()
    let isClaimed = await util.claimer.isClaimed(emblemAddress, 1, [])
    expect(isClaimed).to.be.false  
    let claimedBy = await util.claimer.claimedBy(emblemAddress, 1)
    expect(claimedBy[0]).to.equal('0x0000000000000000000000000000000000000000')
    expect(claimedBy[1]).to.equal('unknown')  
  })
  it('burnt via emblem vault should not return claimed', async()=>{
    await util.cloneHandler(util.deployer.address)
    await util.cloneClaimed(util.deployer.address)
    let claimedContract = util.getClaimed(util.claimer.address, util.deployer)
    await claimedContract.initialize()
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0)
    await emblemContract.burn(1)
    let isClaimed = await util.claimer.isClaimed(emblemAddress, 1, [])
    expect(isClaimed).to.be.false
    let claimedBy = await util.claimer.claimedBy(emblemAddress, 1)
    expect(claimedBy[0]).to.equal('0x0000000000000000000000000000000000000000')
    expect(claimedBy[1]).to.equal('unknown')
  })
})
