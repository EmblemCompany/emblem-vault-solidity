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


describe('Linker', () => {    
  beforeEach(async ()=>{
    await util.deployHandler()
    await util.deployLinker()
  })
  it('should deploy handler', async ()=>{
    expect(util.linker.address).to.not.equal("0x0000000000000000000000000000000000000000")
  })

  it("should map a BTC address to an ETH address", async function () {
    const nonce = 1234;
    const btcAddress = "14xpoTDRpJ7V1MjKpCkkXC1LJhSzxSXSJ9";
    const ethAddress = "0xF5A5A5a5A5a5A5A5A5a5a5A5a5A5A5a5A5a5A5A5";
    const message = ethers.utils.solidityKeccak256(
      ["address", "address", "uint256"],
      [ethers.utils.getAddress(btcAddress), ethAddress, nonce]
    );
    const signature = await signer.signMessage(
      ethers.utils.arrayify("\x19Bitcoin Signed Message:\n32" + message)
    );
    const tx = await btcToEth.mapAddress(btcAddress, ethAddress, nonce, signature);
  
    expect(await btcToEth.getBTCAddress(ethAddress)).to.equal(btcAddress);
    expect(await btcToEth.getETHAddress(btcAddress)).to.equal(ethAddress);
  });

  it("should throw an exception for an unregistered BTC address", async function () {
    const unregisteredAddress = "1BitcoinEaterAddressDontSendf59kuE";
    await expect(btcToEth.getETHAddress(unregisteredAddress)).to.be.revertedWith(
      "Address not registered"
    );
  });

  it("should throw an exception for an unregistered ETH address", async function () {
    const unregisteredAddress = "0x2d6A20C6cCB182a84bF3A3A16199bEBa02682e34";
    await expect(btcToEth.getBTCAddress(unregisteredAddress)).to.be.revertedWith(
      "Address not registered"
    );
  });
  
  
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
