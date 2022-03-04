const { ethers } = require('hardhat');
const { CID } = require('multiformats/cid');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const HDWalletProvider = require("@truffle/hdwallet-provider")
const Web3 = require('web3');
const TEST_CALLBACK_FUNCTION = "0x684ee7de" //web3.eth.abi.encodeFunctionSignature('testCallback(address _from, address _to, uint256 tokenId)').substr(0, 10)
const TEST_REVERT_CALLBACK_FUNCTION = "0x5d1c03dd"
const TEST_FAKE_CALLBACK_FUNCTION = "0x4e1c03dd"
function getRandom(myArray) {
    let selected = myArray[Math.floor(Math.random() * myArray.length)];
    return selected
  }
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
// var provider = selectProvider("mainnet")
// var web3 = new Web3(provider)

const CALLBACK_TYPE = {"MINT": 0,"TRANSFER": 1,"CLAIM":2}
const REGISTRATION_TYPE = {"EMPTY": 0, "ERC1155": 1, "ERC721":2, "HANDLER":3, "ERC20":4, "BALANCE":5, "CLAIM":6, "UNKNOWN":7}// 0 EMPTY, 1 ERC1155, 2 ERC721, 3 HANDLER, 4 ERC20, 5 BALANCE, 6 CLAIM 7 UNKNOWN

