const { ethers } = require('hardhat');
const { CID } = require('multiformats/cid');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const HDWalletProvider = require("@truffle/hdwallet-provider")
const Web3 = require('web3');
const util = new Util()
let ERC1155
beforeEach(async ()=>{
  await util.deploy();
  await util.cloneEmblem(util.deployer.address)
  await util.cloneHandler(util.deployer.address)  
  ERC1155 = util.getERC1155((await util.factory.erc1155Implementation()), util.deployer)
})
describe('ERC1155', () => {
    it('should deploy ERC1155 Vaults', async ()=>{
        expect(ERC1155.address).to.exist
    })
    it('should mint', async()=>{
        let balanceERC1155 = await ERC1155.balanceOf(util.bob.address, 789)
        expect(balanceERC1155).to.equal(0)
        await ERC1155.mint(util.bob.address, 789, 2)
        balanceERC1155 = await ERC1155.balanceOf(util.bob.address, 789)
        expect(balanceERC1155).to.equal(2)
    })
    describe('Non-Fungibility', ()=>{
        it('should create serialnumber on each new asset minted')
        it('should add new serialnumber when minting more of a tokenid')
        it('should assign serialnumber to owner of asset')
        it('should get correct serialnumber when provided with tokenId and address')
        it('should transfer correct serialnumber from old owner to new owner on transfer')
        it('should mark correct serialnumber claimed upon claiming')
    })
    describe('Handler Callbacks', ()=>{
        it('should not allow callback registration in handler without witness')
        it('should allow transfer callback to be registered')
        it('should allow multiple callbacks to be registered')
        it('should allow claim callback to be registered')
        it('should catch exceptions thrown by callback')
        it('should execute multiple callbacks when multiple callbacks are registered')
        it('should only allow callback registrant or owner to remove callback')
    })
})