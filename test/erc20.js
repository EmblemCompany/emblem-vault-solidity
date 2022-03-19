const { ethers } = require('hardhat');
const { CID } = require('multiformats/cid');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const HDWalletProvider = require("@truffle/hdwallet-provider")
const Web3 = require('web3');
const TEST_CALLBACK_FUNCTION = "0x684ee7de" //web3.eth.abi.encodeFunctionSignature('testCallback(address _from, address _to, uint256 tokenId)').substr(0, 10)
const TEST_REVERT_CALLBACK_FUNCTION = "0x5d1c03dd"
const TEST_FAKE_CALLBACK_FUNCTION = "0x4e1c03dd"
function getRandom(myArray) {
    let selected = myArray[Math.floor(Math.random() * myArray.length)];
    return selected
  }
let selectProvider = function(network) {
    return new HDWalletProvider(process.env.ETHKEY || "a819fcd7afa2c39a7f9baf70273a128875b6c9f03001b218824559ccad6ef11c", selectProviderEndpoint(network), 0, 1)
  }
  function selectProviderEndpoint(network) {
    return infuraEndpoints.filter(item => { return item.network == network })[0].address
  }
  const MATIC_IDS = [
    "41f5f3cbf83536b2bf235d2be67a16bf6e5647dd"
  ]
  const INFURA_IDS = [  
    "6112845322b74decbf08005aea176252", // <-- free backup
    "8e5d2af8fbe244f7b7f32e2ddc152508",
    "2e2998d61b0644fe8174bca015096245"
  ]
  const infuraEndpoints = [
    { network: "rinkeby", address: "https://rinkeby.infura.io/v3/" + getRandom(INFURA_IDS) || INFURA_ID },
    { network: "mainnet", address: "https://mainnet.infura.io/v3/" + getRandom(INFURA_IDS) || INFURA_ID },
    { network: "mumbai", address: "https://rpc-mumbai.maticvigil.com/v1/" + getRandom(MATIC_IDS) },
    { network: "matic", address: "https://rpc-mainnet.maticvigil.com/v1/" + getRandom(MATIC_IDS) },
    { network: "xdai", address: "https://rpc.xdaichain.com/" },
    { network: "bsc", address: "https://bsc-dataseed.binance.org/" },
    { network: "fantom", address: "https://rpcapi.fantom.network" }
  ]
// var provider = selectProvider("mainnet")
// var web3 = new Web3(provider)

const CALLBACK_TYPE = {"MINT": 0,"TRANSFER": 1,"CLAIM":2, "BURN": 3}
const REGISTRATION_TYPE = {"EMPTY": 0, "ERC1155": 1, "ERC721":2, "HANDLER":3, "ERC20":4, "BALANCE":5, "CLAIM":6, "UNKNOWN":7, "FACTORY":8, "STAKING": 9, "BYPASS": 10}// 0 EMPTY, 1 ERC1155, 2 ERC721, 3 HANDLER, 4 ERC20, 5 BALANCE, 6 CLAIM 7 UNKNOWN