const util = new Util()
let ERC1155
beforeEach(async ()=>{
  await util.deploy();
  await util.cloneEmblem(util.deployer.address)
  await util.cloneHandler(util.deployer.address)  
  ERC1155 = util.getERC1155((await util.factory.erc1155Implementation()), util.deployer)
})
describe('ERC1155', () => {
    it('should deploy ERC1155 Vaults', async ()=>{
        expect(ERC1155.address).to.exist
    })
    it('should mint', async()=>{
        let balanceERC1155 = await ERC1155.balanceOf(util.bob.address, 789)
        expect(balanceERC1155).to.equal(0)
        await ERC1155.mint(util.bob.address, 789, 2)
        balanceERC1155 = await ERC1155.balanceOf(util.bob.address, 789)
        expect(balanceERC1155).to.equal(2)
    })
    
    describe('Non-Fungibility', ()=>{
        it('should be serialized by default', async ()=>{
            let serialized = await ERC1155.isSerialized()
            expect(serialized).to.equal(true)
        })
        it('non owner can not toggle serializability', async ()=>{
            ERC1155 = util.getERC1155((await util.factory.erc1155Implementation()), util.bob)            
            let tx = ERC1155.toggleSerialization()
            await expect(tx).to.be.revertedWith("018001")
        })
        it('owner can toggle serializability', async ()=>{            
            await ERC1155.toggleSerialization()
            let serialized = await ERC1155.isSerialized()
            expect(serialized).to.equal(false)
        })

        it('should not mint serialnumber if serialization is disabled', async ()=>{
            await ERC1155.toggleSerialization()
            await ERC1155.mint(util.deployer.address, 789, 1)
            let serialnumber =  await ERC1155.getSerial(789, 0)
            expect(serialnumber).to.equal('0x0000000000000000000000000000000000000000')
        })

        it('should mint serialnumber if serialization is enabled', async ()=>{
            await ERC1155.mint(util.deployer.address, 789, 1)
            let serialNumber =  await ERC1155.getSerial(789, 0)            
            expect(serialNumber).to.equal('0xc1aa66045693c092577bd3ebd433d17a8a51c564')
        })
        it('should not allow turning off serization if any serialized items exist', async()=>{
            await ERC1155.mint(util.deployer.address, 789, 1)
            let tx = ERC1155.toggleSerialization()
            await expect(tx).to.be.revertedWith('Already has serialized items')
        })
        it('should create serialnumber on each new asset minted', async()=>{
            await ERC1155.mint(util.deployer.address, 789, 2)
            let serialNumber0 =  await ERC1155.getSerial(789, 0)
            let serialNumber1 =  await ERC1155.getSerial(789, 1)
            let AbiCoder = new ethers.utils.AbiCoder()
            let currentBlockNumber = await ethers.provider.getBlockNumber();
            let calculatedSerial0 = await ethers.utils.ripemd160(AbiCoder.encode([ "uint","uint","uint"], [789, currentBlockNumber, 0]))
            let calculatedSerial1 = await ethers.utils.ripemd160(AbiCoder.encode([ "uint","uint","uint"], [789, currentBlockNumber, 1]))
            expect(serialNumber0).to.equal(calculatedSerial0)
            expect(serialNumber1).to.equal(calculatedSerial1)
        })
        it('should add new serialnumber when minting more of a tokenid', async ()=>{
            await ERC1155.mint(util.deployer.address, 789, 2)            
            await ERC1155.mint(util.deployer.address, 789, 1)
            let serialNumber2 =  await ERC1155.getSerial(789, 2)
            expect(serialNumber2).to.equal('0x52f77f601f8269cf483e3398746adafce52a139b')
        })
        it('should assign serialnumber to owner of asset', async ()=>{
            await ERC1155.mint(util.deployer.address, 789, 1)
            let serialNumber =  await ERC1155.getSerial(789, 0)
            let ownerOfSerial = await ERC1155.getOwnerOfSerial(serialNumber)
            expect(ownerOfSerial).to.equal(util.deployer.address)
        })
        it('should get first serialnumber when provided with tokenId and address', async ()=>{
            await ERC1155.mint(util.deployer.address, 789, 2)
            let serialNumber = await ERC1155.getFirstSerialByOwner(util.deployer.address, 789)
            expect(serialNumber).to.equal("0x99954d9b7e5c53e2a8403328001fbefbade9334f")
        })
        it('should transfer correct serialnumber from old owner to new owner on transfer', async()=>{
            await ERC1155.mint(util.deployer.address, 789, 2)
            let serialNumber0 =  await ERC1155.getSerial(789, 0)
            let serialNumber1 =  await ERC1155.getSerial(789, 1)
            let ownerOfSerial0 = await ERC1155.getOwnerOfSerial(serialNumber0)
            let ownerOfSerial1 = await ERC1155.getOwnerOfSerial(serialNumber1)
            expect(ownerOfSerial0).to.equal(util.deployer.address)
            await ERC1155.safeTransferFrom(util.deployer.address, util.bob.address, 789, 1, 0)            
            ownerOfSerial0 = await ERC1155.getOwnerOfSerial(serialNumber0)
            expect(ownerOfSerial0).to.equal(util.bob.address)
            expect(ownerOfSerial1).to.equal(util.deployer.address)
            await ERC1155.safeTransferFrom(util.deployer.address, util.bob.address, 789, 1, 0)
            ownerOfSerial1 = await ERC1155.getOwnerOfSerial(serialNumber1)
            expect(ownerOfSerial1).to.equal(util.bob.address)
            expect(ownerOfSerial0).to.equal(util.bob.address)
        })
        it('should mark correct serialnumber claimed upon claiming')
        it('should handle batch mint')
        it('should handle batch transfer')
    })
    describe('Handler Callbacks', ()=>{        
        it('should not allow callback registration in handler without witness')
        it('isRegistered should return false when no handler registered', async()=>{
            let registered = await ERC1155.isRegistered(util.handler.address, 3)
            expect(registered).to.equal(false)
        })
        it('isRegistered should return true when a handler is registered', async()=>{
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            let registered = await ERC1155.isRegistered(util.handler.address, REGISTRATION_TYPE.HANDLER)
            expect(registered).to.equal(true)
        })
        it('isRegistered should return false when a handler is unregistered', async()=>{
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            let registered = await ERC1155.isRegistered(util.handler.address, REGISTRATION_TYPE.HANDLER)
            expect(registered).to.equal(true)
            await ERC1155.unregisterContract(util.handler.address,0)
            registered = await ERC1155.isRegistered(util.handler.address, REGISTRATION_TYPE.HANDLER)
            expect(registered).to.equal(false)
        })
        it('should allow adding callback if handler registered', async ()=>{            
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            let hasCallback = await util.handler.hasCallback(ERC1155.address, util.emblem.address, CALLBACK_TYPE.MINT, 0)
            expect(hasCallback).to.equal(false)
            await util.handler.registerCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            hasCallback = await util.handler.hasCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.MINT)
            expect(hasCallback).to.equal(true)
        })
        it('should not have callback of different trigger', async ()=>{            
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)            
            await util.handler.registerCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            let hasCallback = await util.handler.hasCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.CLAIM)
            expect(hasCallback).to.equal(false)
        })
        it('should allow multiple callbacks to be registered', async()=>{
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)            
            await util.handler.registerCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            await util.handler.registerCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
            let hasCallback = await util.handler.hasCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.MINT)
            expect(hasCallback).to.equal(true)
            hasCallback = await util.handler.hasCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.TRANSFER)
            expect(hasCallback).to.equal(true)
        })
        
        it('can execute single mint callback', async()=>{
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)
            await ERC721.setApprovalForAll(util.handler.address, true)
            await ERC721.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            await ERC1155.transferOwnership(util.handler.address)
            let ticks = await util.handler.ticks()
            expect(ticks).to.equal(0)
            await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1)
            ticks = await util.handler.ticks();
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            expect(ticks).to.equal(1)
            expect(lastTokenId).to.equal(1)
            expect(lastTo).to.equal(util.deployer.address)
        })
        it('can handle transfer when no callbacks registered', async()=>{
            await ERC1155.mint(util.deployer.address, 789, 2)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            // await ERC1155.transferOwnership(util.handler.address)
            let ticks = await util.handler.ticks()
            expect(ticks).to.equal(0)
            await ERC1155.safeTransferFrom(util.deployer.address, util.bob.address, 789, 1, 0)
            ticks = await util.handler.ticks()
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            let lastFrom = await util.handler.lastFrom()
            expect(ticks).to.equal(0)
            expect(lastTokenId).to.equal(0)
            expect(lastTo).to.equal('0x0000000000000000000000000000000000000000')
            expect(lastFrom).to.equal('0x0000000000000000000000000000000000000000')
        })
        it('can handle transfer when no handler registered', async()=>{
            await ERC1155.mint(util.deployer.address, 789, 2)
            // await ERC1155.transferOwnership(util.handler.address)
            let ticks = await util.handler.ticks()
            expect(ticks).to.equal(0)
            await ERC1155.safeTransferFrom(util.deployer.address, util.bob.address, 789, 1, 0)
            ticks = await util.handler.ticks()
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            let lastFrom = await util.handler.lastFrom()
            expect(ticks).to.equal(0)
            expect(lastTokenId).to.equal(0)
            expect(lastTo).to.equal('0x0000000000000000000000000000000000000000')
            expect(lastFrom).to.equal('0x0000000000000000000000000000000000000000')
        })
        it('can execute single transfer callback', async()=>{
            await ERC1155.mint(util.deployer.address, 789, 2)
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)
            await ERC721.setApprovalForAll(util.handler.address, true)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
            // await ERC1155.transferOwnership(util.handler.address)
            let ticks = await util.handler.ticks()
            expect(ticks).to.equal(0)
            await ERC1155.safeTransferFrom(util.deployer.address, util.bob.address, 789, 1, 0)
            ticks = await util.handler.ticks()
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            let lastFrom = await util.handler.lastFrom()
            expect(ticks).to.equal(1)
            expect(lastTokenId).to.equal(789)
            expect(lastTo).to.equal(util.bob.address)
            expect(lastFrom).to.equal(util.deployer.address)
        })
        it('can execute multiple mint callbacks', async()=>{
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)            
            await ERC721.setApprovalForAll(util.handler.address, true)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            await ERC1155.transferOwnership(util.handler.address)
            let ticks = await util.handler.ticks()
            expect(ticks).to.equal(0)
            await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1)
            ticks = await util.handler.ticks();
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            expect(ticks).to.equal(2)
            expect(lastTokenId).to.equal(1)
            expect(lastTo).to.equal(util.deployer.address)
        })
        it('can register wildcard callbacks', async() => {
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)            
            await ERC721.setApprovalForAll(util.handler.address, true)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerWildcardCallback(ERC1155.address, util.handler.address, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            let hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.MINT)
            expect(hasCallback).to.equal(true)
        })
        it('can register wildcard callback and tokenId callback', async() => {
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)            
            await ERC721.setApprovalForAll(util.handler.address, true)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerWildcardCallback(ERC1155.address, util.handler.address, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            let hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.MINT)
            expect(hasCallback).to.equal(true)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT)
            expect(hasCallback).to.equal(true)
        })
        it('can execute single wildcard callback', async()=>{
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)            
            await ERC721.setApprovalForAll(util.handler.address, true)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerWildcardCallback(ERC1155.address, util.handler.address, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            let hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.MINT)
            expect(hasCallback).to.equal(true)
            await ERC1155.transferOwnership(util.handler.address)
            let ticks = await util.handler.ticks()
            expect(ticks).to.equal(0)
            await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1)
            ticks = await util.handler.ticks();
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            expect(ticks).to.equal(1)
            expect(lastTokenId).to.equal(1)
            expect(lastTo).to.equal(util.deployer.address)
        })
        it('can execute wildcard and tokenId callback', async()=>{
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)            
            await ERC721.setApprovalForAll(util.handler.address, true)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            await util.handler.registerWildcardCallback(ERC1155.address, util.handler.address, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            await ERC1155.transferOwnership(util.handler.address)
            let ticks = await util.handler.ticks()
            expect(ticks).to.equal(0)
            await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1)
            ticks = await util.handler.ticks();
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            expect(ticks).to.equal(2)
            expect(lastTokenId).to.equal(1)
            expect(lastTo).to.equal(util.deployer.address)
        })
        it('can allow minting when no callbacks registered', async()=>{
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)
            await ERC721.setApprovalForAll(util.handler.address, true)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await ERC1155.transferOwnership(util.handler.address)
            await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1)
            ticks = await util.handler.ticks()
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            expect(ticks).to.equal(0)
            expect(lastTokenId).to.equal(0)
            expect(lastTo).to.equal('0x0000000000000000000000000000000000000000')
        })
        it('can revert when registered callback type allows reversion', async()=>{
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)
            await ERC721.setApprovalForAll(util.handler.address, true)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_REVERT_CALLBACK_FUNCTION, true)
            await ERC1155.transferOwnership(util.handler.address)
            let tx = util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1)
            await expect(tx).to.be.revertedWith("Callback Reverted")
        })
        it('can revert when registered callback type allows reversion and callback is invalid', async()=>{
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)
            await ERC721.setApprovalForAll(util.handler.address, true)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_FAKE_CALLBACK_FUNCTION, true)
            await ERC1155.transferOwnership(util.handler.address)
            let tx = util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1)
            await expect(tx).to.be.revertedWith("Callback Reverted")
        })
        it('can catch revert when registered callback type does not allow reversion', async()=>{
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)
            await ERC721.setApprovalForAll(util.handler.address, true)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_REVERT_CALLBACK_FUNCTION, false)
            await ERC1155.transferOwnership(util.handler.address)            
            await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1)
            let ticks = await util.handler.ticks()
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            expect(ticks).to.equal(0)
            expect(lastTokenId).to.equal(0)
            expect(lastTo).to.equal('0x0000000000000000000000000000000000000000')
        })
        it('can catch revert when registered callback type does not allow reversion and is invalid callback', async()=>{
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)
            await ERC721.setApprovalForAll(util.handler.address, true)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_FAKE_CALLBACK_FUNCTION, false)
            await ERC1155.transferOwnership(util.handler.address)            
            await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1)
            let ticks = await util.handler.ticks()
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            expect(ticks).to.equal(0)
            expect(lastTokenId).to.equal(0)
            expect(lastTo).to.equal('0x0000000000000000000000000000000000000000')
        })
        it('can continue when one failing callback type does not allow reversion', async()=>{
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)
            await ERC721.setApprovalForAll(util.handler.address, true)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_REVERT_CALLBACK_FUNCTION, false)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            await ERC1155.transferOwnership(util.handler.address)            
            await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1)
            let ticks = await util.handler.ticks()
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            expect(ticks).to.equal(1)
            expect(lastTokenId).to.equal(1)
            expect(lastTo).to.equal(util.deployer.address)
        })
        it('can revert when one failing callback type does allow reversion', async()=>{
            let ERC721 = util.getEmblemVault(util.emblem.address, util.deployer)
            ERC721.mint(util.deployer.address, 2, "test", 0x0)
            await ERC721.setApprovalForAll(util.handler.address, true)
            await util.handler.registerContract(ERC721.address, REGISTRATION_TYPE.ERC721)
            await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, false)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_REVERT_CALLBACK_FUNCTION, true)
            await ERC1155.transferOwnership(util.handler.address)
            let tx = util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1)
            await expect(tx).to.be.revertedWith("Callback Reverted")
            let ticks = await util.handler.ticks()
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            expect(ticks).to.equal(0)
            expect(lastTokenId).to.equal(0)
            expect(lastTo).to.equal('0x0000000000000000000000000000000000000000')
        })
        
        it('should now allow callback non registrant to remove callback', async()=>{
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            await util.handler.registerCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
            let handler = util.getHandler(util.handler.address, util.bob)
            let tx = handler.unregisterCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, 0)
            await expect(tx).to.be.revertedWith("Not owner or Callback registrant")
        })

        it('should allow callback owner to remove tokenId callback', async()=>{
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            let handler = util.getHandler(util.handler.address, util.bob)
            await handler.registerCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
            let hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER)
            expect(hasCallback).to.equal(true)
            await handler.unregisterCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, 0)
            hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER)
            expect(hasCallback).to.equal(false)        
        })
        it('should allow callback owner to remove wildcard callback', async()=>{
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            let handler = util.getHandler(util.handler.address, util.bob)
            await handler.registerWildcardCallback(ERC1155.address, util.handler.address, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
            let hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.TRANSFER)
            expect(hasCallback).to.equal(true)
            await handler.unregisterCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.TRANSFER, 0)
            hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.TRANSFER)
            expect(hasCallback).to.equal(false)        
        })
        it('should allow contract owner to remove tokenId callback', async()=>{
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            let handler = util.getHandler(util.handler.address, util.bob)
            await handler.registerCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
            let hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER)
            expect(hasCallback).to.equal(true)
            await util.handler.unregisterCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, 0)
            hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER)
            expect(hasCallback).to.equal(false)
        })

        it('should allow contract owner to remove wildcard callback', async()=>{
            await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
            let handler = util.getHandler(util.handler.address, util.bob)
            await handler.registerWildcardCallback(ERC1155.address, util.handler.address, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
            let hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.TRANSFER)
            expect(hasCallback).to.equal(true)
            await util.handler.unregisterCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.TRANSFER, 0)
            hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.TRANSFER)
            expect(hasCallback).to.equal(false)
        })

        it('should execute callbacks on batch transfer')
        it('should execute callbacks on batch mint')
    })
})