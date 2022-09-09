const { ethers } = require('hardhat');
const { CID } = require('multiformats/cid');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const util = new Util()
const HDWalletProvider = require("@truffle/hdwallet-provider")
const {utils } = require('web3')
const Web3 = require('web3');
const TEST_CALLBACK_FUNCTION = "0x684ee7de" //web3.eth.abi.encodeFunctionSignature('testCallback(address _from, address _to, uint256 tokenId)').substr(0, 10)
const TEST_REVERT_CALLBACK_FUNCTION = "0x5d1c03dd"
const TEST_FAKE_CALLBACK_FUNCTION = "0x4e1c03dd"
// function getRandom(myArray) {
//     let selected = myArray[Math.floor(Math.random() * myArray.length)];
//     return selected
//   }
// let selectProvider = function(network) {
//     return new HDWalletProvider(process.env.ETHKEY || "a819fcd7afa2c39a7f9baf70273a128875b6c9f03001b218824559ccad6ef11c", selectProviderEndpoint(network), 0, 1)
//   }
//   function selectProviderEndpoint(network) {
//     return infuraEndpoints.filter(item => { return item.network == network })[0].address
//   }
//   const MATIC_IDS = [
//     "41f5f3cbf83536b2bf235d2be67a16bf6e5647dd"
//   ]
//   const INFURA_IDS = [  
//     "6112845322b74decbf08005aea176252", // <-- free backup
//     "8e5d2af8fbe244f7b7f32e2ddc152508",
//     "2e2998d61b0644fe8174bca015096245"
//   ]
//   const infuraEndpoints = [
//     { network: "rinkeby", address: "https://rinkeby.infura.io/v3/" + getRandom(INFURA_IDS) || INFURA_ID },
//     { network: "mainnet", address: "https://mainnet.infura.io/v3/" + getRandom(INFURA_IDS) || INFURA_ID },
//     { network: "mumbai", address: "https://rpc-mumbai.maticvigil.com/v1/" + getRandom(MATIC_IDS) },
//     { network: "matic", address: "https://rpc-mainnet.maticvigil.com/v1/" + getRandom(MATIC_IDS) },
//     { network: "xdai", address: "https://rpc.xdaichain.com/" },
//     { network: "bsc", address: "https://bsc-dataseed.binance.org/" },
//     { network: "fantom", address: "https://rpcapi.fantom.network" }
//   ]
// var provider = selectProvider("mainnet")
// var web3 = new Web3(provider)

const CALLBACK_TYPE = {"MINT": 0,"TRANSFER": 1,"CLAIM":2, "BURN": 3}
const REGISTRATION_TYPE = {"EMPTY": 0, "ERC1155": 1, "ERC721":2, "HANDLER":3, "ERC20":4, "BALANCE":5, "CLAIM":6, "UNKNOWN":7, "FACTORY":8, "STAKING": 9, "BYPASS": 10}// 0 EMPTY, 1 ERC1155, 2 ERC721, 3 HANDLER, 4 ERC20, 5 BALANCE, 6 CLAIM 7 UNKNOWN


