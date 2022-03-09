const { ethers } = require('hardhat');
const { CID } = require('multiformats/cid');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const HDWalletProvider = require("@truffle/hdwallet-provider")
const Web3 = require('web3');
const util = new Util()
require('dotenv').config()

let selectProvider = function(network) {
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

var provider = selectProvider("mainnet")
var web3 = new Web3()

beforeEach(async ()=>{
  await util.deploy();
})
describe('Balance', () => {    
  it('should deploy storage', async ()=>{    
    let storage = await util.factory.balanceStorageImplementation()
    expect(storage).to.exist
  })
  it('storage should be owned by deployer', async ()=>{    
    let storage = await util.factory.balanceStorageImplementation()
    let storageContract = util.getBalanceStorage(storage, util.deployer)
    let owner = await storageContract.owner()
    expect(owner).to.equal(util.factory.address)
  })
  it('should deploy balance', async ()=>{
    expect(util.balancer).to.not.exist
    await util.cloneBalance(util.deployer.address)
    expect(util.balancer.address).to.exist
  })

  /*  */
  it('uninitialized storage should reflect current version of zero', async ()=>{
    await util.cloneBalance(util.deployer.address)
    let storage = await util.factory.balanceStorageImplementation()
    let storageContract = util.getBalanceStorage(storage, util.deployer)
    let version = await storageContract.latestVersion()
    expect(version).to.equal("0x0000000000000000000000000000000000000000")
  })

  it('adding balance by non owner reverts', async ()=>{    
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let emblemAddress = await util.factory.emblemImplementation()
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0}
      ]
    }
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    let tx = balanceContract.addBalanceToAsset(emblemAddress, 123, balances, 123456, 0x0)
    await expect(tx).to.be.revertedWith('003002')
  })

  it('uninitialized storage can not add balance', async ()=>{    
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
    await emblemContract.mint(util.deployer.address, 123, "test", 0x0)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0}
      ]
    }
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    let tx = balanceContract.addBalanceToAsset(emblemAddress, 123, balances, 123456, 0x0)
    await expect(tx).to.be.revertedWith('Not Owner or Latest version')
  })

  it('initialized storage should reflect current version', async ()=>{
    await util.cloneBalance(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    let storage = await util.factory.balanceStorageImplementation()
    let storageContract = util.getBalanceStorage(storage, util.deployer)
    let version = await storageContract.latestVersion()
    expect(version).to.equal("0x0000000000000000000000000000000000000000")
    await balanceContract.initialize()
    version = await storageContract.latestVersion()
    expect(version).to.equal(util.balancer.address)
  })

  it('promote version should prevent balance from working', async ()=>{
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    let storage = await util.factory.balanceStorageImplementation()
    let emblemAddress = await util.factory.emblemImplementation()
    await balanceContract.initialize()
    await balanceContract.promoteVersion(util.deployer.address)
    await balanceContract.transferOwnership(emblemAddress)
    let assets = balanceContract.getAssetsForContract(emblemAddress)
    expect(assets).to.revertedWith('Not Owner or Latest version')
  })

  it('should revert with invalid signature', async()=>{

    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    await balanceContract.initialize()
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
    await emblemContract.mint(util.deployer.address, 123, "test", 0x0)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", _address: "0x0000000000000000000000000000000000000000", _type: 0, tokenId: 0}
      ]
    }    
    let localhashed = hashBalancesAndNonce(balances, 123456)
    let signature = await sign(localhashed)
    let tx = balanceContract.addBalanceToAsset(emblemAddress, 123, balances, 123456, signature)
    expect(tx).to.be.revertedWith('Not a witness')
  })

  it('admin can disable adding balances', async ()=>{
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    await balanceContract.initialize()
    
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await balanceContract.addWitness(emblemAddress, "0xB35a0b332657efE5d69792FCA9436537d263472F")
    await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
    await emblemContract.mint(util.deployer.address, 123, "test", 0x0)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", tokenId: 0,  _address: "0x0000000000000000000000000000000000000000", _type: 0}
      ]
    }
    let localhashed = hashBalancesAndNonce(balances, 123456)
    let signature = await sign(localhashed)
    await balanceContract.toggleCanAddBalances()
    let tx = balanceContract.addBalanceToAsset(emblemAddress, 123, balances, 123456, signature)
    await expect(tx).to.be.revertedWith("Adding balances is disabled")
  })

  it('initialized storage and valid signature can add single balance', async ()=>{
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    await balanceContract.initialize()
    
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await balanceContract.addWitness(emblemAddress, "0xB35a0b332657efE5d69792FCA9436537d263472F")
    await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
    await emblemContract.mint(util.deployer.address, 123, "test", 0x0)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", tokenId: 0,  _address: "0x0000000000000000000000000000000000000000", _type: 0}
      ]
    }    
    let localhashed = hashBalancesAndNonce(balances, 123456)
    let signature = await sign(localhashed)
    await balanceContract.addBalanceToAsset(emblemAddress, 123, balances, 123456, signature)
    let balance = await balanceContract.getBalance(emblemAddress, 123)
    expect(balance.balances[0].balance).to.equal(1)
    expect(balance.balances[0].blockchain).to.equal(1)
    expect(balance.balances[0].name).to.equal("token")
    expect(balance.balances[0].symbol).to.equal("t")
    expect(balance.balances[0].tokenId).to.equal(0)
    expect(balance.balances[0]._address).to.equal("0x0000000000000000000000000000000000000000")
    expect(balance.balances[0]._type).to.equal(0)
  })
  it('can add multiple balances', async ()=>{
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    await balanceContract.initialize()
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await balanceContract.addWitness(emblemAddress, "0xB35a0b332657efE5d69792FCA9436537d263472F")
    await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
    await emblemContract.mint(util.deployer.address, 123, "test", 0x0)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t",  tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0},
        {balance: 20, blockchain: 1, name: "token2", symbol: "t2",  tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 1},
      ]
    }
    let localhashed = hashBalancesAndNonce(balances, 123456)
    let signature = await sign(localhashed)
    await balanceContract.addBalanceToAsset(emblemAddress, 123, balances, 123456, signature)
    let balance = await balanceContract.getBalance(emblemAddress, 123)
    expect(balance.balances[0].balance).to.equal(1)
    expect(balance.balances[1].balance).to.equal(20)
  })
  it('can hash balances in contract', async ()=>{
    await util.cloneBalance(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0},
        {balance: 20, blockchain: 1, name: "token2", symbol: "t2", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 1},
      ]
    }
    let hashed = await balanceContract.getSerializedBalances(balances)
    expect(hashed).to.exist
    expect(hashed[0]).to.equal('0xdb3ee04afdba64d7a47b15c44d40decb0ce99b47d5a3b92529eb10c4af061cf8')
    expect(hashed[1]).to.equal('0x37372751210c064a646c8ffa5b8a415f49ef083140664dcda43d7afb0da188a8')
  })
  it('hashed balances in contract matched client hashed balances', async ()=>{
    await util.cloneBalance(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0},
        {balance: 20, blockchain: 1, name: "token2", symbol: "t2", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 1},
      ]
    }
    let hashed = await balanceContract.getSerializedBalances(balances)
    
    balances.balances.forEach((balance, i)=>{
      let args = Object.keys(balance).map((key)=>{return balance[key]})
      expect(web3.utils.soliditySha3(...args)).to.equal(hashed[i])
    })
  })
  it('hashed balance object in contract matched client hashed balance object', async ()=>{
    await util.cloneBalance(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0},
        {balance: 20, blockchain: 1, name: "token2", symbol: "t2", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 1},
      ]
    }
    let hashed = await balanceContract.getSerializedBalance(balances)
    let localhashed = hashBalances(balances)
    expect(localhashed).to.equal(hashed)
  })
  it('hashed balance object with 10 balances matches', async ()=>{
    await util.cloneBalance(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0},
        {balance: 20, blockchain: 1, name: "token2", symbol: "t2", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 1},
        {balance: 1, blockchain: 1, name: "token3", symbol: "t3", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0},
        {balance: 1, blockchain: 1, name: "token4", symbol: "t4", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0},
        {balance: 1, blockchain: 1, name: "token5", symbol: "t5", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0},
        {balance: 1, blockchain: 1, name: "token6", symbol: "t6", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0},
        {balance: 1, blockchain: 1, name: "token7", symbol: "t7", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0},
        {balance: 1, blockchain: 1, name: "token8", symbol: "t8", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0},
        {balance: 1, blockchain: 1, name: "token9", symbol: "t9", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0},
        {balance: 1, blockchain: 1, name: "token10", symbol: "t10", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0},
      ]
    }
    let hashed = await balanceContract.getSerializedBalance(balances)
    let localhashed = hashBalances(balances)
    expect(localhashed).to.equal(hashed)
  })
  it('adding witness by non owner should revert', async()=>{
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    await balanceContract.initialize()
    let emblemAddress = await util.factory.emblemImplementation()
    await balanceContract.transferOwnership(util.balancer.address)
    let tx = balanceContract.addWitness(emblemAddress, util.deployer.address)
    await expect(tx).to.be.revertedWith('018001')
  })

  it('owner should be able to add witness', async()=>{
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    await balanceContract.initialize()
    let emblemAddress = await util.factory.emblemImplementation()
    let storage = await util.factory.balanceStorageImplementation()
    let storageContract = util.getBalanceStorage(storage, util.deployer)
    let isWitness = await storageContract.isWitness(emblemAddress, util.deployer.address)
    expect(isWitness).to.equal(false)
    await balanceContract.addWitness(emblemAddress, util.deployer.address)
    isWitness = await storageContract.isWitness(emblemAddress, util.deployer.address)
    expect(isWitness).to.equal(true)
  })
  it('removing witness by non owner should revert', async()=>{
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    await balanceContract.initialize()
    let emblemAddress = await util.factory.emblemImplementation()
    await balanceContract.addWitness(emblemAddress, util.deployer.address)
    await balanceContract.transferOwnership(util.balancer.address)
    let tx = balanceContract.removeWitness(emblemAddress, util.deployer.address)
    await expect(tx).to.be.revertedWith('018001')
  })
  it('owner should be able to remove witness', async()=>{
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    await balanceContract.initialize()
    let emblemAddress = await util.factory.emblemImplementation()
    let storage = await util.factory.balanceStorageImplementation()
    let storageContract = util.getBalanceStorage(storage, util.deployer)
    await balanceContract.addWitness(emblemAddress, util.deployer.address)
    isWitness = await storageContract.isWitness(emblemAddress, util.deployer.address)
    expect(isWitness).to.equal(true)
    await balanceContract.removeWitness(emblemAddress, util.deployer.address)
    isWitness = await storageContract.isWitness(emblemAddress, util.deployer.address)
    expect(isWitness).to.equal(false)
  })
  it('signature from witness with used nonce should revert', async ()=>{
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    await balanceContract.initialize()
    
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await balanceContract.addWitness(emblemAddress, "0xB35a0b332657efE5d69792FCA9436537d263472F")
    await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
    await emblemContract.mint(util.deployer.address, 123, "test", 0x0)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0}
      ]
    }    
    let localhashed = hashBalancesAndNonce(balances, 123456)
    let signature = await sign(localhashed)
    await balanceContract.addBalanceToAsset(emblemAddress, 123, balances, 123456, signature)
    let balance = await balanceContract.getBalance(emblemAddress, 123)
    expect(balance.balances[0].balance).to.equal(1)
    let tx = balanceContract.addBalanceToAsset(emblemAddress, 123, balances, 123456, signature)
    await expect(tx).to.be.revertedWith('Nonce already used')
    
  })
  it('should get all tokenIds for nftAddress', async ()=>{
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    await balanceContract.initialize()
    
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await balanceContract.addWitness(emblemAddress, "0xB35a0b332657efE5d69792FCA9436537d263472F")
    await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
    await emblemContract.mint(util.deployer.address, 123, "test", 0x0)
    await emblemContract.mint(util.deployer.address, 321, "test", 0x0)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0}
      ]
    }    
    let localhashed = hashBalancesAndNonce(balances, 123456)
    let signature = await sign(localhashed)
    await balanceContract.addBalanceToAsset(emblemAddress, 123, balances, 123456, signature)
    let assets = await balanceContract.getAssetsForContract(emblemAddress)
    expect(assets.length).to.equal(1)
    expect(assets[0]).to.equal(123)
    localhashed = hashBalancesAndNonce(balances, 654321)
    signature = await sign(localhashed)
    await balanceContract.addBalanceToAsset(emblemAddress, 321, balances, 654321, signature)
    assets = await balanceContract.getAssetsForContract(emblemAddress)
    expect(assets.length).to.equal(2)
    expect(assets[0]).to.equal(123)
    expect(assets[1]).to.equal(321)
  })
  it('should get single tokenId for nftAddress by index', async ()=>{
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    await balanceContract.initialize()
    
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await balanceContract.addWitness(emblemAddress, "0xB35a0b332657efE5d69792FCA9436537d263472F")
    await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
    await emblemContract.mint(util.deployer.address, 123, "test", 0x0)
    await emblemContract.mint(util.deployer.address, 321, "test", 0x0)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0}
      ]
    }    
    let localhashed = hashBalancesAndNonce(balances, 123456)
    let signature = await sign(localhashed)
    await balanceContract.addBalanceToAsset(emblemAddress, 123, balances, 123456, signature)    
    localhashed = hashBalancesAndNonce(balances, 654321)
    signature = await sign(localhashed)
    await balanceContract.addBalanceToAsset(emblemAddress, 321, balances, 654321, signature)
    let asset = await balanceContract.getAssetsForContractAtIndex(emblemAddress, 0)
    expect(asset).to.equal(123)
    asset = await balanceContract.getAssetsForContractAtIndex(emblemAddress, 1)
    expect(asset).to.equal(321)
    let assetCount = await balanceContract.getAssetCountForContract(emblemAddress)
    expect(assetCount).to.equal(2)
  })
  it('should get tokenIds from map', async ()=>{
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    await balanceContract.initialize()
    
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await balanceContract.addWitness(emblemAddress, "0xB35a0b332657efE5d69792FCA9436537d263472F")
    await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
    await emblemContract.mint(util.deployer.address, 123, "test", 0x0)
    await emblemContract.mint(util.deployer.address, 321, "test", 0x0)
    await emblemContract.mint(util.deployer.address, 456, "test", 0x0)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0}
      ]
    }    
    let localhashed = hashBalancesAndNonce(balances, 123456)
    let signature = await sign(localhashed)
    await balanceContract.addBalanceToAsset(emblemAddress, 123, balances, 123456, signature)
    localhashed = hashBalancesAndNonce(balances, 654321)
    signature = await sign(localhashed)
    await balanceContract.addBalanceToAsset(emblemAddress, 321, balances, 654321, signature)
    let tokenIds = await balanceContract.getTokenIdsFromMap(emblemAddress, 1, "token")
    expect(tokenIds.length).to.equal(2)
    expect(tokenIds[0]).to.equal(123)
    expect(tokenIds[1]).to.equal(321)
    balances.balances[0].name = "token2"
    localhashed = hashBalancesAndNonce(balances, 11111)
    signature = await sign(localhashed)
    await balanceContract.addBalanceToAsset(emblemAddress, 456, balances, 11111, signature)
    tokenIds = await balanceContract.getTokenIdsFromMap(emblemAddress, 1, "token2")
    expect(tokenIds.length).to.equal(1)
    expect(tokenIds[0]).to.equal(456)
  })
  it('should get tokenIds from map by index', async ()=>{
    await util.cloneBalance(util.deployer.address)
    await util.cloneHandler(util.deployer.address)
    let balanceContract = util.getBalance(util.balancer.address, util.deployer)
    await balanceContract.initialize()
    
    let emblemAddress = await util.factory.emblemImplementation()
    let emblemContract = util.getEmblemVault(emblemAddress, util.deployer)
    await balanceContract.addWitness(emblemAddress, "0xB35a0b332657efE5d69792FCA9436537d263472F")
    await util.handler.transferNftOwnership(emblemAddress, util.deployer.address)
    await emblemContract.mint(util.deployer.address, 123, "test", 0x0)
    await emblemContract.mint(util.deployer.address, 321, "test", 0x0)
    await emblemContract.mint(util.deployer.address, 456, "test", 0x0)
    let balances = {
      balances: [
        {balance: 1, blockchain: 1, name: "token", symbol: "t", tokenId: 0, _address: "0x0000000000000000000000000000000000000000", _type: 0}
      ]
    }    
    let localhashed = hashBalancesAndNonce(balances, 123456)
    let signature = await sign(localhashed)
    await balanceContract.addBalanceToAsset(emblemAddress, 123, balances, 123456, signature)
    localhashed = hashBalancesAndNonce(balances, 654321)
    signature = await sign(localhashed)
    await balanceContract.addBalanceToAsset(emblemAddress, 321, balances, 654321, signature)
    balances.balances[0].name = "token2"
    localhashed = hashBalancesAndNonce(balances, 11111)
    signature = await sign(localhashed)
    await balanceContract.addBalanceToAsset(emblemAddress, 456, balances, 11111, signature)
    let tokenId = await balanceContract.getTokenIdsFromMapAtIndex(emblemAddress, 1, "token", 0)
    expect(tokenId).to.equal(123)
    tokenId = await balanceContract.getTokenIdsFromMapAtIndex(emblemAddress, 1, "token", 1)
    expect(tokenId).to.equal(321)
    tokenId = await balanceContract.getTokenIdsFromMapAtIndex(emblemAddress, 1, "token2", 0)
    expect(tokenId).to.equal(456)
    let tokenCount = await balanceContract.getTokenIdCountFromMap(emblemAddress, 1, "token")
    expect(tokenCount).to.equal(2)
    tokenCount = await balanceContract.getTokenIdCountFromMap(emblemAddress, 1, "token2")
    expect(tokenCount).to.equal(1)
  })
})

function addNonceToHashedBalances(localhashed, nonce) {
  return web3.utils.soliditySha3(nonce, localhashed);
}

function hashBalances(balances) {
  let localhashed
  balances.balances.forEach((balance, i) => {
    let hash = web3.utils.soliditySha3(...Object.keys(balance).map((key) => { return balance[key]; }));
    i > 0 ?
      localhashed = web3.utils.soliditySha3(localhashed, hash) :
      localhashed = web3.utils.soliditySha3(hash);
  });
  return localhashed;
}

function hashBalancesAndNonce(balances, nonce) {
  let localhashed = hashBalances(balances)  
  return addNonceToHashedBalances(localhashed, nonce);
}

function getRandom(myArray) {
  let selected = myArray[Math.floor(Math.random() * myArray.length)];
  return selected
}

async function sign(hash) {
  web3_signer = new Web3(provider);
  let accounts = await web3_signer.eth.getAccounts()
  let signature = await web3_signer.eth.sign(hash, accounts[0])
  return signature
}

