const { expect } = require('chai')
const Util = require('./util.js')
const util = new Util()

describe('ERC721a', () => {
  beforeEach(async ()=>{
    await util.deployERC721A();
    await util.deployHandlerUpgradable()
    ERC721 = util.emblemVault721AUpgradeable
  })
  it('should deploy vault', async ()=>{
    let emblemAddress = util.emblemVault721AUpgradeable.address
    console.log(emblemAddress)
    expect(emblemAddress).to.exist
  })
  
  it('should prevent non owner mint', async ()=>{
    let NonAdmin721a = util.getContract(ERC721.address, "EmblemVault721AUpgradeable", util.alice)
    let tx =  NonAdmin721a.mint(util.deployer.address, 1)
    await expect(tx).to.be.revertedWith("Not owner or able to bypass")
  })

  it('should allow owner mint', async ()=>{
    await ERC721.mint(util.deployer.address, 1)
    let balance = await ERC721.balanceOf(util.deployer.address)
    expect(balance).to.equal(1)
  })
  it('should allow owner mint many', async ()=>{
    await ERC721.mintMany([util.deployer.address, util.deployer.address], [123, 998])
    let balance = await ERC721.balanceOf(util.deployer.address)
    expect(balance).to.equal(2)
  })

  it('should mint 1 via handler with signed price', async () => {
    // register handler with itself
    await util.handler_upgradable.registerContract(util.handler_upgradable.address, 3)
    // register erc721a with handler
    await util.handler_upgradable.registerContract(ERC721.address, 2)
    // register handler with erc721a
    await ERC721.registerContract(util.handler_upgradable.address, 3)
    
    await ERC721.transferOwnership(util.handler_upgradable.address)

    let balance = await ERC721.balanceOf(util.deployer.address)
    expect(balance).to.equal(0)

    await util.handler_upgradable.mint(ERC721.address, util.deployer.address, 1337, '','',1)

    balance = await ERC721.balanceOf(util.deployer.address)
    expect(balance).to.equal(1)
    // let covalAddress = util.erc20.address
    // await util.handler_upgradable.addWitness("0x2b8F310A5fE8D057d7Cf1d70E78Ded35cc291111")
    // var provider = util.selectProvider("mainnet")
    // var web3 = new Web3(provider)
    // let hash = web3.utils.soliditySha3(ERC1155.address, covalAddress, 0, util.deployer.address, 123, 111, 1)
    // let sig = await sign(web3, hash)
    // let balance = await ERC1155.balanceOf(util.deployer.address, 123)
    // expect(balance.toNumber()).to.equal(0)
    // await util.handler_upgradable.buyWithSignedPrice(ERC1155.address, covalAddress, 0, util.deployer.address, 123, 111, sig, util.serializeUintToBytes(0), 1)
    // balance = await ERC1155.balanceOf(util.deployer.address, 123)
    // expect(balance.toNumber()).to.equal(1)
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
