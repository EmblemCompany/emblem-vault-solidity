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


describe('Legacy Vault Handler', () => {    
  beforeEach(async ()=>{
    await util.deployHandler()
    await util.deployERC721Factory()
    await util.deployERC20Factory()
    await util.deployClaimedUpgradable()
    await util.deployLegacyHandler()
    ERC721 = util.emblem
  })
  it('should deploy handler', async ()=>{
    expect(util.legacy_handler.address).to.not.equal("0x0000000000000000000000000000000000000000")
  })
  it('should deploy ERC721 Vault', async ()=>{
    expect(ERC721.address).to.exist
  })

  it('signer should be witness', async()=>{
    let isWitness = await util.legacy_handler.witnesses(util.witness)
    expect(isWitness).to.be.false
    await util.legacy_handler.addWitness(util.witness)
    isWitness = await util.legacy_handler.witnesses(util.witness)
    expect(isWitness).to.be.true
  })

  it('handler should own vault contract', async ()=>{
    let owner = await ERC721.owner()
    expect(owner).to.equal(util.deployer.address)
    await ERC721.transferOwnership(util.legacy_handler.address)
    owner = await ERC721.owner()
    console.log('handler address', util.legacy_handler.address, 'deployer', util.deployer.address, 'owner', owner)
    expect(owner).to.equal(util.legacy_handler.address)
  })

  it('old buy with signature will allow minting of claimed tokens', async ()=>{
    await util.legacy_handler.addWitness(util.witness)
    await util.legacy_handler.addClaimAddress(util.claimedUpgradable.address)
    await util.claimedUpgradable.registerContract(util.legacy_handler.address, 11)
    var provider = util.selectProvider("mainnet")
    var web3 = new Web3(provider)
    await ERC721.mint(util.deployer.address, 123, 'a', 'a')
    await ERC721.transferOwnership(util.legacy_handler.address)
    await ERC721.setApprovalForAll(util.legacy_handler.address, true)
    let balance = await ERC721.ownerOf(123)
    expect(balance).to.equal(util.deployer.address)
    await util.legacy_handler.claimOnChain(123)
    balance = ERC721.ownerOf(123)
    await expect(balance).to.be.revertedWith('003002')
    let hash = web3.utils.soliditySha3('123'+'a'+ 1)
    let sig = await sign(web3, hash)
    await util.legacy_handler.buyWithSignature(util.deployer.address, 123, 'a', 1, sig)
    balance = await ERC721.ownerOf(123)
    expect(balance).to.equal(util.deployer.address)
  })

  it('new buy with signature method does not allow minting previously claimed tokens', async()=>{
    await util.legacy_handler.addWitness(util.witness)
    await util.legacy_handler.addClaimAddress(util.claimedUpgradable.address)
    await util.claimedUpgradable.registerContract(util.legacy_handler.address, 11)
    var provider = util.selectProvider("mainnet")
    var web3 = new Web3(provider)
    await ERC721.mint(util.deployer.address, 123, 'a', 'a')
    await ERC721.transferOwnership(util.legacy_handler.address)
    await ERC721.setApprovalForAll(util.legacy_handler.address, true)
    let balance = await ERC721.ownerOf(123)
    expect(balance).to.equal(util.deployer.address)
    await util.legacy_handler.claimOnChain(123)
    balance = ERC721.ownerOf(123)
    await expect(balance).to.be.revertedWith('003002')
    let currentBlockNumber = await web3.eth.getBlockNumber()
    let hash = web3.utils.soliditySha3('123'+'a'+ currentBlockNumber +1)
    let sig = await sign(web3, hash)
    let tx = util.legacy_handler.buyWithSignature2(util.deployer.address, 123, 'a', 1, currentBlockNumber, sig)
    await expect(tx).to.be.revertedWith('Already claimed')
  })

  it('admin can adjust block window', async()=>{
    await util.legacy_handler.adjustBlockWindow(1)
    let handler = util.getLegacyHandler(util.legacy_handler.address, util.alice)
    let tx = handler.adjustBlockWindow(1)
    await expect(tx).to.be.revertedWith('Caller is not owner')
  })

  it('mint outside blockWindow is not successful', async()=>{
    await util.legacy_handler.adjustBlockWindow(1)
    await util.legacy_handler.addWitness(util.witness)
    await ERC721.transferOwnership(util.legacy_handler.address)
    var provider = util.selectProvider("mainnet")
    var web3 = new Web3(provider)
    let signedBlock = (await ethers.provider.getBlock("latest")).number
    let hash = web3.utils.soliditySha3('456'+'a'+ signedBlock + 2)
    let sig = await sign(web3, hash) 
    let tx =  util.legacy_handler.buyWithSignature2(util.deployer.address, 456, 'a', 2, signedBlock, sig)    
    await expect(tx).to.be.revertedWith('Signature expired')
  })

  it('mint within blockWindow is successful', async()=>{
    await util.legacy_handler.addWitness(util.witness)
    await util.legacy_handler.addClaimAddress(util.claimedUpgradable.address)
    await util.claimedUpgradable.registerContract(util.legacy_handler.address, 11)
    await ERC721.transferOwnership(util.legacy_handler.address)
    var provider = util.selectProvider("mainnet")
    var web3 = new Web3(provider)
    let signedBlock = (await ethers.provider.getBlock("latest")).number
    let hash = web3.utils.soliditySha3('456'+'a'+ signedBlock + 2)
    let sig = await sign(web3, hash)
    await util.legacy_handler.buyWithSignature2(util.deployer.address, 456, 'a', 2, signedBlock, sig) 
    let balance = await ERC721.ownerOf(456)
    expect(balance).to.equal(util.deployer.address)
  })

  it('mint from blacklisted is not successful', async()=>{
    await util.legacy_handler.addClaimAddress(util.claimedUpgradable.address)
    await util.claimedUpgradable.registerContract(util.legacy_handler.address, 11)
    await util.legacy_handler.toggleBlacklist(util.deployer.address)
    await ERC721.transferOwnership(util.legacy_handler.address)
    var provider = util.selectProvider("mainnet")
    var web3 = new Web3(provider)
    let signedBlock = (await ethers.provider.getBlock("latest")).number
    let hash = web3.utils.soliditySha3('456'+'a'+ signedBlock + 2)
    let sig = await sign(web3, hash)
    let tx =  util.legacy_handler.buyWithSignature2(util.deployer.address, 456, 'a', 2, signedBlock, sig)    
    await expect(tx).to.be.revertedWith('Caller is blacklisted')
  })

  it('mint after burn vs claim is not sucessful', async()=>{
    await util.legacy_handler.addWitness(util.witness)
    await util.legacy_handler.addClaimAddress(util.claimedUpgradable.address)
    await util.claimedUpgradable.registerContract(util.legacy_handler.address, 11)
    await ERC721.transferOwnership(util.legacy_handler.address)
    var provider = util.selectProvider("mainnet")
    var web3 = new Web3(provider)
    let signedBlock = (await ethers.provider.getBlock("latest")).number
    let hash = web3.utils.soliditySha3('456'+'a'+ signedBlock + 2)
    let sig = await sign(web3, hash)
    await util.legacy_handler.buyWithSignature2(util.deployer.address, 456, 'a', 2, signedBlock, sig) 
    await ERC721.burn(456);
    signedBlock = (await ethers.provider.getBlock("latest")).number
    hash = web3.utils.soliditySha3('456'+'a'+ signedBlock + 3)
    sig = await sign(web3, hash)
    let tx = util.legacy_handler.buyWithSignature2(util.deployer.address, 456, 'a', 3, signedBlock, sig) 
    await expect(tx).to.be.revertedWith('Already claimed')
  })

  it('onchain claim is succcessful', async()=>{
    await util.legacy_handler.addWitness(util.witness)
    await util.legacy_handler.addClaimAddress(util.claimedUpgradable.address)
    await util.claimedUpgradable.registerContract(util.legacy_handler.address, 11)
    var provider = util.selectProvider("mainnet")
    var web3 = new Web3(provider)
    await ERC721.mint(util.deployer.address, 123, 'a', 'a')
    await ERC721.transferOwnership(util.legacy_handler.address)
    await ERC721.setApprovalForAll(util.legacy_handler.address, true)
    await util.legacy_handler.claimOnChain(123)
  })

  it('MOVE sig: for testing purposes only', async ()=>{
    var provider = util.selectProvider("mainnet")
    var web3 = new Web3(provider)
    let hash = web3.utils.soliditySha3("0x67f3d3b7eF0359D92605F48E46F069d06805751f", "0x9022fb4487EBa36D5BBb0a1459247E0A6072430E", 54321, 326113, 8438894575)
    // console.log("hash", hash)
    let sig = await sign(web3, hash)
    // console.log("sig", sig)
  })
  it('ABI: for testing purposes only', async ()=>{
    var web3 = new Web3()
    // console.log("hash", web3.utils.soliditySha3(123))
    // console.log("bytes", util.serializeUintToBytes(123))
  })
  
})


