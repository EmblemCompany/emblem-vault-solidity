const { ethers } = require('hardhat');
const { CID } = require('multiformats/cid');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const HDWalletProvider = require("@truffle/hdwallet-provider")
const Web3 = require('web3');
const util = new Util()
const TEST_CALLBACK_FUNCTION = "0x684ee7de" //web3.eth.abi.encodeFunctionSignature('testCallback(address _from, address _to, uint256 tokenId)').substr(0, 10)
const TEST_REVERT_CALLBACK_FUNCTION = "0x5d1c03dd"
const TEST_FAKE_CALLBACK_FUNCTION = "0x4e1c03dd"
const CALLBACK_TYPE = {"MINT": 0,"TRANSFER": 1,"CLAIM":2}
const REGISTRATION_TYPE = {"EMPTY": 0, "ERC1155": 1, "ERC721":2, "HANDLER":3, "ERC20":4, "BALANCE":5, "CLAIM":6, "UNKNOWN":7}// 0 EMPTY, 1 ERC1155, 2 ERC721, 3 HANDLER, 4 ERC20, 5 BALANCE, 6 CLAIM 7 UNKNOWN

beforeEach(async ()=>{
  await util.deploy();
})

describe('ERC721', () => {
  it('should deploy vault', async ()=>{
    await util.cloneHandler(util.deployer.address)
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = await util.getEmblemVault(emblemAddress, util.deployer)
    let contractName = await emblemContract.name()
    expect(contractName).to.equal("Emblem Vault V2")
  })

  describe('Mint', ()=>{
    it('should not allow minting if not owned', async ()=>{
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      let emblemContract = await util.getEmblemVault(emblemAddress, util.deployer)
      let tx = emblemContract.mint(util.deployer.address, 1, "test", 0x0)
      await expect(tx).to.be.revertedWith('018001')
    })
    it('should allow minting if owned', async ()=>{
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      let emblemContract = await util.getEmblemVault(emblemAddress, util.deployer)
      await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
      await emblemContract.mint(util.deployer.address, 1, "test", 0x0)
      let owner = await emblemContract.ownerOf(1)
      await expect(owner).to.equal(util.deployer.address)
    })
    it('should serialize and hash locally', async () => {
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, util.deployer.address, 123, {type: 'uint256[]', value: [4,5,6]})
      expect(hash).to.exist
    })
    it('should verify signature and hash in handler', async () => {
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, util.deployer.address, 123, {type: 'uint256[]', value: [4,5,6]})
      let sig = await sign(web3, hash)
      let address = await util.handler.getAddressFromSignatureHash(hash, sig)
      expect(address).to.equal('0xB35a0b332657efE5d69792FCA9436537d263472F')
      // console.log(address)
    })
    it('should not be witnessed if signer not a witness', async () => {
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, util.deployer.address, 123, {type: 'uint256[]', value: [4,5,6]})
      let sig = await sign(web3, hash)
      let witnessed = await util.handler.isWitnessed(hash, sig)
      expect(witnessed).to.equal(false)
    })
    it('should be witnessed if signer is a witness', async () => {
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      await util.handler.addWitness("0xB35a0b332657efE5d69792FCA9436537d263472F")
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, util.deployer.address, 123, {type: 'uint256[]', value: [4,5,6]})
      let sig = await sign(web3, hash)
      let witnessed = await util.handler.isWitnessed(hash, sig)
      expect(witnessed).to.equal(true)
    })
    it('should get correct address from signature', async () => {
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      await util.handler.addWitness("0xB35a0b332657efE5d69792FCA9436537d263472F")
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, util.deployer.address, 123, 111, "payload")
      let sig = await sign(web3, hash)
      let witnessed = await util.handler.isWitnessed(hash, sig)
      expect(witnessed).to.equal(true)
      let address = await util.handler.getAddressFromSignatureMint(emblemAddress, util.deployer.address, 123, 111, "payload", sig);
      expect(address).to.equal('0xB35a0b332657efE5d69792FCA9436537d263472F')
    })
    it('should fail to mint with signature if signer is not a witness', async () => {
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      await util.handler.changePrice(0)
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, util.deployer.address, 123, 111, "payload")
      let sig = await sign(web3, hash)
      let tx = util.handler.buyWithSignature(emblemAddress, util.deployer.address, 123, "payload", 111, sig)
      await expect(tx).to.be.revertedWith('Not Witnessed')
    })
    it('should mint via handler with signature if signer is a witness', async () => {
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      let emblemContract = await util.getEmblemVault(emblemAddress, util.deployer)
      await util.handler.changePrice(0)
      await util.handler.addWitness("0xB35a0b332657efE5d69792FCA9436537d263472F")
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, util.deployer.address, 123, 111, "payload")
      let sig = await sign(web3, hash)
      let balance = await emblemContract.balanceOf(util.deployer.address)
      expect(balance.toNumber()).to.equal(0)
      await util.handler.buyWithSignature(emblemAddress, util.deployer.address, 123, "payload", 111, sig)
      balance = await emblemContract.balanceOf(util.deployer.address)
      expect(balance.toNumber()).to.equal(1)
    })
    it('should mint via handler with signed price', async () => {
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      let covalAddress = await util.factory.erc20Implementation()
      let emblemContract = await util.getEmblemVault(emblemAddress, util.deployer)
      await util.handler.changePrice(0)
      await util.handler.addWitness("0xB35a0b332657efE5d69792FCA9436537d263472F")
      var provider = selectProvider("mainnet")
      var web3 = new Web3(provider)
      let hash = web3.utils.soliditySha3(emblemAddress, covalAddress, 0, util.deployer.address, 123, 111, "payload")
      let sig = await sign(web3, hash)
      let balance = await emblemContract.balanceOf(util.deployer.address)
      expect(balance.toNumber()).to.equal(0)
      await util.handler.buyWithSignedPrice(emblemAddress, covalAddress, 0, util.deployer.address, 123, "payload", 111, sig)
      balance = await emblemContract.balanceOf(util.deployer.address)
      expect(balance.toNumber()).to.equal(1)
    })
  })
  describe('Claim', ()=>{
    it('should not claim via handler without permission', async()=>{
      await util.cloneHandler(util.deployer.address)
      await util.cloneClaimed(util.deployer.address)
      let claimedContract = util.getClaimed(util.claimer.address, util.deployer)
      await claimedContract.initialize()
      let emblemAddress = await util.factory.emblemImplementation()
      let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)    
      await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0, 1)
      let owner = await emblemContract.ownerOf(1)
      await expect(owner).to.equal(util.deployer.address)
      let tx = util.handler.claim(emblemAddress, 1)
      expect(tx).to.be.revertedWith("003004")
    })
    it('should claim erc721 via handler with permission', async()=>{
      await util.cloneHandler(util.deployer.address)
      await util.cloneClaimed(util.deployer.address)
      let claimedContract = util.getClaimed(util.claimer.address, util.deployer)
      await claimedContract.initialize()
      await util.handler.registerContract(util.claimer.address, 6)    
      await claimedContract.registerContract(util.handler.address, 3)
      let emblemAddress = await util.factory.emblemImplementation()
      let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
      await util.handler.registerContract(emblemAddress, 2)
      await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0, 1)
      let owner = await emblemContract.ownerOf(1)
      expect(owner).to.equal(util.deployer.address)
      let approved = await emblemContract.isApprovedForAll(util.deployer.address, util.handler.address)
      expect(approved).to.be.false
      await emblemContract.setApprovalForAll(util.handler.address, true)
      approved = await emblemContract.isApprovedForAll(util.deployer.address, util.handler.address)
      expect(approved).to.be.true
      let isClaimed = await util.claimer.isClaimed(emblemAddress, 1, [])
      expect(isClaimed).to.be.false
      await util.handler.claim(emblemAddress, 1)
      isClaimed = await util.claimer.isClaimed(emblemAddress, 1, [])
      expect(isClaimed).to.be.true
      let claimedBy = await util.claimer.claimedBy(emblemAddress, 1)
      expect(claimedBy[0]).to.equal(util.deployer.address)
      expect(claimedBy[1]).to.equal('record')
    })
    it('should not be able to mint previously claimed erc721 vault', async()=>{
      await util.cloneHandler(util.deployer.address)
      await util.cloneClaimed(util.deployer.address)
      let claimedContract = util.getClaimed(util.claimer.address, util.deployer)
      await claimedContract.initialize()
      await util.handler.registerContract(util.claimer.address, 6)
      await claimedContract.registerContract(util.handler.address, 3)
      let emblemAddress = await util.factory.emblemImplementation()
      let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
      await util.handler.registerContract(emblemAddress, 2)
      await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0, 1)
      await emblemContract.setApprovalForAll(util.handler.address, true)
      let isClaimed = await util.claimer.isClaimed(emblemAddress, 1, [])
      expect(isClaimed).to.be.false
      await util.handler.claim(emblemAddress, 1)
      isClaimed = await util.claimer.isClaimed(emblemAddress, 1, [])
      expect(isClaimed).to.be.true
      let tx = util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0, 1)
      expect(tx).to.be.revertedWith("003006")
      let claimedBy = await util.claimer.claimedBy(emblemAddress, 1)
      expect(claimedBy[0]).to.equal(util.deployer.address)
      expect(claimedBy[1]).to.equal('record')
    })
    it('should be able to toggle can claim if admin', async()=>{
      await util.cloneHandler(util.deployer.address)
      await util.cloneClaimed(util.deployer.address)
      let claimedContract = util.getClaimed(util.claimer.address, util.deployer)
      await claimedContract.initialize()
      await util.handler.registerContract(util.claimer.address, 6)    
      await claimedContract.registerContract(util.handler.address, 3)
      let emblemAddress = await util.factory.emblemImplementation()
      let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
      await util.handler.registerContract(emblemAddress, 2)
      await util.handler.mint(emblemAddress, util.deployer.address, 1, "test", 0x0, 1)
      await emblemContract.setApprovalForAll(util.handler.address, true)
      await claimedContract.toggleCanClaim()
      let tx = util.handler.claim(emblemAddress, 1)
      await expect(tx).to.be.revertedWith("Claiming is turned off")      
    })
  })
  describe('Handler Callbacks', ()=>{
    it('can execute single mint callback', async()=>{
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      let ERC721 = await util.getEmblemVault(emblemAddress, util.deployer)
      await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
      await ERC721.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
      await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
      await util.handler.registerCallback(ERC721.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
      await ERC721.transferOwnership(util.handler.address)
      let ticks = await util.handler.ticks()
      expect(ticks).to.equal(0)
      await util.handler.mint(ERC721.address, util.deployer.address, 1, "", "", 1)
      ticks = await util.handler.ticks();
      let lastTokenId = await util.handler.lastTokenId()
      let lastTo = await util.handler.lastTo()
      expect(ticks).to.equal(1)
      expect(lastTokenId).to.equal(1)
      expect(lastTo).to.equal(util.deployer.address)
    })
    it('can execute single transfer callback', async()=>{
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      let ERC721 = await util.getEmblemVault(emblemAddress, util.deployer)
      await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
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
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      let ERC721 = await util.getEmblemVault(emblemAddress, util.deployer)
      await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
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
      await util.cloneHandler(util.deployer.address)
      let emblemAddress = await util.factory.emblemImplementation()
      let ERC721 = await util.getEmblemVault(emblemAddress, util.deployer)
      await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
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
  return new HDWalletProvider(process.env.ETHKEY || "c1fc1fe3db1e71bb457c5f8f10de8ff349d24f30f56a1e6a92e55ef90d961328", selectProviderEndpoint(network), 0, 1)
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
