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
    let contractRecord = await util.handler.vaultContracts(ERC721.address)
    expect(contractRecord._type).to.equal(0)
    expect(contractRecord.curated).to.equal(false)
  })
  it('non admin can not add vaultContract', async ()=>{
    let handler = util.getHandler(util.handler.address, util.alice)
    let tx = handler.addVaultContract(ERC721.address, 0, true)
    await expect(tx).to.be.revertedWith('018001')
  })
  
  it('admin can add vaultContract', async ()=>{
    await util.handler.addVaultContract(ERC721.address, 1, true)
    let contractRecord = await util.handler.vaultContracts(ERC721.address)
    expect(contractRecord._type).to.equal(1)
    expect(contractRecord.curated).to.equal(true)
  })

  it('admin can remove vaultContract', async ()=>{
    await util.handler.addVaultContract(ERC721.address, 2, false)
    let contractRecord = await util.handler.vaultContracts(ERC721.address)
    expect(contractRecord._type).to.equal(2)
    expect(contractRecord.curated).to.equal(false)
    expect(await util.handler.vaultContractCount()).to.equal(1)
    await util.handler.removeVaultContract(ERC721.address)
    contractRecord = await util.handler.vaultContracts(ERC721.address)
    expect(contractRecord._type).to.equal(0)
    expect(contractRecord.curated).to.equal(false)
    expect(await util.handler.vaultContractCount()).to.equal(0)
  })

  it('can not move from unregistered contract', async ()=>{
    let tx = util.handler.moveVault(ERC721.address, ERC1155.address, 1, 0)
    await expect(tx).to.be.revertedWith('Vault contract is not registered')
  })

  it('can move from ERC721 to ERC1155 with registered contracts', async ()=>{
    await ERC1155.transferOwnership(util.handler.address)
    await ERC721.setApprovalForAll(util.handler.address, true)
    await util.handler.addVaultContract(ERC721.address, 2, false)
    await util.handler.addVaultContract(ERC1155.address, 2, false)
    let balanceERC721 = await ERC721.balanceOf(util.deployer.address)
    let balanceERC1155 = await ERC1155.balanceOf(util.deployer.address, 1337)
    expect(balanceERC1155).to.equal(0)
    expect(balanceERC721).to.equal(1)
    await util.handler.moveVault(ERC721.address, ERC1155.address, 1, 1337)
    balanceERC721 = await ERC721.balanceOf(util.deployer.address)
    balanceERC1155 = await ERC1155.balanceOf(util.deployer.address, 1337)
    expect(balanceERC1155).to.equal(1)
    expect(balanceERC721).to.equal(0)
  })

  it('can move from ERC1155 to ERC721 with registered contracts', async ()=>{
    await ERC1155.transferOwnership(util.deployer.address)
    await ERC1155.mint(util.deployer.address, 123, 2)
    await ERC721.setApprovalForAll(util.handler.address, true)
    await ERC721.burn(1)
    await ERC1155.setApprovalForAll(util.handler.address, true)
    await ERC721.transferOwnership(util.handler.address)
    await util.handler.addVaultContract(ERC721.address, 2, false)
    await util.handler.addVaultContract(ERC1155.address, 2, false)
    let balanceERC721 = await ERC721.balanceOf(util.deployer.address)
    let balanceERC1155 = await ERC1155.balanceOf(util.deployer.address, 123)
    expect(balanceERC1155).to.equal(2)
    expect(balanceERC721).to.equal(0)
    await util.handler.moveVault(ERC1155.address, ERC721.address, 123, 1337)
    balanceERC721 = await ERC721.balanceOf(util.deployer.address)
    balanceERC1155 = await ERC1155.balanceOf(util.deployer.address, 123)
    expect(balanceERC1155).to.equal(1)
    expect(balanceERC721).to.equal(1)
  })

  it('can not move ERC1155 to ERC721 when new tokenId already exists', async ()=>{
    await ERC1155.transferOwnership(util.deployer.address)
    await ERC1155.mint(util.deployer.address, 123, 2)
    await ERC721.setApprovalForAll(util.handler.address, true)
    await ERC1155.setApprovalForAll(util.handler.address, true)
    await ERC721.transferOwnership(util.handler.address)
    await util.handler.addVaultContract(ERC721.address, 2, false)
    await util.handler.addVaultContract(ERC1155.address, 2, false)
    let balanceERC721 = await ERC721.balanceOf(util.deployer.address)
    let balanceERC1155 = await ERC1155.balanceOf(util.deployer.address, 123)
    expect(balanceERC1155).to.equal(2)
    expect(balanceERC721).to.equal(1)
    let tx = util.handler.moveVault(ERC1155.address, ERC721.address, 123, 1)
    await expect(tx).to.be.revertedWith('NFT Already Exists')
  })

  it('should only allow move if witnessed')
  
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