const util = new Util()
let ERC20
beforeEach(async ()=>{
  await util.deployHandler()
    await util.deployBalanceUpgradable()
    await util.deployClaimedUpgradable()
    await util.deployERC721Factory()
    await util.deployERC20Factory()
    await util.deployERC1155Upgradable()
    ERC20 = util.erc20

})
describe('ERC20', () => {
    it('should deploy ERC20 Token', async ()=>{
        expect(ERC20.address).to.exist
    })

    describe('Bypass', ()=>{
        it.only('not allow bypass if bypass not allowed', async()=>{
            await ERC20.mint(util.deployer.address, 1)
            ERC20 = await util.getERC20(ERC20.address, util.bob)
            let tx = ERC20.transferFrom(util.deployer.address, util.bob.address, 1)
            await expect(tx).to.be.revertedWith("ERC20: transfer amount exceeds allowance or not bypassable")
        })
        it.only('not allow bypass if bypass allowed and not registered as bypasser', async()=>{
            await ERC20.mint(util.deployer.address, 1)
            await ERC20.toggleBypassability()
            ERC20 = await util.getERC20(ERC20.address, util.bob)
            let tx = ERC20.transferFrom(util.deployer.address, util.bob.address, 1)
            await expect(tx).to.be.revertedWith("ERC20: transfer amount exceeds allowance or not bypassable")
        })
        it.only('only admin can add bypasser', async()=>{
            await ERC20.mint(util.deployer.address, 1)
            await ERC20.toggleBypassability()
            ERC20 = await util.getERC20(ERC20.address, util.bob)
            let tx = ERC20.registerContract(util.bob.address, REGISTRATION_TYPE.BYPASS)
            await expect(tx).to.be.revertedWith("Contract is not registered nor Owner")
        })
        it.only('allow bypass if bypass allowed and registered as bypasser', async()=>{
            await ERC20.mint(util.deployer.address, 1)
            let balanceERC20 = await ERC20.balanceOf(util.bob.address)
            expect(balanceERC20).to.equal(0)
            await ERC20.toggleBypassability()
            await ERC20.addBypassRule(util.bob.address, "0x23b872dd", 0)
            ERC20 = await util.getERC20(ERC20.address, util.bob)
            await ERC20.transferFrom(util.deployer.address, util.bob.address, 1)
            balanceERC20 = await ERC20.balanceOf(util.bob.address)
            expect(balanceERC20).to.equal(1)
        })
        it.only('not allow bypass of ownerOnly if no valid rule', async()=>{
          await ERC20.changeContractDetails("SomeName","smbl",8)
          let currentName = await ERC20.name()
          expect(currentName).to.equal("SomeName")
          ERC20 = await util.getERC20(ERC20.address, util.bob)
          let tx = ERC20.changeContractDetails("AnotherName","smbl",8)
          await expect(tx).to.be.revertedWith("Sender is not Governer")
        })
        it.only('allow bypass of ownerOnly if valid rule', async()=>{
          await ERC20.toggleBypassability()
          await ERC20.changeContractDetails("SomeName","smbl",8)
          await ERC20.addBypassRule(util.bob.address, "0x425a71c0", 0)
          let currentName = await ERC20.name()
          expect(currentName).to.equal("SomeName")
          ERC20 = await util.getERC20(ERC20.address, util.bob)
          await ERC20.changeContractDetails("AnotherName","smbl",8)
          currentName = await ERC20.name()
          expect(currentName).to.equal("AnotherName")
        })
    })
    
    describe('Handler Callbacks', ()=>{        
        it.only('can execute single mint callback', async()=>{
            await util.handler.registerCallback(ERC20.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            let ticks = await util.handler.ticks()
            expect(ticks).to.equal(0)
            await ERC20.mint(util.deployer.address, 1)
            ticks = await util.handler.ticks();
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            expect(ticks).to.equal(1)
            expect(lastTokenId).to.equal(1)
            expect(lastTo).to.equal(util.deployer.address)
          })
          it.only('can execute single transfer callback', async()=>{
            await util.handler.registerCallback(ERC20.address, util.handler.address, 1, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
            let ticks = await util.handler.ticks()
            expect(ticks).to.equal(0)
            await ERC20.mint(util.deployer.address, 1)
            await ERC20.transferFrom(util.deployer.address, util.bob.address, 1)
            ticks = await util.handler.ticks()
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            let lastFrom = await util.handler.lastFrom()
            expect(ticks).to.equal(1)
            expect(lastTokenId).to.equal(1)
            expect(lastTo).to.equal(util.bob.address)
            expect(lastFrom).to.equal(util.deployer.address)
          })
          it.only('can execute single burn callback', async()=>{
            await util.handler.registerCallback(ERC20.address, util.handler.address, 1, CALLBACK_TYPE.BURN, TEST_CALLBACK_FUNCTION, true)
            let ticks = await util.handler.ticks()
            expect(ticks).to.equal(0)
            await ERC20.mint(util.deployer.address, 1)
            await ERC20.burn(1)
            ticks = await util.handler.ticks()
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            let lastFrom = await util.handler.lastFrom()
            expect(ticks).to.equal(1)
            expect(lastTokenId).to.equal(1)
            expect(lastTo).to.equal("0x0000000000000000000000000000000000000000")
            expect(lastFrom).to.equal(util.deployer.address)
          })
    })
})
async function sign(web3, hash){
    let accounts = await web3.eth.getAccounts()
    let signature = await web3.eth.sign(hash, accounts[0])
    return signature
}