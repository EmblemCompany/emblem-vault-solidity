const { ethers } = require('hardhat');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const util = new Util()



describe('ContractNFT', () => {
  beforeEach(async () => { 
    await util.deployHandler()
    await util.deployBalanceUpgradable()
    await util.deployClaimedUpgradable()
    await util.deployERC721Factory()
    await util.deployERC20Factory() 
  })
  it.only('deploys ContractNFTFactory', async () => {
    await util.deployContractNFTFactory()
    expect(util.contractNFTFactory.address).to.not.equal("0x0000000000000000000000000000000000000000")
    await util.contractNFT.createClone(util.deployer.address, 1337, "uri://")
  })
  
})
