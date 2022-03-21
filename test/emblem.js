const { ethers } = require('hardhat');
const { CID } = require('multiformats/cid');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const HDWalletProvider = require("@truffle/hdwallet-provider")
const Web3 = require('web3');
const { utils } = require('web3');
const util = new Util()
const TEST_CALLBACK_FUNCTION = "0x684ee7de" //web3.eth.abi.encodeFunctionSignature('testCallback(address _from, address _to, uint256 tokenId)').substr(0, 10)
const TEST_REVERT_CALLBACK_FUNCTION = "0x5d1c03dd"
const TEST_FAKE_CALLBACK_FUNCTION = "0x4e1c03dd"
const CALLBACK_TYPE = {"MINT": 0,"TRANSFER": 1,"CLAIM":2}
const REGISTRATION_TYPE = {"EMPTY": 0, "ERC1155": 1, "ERC721":2, "HANDLER":3, "ERC20":4, "BALANCE":5, "CLAIM":6, "UNKNOWN":7, "FACTORY":8, "STAKING": 9, "BYPASS": 10}// 0 EMPTY, 1 ERC1155, 2 ERC721, 3 HANDLER, 4 ERC20, 5 BALANCE, 6 CLAIM 7 UNKNOWN
let emblemAddress, emblemContract

describe('ERC721', () => {
  beforeEach(async ()=>{
    await util.deployHandler()
    await util.deployBalanceUpgradable();
    await util.deployClaimedUpgradable();
    await util.deployERC721Factory()
    await util.deployERC20Factory()
  })
  it('should deploy vault', async ()=>{
    let emblemAddress = util.emblem.address
    let emblemContract = await util.getEmblemVault(emblemAddress, util.deployer)
    let contractName = await emblemContract.name()
    expect(contractName).to.equal("Emblem Vault V2")
    let owner = await util.emblem.owner()
    expect(owner).to.equal(util.deployer.address)
  })

  it('should deploy stream', async ()=>{
    let streamAddress = await util.emblem.streamAddress()
    let stream = util.getContract(streamAddress, "Stream", util.deployer)
    expect(await util.emblem.owner()).to.equal(util.deployer.address)
    expect(await stream.owner()).to.equal(util.deployer.address)
  })

  describe('Mint', ()=>{
    it('should allow minting if owned', async ()=>{
      await util.emblem.mint(util.deployer.address, 100, "test", 0x0)
      let owner = await util.emblem.ownerOf(100)
      await expect(owner).to.equal(util.deployer.address)
    })
    it('should serialize and hash locally', async () => {
      var web3 = new Web3()
      let hash = web3.utils.soliditySha3(util.emblem.address, util.deployer.address, 123, {type: 'uint256[]', value: [4,5,6]})
      expect(hash).to.exist
    })
    it('should verify signature and hash in handler', async () => {
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(util.emblem.address, util.deployer.address, 123, {type: 'uint256[]', value: [4,5,6]})
      let sig = await sign(web3, hash)
      let address = await util.handler.getAddressFromSignatureHash(hash, sig)
      expect(address).to.equal('0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396')
    })
    it('should not be witnessed if signer not a witness', async () => {
      let emblemAddress = util.emblem.address
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, util.deployer.address, 123, {type: 'uint256[]', value: [4,5,6]})
      let sig = await sign(web3, hash)
      let witnessed = await util.handler.isWitnessed(hash, sig)
      expect(witnessed).to.equal(false)
    })
    it('should be witnessed if signer is a witness', async () => {
      let emblemAddress = util.emblem.address
      await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, util.deployer.address, 123, {type: 'uint256[]', value: [4,5,6]})
      let sig = await sign(web3, hash)
      let witnessed = await util.handler.isWitnessed(hash, sig)
      expect(witnessed).to.equal(true)
    })
    it('should get correct address from signature', async () => {
      let emblemAddress = util.emblem.address
      await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, util.deployer.address, 123, 111, "payload")
      let sig = await sign(web3, hash)
      let witnessed = await util.handler.isWitnessed(hash, sig)
      expect(witnessed).to.equal(true)
      let address = await util.handler.getAddressFromSignatureMint(emblemAddress, util.deployer.address, 123, 111, "payload", sig);
      expect(address).to.equal('0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396')
    })
    it('should fail to mint with signature if signer is not a witness', async () => {
      let emblemAddress = util.emblem.address
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, util.erc20.address, 0, util.deployer.address, 123, 111, "payload")
      let sig = await sign(web3, hash)
      let tx = util.handler.buyWithSignedPrice(emblemAddress, util.erc20.address, 0, util.deployer.address, 123, "payload", 111, sig, util.serializeUintToBytes(0))
      await expect(tx).to.be.revertedWith('Not Witnessed')
    })
    it('should mint via handler with signature if signer is a witness', async () => {
      let emblemAddress = util.emblem.address
      let emblemContract = await util.getEmblemVault(emblemAddress, util.deployer)
      await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, util.erc20.address, 0, util.deployer.address, 123, 111, "payload")
      let sig = await sign(web3, hash)
      let balance = await emblemContract.balanceOf(util.deployer.address)
      expect(balance.toNumber()).to.equal(0)
      await emblemContract.transferOwnership(util.handler.address)
      await util.erc20.transferOwnership(util.handler.address)
      await util.handler.buyWithSignedPrice(emblemAddress, util.erc20.address, 0, util.deployer.address, 123, "payload", 111, sig, util.serializeUintToBytes(0))
      balance = await emblemContract.balanceOf(util.deployer.address)
      expect(balance.toNumber()).to.equal(1)
    })
    it('should mint via handler with signed price', async () => {
      let emblemAddress = util.emblem.address
      let covalAddress = util.erc20.address
      let emblemContract = await util.getEmblemVault(emblemAddress, util.deployer)
      await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, covalAddress, 0, util.deployer.address, 123, 111, "payload")
      let sig = await sign(web3, hash)
      let balance = await emblemContract.balanceOf(util.deployer.address)
      expect(balance.toNumber()).to.equal(0)
      await emblemContract.transferOwnership(util.handler.address)
      await util.erc20.transferOwnership(util.handler.address)
      await util.handler.buyWithSignedPrice(emblemAddress, covalAddress, 0, util.deployer.address, 123, "payload", 111, sig, util.serializeUintToBytes(0))
      balance = await emblemContract.balanceOf(util.deployer.address)
      expect(balance.toNumber()).to.equal(1)
    })
  })
  describe('Bypass', ()=>{
    beforeEach(async ()=>{
    })

    it('not allow bypass if bypass not allowed', async()=>{
        await util.emblem.mint(util.deployer.address, 789, "uri", "payload")
        ERC721 = await util.getEmblemVault(util.emblem.address, util.bob)
        let tx = ERC721.transferFrom(util.deployer.address, util.bob.address, 789)
        await expect(tx).to.be.revertedWith("003004")
    })
    it('not allow bypass if bypass allowed and not registered as bypasser', async()=>{
      await util.emblem.mint(util.deployer.address, 789, "uri", "payload")
      await util.emblem.toggleBypassability()
      ERC721 = await util.getEmblemVault(util.emblem.address, util.bob)
      let tx = ERC721.transferFrom(util.deployer.address, util.bob.address, 789)
      await expect(tx).to.be.revertedWith("003004")
    })
    it('only admin can add bypasser', async()=>{
        await util.emblem.mint(util.deployer.address, 789, "uri", "payload")
        await util.emblem.toggleBypassability()
        ERC721 = await util.getEmblemVault(util.emblem.address, util.bob)
        let tx = ERC721.registerContract(util.bob.address, REGISTRATION_TYPE.BYPASS)
        await expect(tx).to.be.revertedWith("Contract is not registered nor Owner")
    })
    it('allow bypass if bypass allowed and registered as bypasser', async()=>{       
        await util.emblem.mint(util.deployer.address, 789, "uri", "payload")
        let balanceERC721 = await util.emblem.balanceOf(util.bob.address)
        expect(balanceERC721).to.equal(0)
        await util.emblem.toggleBypassability()
        await util.emblem.addBypassRule(util.bob.address, "0x23b872dd", 789);
        ERC721 = await util.getEmblemVault(util.emblem.address, util.bob)
        await ERC721.transferFrom(util.deployer.address, util.bob.address, 789)
        balanceERC721 = await ERC721.balanceOf(util.bob.address)
        expect(balanceERC721).to.equal(1)
    })
    it('not allow bypass of ownerOnly if no valid rule', async()=>{
      await util.emblem.toggleBypassability()
      ERC721 = await util.getEmblemVault(util.emblem.address, util.bob)
      let tx = ERC721.changeName("New Name", "smbl")
      await expect(tx).to.be.revertedWith("Not owner or able to bypass")
    })
    it('allow bypass of ownerOnly if valid rule', async()=>{
      await util.emblem.toggleBypassability()
      let currentName = await util.emblem.name()
      expect(currentName).to.equal("Emblem Vault V2")
      await util.emblem.addBypassRule(util.bob.address, "0x86575e40", 0);
      ERC721 = await util.getEmblemVault(util.emblem.address, util.bob)
      await ERC721.changeName("New Name", "smbl")
      currentName = await util.emblem.name()
      expect(currentName).to.equal("New Name")
    })
    it('removal of rule prevents bypass of ownerOnly', async()=>{
      await util.emblem.toggleBypassability()
      await util.emblem.addBypassRule(util.bob.address, "0x86575e40", 0);
      ERC721 = await util.getEmblemVault(util.emblem.address, util.bob)
      await ERC721.changeName("New Name", "smbl")
      let currentName = await util.emblem.name()
      expect(currentName).to.equal("New Name")
      ERC721 = await util.getEmblemVault(util.emblem.address, util.deployer)
      await ERC721.removeBypassRule(util.bob.address, "0x86575e40", 0)
      ERC721 = await util.getEmblemVault(util.emblem.address, util.bob)
      let tx = ERC721.changeName("Another Name", "smbl")
      await expect(tx).to.be.revertedWith("Not owner or able to bypass")
    })
  })
  describe('Claim', ()=>{
    it('should not claim via handler without permission', async()=>{
      let claimedContract = util.claimedUpgradable
      let emblemAddress = util.emblem.address
      let emblemContract = util.emblem
      await emblemContract.transferOwnership(util.handler.address)
      await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0, 1)
      let owner = await emblemContract.ownerOf(1)
      await expect(owner).to.equal(util.deployer.address)
      let tx = util.handler.claim(emblemAddress, 1)
      expect(tx).to.be.revertedWith("003004")
    })
    it('should claim erc721 via handler with permission', async()=>{
      let claimedContract = util.claimedUpgradable
      await util.handler.registerContract(util.claimedUpgradable.address, 6)    
      await claimedContract.registerContract(util.handler.address, 3)
      let emblemAddress = util.emblem.address
      let emblemContract = util.emblem
      await util.handler.registerContract(emblemAddress, 2)
      await emblemContract.transferOwnership(util.handler.address)
      await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0, 1)
      let owner = await emblemContract.ownerOf(1)
      expect(owner).to.equal(util.deployer.address)
      let approved = await emblemContract.isApprovedForAll(util.deployer.address, util.handler.address)
      expect(approved).to.be.false
      await emblemContract.setApprovalForAll(util.handler.address, true)
      approved = await emblemContract.isApprovedForAll(util.deployer.address, util.handler.address)
      expect(approved).to.be.true
      let isClaimed = await util.claimedUpgradable.isClaimed(emblemAddress, 1, [])
      expect(isClaimed).to.be.false
      await util.handler.claim(emblemAddress, 1)
      isClaimed = await util.claimedUpgradable.isClaimed(emblemAddress, 1, [])
      expect(isClaimed).to.be.true
      let claimedBy = await util.claimedUpgradable.claimedBy(emblemAddress, 1)
      expect(claimedBy[0]).to.equal(util.deployer.address)
      expect(claimedBy[1]).to.equal('record')
    })
    it('should not be able to mint previously claimed erc721 vault', async()=>{
      let claimedContract = util.claimedUpgradable
      await util.handler.registerContract(util.claimedUpgradable.address, 6)
      await claimedContract.registerContract(util.handler.address, 3)
      let emblemAddress = util.emblem.address
      let emblemContract = util.emblem
      await util.handler.registerContract(emblemAddress, 2)
      await emblemContract.transferOwnership(util.handler.address)
      await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0, 1)
      await emblemContract.setApprovalForAll(util.handler.address, true)
      let isClaimed = await util.claimedUpgradable.isClaimed(emblemAddress, 1, [])
      expect(isClaimed).to.be.false
      await util.handler.claim(emblemAddress, 1)
      isClaimed = await util.claimedUpgradable.isClaimed(emblemAddress, 1, [])
      expect(isClaimed).to.be.true
      let tx = util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0, 1)
      expect(tx).to.be.revertedWith("003006")
      let claimedBy = await util.claimedUpgradable.claimedBy(emblemAddress, 1)
      expect(claimedBy[0]).to.equal(util.deployer.address)
      expect(claimedBy[1]).to.equal('record')
    })
    it('should be able to toggle can claim if admin', async()=>{
      let claimedContract = util.claimedUpgradable
      await util.handler.registerContract(util.claimedUpgradable.address, 6)    
      await claimedContract.registerContract(util.handler.address, 3)
      let emblemAddress = util.emblem.address
      let emblemContract = util.emblem
      await util.handler.registerContract(emblemAddress, 2)
      await emblemContract.transferOwnership(util.handler.address)
      await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0, 1)
      await emblemContract.setApprovalForAll(util.handler.address, true)
      await claimedContract.toggleCanClaim()
      let tx = util.handler.claim(emblemAddress, 1)
      await expect(tx).to.be.revertedWith("Claiming is turned off")      
    })
  })
  describe('Handler Callbacks', ()=>{
    it('can execute single mint callback', async()=>{
      let emblemAddress = util.emblem.address
      let ERC721 = await util.getEmblemVault(emblemAddress, util.deployer)
      await ERC721.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
      await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
      await util.handler.registerCallback(ERC721.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
      let ticks = await util.handler.ticks()
      expect(ticks).to.equal(0)
      await ERC721.transferOwnership(util.handler.address)
      await util.handler.mint(ERC721.address, util.deployer.address, 1, "", "", 1)
      ticks = await util.handler.ticks();
      let lastTokenId = await util.handler.lastTokenId()
      let lastTo = await util.handler.lastTo()
      expect(ticks).to.equal(1)
      expect(lastTokenId).to.equal(1)
      expect(lastTo).to.equal(util.deployer.address)
    })
    it('can execute single transfer callback', async()=>{
      let emblemAddress = util.emblem.address
      let ERC721 = await util.getEmblemVault(emblemAddress, util.deployer)
      await ERC721.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
      await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
      await util.handler.registerCallback(ERC721.address, util.handler.address, 1, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
      await ERC721.transferOwnership(util.handler.address)
      let ticks = await util.handler.ticks()
      expect(ticks).to.equal(0)
      await util.handler.mint(ERC721.address, util.deployer.address, 1, "", "", 1)
      await ERC721.transferFrom(util.deployer.address, util.bob.address, 1)
      ticks = await util.handler.ticks()
      let lastTokenId = await util.handler.lastTokenId()
      let lastTo = await util.handler.lastTo()
      let lastFrom = await util.handler.lastFrom()
      expect(ticks).to.equal(1)
      expect(lastTokenId).to.equal(1)
      expect(lastTo).to.equal(util.bob.address)
      expect(lastFrom).to.equal(util.deployer.address)
    })
    it('can execute wildcard callbacks on mint', async()=>{
      let emblemAddress = util.emblem.address
      let ERC721 = await util.getEmblemVault(emblemAddress, util.deployer)
      await ERC721.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
      await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
      await util.handler.registerWildcardCallback(ERC721.address, util.handler.address, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
      await ERC721.transferOwnership(util.handler.address)
      let ticks = await util.handler.ticks()
      expect(ticks).to.equal(0)
      await util.handler.mint(ERC721.address, util.deployer.address, 1, "", "", 1)
      await util.handler.mint(ERC721.address, util.deployer.address, 789, "", "", 1)
      ticks = await util.handler.ticks()
      let lastTokenId = await util.handler.lastTokenId()
      let lastTo = await util.handler.lastTo()
      let lastFrom = await util.handler.lastFrom()
      expect(ticks).to.equal(2)
      expect(lastTokenId).to.equal(789)
      expect(lastTo).to.equal(util.deployer.address)
      expect(lastFrom).to.equal("0x0000000000000000000000000000000000000000")
    })
    it('can turn toggle all callbacks', async()=>{
      let emblemAddress = util.emblem.address
      let ERC721 = await util.getEmblemVault(emblemAddress, util.deployer)
      await ERC721.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
      await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
      await util.handler.registerWildcardCallback(ERC721.address, util.handler.address, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
      await util.handler.toggleAllowCallbacks()
      await ERC721.transferOwnership(util.handler.address)
      await util.handler.mint(ERC721.address, util.deployer.address, 1, "", "", 1)
      let ticks = await util.handler.ticks()
      expect(ticks).to.equal(0)
      await util.handler.toggleAllowCallbacks()
      await util.handler.mint(ERC721.address, util.deployer.address, 2, "", "", 1)
      ticks = await util.handler.ticks()
      expect(ticks).to.equal(1)
    })
  })
})


function getRandom(myArray) {
  let selected = myArray[Math.floor(Math.random() * myArray.length)];
  return selected
}
async function sign(web3, hash){
  let accounts = await web3.eth.getAccounts()
  let signature = await web3.eth.sign(hash, accounts[0])
  return signature
}
function selectProvider(network) {
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
