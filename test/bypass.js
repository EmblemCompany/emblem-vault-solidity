const { ethers } = require('hardhat');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const util = new Util()



describe('Bypass: Fuse Burn (lock function forever)', () => {
  beforeEach(async () => {
    await util.deployHandler()
    await util.deployBalanceUpgradable()
    await util.deployClaimedUpgradable()
    await util.deployERC721Factory()
    await util.deployERC20Factory() 
  })
  it('burning a fuse prevents any bypasses from working')
  it('burning a fuse prevents owner of accessing function')
  it('burning adheres to minimum')
  it('burning adheres threshold')
  
})
