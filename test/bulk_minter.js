const { ethers, helpers } = require('hardhat');
const { CID } = require('multiformats/cid');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const HDWalletProvider = require("@truffle/hdwallet-provider")
const Web3 = require('web3');
const { time } = require('console');
const util = new Util()
let ERC721, ERC1155


describe('Bulk Mint', () => {    
  beforeEach(async ()=>{
    await util.deployHandler()
    await util.deployERC721Factory()
    await util.deployBulkMinter()
    ERC721 = util.emblem
  })
  it('should deploy minter', async ()=>{
    expect(util.bulkMinter.address).to.not.equal("0x0000000000000000000000000000000000000000")
  })
  it('should allow transfering ownership of erc721 back to handler', async ()=>{
    let owner = await util.emblem.owner()
    await expect(owner).to.equal(util.deployer.address)
    await util.emblem.transferOwnership(util.bulkMinter.address)
    owner = await util.emblem.owner()
    await expect(owner).to.equal(util.bulkMinter.address)
    await util.bulkMinter.transferContractOwnership(util.emblem.address, util.handler.address)
    owner = await util.emblem.owner()
    await expect(owner).to.equal(util.handler.address)
  })
})
