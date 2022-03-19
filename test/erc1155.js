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
    return new HDWalletProvider(process.env.ETHKEY || "a819fcd7afa2c39a7f9baf70273a128875b6c9f03001b218824559ccad6ef11c", selectProviderEndpoint(network), 0, 1)
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
const REGISTRATION_TYPE = {"EMPTY": 0, "ERC1155": 1, "ERC721":2, "HANDLER":3, "ERC20":4, "BALANCE":5, "CLAIM":6, "UNKNOWN":7, "FACTORY":8, "STAKING": 9, "BYPASS": 10}// 0 EMPTY, 1 ERC1155, 2 ERC721, 3 HANDLER, 4 ERC20, 5 BALANCE, 6 CLAIM 7 UNKNOWN

const util = new Util()
let ERC1155

describe('ERC1155', () => {
    beforeEach(async ()=>{
        await util.deployHandler()
        await util.deployBalanceUpgradable()
        await util.deployClaimedUpgradable()
        await util.deployERC721Factory()
        await util.deployERC20Factory()
        await util.deployERC1155Upgradable()
        ERC1155 = util.erc1155Factory.clone
      })
    describe('V2 Upgradable', ()=>{
        it('should deploy ERC1155 Vaults', async ()=>{
            expect(ERC1155.address).to.exist
        })
        it('should return proper uri', async ()=>{
            let uri = await ERC1155.uri(1337)
            expect(uri).to.equal("https://api.emblemvault.io/s:evmetadata/meta/1337")
        })
        describe('Burn', ()=>{
            it.only('should burn', async()=>{
                await ERC1155.toggleSerialization()
                await ERC1155.mint(util.deployer.address, 789, 1)
                let balanceERC1155 = await ERC1155.balanceOf(util.deployer.address, 789)
                expect(balanceERC1155).to.equal(1)
                await ERC1155.burn(util.deployer.address, 789, 1)
                balanceERC1155 = await ERC1155.balanceOf(util.deployer.address, 789)
                expect(balanceERC1155).to.equal(0)
            })
        })
        describe('Mint', ()=>{
            it.only('should mint', async()=>{
                await ERC1155.toggleSerialization()
                let balanceERC1155 = await ERC1155.balanceOf(util.bob.address, 789)
                expect(balanceERC1155).to.equal(0)
                await ERC1155.mint(util.bob.address, 789, 2)
                balanceERC1155 = await ERC1155.balanceOf(util.bob.address, 789)
                expect(balanceERC1155).to.equal(2)
            })
        
            it.only('should not mint directly if owned by handler', async()=>{
                await ERC1155.toggleSerialization()
                let balanceERC1155 = await ERC1155.balanceOf(util.bob.address, 789)
                expect(balanceERC1155).to.equal(0)
                await ERC1155.transferOwnership(util.handler.address)
                let tx = ERC1155.mint(util.bob.address, 789, 2)
                expect(tx).to.be.revertedWith('018001')
            })
        
            // it('should mint via handler with signature if signer is a witness', async () => {
            //     await ERC1155.transferOwnership(util.handler.address)
            //     await util.handler.changePrice(0)
            //     await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
            //     var provider = selectProvider("mainnet")
            //     var web3 = new Web3(provider)
            //     let hash = web3.utils.soliditySha3(ERC1155.address, util.deployer.address, 123, 111, "payload")
            //     let sig = await sign(web3, hash)
            //     let balance = await ERC1155.balanceOf(util.deployer.address, 123)
            //     expect(balance.toNumber()).to.equal(0)
            //     await util.handler.buyWithSignature(ERC1155.address, util.deployer.address, 123, "payload", 111, sig)
            //     balance = await ERC1155.balanceOf(util.deployer.address, 123)
            //     expect(balance.toNumber()).to.equal(1)
            //   })
        
            it.only('should mint via handler with signed price', async () => {
                await ERC1155.toggleSerialization()
                await ERC1155.transferOwnership(util.handler.address)
                let covalAddress = util.erc20.address
                await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                let hash = web3.utils.soliditySha3(ERC1155.address, covalAddress, 0, util.deployer.address, 123, 111, "payload")
                let sig = await sign(web3, hash)
                let balance = await ERC1155.balanceOf(util.deployer.address, 123)
                expect(balance.toNumber()).to.equal(0)
                await util.handler.buyWithSignedPrice(ERC1155.address, covalAddress, 0, util.deployer.address, 123, "payload", 111, sig, util.serializeUintToBytes(0))
                balance = await ERC1155.balanceOf(util.deployer.address, 123)
                expect(balance.toNumber()).to.equal(1)
              })
    
              it('MINT sig: for testing purposes only', async () => {
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                let hash = web3.utils.soliditySha3("0x9022fb4487EBa36D5BBb0a1459247E0A6072430E", "0x44c1a9d7d1f932b4c2811a70edffdd6ae2eb60e6", 0, "0x5B3cFb86a9575a2C42fd88AA71F0957004fa9209", 899828, 6358892423, "payload")
                console.log("hash", hash)
                let sig = await sign(web3, hash)
                console.log("sig", sig)
              })
        })
    
        describe('Bypass', ()=>{
            beforeEach(async()=>{
                await ERC1155.toggleSerialization()
            })
            it.only('not allow bypass if bypass not allowed', async()=>{
                await ERC1155.mint(util.deployer.address, 789, 1)
                ERC1155 = await util.getERC1155(ERC1155.address, util.bob)
                let tx = ERC1155.safeTransferFrom(util.deployer.address, util.bob.address, 789, 1, 0x0)
                await expect(tx).to.be.revertedWith("ERC1155: caller is not owner nor approved nor bypasser")
            })
            it.only('not allow bypass if bypass allowed and not registered as bypasser', async()=>{
                await ERC1155.mint(util.deployer.address, 789, 1)
                await ERC1155.toggleBypassability()
                ERC1155 = await util.getERC1155(ERC1155.address, util.bob)
                let tx = ERC1155.safeTransferFrom(util.deployer.address, util.bob.address, 789, 1, 0x0)
                await expect(tx).to.be.revertedWith("ERC1155: caller is not owner nor approved nor bypasser")
            })
            it.only('only admin can add bypasser', async()=>{
                await ERC1155.mint(util.deployer.address, 789, 1)
                ERC1155 = await util.getERC1155(ERC1155.address, util.bob)
                let tx = ERC1155.registerContract(util.bob.address, REGISTRATION_TYPE.BYPASS)
                await expect(tx).to.be.revertedWith("Contract is not registered nor Owner")
            })
            it.only('not allow bypass if bypass allowed and registered as bypasser but wrong id', async()=>{
                await ERC1155.mint(util.deployer.address, 321, 1)
                let balanceERC1155 = await ERC1155.balanceOf(util.bob.address, 321)
                expect(balanceERC1155).to.equal(0)
                await ERC1155.toggleBypassability()
                await ERC1155.addBypassRule(util.bob.address, "0xf242432a", 789);
                ERC1155 = await util.getERC1155(ERC1155.address, util.bob)
                let tx = ERC1155.safeTransferFrom(util.deployer.address, util.bob.address, 321, 1, 0x0)
                await expect(tx).to.be.revertedWith("ERC1155: caller is not owner nor approved nor bypasser")
            })
            it.only('allow bypass if bypass for tokenid allowed and registered as bypasser', async()=>{
                await ERC1155.mint(util.deployer.address, 789, 1)
                let balanceERC1155 = await ERC1155.balanceOf(util.bob.address, 789)
                expect(balanceERC1155).to.equal(0)
                await ERC1155.toggleBypassability()
                await ERC1155.addBypassRule(util.bob.address, "0xf242432a", 789);
                ERC1155 = await util.getERC1155(ERC1155.address, util.bob)
                await ERC1155.safeTransferFrom(util.deployer.address, util.bob.address, 789, 1, 0x0)
                balanceERC1155 = await ERC1155.balanceOf(util.bob.address, 789)
                expect(balanceERC1155).to.equal(1)
            })
            it.only('not allow bypass of ownerOnly if no valid rule', async()=>{
                let currentUri = await ERC1155.uri(789);
                expect(currentUri).to.equal("https://api.emblemvault.io/s:evmetadata/meta/789")
                await ERC1155.toggleBypassability()
                ERC1155 = await util.getERC1155(ERC1155.address, util.bob)
                let tx = ERC1155.setURI("foo.bar")
                await expect(tx).to.be.revertedWith("Not owner or able to bypass")
                
            })
            it.only('allow bypass of ownerOnly if valid rule', async()=>{
                let currentUri = await ERC1155.uri(789);
                expect(currentUri).to.equal("https://api.emblemvault.io/s:evmetadata/meta/789")
                await ERC1155.toggleBypassability()
                await ERC1155.addBypassRule(util.bob.address, "0x02fe5305", 0)
                ERC1155 = await util.getERC1155(ERC1155.address, util.bob)
                await ERC1155.setURI("foo.bar/")
                currentUri = await ERC1155.uri(789);
                expect(currentUri).to.equal("foo.bar/789")
            })
        })
        
        
        describe('Non-Fungibility', ()=>{
            it.only('should be serialized by default', async ()=>{
                let serialized = await ERC1155.isSerialized()
                expect(serialized).to.equal(true)
            })
            it.only('non owner can not toggle serializability', async ()=>{
                ERC1155 = util.getERC1155(util.erc1155.address, util.bob)            
                let tx = ERC1155.toggleSerialization()
                await expect(tx).to.be.revertedWith("Not owner or able to bypass")
            })
            it.only('owner can toggle serializability', async ()=>{            
                await ERC1155.toggleSerialization()
                let serialized = await ERC1155.isSerialized()
                expect(serialized).to.equal(false)
            })
            it.only('should not mint serialnumber if serialization is disabled', async ()=>{
                await ERC1155.toggleSerialization()
                await ERC1155.mint(util.deployer.address, 789, 1)
                let serialnumber =  await ERC1155.getSerial(789, 0)
                expect(serialnumber).to.equal('0x0000000000000000000000000000000000000000')
            })
            it.only('should not allow turning off serization if any serialized items exist', async()=>{
                await ERC1155.mintWithSerial(util.deployer.address, 789, 1, util.serializeUintToBytes(789))
                let tx = ERC1155.toggleSerialization()
                await expect(tx).to.be.revertedWith('Already has serialized items')
            })
        })
        describe('Claim', ()=>{
            it.only('should claim erc1155 via handler with permission', async()=>{
                // await util.cloneClaimed(util.deployer.address)
                let claimedContract = util.claimedUpgradable
                await util.handler.registerContract(util.claimedUpgradable.address, 6)
                await claimedContract.registerContract(util.handler.address, 3)
                await util.handler.registerContract(ERC1155.address, 1)
                await ERC1155.mintWithSerial(util.deployer.address, 789, 1, util.serializeUintToBytes(789))
                let serialNumber = await ERC1155.getSerial(789, 0)
                await ERC1155.setApprovalForAll(util.handler.address, true)
                let isClaimed = await util.claimedUpgradable.isClaimed(ERC1155.address, serialNumber, [])
                expect(isClaimed).to.be.false
                let hasClaimed = await util.claimedUpgradable.getClaimsFor(util.deployer.address)
                expect(hasClaimed.length).to.equal(0)
                await util.handler.claim(ERC1155.address, 789)
                isClaimed = await util.claimedUpgradable.isClaimed(ERC1155.address, serialNumber, [])
                expect(isClaimed).to.be.true
                let claimedBy = await util.claimedUpgradable.claimedBy(ERC1155.address, serialNumber)
                expect(claimedBy[0]).to.equal(util.deployer.address)
                expect(claimedBy[1]).to.equal('record')
                let serialTokenId = await ERC1155.getTokenIdForSerialNumber(serialNumber)
                expect(serialTokenId).to.equal(789)
                let newOwner = await ERC1155.getOwnerOfSerial(serialNumber)
                expect(newOwner).to.equal("0x0000000000000000000000000000000000000000")
                hasClaimed = await util.claimedUpgradable.getClaimsFor(util.deployer.address)
                expect(serialNumber).to.equal(hasClaimed[0])
              })
            it.only('should get correct serialNumber for owner and tokenId after claims', async()=>{
                let claimedContract = util.claimedUpgradable
                await util.handler.registerContract(util.claimedUpgradable.address, 6)
                await claimedContract.registerContract(util.handler.address, 3)
                await util.handler.registerContract(ERC1155.address, 1)
                await ERC1155.mintWithSerial(util.deployer.address, 789, 2, util.serializeUintArrayToBytes([2,3]))
                await ERC1155.mintWithSerial(util.deployer.address, 789, 1, util.serializeUintToBytes(4))
                await ERC1155.setApprovalForAll(util.handler.address, true)
                let firstSerialByOwner = await ERC1155.getFirstSerialByOwner(util.deployer.address, 789)
                expect(firstSerialByOwner).to.equal(2)
                await ERC1155.transferOwnership(util.handler.address)
                await util.handler.claim(ERC1155.address, 789)
                firstSerialByOwner = await ERC1155.getFirstSerialByOwner(util.deployer.address, 789)
                expect(firstSerialByOwner).to.equal(3)
                await util.handler.claim(ERC1155.address, 789)
                firstSerialByOwner = await ERC1155.getFirstSerialByOwner(util.deployer.address, 789)
                expect(firstSerialByOwner).to.equal(4)
                await util.handler.claim(ERC1155.address, 789)
                firstSerialByOwner = await ERC1155.getFirstSerialByOwner(util.deployer.address, 789)
                expect(firstSerialByOwner).to.equal(0)
            })
        })
        describe('Handler Callbacks', ()=>{        
            it('should not allow callback registration in handler without witness')
            it.only('isRegistered should return false when no handler registered', async()=>{
                await ERC1155.unregisterContract(util.handler.address, 0)
                let registered = await ERC1155.isRegistered(util.handler.address, 3)
                expect(registered).to.equal(false)
            })
            it.only('isRegistered should return true when a handler is registered', async()=>{
                // await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
                let registered = await ERC1155.isRegistered(util.handler.address, REGISTRATION_TYPE.HANDLER)
                expect(registered).to.equal(true)
            })
            it.only('isRegistered should return false when a handler is unregistered', async()=>{
                // await ERC1155.registerContract(util.handler.address, REGISTRATION_TYPE.HANDLER)
                let registered = await ERC1155.isRegistered(util.handler.address, REGISTRATION_TYPE.HANDLER)
                expect(registered).to.equal(true)
                await ERC1155.unregisterContract(util.handler.address,0)
                registered = await ERC1155.isRegistered(util.handler.address, REGISTRATION_TYPE.HANDLER)
                expect(registered).to.equal(false)
            })
            it.only('should allow adding callback if handler registered', async ()=>{            
                // await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
                let hasCallback = await util.handler.hasCallback(ERC1155.address, util.emblem.address, CALLBACK_TYPE.MINT, 0)
                expect(hasCallback).to.equal(false)
                await util.handler.registerCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                hasCallback = await util.handler.hasCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.MINT)
                expect(hasCallback).to.equal(true)
            })
            it.only('should allow grabbing all registered contracts of type', async ()=>{
                // await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
                let registered = await util.handler.getAllRegisteredContractsOfType(REGISTRATION_TYPE.ERC1155)
                expect(registered.length).to.equal(1)
                expect(registered[0]).to.equal(ERC1155.address)
            })
            it.only('should not have callback of different trigger', async ()=>{            
                // await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)            
                await util.handler.registerCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                let hasCallback = await util.handler.hasCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.CLAIM)
                expect(hasCallback).to.equal(false)
            })
            it.only('should allow multiple callbacks to be registered', async()=>{
                // await util.handler.registerContract(ERC1155.address, REGISTRATION_TYPE.ERC1155)
                await util.handler.registerCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                await util.handler.registerCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
                let hasCallback = await util.handler.hasCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.MINT)
                expect(hasCallback).to.equal(true)
                hasCallback = await util.handler.hasCallback(ERC1155.address, util.emblem.address, 1, CALLBACK_TYPE.TRANSFER)
                expect(hasCallback).to.equal(true)
            })
            it.only('can execute single mint callback', async()=>{
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)
                await ERC721.setApprovalForAll(util.handler.address, true)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                await ERC1155.transferOwnership(util.handler.address)
                let ticks = await util.handler.ticks()
                expect(ticks).to.equal(0)
    
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                let hash = web3.utils.soliditySha3(ERC721.address, ERC1155.address, 2, 1, util.serializeUintToBytes(123), 111)
                let sig = await sign(web3, hash)
                await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
    
                await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1, 111, sig, util.serializeUintToBytes(123))
                ticks = await util.handler.ticks();
                let lastTokenId = await util.handler.lastTokenId()
                let lastTo = await util.handler.lastTo()
                expect(ticks).to.equal(1)
                expect(lastTokenId).to.equal(1)
                expect(lastTo).to.equal(util.deployer.address)
            })
            it.only('can execute multple mint callbacks', async()=>{
                await ERC1155.toggleSerialization()
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                await ERC1155.transferOwnership(util.handler.address)
                let ticks = await util.handler.ticks()
                expect(ticks).to.equal(0)
                await util.handler.mint(ERC1155.address, util.deployer.address, 789, "", "", 2)
                ticks = await util.handler.ticks();
                let lastTokenId = await util.handler.lastTokenId()
                let lastTo = await util.handler.lastTo()
                expect(ticks).to.equal(2)
                expect(lastTokenId).to.equal(789)
                expect(lastTo).to.equal(util.deployer.address)
            })
            it.only('can handle transfer when no callbacks registered', async()=>{
                await ERC1155.toggleSerialization()
                await ERC1155.mint(util.deployer.address, 789, 2)
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
            it.only('can handle transfer when no handler registered', async()=>{
                await ERC1155.toggleSerialization()
                await ERC1155.mint(util.deployer.address, 789, 2)
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
            it.only('can execute single transfer callback', async()=>{
                await ERC1155.toggleSerialization()
                await ERC1155.mint(util.deployer.address, 789, 2)
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)
                await ERC721.setApprovalForAll(util.handler.address, true)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
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
            it.only('can execute single claim callback', async()=>{
                // await ERC1155.toggleSerialization()
                let claimedContract = util.claimedUpgradable
                await util.handler.registerContract(util.claimedUpgradable.address, 6)
                await claimedContract.registerContract(util.handler.address, 3)
                await ERC1155.mintWithSerial(util.deployer.address, 789, 1, util.serializeUintToBytes(123))
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.CLAIM, TEST_CALLBACK_FUNCTION, true)
                await ERC1155.transferOwnership(util.handler.address)
                await ERC1155.setApprovalForAll(util.handler.address, true)
                let ticks = await util.handler.ticks()
                expect(ticks).to.equal(0)
                await util.handler.claim(ERC1155.address, 789)
                ticks = await util.handler.ticks()
                let lastTokenId = await util.handler.lastTokenId()
                let lastTo = await util.handler.lastTo()
                let lastFrom = await util.handler.lastFrom()
                expect(ticks).to.equal(1)
                expect(lastTokenId).to.equal(789)
                expect(lastTo).to.equal("0x0000000000000000000000000000000000000000")
                expect(lastFrom).to.equal(util.deployer.address)
            })
            it.only('can execute multiple mint callbacks', async()=>{
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)            
                await ERC721.setApprovalForAll(util.handler.address, true)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                await ERC1155.transferOwnership(util.handler.address)
                let ticks = await util.handler.ticks()
                expect(ticks).to.equal(0)
    
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                let hash = web3.utils.soliditySha3(ERC721.address, ERC1155.address, 2, 1, util.serializeUintToBytes(123), 111)
                let sig = await sign(web3, hash)
                await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
    
                await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1, 111, sig, util.serializeUintToBytes(123))
                ticks = await util.handler.ticks();
                let lastTokenId = await util.handler.lastTokenId()
                let lastTo = await util.handler.lastTo()
                expect(ticks).to.equal(2)
                expect(lastTokenId).to.equal(1)
                expect(lastTo).to.equal(util.deployer.address)
            })
            it.only('can register wildcard callbacks', async() => {
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)            
                await ERC721.setApprovalForAll(util.handler.address, true)
                await util.handler.registerWildcardCallback(ERC1155.address, util.handler.address, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                let hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.MINT)
                expect(hasCallback).to.equal(true)
            })
            it.only('can register wildcard callback and tokenId callback', async() => {
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)            
                await ERC721.setApprovalForAll(util.handler.address, true)
                await util.handler.registerWildcardCallback(ERC1155.address, util.handler.address, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                let hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.MINT)
                expect(hasCallback).to.equal(true)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT)
                expect(hasCallback).to.equal(true)
            })
            it.only('can execute single wildcard callback', async()=>{
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)            
                await ERC721.setApprovalForAll(util.handler.address, true)
                await util.handler.registerWildcardCallback(ERC1155.address, util.handler.address, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                let hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.MINT)
                expect(hasCallback).to.equal(true)
                await ERC1155.transferOwnership(util.handler.address)
                let ticks = await util.handler.ticks()
                expect(ticks).to.equal(0)
    
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                let hash = web3.utils.soliditySha3(ERC721.address, ERC1155.address, 2, 1, util.serializeUintToBytes(123), 111)
                let sig = await sign(web3, hash)
                await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
    
                await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1, 111, sig, util.serializeUintToBytes(123))
                ticks = await util.handler.ticks();
                let lastTokenId = await util.handler.lastTokenId()
                let lastTo = await util.handler.lastTo()
                expect(ticks).to.equal(1)
                expect(lastTokenId).to.equal(1)
                expect(lastTo).to.equal(util.deployer.address)
            })
            it.only('can execute wildcard and tokenId callback', async()=>{
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)            
                await ERC721.setApprovalForAll(util.handler.address, true)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                await util.handler.registerWildcardCallback(ERC1155.address, util.handler.address, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                await ERC1155.transferOwnership(util.handler.address)
                let ticks = await util.handler.ticks()
                expect(ticks).to.equal(0)
    
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                let hash = web3.utils.soliditySha3(ERC721.address, ERC1155.address, 2, 1, util.serializeUintToBytes(123), 222)
                let sig = await sign(web3, hash)
                await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
    
                await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1, 222, sig, util.serializeUintToBytes(123))
                ticks = await util.handler.ticks();
                let lastTokenId = await util.handler.lastTokenId()
                let lastTo = await util.handler.lastTo()
                expect(ticks).to.equal(2)
                expect(lastTokenId).to.equal(1)
                expect(lastTo).to.equal(util.deployer.address)
            })
            it.only('can allow minting when no callbacks registered', async()=>{
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)
                await ERC721.setApprovalForAll(util.handler.address, true)
                await ERC1155.transferOwnership(util.handler.address)
    
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                let hash = web3.utils.soliditySha3(ERC721.address, ERC1155.address, 2, 1, util.serializeUintToBytes(123), 111)
                let sig = await sign(web3, hash)
                await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
    
                await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1, 111, sig, util.serializeUintToBytes(123))
                ticks = await util.handler.ticks()
                let lastTokenId = await util.handler.lastTokenId()
                let lastTo = await util.handler.lastTo()
                expect(ticks).to.equal(0)
                expect(lastTokenId).to.equal(0)
                expect(lastTo).to.equal('0x0000000000000000000000000000000000000000')
            })
            it.only('can revert when registered callback type allows reversion', async()=>{
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)
                await ERC721.setApprovalForAll(util.handler.address, true)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_REVERT_CALLBACK_FUNCTION, true)
                await ERC1155.transferOwnership(util.handler.address)
    
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                let hash = web3.utils.soliditySha3(ERC721.address, ERC1155.address, 2, 1, util.serializeUintToBytes(123), 111)
                let sig = await sign(web3, hash)
                await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
    
                let tx = util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1, 111, sig, util.serializeUintToBytes(123))
                await expect(tx).to.be.revertedWith("Callback Reverted")
            })
            it.only('can revert when registered callback type allows reversion and callback is invalid', async()=>{
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)
                await ERC721.setApprovalForAll(util.handler.address, true)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_FAKE_CALLBACK_FUNCTION, true)
                await ERC1155.transferOwnership(util.handler.address)
    
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                let hash = web3.utils.soliditySha3(ERC721.address, ERC1155.address, 2, 1, util.serializeUintToBytes(123), 111)
                let sig = await sign(web3, hash)
                await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
    
                let tx = util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1, 111, sig, util.serializeUintToBytes(123))
                await expect(tx).to.be.revertedWith("Callback Reverted")
            })
            it.only('can catch revert when registered callback type does not allow reversion', async()=>{
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)
                await ERC721.setApprovalForAll(util.handler.address, true)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_REVERT_CALLBACK_FUNCTION, false)
                await ERC1155.transferOwnership(util.handler.address)
                
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                let hash = web3.utils.soliditySha3(ERC721.address, ERC1155.address, 2, 1, util.serializeUintToBytes(123), 111)
                let sig = await sign(web3, hash)
                await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
    
                await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1, 111, sig, util.serializeUintToBytes(123))
                let ticks = await util.handler.ticks()
                let lastTokenId = await util.handler.lastTokenId()
                let lastTo = await util.handler.lastTo()
                expect(ticks).to.equal(0)
                expect(lastTokenId).to.equal(0)
                expect(lastTo).to.equal('0x0000000000000000000000000000000000000000')
            })
            it.only('can catch revert when registered callback type does not allow reversion and is invalid callback', async()=>{
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)
                await ERC721.setApprovalForAll(util.handler.address, true)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_FAKE_CALLBACK_FUNCTION, false)
                await ERC1155.transferOwnership(util.handler.address)
                
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                let hash = web3.utils.soliditySha3(ERC721.address, ERC1155.address, 2, 1, util.serializeUintToBytes(123), 111)
                let sig = await sign(web3, hash)
                await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
    
                await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1, 111, sig, util.serializeUintToBytes(123))
                let ticks = await util.handler.ticks()
                let lastTokenId = await util.handler.lastTokenId()
                let lastTo = await util.handler.lastTo()
                expect(ticks).to.equal(0)
                expect(lastTokenId).to.equal(0)
                expect(lastTo).to.equal('0x0000000000000000000000000000000000000000')
            })
            it.only('can continue when one failing callback type does not allow reversion', async()=>{
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)
                await ERC721.setApprovalForAll(util.handler.address, true)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_REVERT_CALLBACK_FUNCTION, false)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
                await ERC1155.transferOwnership(util.handler.address)
                
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                let hash = web3.utils.soliditySha3(ERC721.address, ERC1155.address, 2, 1, util.serializeUintToBytes(123), 111)
                let sig = await sign(web3, hash)
                await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
    
                await util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1, 111, sig, util.serializeUintToBytes(123))
                let ticks = await util.handler.ticks()
                let lastTokenId = await util.handler.lastTokenId()
                let lastTo = await util.handler.lastTo()
                expect(ticks).to.equal(1)
                expect(lastTokenId).to.equal(1)
                expect(lastTo).to.equal(util.deployer.address)
            })
            it.only('can revert when one failing callback type does allow reversion', async()=>{
                let ERC721 = util.emblem
                ERC721.mint(util.deployer.address, 2, "test", 0x0)
                await ERC721.setApprovalForAll(util.handler.address, true)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, false)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_REVERT_CALLBACK_FUNCTION, true)
                await ERC1155.transferOwnership(util.handler.address)
    
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                let hash = web3.utils.soliditySha3(ERC721.address, ERC1155.address, 2, 1, util.serializeUintToBytes(123), 111)
                let sig = await sign(web3, hash)
                await util.handler.addWitness("0xFad12e0531b6f53Ec05018Ae779E393a6CdDe396")
    
                let tx = util.handler.moveVault(ERC721.address, ERC1155.address, 2, 1, 111, sig, util.serializeUintToBytes(123))
                await expect(tx).to.be.revertedWith("Callback Reverted")
                let ticks = await util.handler.ticks()
                let lastTokenId = await util.handler.lastTokenId()
                let lastTo = await util.handler.lastTo()
                expect(ticks).to.equal(0)
                expect(lastTokenId).to.equal(0)
                expect(lastTo).to.equal('0x0000000000000000000000000000000000000000')
            })
            
            it.only('should not allow callback non registrant to remove callback', async()=>{
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
                let handler = util.getHandler(util.handler.address, util.bob)
                let tx = handler.unregisterCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, 0)
                await expect(tx).to.be.revertedWith("Not owner or Callback registrant")
            })
    
            it.only('should not allow non contract owner to add tokenId callback', async()=>{
                let handler = util.getHandler(util.handler.address, util.bob)
                let tx = handler.registerCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
                await expect(tx).to.be.revertedWith("Not owner or able to bypass")        
            })
            it.only('should not allow non contract owner to add wildcard callback', async()=>{
                let handler = util.getHandler(util.handler.address, util.bob)
                let tx = handler.registerWildcardCallback(ERC1155.address, util.handler.address, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
                await expect(tx).to.be.revertedWith("Not owner or able to bypass")     
            })
            it.only('should allow contract owner to remove tokenId callback', async()=>{
                let handler = util.getHandler(util.handler.address, util.deployer)
                await handler.registerCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
                let hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER)
                expect(hasCallback).to.equal(true)
                await util.handler.unregisterCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, 0)
                hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER)
                expect(hasCallback).to.equal(false)
            })
    
            it.only('should allow contract owner to remove wildcard callback', async()=>{
                let handler = util.getHandler(util.handler.address, util.deployer)
                await handler.registerWildcardCallback(ERC1155.address, util.handler.address, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
                let hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.TRANSFER)
                expect(hasCallback).to.equal(true)
                await util.handler.unregisterCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.TRANSFER, 0)
                hasCallback = await util.handler.hasCallback(ERC1155.address, util.handler.address, 0, CALLBACK_TYPE.TRANSFER)
                expect(hasCallback).to.equal(false)
            })
    
            it.only('should execute multiple callbacks on batch transfer', async()=>{
                await ERC1155.mintWithSerial(util.deployer.address, 789, 1, util.serializeUintToBytes(123))
                await ERC1155.mintWithSerial(util.deployer.address, 456, 1, util.serializeUintToBytes(111))
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 456, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
                let ticks = await util.handler.ticks()
                expect(ticks).to.equal(0)
                await ERC1155.safeBatchTransferFrom(util.deployer.address, util.bob.address, [789, 456], [1,1], 0)
                ticks = await util.handler.ticks()
                let lastTokenId = await util.handler.lastTokenId()
                let lastTo = await util.handler.lastTo()
                let lastFrom = await util.handler.lastFrom()
                expect(ticks).to.equal(2)
                expect(lastTokenId).to.equal(456)
                expect(lastTo).to.equal(util.bob.address)
                expect(lastFrom).to.equal(util.deployer.address)
            })
            it.only('should execute multiple callbacks on transfer of multiple amount', async()=>{
                await ERC1155.mintWithSerial(util.deployer.address, 789, 2, util.serializeUintArrayToBytes([123, 786]))
                await util.handler.registerCallback(ERC1155.address, util.handler.address, 789, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
                let ticks = await util.handler.ticks()
                expect(ticks).to.equal(0)
                await ERC1155.safeTransferFrom(util.deployer.address, util.bob.address, 789, 2, 0)
                ticks = await util.handler.ticks()
                let lastTokenId = await util.handler.lastTokenId()
                let lastTo = await util.handler.lastTo()
                let lastFrom = await util.handler.lastFrom()
                expect(ticks).to.equal(2)
                expect(lastTokenId).to.equal(789)
                expect(lastTo).to.equal(util.bob.address)
                expect(lastFrom).to.equal(util.deployer.address)
            })
            it('should execute callbacks on batch mint')
            it.only('FUNCTION generate: for testing purposes only', async()=>{
                var provider = selectProvider("mainnet")
                var web3 = new Web3(provider)
                // let hash = web3.eth.abi.encodeFunctionSignature('catchCallbackFrom(address,address,uint256)').substr(0, 10) //catchCallback(address, address _to, uint256)
                let hash = web3.eth.abi.encodeFunctionSignature('changeName(string,string)').substr(0, 10) //getFunctions()
                console.log("hash", hash)
            })
        })
        describe('Serialization', async()=>{
            it.only('should mint with overloadSerial off', async ()=>{
                await ERC1155.toggleOverloadSerial()
                await ERC1155.mint(util.deployer.address, 789, 1)
                let currentBalance = await ERC1155.balanceOf(util.deployer.address, 789)
                expect(currentBalance).to.equal(1)
            })
            it.only('can mint with provided serial', async ()=>{
                // await util.deployERC1155Upgradable(util.handler)
                await ERC1155.mintWithSerial(util.deployer.address, 789, 1, util.serializeUintToBytes(123))
                let currentBalance = await ERC1155.balanceOf(util.deployer.address, 789)
                expect(currentBalance).to.equal(1)
                let currentSerial = await ERC1155.getFirstSerialByOwner(util.deployer.address, 789)
                expect(currentSerial).to.equal(123)
            })
            it.only('should not mint with duplicate serial', async ()=>{
                // await util.deployERC1155Upgradable(util.handler)
                await ERC1155.mintWithSerial(util.deployer.address, 789, 1, util.serializeUintToBytes(123))
                let tx = ERC1155.mintWithSerial(util.deployer.address, 789, 1, util.serializeUintToBytes(123))
                await expect(tx).to.be.revertedWith("Serial number already used")
            })
            it.only('should not standard mint when overridable', async ()=>{
                // await util.deployERC1155Upgradable(util.handler)
                let tx = ERC1155.mint(util.deployer.address, 789, 1)
                await expect(tx).to.be.revertedWith("Must provide serial number")
            })
            it.only('should not mint amounts over 1 with duplicate encoded serials', async ()=>{
                // await util.deployERC1155Upgradable(util.handler)
                let tx = ERC1155.mintWithSerial(util.deployer.address, 789, 2, util.serializeUintArrayToBytes([123, 123]))
                await expect(tx).to.be.revertedWith("Serial number already used")
            })
            it.only('should mint amounts over 1 with encoded serials', async ()=>{
                // await util.deployERC1155Upgradable(util.handler)
                await ERC1155.mintWithSerial(util.deployer.address, 789, 2, util.serializeUintArrayToBytes([123, 456]))
                let serial1 = await ERC1155.getSerial(789, 0)
                let serial2 = await ERC1155.getSerial(789, 1)
                expect(serial1).to.equal(123)
                expect(serial2).to.equal(456)
            })
            it.only('should not mint batch with duplicate encoded serials', async ()=>{
                // await util.deployERC1155Upgradable(util.handler)
                let tx = ERC1155.mintBatch(util.deployer.address, [789, 543], [1,1], util.serializeToByteArray([123, 123]))
                await expect(tx).to.be.revertedWith("Serial number already used")
            })
            it.only('should mint batch with encoded serials', async ()=>{
                // await util.deployERC1155Upgradable(util.handler)
                await ERC1155.mintBatch(util.deployer.address, [789, 543], [1,1], util.serializeToByteArray([123, 456]))
                let serial1 = await ERC1155.getSerial(789, 0)
                let serial2 = await ERC1155.getSerial(543, 0)
                expect(serial1).to.equal(123)
                expect(serial2).to.equal(456)
            })
            it.only('should mint batch with encoded serials and amounts', async ()=>{
                // await util.deployERC1155Upgradable(util.handler)
                await ERC1155.mintBatch(util.deployer.address, [789, 543], [1,2], util.serializeToByteArray([789, [123, 456]]))
                let serial1 = await ERC1155.getSerial(789, 0)
                let serial2 = await ERC1155.getSerial(543, 0)
                let serial3 = await ERC1155.getSerial(543, 1)
                expect(serial1).to.equal(789)
                expect(serial2).to.equal(123)
                expect(serial3).to.equal(456)
            })
            it.only('should burn', async ()=>{
                // await util.deployERC1155Upgradable(util.handler)
                await ERC1155.toggleOverloadSerial()
                await ERC1155.mint(util.deployer.address, 789, 1)
                await ERC1155.burn(util.deployer.address, 789, 1)
                let currentBalance = await ERC1155.balanceOf(util.deployer.address, 789)
                expect(currentBalance).to.equal(0)
            })
            it.only('should claim', async ()=>{
                // await util.deployERC1155Upgradable(util.handler)
                await ERC1155.toggleOverloadSerial()
                await util.deployClaimedUpgradable()
                await ERC1155.mint(util.deployer.address, 789, 1)
                await ERC1155.setApprovalForAll(util.handler.address, true)
                await util.handler.registerContract(util.claimedUpgradable.address, 6)
                await util.handler.registerContract(ERC1155.address, 1)
                await ERC1155.registerContract(util.handler.address, 3)
                await util.claimedUpgradable.registerContract(util.handler.address, 3)
                await util.handler.claim(ERC1155.address, 789)
                let claims = await util.claimedUpgradable.getClaimsFor(util.deployer.address)
                expect(claims[0]).to.equal("0xb05d86c0f0c086513efc043d0690939fbbe77b6e0e329030bd231360f0d640ea")
            })     
        })
    })
})


async function sign(web3, hash){
    let accounts = await web3.eth.getAccounts()
    let signature = await web3.eth.sign(hash, accounts[0])
    return signature
}