let ERC20
beforeEach(async ()=>{
  await util.deployHandler()
    await util.deployBalanceUpgradable()
    await util.deployClaimedUpgradable()
    await util.deployERC721Factory()
    await util.deployERC20Factory()
    await util.deployERC1155Factory()
    await util.deployERC20V2()
    ERC20 = util.erc20
    ERC20V2 = util.erc20v2

})
describe('ERC20', () => {
    it('should deploy ERC20 Token', async ()=>{
        expect(ERC20.address).to.exist
    })
    it('FIX: double approve', async()=>{
      await ERC20.mint(util.deployer.address, 2)
      let allowance = await ERC20.allowance(util.deployer.address, util.deployer.address)
      expect(allowance).to.equal(0) // start with zero
      await ERC20.approve(util.deployer.address, 1) // approve 1
      await ERC20.transferFrom(util.deployer.address, util.bob.address, 1) // transfer 1
      allowance = await ERC20.allowance(util.deployer.address, util.deployer.address)
      expect(allowance).to.equal(0) // still zero
    })

    it('BUG: double approve', async()=>{
      await ERC20V2.mint(util.deployer.address, 2)
      let allowance = await ERC20V2.allowance(util.deployer.address, util.deployer.address)
      expect(allowance).to.equal(0) // start with zero
      await ERC20V2.approve(util.deployer.address, 1) // approve 1
      let tx = ERC20V2["transferFrom(address,address,uint256)"](util.deployer.address, util.bob.address, 1) // transfer 1
      await expect(tx).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
      allowance = await ERC20V2.allowance(util.deployer.address, util.deployer.address)
      expect(allowance).to.equal(1) // still 1
      await ERC20V2.approve(util.deployer.address, 2) // approve 2
      ERC20V2["transferFrom(address,address,uint256)"](util.deployer.address, util.bob.address, 1) // transfer 1
      expect(allowance).to.equal(1) // still 1
    })

    describe('Events',()=>{
      it('only admin can emit events', async ()=>{
        ERC20 = util.getERC20(ERC20.address, util.bob)
        let tx =  ERC20['makeEvents(address[],address[],uint256[])'](["0x0000000000000000000000000000000000000000"],["0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5"],[1])
        await expect(tx).to.be.revertedWith("Sender is not Governer")
      })
      it('should emit one transfer event', async ()=>{
        expect(ERC20.address).to.exist
        let tx = await ERC20['makeEvents(address[],address[],uint256[])'](["0x0000000000000000000000000000000000000000"],["0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5"],[1])
        let result = await tx.wait()
        expect(result.events.length).to.equal(1)
        expect(result.events[0].args.from).to.equal("0x0000000000000000000000000000000000000000")
        expect(result.events[0].args.to).to.equal("0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5")
        expect(result.events[0].args.value).to.equal(1)
      })

      it('should emit two transfer events when multiple amounts', async ()=>{
        expect(ERC20.address).to.exist
        let tx = await ERC20['makeEvents(address[],address[],uint256[])'](["0x0000000000000000000000000000000000000000"],["0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5"],[1, 10])
        let result = await tx.wait()
        expect(result.events.length).to.equal(2)
        expect(result.events[0].args.from).to.equal("0x0000000000000000000000000000000000000000")
        expect(result.events[0].args.to).to.equal("0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5")
        expect(result.events[0].args.value).to.equal(1)

        expect(result.events[1].args.from).to.equal("0x0000000000000000000000000000000000000000")
        expect(result.events[1].args.to).to.equal("0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5")
        expect(result.events[1].args.value).to.equal(10)
        console.log(result.events)
      })

      it('should emit two transfer events when multiple to addresses and multiple amounts', async ()=>{
        expect(ERC20.address).to.exist
        let tx = await ERC20['makeEvents(address[],address[],uint256[])'](["0x0000000000000000000000000000000000000000"],["0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5", "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"],[1, 10])
        let result = await tx.wait()
        console.log(result.events)
        expect(result.events.length).to.equal(2)
        expect(result.events[0].args.from).to.equal("0x0000000000000000000000000000000000000000")
        expect(result.events[0].args.to).to.equal("0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5")
        expect(result.events[0].args.value).to.equal(1)

        expect(result.events[1].args.from).to.equal("0x0000000000000000000000000000000000000000")
        expect(result.events[1].args.to).to.equal("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4")
        expect(result.events[1].args.value).to.equal(10)        
      })

      it('should emit two transfer events when multiple to addresses and single amount', async ()=>{
        expect(ERC20.address).to.exist
        let tx = await ERC20['makeEvents(address[],address[],uint256[])'](["0x0000000000000000000000000000000000000000"],["0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5", "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"],[1])
        let result = await tx.wait()
        console.log(result.events)
        expect(result.events.length).to.equal(2)
        expect(result.events[0].args.from).to.equal("0x0000000000000000000000000000000000000000")
        expect(result.events[0].args.to).to.equal("0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5")
        expect(result.events[0].args.value).to.equal(1)

        expect(result.events[1].args.from).to.equal("0x0000000000000000000000000000000000000000")
        expect(result.events[1].args.to).to.equal("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4")
        expect(result.events[1].args.value).to.equal(1)        
      })

      it('should emit multiple transfer events when multiple from addresses', async ()=>{
        expect(ERC20.address).to.exist
        let tx = await ERC20['makeEvents(address[],address[],uint256[])'](["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000001"],["0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5"],[1])
        let result = await tx.wait()
        expect(result.events.length).to.equal(2)
        expect(result.events[0].args.from).to.equal("0x0000000000000000000000000000000000000000")
        expect(result.events[0].args.to).to.equal("0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5")
        expect(result.events[0].args.value).to.equal(1)
        expect(result.events[1].args.from).to.equal("0x0000000000000000000000000000000000000001")
        expect(result.events[1].args.to).to.equal("0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5")
        expect(result.events[1].args.value).to.equal(1)
      })

      it('should emit multiple transfer events when multiple from addresses and multiple amounts', async ()=>{
        expect(ERC20.address).to.exist
        let tx = await ERC20['makeEvents(address[],address[],uint256[])'](["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000001"],["0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5"],[1, 10])
        let result = await tx.wait()
        expect(result.events.length).to.equal(2)
        expect(result.events[0].args.from).to.equal("0x0000000000000000000000000000000000000000")
        expect(result.events[0].args.to).to.equal("0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5")
        expect(result.events[0].args.value).to.equal(1)
        expect(result.events[1].args.from).to.equal("0x0000000000000000000000000000000000000001")
        expect(result.events[1].args.to).to.equal("0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5")
        expect(result.events[1].args.value).to.equal(10)
      })

      it('should emit multiple transfer events when multiple from addresses, multiple to addresses and multiple amounts', async ()=>{
        expect(ERC20.address).to.exist
        let tx = await ERC20['makeEvents(address[],address[],uint256[])'](["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000001"],["0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5", "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"],[1, 10])
        let result = await tx.wait()
        expect(result.events.length).to.equal(2)
        expect(result.events[0].args.from).to.equal("0x0000000000000000000000000000000000000000")
        expect(result.events[0].args.to).to.equal("0x3B31925EeC78dA3CF15c4503604c13b0eEBC57e5")
        expect(result.events[0].args.value).to.equal(1)
        expect(result.events[1].args.from).to.equal("0x0000000000000000000000000000000000000001")
        expect(result.events[1].args.to).to.equal("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4")
        expect(result.events[1].args.value).to.equal(10)
      })

    })

    describe('Upgrade', ()=>{
      it('Should not be an upgrade by default', async ()=>{
        let upgraded = await ERC20.isUpgrade()
        console.log("test")
        expect(upgraded).to.be.false
      })
      it('non admin can not set upgrade', async ()=>{
        ERC20 = await util.getERC20(ERC20.address, util.bob)
        let tx = ERC20.upgradeFrom(ERC20V2.address)
        await expect(tx).to.be.revertedWith("Sender is not Governer")
        let upgraded = await ERC20.isUpgrade()
        expect(upgraded).to.be.false
      })
      it('admin can set upgrade', async ()=>{
        await ERC20.upgradeFrom(ERC20V2.address)
        let upgraded = await ERC20.isUpgrade()
        let upgradeAddress = await ERC20.upgradedFrom()
        expect(upgraded).to.be.true
        expect(upgradeAddress).to.equal(ERC20V2.address)
      })

      it('admin can not set upgrade twice', async ()=>{
        await ERC20.upgradeFrom(ERC20V2.address)
        let tx = ERC20.upgradeFrom(ERC20V2.address)
        await expect(tx).to.be.revertedWith("Contract already an upgrade")
      })

      it('upgraded checks balance of old contract if not seen', async ()=>{
        await ERC20V2.mint(util.bob.address, 1)
        let oldBalance = await ERC20V2.balanceOf(util.bob.address)
        let newBalance = await ERC20.balanceOf(util.bob.address)
        expect(oldBalance).to.equal(1)
        expect(newBalance).to.equal(0)
        await ERC20.upgradeFrom(ERC20V2.address)
        newBalance = await ERC20.balanceOf(util.bob.address)
        expect(newBalance).to.equal(1)
      })

      it('upgraded checks allowance of new contract if not seen', async ()=>{
        await ERC20V2.mint(util.bob.address, 1)
        ERC20V2 = util.getERC20V2(ERC20V2.address, util.bob)
        await ERC20V2.approve(util.deployer.address, 1)
        let oldAllowance = await ERC20V2.allowance(util.bob.address, util.deployer.address)
        let newAllowance = await ERC20.allowance(util.bob.address, util.deployer.address)
        expect(oldAllowance).to.equal(1)
        expect(newAllowance).to.equal(0)
        await ERC20.upgradeFrom(ERC20V2.address)
        newBalance = await ERC20.allowance(util.bob.address, util.deployer.address)
        expect(newBalance).to.equal(0)
      })
      it('upgraded checks totalSupply from old contract with zero balance', async ()=>{
        let oldTotalSupply = await ERC20V2.totalSupply()
        let newTotalSupply = await ERC20.totalSupply()
        expect(oldTotalSupply).to.equal(0)
        expect(newTotalSupply).to.equal(0)
        await ERC20.upgradeFrom(ERC20V2.address)
        newTotalSupply = await ERC20.totalSupply()
        expect(newTotalSupply).to.equal(0)
      })

      it('upgraded checks totalSupply from old contract with 1 balance', async ()=>{
        await ERC20V2.mint(util.bob.address, 1)
        let oldTotalSupply = await ERC20V2.totalSupply()
        let newTotalSupply = await ERC20.totalSupply()
        expect(oldTotalSupply).to.equal(1)
        expect(newTotalSupply).to.equal(0)
        await ERC20.upgradeFrom(ERC20V2.address)
        newTotalSupply = await ERC20.totalSupply()
        expect(newTotalSupply).to.equal(1)
      })

      it('upgraded checks totalSupply from old contract plus any newly minted on new contract', async ()=>{
        await ERC20V2.mint(util.bob.address, 1)
        let oldTotalSupply = await ERC20V2.totalSupply()
        let newTotalSupply = await ERC20.totalSupply()
        expect(oldTotalSupply).to.equal(1)
        expect(newTotalSupply).to.equal(0)
        await ERC20.upgradeFrom(ERC20V2.address)
        await ERC20.mint(util.alice.address, 1)
        newTotalSupply = await ERC20.totalSupply()
        expect(newTotalSupply).to.equal(2)
      })

      it('minting marks address seen', async ()=>{
        let seen = await ERC20.seen(util.bob.address)
        expect(seen).to.be.false
        await ERC20.mint(util.bob.address, 1)
        seen = await ERC20.seen(util.bob.address)
        expect(seen).to.be.true
      })

      it('minting combines old and new balances', async ()=>{
        await ERC20V2.mint(util.bob.address, 1)
        let oldBalance = await ERC20V2.balanceOf(util.bob.address)
        let newBalance = await ERC20.balanceOf(util.bob.address)
        expect(oldBalance).to.equal(1)
        expect(newBalance).to.equal(0)
        await ERC20.upgradeFrom(ERC20V2.address)
        await ERC20.mint(util.bob.address, 1)
        newBalance = await ERC20.balanceOf(util.bob.address)
        expect(newBalance).to.equal(2)
      })
      it('minting that combines old and new balances is reflected in totalSupply', async ()=>{
        await ERC20V2.mint(util.bob.address, 1)
        await ERC20V2.mint(util.alice.address, 1)
        let totalSupply = await ERC20V2.totalSupply()
        expect(totalSupply).to.equal(2)
        await ERC20.upgradeFrom(ERC20V2.address)
        await ERC20.mint(util.bob.address, 1)
        newBalance = await ERC20.totalSupply()
        expect(newBalance).to.equal(3)
        await ERC20.mint(util.bob.address, 1)
        newBalance = await ERC20.totalSupply()
        expect(newBalance).to.equal(4)
      })
      it('minting to old after minting on new does not effect new contract balance', async ()=>{
        await ERC20V2.mint(util.bob.address, 1)
        let oldBalance = await ERC20V2.balanceOf(util.bob.address)
        let newBalance = await ERC20.balanceOf(util.bob.address)
        expect(oldBalance).to.equal(1)
        expect(newBalance).to.equal(0)
        await ERC20.upgradeFrom(ERC20V2.address)
        await ERC20.mint(util.bob.address, 1)
        newBalance = await ERC20.balanceOf(util.bob.address)
        expect(newBalance).to.equal(2)
        await ERC20V2.mint(util.bob.address, 1)
        newBalance = await ERC20.balanceOf(util.bob.address)
        expect(newBalance).to.equal(2)
        oldBalance = await ERC20V2.balanceOf(util.bob.address)
        expect(oldBalance).to.equal(2)
      })
      it('transfering 2 unseen addresses makes both seen', async ()=>{
        await ERC20V2.mint(util.bob.address, 1)
        await ERC20V2.mint(util.alice.address, 1)
        await ERC20.upgradeFrom(ERC20V2.address)
        let seenBob = await ERC20.seen(util.bob.address)
        let seenAlice = await ERC20.seen(util.alice.address)
        expect(seenBob).to.be.false
        expect(seenAlice).to.be.false
        ERC20 = await util.getERC20(ERC20.address, util.bob)
        await ERC20['transfer(address,uint256)'](util.alice.address,1)
        seenBob = await ERC20.seen(util.bob.address)
        seenAlice = await ERC20.seen(util.alice.address)
        expect(seenBob).to.be.true
        expect(seenAlice).to.be.true
        let bobBalance = await ERC20.balanceOf(util.bob.address)
        let aliceBalance = await ERC20.balanceOf(util.alice.address)
        expect(bobBalance).to.equal(0)
        expect(aliceBalance).to.equal(2)
      })

      it('transfering from 1 unseen address makes it seen', async ()=>{
        await ERC20V2.mint(util.deployer.address, 10)
        await ERC20V2.mint(util.bob.address, 1)
        await ERC20.upgradeFrom(ERC20V2.address)
        let newTotalSupply = await ERC20.totalSupply()
        expect(newTotalSupply).to.equal(11)
        await ERC20.mint(util.alice.address, 1)
        newTotalSupply = await ERC20.totalSupply()
        expect(newTotalSupply).to.equal(12)
        let aliceBalance = await ERC20.balanceOf(util.alice.address)
        expect(aliceBalance).to.equal(1)
        let seenBob = await ERC20.seen(util.bob.address)
        let seenAlice = await ERC20.seen(util.alice.address)
        expect(seenBob).to.be.false
        expect(seenAlice).to.be.true
        let oldTotalSupply = await ERC20V2.totalSupply()
        expect(oldTotalSupply).to.equal(11)
        ERC20 = await util.getERC20(ERC20.address, util.alice)
        await ERC20['transfer(address,uint256)'](util.bob.address,1)
        seenBob = await ERC20.seen(util.bob.address)
        seenAlice = await ERC20.seen(util.alice.address)
        expect(seenBob).to.be.true
        expect(seenAlice).to.be.true
        let bobBalance = await ERC20.balanceOf(util.bob.address)
        aliceBalance = await ERC20.balanceOf(util.alice.address)
        expect(bobBalance).to.equal(2)
        expect(aliceBalance).to.equal(0)
        newTotalSupply = await ERC20.totalSupply()
        expect(newTotalSupply).to.equal(12)
        
      })
    })

    describe('Bypass', ()=>{
        it('not allow bypass if bypass not allowed', async()=>{
            await ERC20.mint(util.deployer.address, 1)
            ERC20 = await util.getERC20(ERC20.address, util.bob)
            let tx = ERC20.transferFrom(util.deployer.address, util.bob.address, 1)
            await expect(tx).to.be.revertedWith("ERC20: transfer amount exceeds allowance or not bypassable")
        })
        it('not allow bypass if bypass allowed and not registered as bypasser', async()=>{
            await ERC20.mint(util.deployer.address, 1)
            await ERC20.toggleBypassability()
            ERC20 = await util.getERC20(ERC20.address, util.bob)
            let tx = ERC20.transferFrom(util.deployer.address, util.bob.address, 1)
            await expect(tx).to.be.revertedWith("ERC20: transfer amount exceeds allowance or not bypassable")
        })
        it('only admin can add bypasser', async()=>{
            await ERC20.mint(util.deployer.address, 1)
            await ERC20.toggleBypassability()
            ERC20 = await util.getERC20(ERC20.address, util.bob)
            let tx = ERC20.registerContract(util.bob.address, REGISTRATION_TYPE.BYPASS)
            await expect(tx).to.be.revertedWith("Contract is not registered nor Owner")
        })
        it('allow bypass if bypass allowed and registered as bypasser', async()=>{
            await ERC20.mint(util.deployer.address, 1)
            let balanceERC20 = await ERC20.balanceOf(util.bob.address)
            expect(balanceERC20).to.equal(0)
            await ERC20.toggleBypassability()
            await ERC20.addBypassRule(util.bob.address, "0x23b872dd", 0)
            ERC20 = await util.getERC20(ERC20.address, util.bob)
            await ERC20.transferFrom(util.deployer.address, util.bob.address, 1)
            balanceERC20 = await ERC20.balanceOf(util.bob.address)
            expect(balanceERC20).to.equal(1)
        })
        it('not allow bypass of ownerOnly if no valid rule', async()=>{
          await ERC20.changeContractDetails("SomeName","smbl",8)
          let currentName = await ERC20.name()
          expect(currentName).to.equal("SomeName")
          ERC20 = await util.getERC20(ERC20.address, util.bob)
          let tx = ERC20.changeContractDetails("AnotherName","smbl",8)
          await expect(tx).to.be.revertedWith("Sender is not Governer")
        })
        it('allow bypass of ownerOnly if valid rule', async()=>{
          await ERC20.toggleBypassability()
          await ERC20.changeContractDetails("SomeName","smbl",8)
          await ERC20.addBypassRule(util.bob.address, "0x425a71c0", 0)
          let currentName = await ERC20.name()
          expect(currentName).to.equal("SomeName")
          ERC20 = await util.getERC20(ERC20.address, util.bob)
          await ERC20.changeContractDetails("AnotherName","smbl",8)
          currentName = await ERC20.name()
          expect(currentName).to.equal("AnotherName")
        })
    })
    
    describe('Handler Callbacks', ()=>{        
        it('can execute single mint callback', async()=>{
            await util.handler.registerCallback(ERC20.address, util.handler.address, 1, CALLBACK_TYPE.MINT, TEST_CALLBACK_FUNCTION, true)
            let ticks = await util.handler.ticks()
            expect(ticks).to.equal(0)
            await ERC20.mint(util.deployer.address, 1)
            ticks = await util.handler.ticks();
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            expect(ticks).to.equal(1)
            expect(lastTokenId).to.equal(1)
            expect(lastTo).to.equal(util.deployer.address)
          })
          it('can execute single transfer callback', async()=>{
            await util.handler.registerCallback(ERC20.address, util.handler.address, 1, CALLBACK_TYPE.TRANSFER, TEST_CALLBACK_FUNCTION, true)
            let ticks = await util.handler.ticks()
            expect(ticks).to.equal(0)
            await ERC20.mint(util.deployer.address, 1)
            await ERC20.transferFrom(util.deployer.address, util.bob.address, 1)
            ticks = await util.handler.ticks()
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            let lastFrom = await util.handler.lastFrom()
            expect(ticks).to.equal(1)
            expect(lastTokenId).to.equal(1)
            expect(lastTo).to.equal(util.bob.address)
            expect(lastFrom).to.equal(util.deployer.address)
          })
          it('can execute single burn callback', async()=>{
            await util.handler.registerCallback(ERC20.address, util.handler.address, 1, CALLBACK_TYPE.BURN, TEST_CALLBACK_FUNCTION, true)
            let ticks = await util.handler.ticks()
            expect(ticks).to.equal(0)
            await ERC20.mint(util.deployer.address, 1)
            await ERC20.burn(1)
            ticks = await util.handler.ticks()
            let lastTokenId = await util.handler.lastTokenId()
            let lastTo = await util.handler.lastTo()
            let lastFrom = await util.handler.lastFrom()
            expect(ticks).to.equal(1)
            expect(lastTokenId).to.equal(1)
            expect(lastTo).to.equal("0x0000000000000000000000000000000000000000")
            expect(lastFrom).to.equal(util.deployer.address)
          })
    })
})
async function sign(web3, hash){
    let accounts = await web3.eth.getAccounts()
    let signature = await web3.eth.sign(hash, accounts[0])
    return signature
}