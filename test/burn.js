const { ethers } = require('hardhat');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const util = new Util()



describe('Burn tokens', () => {
  beforeEach(async () => {
    await util.deployHandler()
    await util.deployBalanceUpgradable()
    await util.deployClaimedUpgradable()
    await util.deployERC721Factory()
    await util.deployERC20Factory() 
  })
  it.only('should burn directly via vault contract', async()=>{
    let emblemAddress = util.emblem.address
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await emblemContract.transferOwnership(util.handler.address)
    await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 1, 0x0)
    let owner = await emblemContract.ownerOf(1)
    await expect(owner).to.equal(util.deployer.address)
    await emblemContract.burn(1)
    owner = emblemContract.ownerOf(1)
    expect(owner).to.be.revertedWith("003002")    
  })  
  it.only('unminted should not return claimed', async()=>{
    let emblemAddress = util.emblem.address
    let isClaimed = await util.claimedUpgradable.isClaimed(emblemAddress, 1, [])
    expect(isClaimed).to.be.false  
    let claimedBy = await util.claimedUpgradable.claimedBy(emblemAddress, 1)
    expect(claimedBy[0]).to.equal('0x0000000000000000000000000000000000000000')
    expect(claimedBy[1]).to.equal('unknown')  
  })
  it.only('burnt via emblem vault should not return claimed', async()=>{
    let emblemAddress = util.emblem.address
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await emblemContract.transferOwnership(util.handler.address)
    await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 1, 0x0)
    await emblemContract.burn(1)
    let isClaimed = await util.claimedUpgradable.isClaimed(emblemAddress, 1, [])
    expect(isClaimed).to.be.false
    let claimedBy = await util.claimedUpgradable.claimedBy(emblemAddress, 1)
    expect(claimedBy[0]).to.equal('0x0000000000000000000000000000000000000000')
    expect(claimedBy[1]).to.equal('unknown')
  })
})
