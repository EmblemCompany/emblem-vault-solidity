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
    await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 1, 0x0)
    let owner = await emblemContract.ownerOf(1)
    await expect(owner).to.equal(util.deployer.address)
    await emblemContract.burn(1)
    owner = emblemContract.ownerOf(1)
    expect(owner).to.be.revertedWith("003002")    
  })
  
  it('unminted should not return claimed', async()=>{
    await util.cloneHandler(util.deployer.address)
    await util.cloneClaimed(util.deployer.address)
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
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 1, 0x0)
    await emblemContract.burn(1)
    let isClaimed = await util.claimer.isClaimed(emblemAddress, 1, [])
    expect(isClaimed).to.be.false
    let claimedBy = await util.claimer.claimedBy(emblemAddress, 1)
    expect(claimedBy[0]).to.equal('0x0000000000000000000000000000000000000000')
    expect(claimedBy[1]).to.equal('unknown')
  })
})
