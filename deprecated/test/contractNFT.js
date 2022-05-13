const { ethers } = require('hardhat');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const util = new Util()



describe('ContractNFT', () => {
  beforeEach(async () => {
    await util.deploy();      
  })
  it('deploys ContractNFTFactory', async () => {
    await util.deployContractNFTFactory()
    expect(util.contractNFTFactory.address).to.not.equal("0x0000000000000000000000000000000000000000")
    await util.contractNFTClone.createClone(util.deployer.address, 1337, "uri://")
  })
  
})
