const { ethers } = require('hardhat');
const { CID } = require('multiformats/cid');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const HDWalletProvider = require("@truffle/hdwallet-provider")
const Web3 = require('web3');
// const MerkleTree = require('merkletreejs').MerkleTree
const Merklescript = require('merklescript')
//const keccak256 = require('keccak256')
const util = new Util()
beforeEach(async ()=>{
  await util.deployHandler()
  await util.deployBalanceUpgradable()
  await util.deployClaimedUpgradable()
  await util.deployERC721Factory()
  await util.deployERC20Factory() 
})
describe('Claimed', () => {     
  describe('V2 Upgradable', ()=>{
    beforeEach(async ()=>{ })
    it('should be owned by deployer', async ()=>{
      let owner = await util.claimedUpgradable.owner()
      expect(owner).to.equal(util.deployer.address)
    })
    it('initialized storage can add legacy claim', async ()=>{
      let claimedContract = util.claimedUpgradable
      let emblemAddress = await util.emblem.address
      
      let values = [[1], [2], [3]]
      const script = new Merklescript({
        types: ["uint256"],
        values
      })
      const root = script.root()

      await claimedContract.addLegacy(emblemAddress, root)
      let contractRoot = await claimedContract.getLegacyClaims(emblemAddress)
      expect(contractRoot).to.equal(root)
    })
    it('should not be legacy claimed when legacy claimed root not stored', async()=>{
      let claimedContract = util.claimedUpgradable
      let emblemAddress = util.emblem.address
      
      let values = [[1], [2], [3]]
      const script = new Merklescript({
        types: ["uint256"],
        values
      })
      
      let proof = script.proof(values[0])

      let isClaimed = await claimedContract.isClaimed(emblemAddress, 1, proof)
      expect(isClaimed).to.equal(false)
    })
    it('should be claimed by ZERO ADDRESS when not minted', async()=>{
      let claimedContract = util.claimedUpgradable
      let emblemAddress = util.emblem.address
      let isClaimed = await claimedContract.claimedBy(emblemAddress, 1)
      expect(isClaimed._owner).to.equal("0x0000000000000000000000000000000000000000")
    })
    it('should be claimed by type of "unknown" when not minted', async()=>{
      let claimedContract = util.claimedUpgradable
      let emblemAddress = util.emblem.address
      let isClaimed = await claimedContract.claimedBy(emblemAddress, 1)
      expect(isClaimed._type).to.equal("unknown")
    })
    it('should be claimed when legacy', async ()=>{
      let claimedContract = util.claimedUpgradable
      let emblemAddress = util.emblem.address
      
      let values = [[1], [2], [3]]
      const script = new Merklescript({
        types: ["uint256"],
        values
      })
      const root = script.root()
      let proof = script.proof(values[0])
      
      await claimedContract.addLegacy(emblemAddress, root)    
      let isClaimed = await claimedContract.isClaimed(emblemAddress, 1, proof)
      expect(isClaimed).to.equal(true)
    })
    it('should verify valid merklescript', async()=>{
      let values = [[util.deployer.address, 1], [util.claimedUpgradable.address, 2], [util.deployer.address, 3]]
      const script = new Merklescript({
        types: ["address", "uint256"],
        values
      })
      const root = script.root()
      let proof = script.proof([ util.deployer.address, values[0][1] ])
      
      let claimedContract = util.claimedUpgradable
      let emblemAddress = util.emblem.address
      await claimedContract.addLegacyClaimedBy(emblemAddress, root)
      let isClaimed = await claimedContract.legacyClaimedBy(emblemAddress, util.deployer.address, 1, proof)
      expect(isClaimed[0]).to.equal(util.deployer.address)
      expect(isClaimed[1]).to.equal('legacy')
    })
    it('should verify valid merkle proof', async()=>{
      var provider = util.selectProvider("mainnet")
      var web3 = new Web3(provider)
      let claimedContract = util.claimedUpgradable
      
      let values = [[util.deployer.address], [util.claimedUpgradable.address], [util.deployer.address]]
      const script = new Merklescript({
        types: ["address"],
        values
      })
      const root = script.root()
      let proof = script.proof([ util.deployer.address ])
      let hash = web3.utils.soliditySha3(util.deployer.address)
      let isValid = await claimedContract.verifyScript(root, hash, proof)
      expect(isValid).to.equal(true)
    })
    it('should not verify invalid merkle proof', async()=>{
      let claimedContract = util.claimedUpgradable
      var provider = util.selectProvider("mainnet")
      var web3 = new Web3(provider)
      
      let values = [[util.deployer.address, 1], [util.claimedUpgradable.address, 2], [util.deployer.address, 3]]
      let script = new Merklescript({
        types: ["address", "uint256"],
        values
      })
      let badValues = [[util.deployer.address, 10], [util.claimedUpgradable.address, 20], [util.deployer.address, 30]]
      let badScript = new Merklescript({
        types: ["address", "uint256"],
        values: badValues
      })
      const root = script.root()
      
      let badProof = badScript.proof([ util.deployer.address, badValues[0][1] ])
      let hash = web3.utils.soliditySha3(util.deployer.address, values[0][1])
      
      let isValid = await claimedContract.verifyScript(root, hash, badProof)
      expect(isValid).to.equal(false)
    })
    it('should verify valid complex merkle proof', async()=>{
      let claimedContract = util.claimedUpgradable

      var provider = util.selectProvider("mainnet")
      var web3 = new Web3(provider)

      let values = [[util.deployer.address, 1], [util.claimedUpgradable.address, 2], [util.deployer.address, 3]]
      let script = new Merklescript({
        types: ["address", "uint256"],
        values
      })
      const root = script.root()
      let proof = script.proof([ util.deployer.address, values[0][1] ])
      let hash = web3.utils.soliditySha3(util.deployer.address, values[0][1])
      let isValid = await claimedContract.verifyScript(root, hash, proof)
      expect(isValid).to.equal(true)
    })
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
