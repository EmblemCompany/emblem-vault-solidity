const { ethers } = require('hardhat');
const { CID } = require('multiformats/cid');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const HDWalletProvider = require("@truffle/hdwallet-provider")
const Web3 = require('web3');
const util = new Util()
beforeEach(async ()=>{
  await util.deploy();
})
describe('Emblem Vault', () => {
  it('should deploy vault', async ()=>{
    await util.cloneHandler(util.deployer.address)
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = await util.getEmblemVault(emblemAddress, util.deployer)
    let contractName = await emblemContract.name()
    expect(contractName).to.equal("Emblem Vault V2")
  })
  
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
  it('should mint with signature if signer is a witness', async () => {
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
  it('should mint with signed price', async () => {
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
