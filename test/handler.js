const { ethers } = require('hardhat');
const { CID } = require('multiformats/cid');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const HDWalletProvider = require("@truffle/hdwallet-provider")
const Web3 = require('web3');
const util = new Util()
let ERC721, ERC1155
beforeEach(async ()=>{
  await util.deploy();
  await util.cloneEmblem(util.deployer.address)
  await util.cloneHandler(util.deployer.address)
  ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
  ERC721.mint(util.deployer.address, 1, "test", 0x0)
  ERC1155 = util.getERC1155((await util.factory.erc1155Implementation()), util.deployer)
})

describe('Vault Handler', () => {    
  it('should deploy handler', async ()=>{
    let initialized = await util.handler.initialized()
    expect(initialized).to.equal(true)
  })
  it('should transfer vault ownership to handler', async ()=>{
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = await util.getEmblemVault(emblemAddress, util.deployer)
    let owner = await emblemContract.owner()
    expect(owner).to.equal(util.handler.address)
  })
  it('should deploy ERC721 and ERC1155 Vaults', async ()=>{
    expect(ERC721.address).to.exist
    expect(ERC1155.address).to.exist
  })

  it('non existant vaultContract returns empty record', async ()=>{
    let contractRecord = await util.handler.registeredContracts(ERC721.address)
    expect(contractRecord).to.equal(0)
  })
  it('non admin can not add vaultContract', async ()=>{
    let handler = util.getHandler(util.handler.address, util.alice)
    let tx = handler.registerContract(ERC721.address, 0)
    await expect(tx).to.be.revertedWith('018001')
  })
  
  it('admin can add vaultContract', async ()=>{
    await util.handler.registerContract(ERC721.address, 1)
    let contractRecord = await util.handler.registeredContracts(ERC721.address)
    expect(contractRecord).to.equal(1)
  })

  it('admin can remove vaultContract', async ()=>{
    await util.handler.registerContract(ERC721.address, 2)
    let contractRecord = await util.handler.registeredContracts(ERC721.address)
    expect(contractRecord).to.equal(2)
    expect(await util.handler.contractCount()).to.equal(1)
    await util.handler.unregisterContract(ERC721.address,0)
    contractRecord = await util.handler.registeredContracts(ERC721.address)
    expect(contractRecord).to.equal(0)
    expect(await util.handler.contractCount()).to.equal(0)
  })

  it('can not move from unregistered contract', async ()=>{
    var provider = selectProvider("mainnet")
    var web3 = new Web3(provider)
    let hash = web3.utils.soliditySha3(ERC721.address, ERC1155.address, 2, 1, 111)
    let sig = await sign(web3, hash)
    await util.handler.addWitness("0xB35a0b332657efE5d69792FCA9436537d263472F")

    let tx = util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1, 111, sig)
    await expect(tx).to.be.revertedWith('Contract is not registered')
  })

  it('can move from ERC721 to ERC1155 with registered contracts', async ()=>{
    await ERC1155.registerContract(util.handler.address, 3)
    await ERC1155.transferOwnership(util.handler.address)
    await ERC721.setApprovalForAll(util.handler.address, true)
    await util.handler.registerContract(ERC721.address, 2)
    await util.handler.registerContract(ERC1155.address, 1)
    let balanceERC721 = await ERC721.balanceOf(util.deployer.address)
    let balanceERC1155 = await ERC1155.balanceOf(util.deployer.address, 1337)
    expect(balanceERC1155).to.equal(0)
    expect(balanceERC721).to.equal(1)

    var provider = selectProvider("mainnet")
    var web3 = new Web3(provider)
    let hash = web3.utils.soliditySha3(ERC721.address, ERC1155.address, 1, 1337, 111)
    let sig = await sign(web3, hash)
    await util.handler.addWitness("0xB35a0b332657efE5d69792FCA9436537d263472F")

    await util.handler.moveVault(ERC721.address, ERC1155.address, 1, 1337, 111, sig)
    balanceERC721 = await ERC721.balanceOf(util.deployer.address)
    balanceERC1155 = await ERC1155.balanceOf(util.deployer.address, 1337)
    expect(balanceERC1155).to.equal(1)
    expect(balanceERC721).to.equal(0)
  })

  it('can move from ERC1155 to ERC721 with registered contracts', async ()=>{
    await ERC1155.registerContract(util.handler.address, 3)
    await ERC1155.transferOwnership(util.deployer.address)
    await ERC1155.mint(util.deployer.address, 123, 2)
    await ERC721.setApprovalForAll(util.handler.address, true)
    await ERC721.burn(1)
    await ERC1155.setApprovalForAll(util.handler.address, true)
    await ERC721.transferOwnership(util.handler.address)
    await util.handler.registerContract(ERC721.address, 2)
    await util.handler.registerContract(ERC1155.address, 1)
    let balanceERC721 = await ERC721.balanceOf(util.deployer.address)
    let balanceERC1155 = await ERC1155.balanceOf(util.deployer.address, 123)
    expect(balanceERC1155).to.equal(2)
    expect(balanceERC721).to.equal(0)

    var provider = selectProvider("mainnet")
    var web3 = new Web3(provider)
    let hash = web3.utils.soliditySha3(ERC1155.address, ERC721.address, 123, 1337, 111)
    let sig = await sign(web3, hash)
    await util.handler.addWitness("0xB35a0b332657efE5d69792FCA9436537d263472F")
    
    await util.handler.moveVault(ERC1155.address, ERC721.address, 123, 1337, 111, sig)
    balanceERC721 = await ERC721.balanceOf(util.deployer.address)
    balanceERC1155 = await ERC1155.balanceOf(util.deployer.address, 123)
    expect(balanceERC1155).to.equal(1)
    expect(balanceERC721).to.equal(1)
  })

  it('can not move ERC1155 to ERC721 when new tokenId already exists', async ()=>{
    await ERC1155.registerContract(util.handler.address, 3)
    await ERC1155.transferOwnership(util.deployer.address)
    await ERC1155.mint(util.deployer.address, 123, 2)
    await ERC721.setApprovalForAll(util.handler.address, true)
    await ERC1155.setApprovalForAll(util.handler.address, true)
    await ERC721.transferOwnership(util.handler.address)
    await util.handler.registerContract(ERC721.address, 2)
    await util.handler.registerContract(ERC1155.address, 2)
    let balanceERC721 = await ERC721.balanceOf(util.deployer.address)
    let balanceERC1155 = await ERC1155.balanceOf(util.deployer.address, 123)
    expect(balanceERC1155).to.equal(2)
    expect(balanceERC721).to.equal(1)

    var provider = selectProvider("mainnet")
    var web3 = new Web3(provider)
    let hash = web3.utils.soliditySha3(ERC1155.address, ERC721.address, 123, 1, 111)
    let sig = await sign(web3, hash)
    await util.handler.addWitness("0xB35a0b332657efE5d69792FCA9436537d263472F")

    let tx = util.handler.moveVault(ERC1155.address, ERC721.address, 123, 1, 111, sig)
    await expect(tx).to.be.revertedWith('NFT Already Exists')
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
