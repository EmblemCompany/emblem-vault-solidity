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

const CALLBACK_TYPE = {"MINT": 0,"TRANSFER": 1,"CLAIM":2}
const REGISTRATION_TYPE = {"EMPTY": 0, "ERC1155": 1, "ERC721":2, "HANDLER":3, "ERC20":4, "BALANCE":5, "CLAIM":6, "UNKNOWN":7, "FACTORY":8, "STAKING": 9, "BYPASS": 10}// 0 EMPTY, 1 ERC1155, 2 ERC721, 3 HANDLER, 4 ERC20, 5 BALANCE, 6 CLAIM 7 UNKNOWN

const util = new Util()
const MOCK_SINGLE_MINT = {
    "tokenId": "17345490444539905717180301392584903018850183207863137709888446061064238194365",
    "tokenIdPacked": "0x2659331e6f8ed3fa07cc27ff6ae37cae36989e8843aac500749f9f87e70cdebd",
    "serial": "0x00000000000000000000000000000000000000000000000000048d2eead11489",
    "amount": 1
}
const MOCK_BATCH_MINT = [
    {
        "tokenId": "61054066196640160824104690701490096086333068165863065524493427911363067748363",
        "tokenIdPacked": "0x86fb607a9c4cc8f79fac8413e01fdbe74023e5d425c70602464d5b365b15a00b",
        "serial": "0x0000000000000000000000000000000000000000000000000003c4da6acfa72a",
        "amount": 1
    },{
        "tokenId": "88745664613170085708849447032700785823911406235002429158726970225934679441360",
        "tokenIdPacked": "0xc43444224cd5a93070a6e712521285000e1159cdee40aa0ae58f46fa55c87fd0",
        "serial": "0x000000000000000000000000000000000000000000000000000067f84cacbb89",
        "amount": 1
    }
]
let ERC1155Batch

describe('ERC1155 Batch', () => {
    beforeEach(async ()=>{
        await util.deployERC1155Batch()
        ERC1155Batch = util.getContract(util.erc1155Batch.address, "ERC1155UpgradableBatch", util.deployer)
      })
    describe('Batch mint upgrade', ()=>{
        it('should deploy ERC1155Batch Vaults', async ()=>{
            expect(ERC1155Batch.address).to.exist
        })
        it('should mint with serial', async ()=>{            
            await ERC1155Batch.mintWithSerial(util.alice.address, MOCK_SINGLE_MINT.tokenId, 1, MOCK_SINGLE_MINT.serial)
            let balance = await ERC1155Batch.balanceOf(util.alice.address, MOCK_SINGLE_MINT.tokenId)
            expect(balance).to.equal(1)
        })
        it('should mint batch with serial (2)', async ()=>{
            await ERC1155Batch.mintBatch([util.alice.address, util.alice.address], [MOCK_BATCH_MINT[0].tokenIdPacked, MOCK_BATCH_MINT[1].tokenId], [1,1], [1, 2])
            let balance0 = await ERC1155Batch.balanceOf(util.alice.address, MOCK_BATCH_MINT[0].tokenId)
            expect(balance0).to.equal(1)
            let balance1 = await ERC1155Batch.balanceOf(util.alice.address, MOCK_BATCH_MINT[1].tokenId)
            expect(balance1).to.equal(1)
        })
        it('should mint batch with serial (10)', async ()=>{
            let qty = 10
            let startingTokenId = 123123123
            await ERC1155Batch.mintBatch(generateArray(util.alice.address, qty, false), generateArray(startingTokenId, qty), generateArray(1,qty,false), generateArray(1,qty,true))
            for(let i = 0; i < qty; i++) {
                let balance = await ERC1155Batch.balanceOf(util.alice.address, startingTokenId + i)
                expect(balance).to.equal(1)
            }
        })
        it('should mint batch with serial (100)', async ()=>{
            let qty = 100
            let startingTokenId = 123123123
            await ERC1155Batch.mintBatch(generateArray(util.alice.address, qty, false), generateArray(startingTokenId, qty), generateArray(1,qty,false), generateArray(1,qty,true))
            for(let i = 0; i < qty; i++) {
                let balance = await ERC1155Batch.balanceOf(util.alice.address, startingTokenId + i)
                expect(balance).to.equal(1)
            }
        })
        it('should mint batch with serial (1000)', async ()=>{
            let qty = 1000
            let startingTokenId = 123123123
            await ERC1155Batch.mintBatch(generateArray(util.alice.address, qty, false), generateArray(startingTokenId, qty), generateArray(1,qty,false), generateArray(1,qty,true))
            for(let i = 0; i < 10; i++) {
                let balance = await ERC1155Batch.balanceOf(util.alice.address, startingTokenId + i)
                expect(balance).to.equal(1)
            }
        })
        it('should mint batch with serial (5000)', async ()=>{
            let qty = 5000
            let startingTokenId = 123123123
            await ERC1155Batch.mintBatch(generateArray(util.alice.address, qty, false), generateArray(startingTokenId, qty), generateArray(1,qty,false), generateArray(1,qty,true))
            for(let i = 0; i < 10; i++) {
                let balance = await ERC1155Batch.balanceOf(util.alice.address, startingTokenId + i)
                expect(balance).to.equal(1)
            }
        })
    })
})

 function generateArray(input, qty, increment = true) {
     if (increment && typeof input === 'number') {
         return Array.from({length: qty}, (_, i) => input + i);
     } else {
         return Array.from({length: qty}, () => input);
     }
 }
 
async function sign(web3, hash){
    let accounts = await web3.eth.getAccounts()
    let signature = await web3.eth.sign(hash, accounts[0])
    return signature
}