function getRandom(myArray) {
  let selected = myArray[Math.floor(Math.random() * myArray.length)];
  return selected
}
function getWitnessSignature(web3, hash, cb) {
  web3.eth.getAccounts().then(async (accounts) => {
      var currentAccount = accounts[0].toLowerCase()
      return web3.eth.sign(hash, currentAccount, (err, res) => {
          return cb(res)
      })
  })
}
async function sign(web3, hash){
  let accounts = await web3.eth.getAccounts()
  let signature = await web3.eth.sign(hash, accounts[0])
  return signature
}
// function selectProvider(network) {
//   return new HDWalletProvider(process.env.ETHKEY || "a819fcd7afa2c39a7f9baf70273a128875b6c9f03001b218824559ccad6ef11c", selectProviderEndpoint(network), 0, 1)
// }
// function selectProviderEndpoint(network) {
//   return infuraEndpoints.filter(item => { return item.network == network })[0].address
// }
// const MATIC_IDS = [
//   "41f5f3cbf83536b2bf235d2be67a16bf6e5647dd"
// ]
// const INFURA_IDS = [
//   "6112845322b74decbf08005aea176252", // <-- free backup
//   "8e5d2af8fbe244f7b7f32e2ddc152508",
//   "2e2998d61b0644fe8174bca015096245"
// ]
// const infuraEndpoints = [
//   { network: "rinkeby", address: "https://rinkeby.infura.io/v3/" + getRandom(INFURA_IDS) || INFURA_ID },
//   { network: "mainnet", address: "https://mainnet.infura.io/v3/" + getRandom(INFURA_IDS) || INFURA_ID },
//   { network: "mumbai", address: "https://rpc-mumbai.maticvigil.com/v1/" + getRandom(MATIC_IDS) },
//   { network: "matic", address: "https://rpc-mainnet.maticvigil.com/v1/" + getRandom(MATIC_IDS) },
//   { network: "xdai", address: "https://rpc.xdaichain.com/" },
//   { network: "bsc", address: "https://bsc-dataseed.binance.org/" },
//   { network: "fantom", address: "https://rpcapi.fantom.network" }
// ]
