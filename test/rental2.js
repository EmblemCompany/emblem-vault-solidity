const { ethers } = require('hardhat');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js');
const { utils } = require('web3');
const util = new Util()


let erc721Nft, erc1155Nft
describe('Rentals V2', () => {
  
    beforeEach(async () => {
      await util.deployHandler()
      await util.deployERC721Factory()
      await util.deployERC1155Factory()
      await util.deployERC20Factory()
      erc721Nft = util.erc721Factory.clone
      erc1155Nft = util.erc1155Factory.clone
      erc20 = util.erc20
      await util.deployRentalV2()
    })
    // it('deploys rental', async()=>{
    //   let version = await util.rentalV2.Version()
    //   expect(version).to.equal(2)
    // })

    it('can get assets', async()=>{
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let assetIds = await util.rentalV2.GetAssetIds()
      let assets = await getObjectArrayFromIdArray(util.rentalV2, assetIds, 'GetAsset')
      
      expect(assets.length).to.equal(2)
      expect(assets[0].contractAddress).to.equal(erc1155Nft.address)
      expect(assets[0].tokenId).to.equal(789)
      expect(assets[1].interfaceId).to.equal("0x80ac58cd")

      expect(assets[1].contractAddress).to.equal(erc721Nft.address)
      expect(assets[1].tokenId).to.equal(123)
      expect(assets[1].interfaceId).to.equal("0x80ac58cd")
      console.log(assets)
    })

    it('can get pairs', async()=>{
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, false)
      let pairIds = await util.rentalV2.GetPairIds()
      let pairs = await getObjectArrayFromIdArray(util.rentalV2, pairIds, 'GetPair')
      expect(pairs.length).to.equal(1)
      console.log(pairs)
    })

    it('pairs doubled if returnable', async()=>{
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let pairIds = await util.rentalV2.GetPairIds()
      let pairs = await getObjectArrayFromIdArray(util.rentalV2, pairIds, 'GetPair')
      expect(pairs.length).to.equal(2)
      console.log(pairs)
    })

    it('can get inventory', async()=>{
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let inventoryIds = await util.rentalV2.GetInventoryIds()
      let inventory = await getObjectArrayFromIdArray(util.rentalV2, inventoryIds, 'GetInventory')
      expect(inventory.length).to.equal(2)
      console.log(inventory)
    })

    it('can get all inventory and assets when single 2 sided', async()=>{
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let pairIds = await util.rentalV2.GetPairIds()
      let pairs = await getObjectArrayFromIdArray(util.rentalV2, pairIds, 'GetPair')
      let returnValue = {}
      await pairs.asyncForEach(async (pair, index)=>{        
        let askInventory = await getObjectArrayFromIdArray(util.rentalV2, [pair.askInventoryId], 'GetInventory')
        let ask_asset = await getObjectArrayFromIdArray(util.rentalV2, [askInventory[0][0]], 'GetAsset')
        let costInventory = await getObjectArrayFromIdArray(util.rentalV2, [pair.costInventoryId], 'GetInventory')
        let cost_asset = await getObjectArrayFromIdArray(util.rentalV2, [costInventory[0][0]], 'GetAsset')
        returnValue[pair[0]] = {asks: ask_asset, costs: cost_asset}
        console.log('--- ask inv', JSON.stringify(returnValue, null, 2))
      })
      expect(Object.keys(returnValue).length).to.equal(2)
    })

    it('can get all inventory and assets when single 1 sided', async()=>{
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, false)
      let pairIds = await util.rentalV2.GetPairIds()
      let pairs = await getObjectArrayFromIdArray(util.rentalV2, pairIds, 'GetPair')
      let returnValue = {}
      await pairs.asyncForEach(async (pair, index)=>{        
        let askInventory = await getObjectArrayFromIdArray(util.rentalV2, [pair.askInventoryId], 'GetInventory')
        let ask_asset = await getObjectArrayFromIdArray(util.rentalV2, [askInventory[0][0]], 'GetAsset')
        let costInventory = await getObjectArrayFromIdArray(util.rentalV2, [pair.costInventoryId], 'GetInventory')
        let cost_asset = await getObjectArrayFromIdArray(util.rentalV2, [costInventory[0][0]], 'GetAsset')
        returnValue[pair[0]] = {asks: ask_asset, costs: cost_asset}
        // console.log('--- ask inv', JSON.stringify(returnValue, null, 2))
      })
      expect(Object.keys(returnValue).length).to.equal(1)
    })

    it('can get all inventory and assets when multiple 2 sided', async()=>{
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      await util.rentalV2.AddInventory(erc1155Nft.address, 456, 1, erc721Nft.address, 111, 1, true)
      let pairIds = await util.rentalV2.GetPairIds()
      let pairs = await getObjectArrayFromIdArray(util.rentalV2, pairIds, 'GetPair')
      let returnValue = {}
      await pairs.asyncForEach(async (pair, index)=>{   
        let askInventory = await getObjectArrayFromIdArray(util.rentalV2, [pair.askInventoryId], 'GetInventory')
        let ask_asset = await getObjectArrayFromIdArray(util.rentalV2, [askInventory[0][0]], 'GetAsset')
        let costInventory = await getObjectArrayFromIdArray(util.rentalV2, [pair.costInventoryId], 'GetInventory')
        let cost_asset = await getObjectArrayFromIdArray(util.rentalV2, [costInventory[0][0]], 'GetAsset')
        returnValue[pair[0]] = {asks: ask_asset, costs: cost_asset}
      })
      expect(Object.keys(returnValue).length).to.equal(4)
    })

    async function getObjectArrayFromIdArray(contract, ids, getObjectFunctionName) {
      let objectArray = []
      await ids.asyncForEach(async (item, index) => {
        let structObject = await contract[getObjectFunctionName](item)
        objectArray.push(structObject)
      })
      return objectArray
    }

    it('ask and cost can not be equal', async()=>{
      let tx = util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 789, 1, true)
      await expect(tx).to.be.revertedWith("ask and cost should not be the same")
    })

    // it('cant cost more than 1 erc721')
    // it('cant ask more than 1 erc721')

    it('can not deposit without inventory defined', async()=>{
      let tx = util.rentalV2.Rent(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 1)
      await expect(tx).to.be.revertedWith("invalid inventory")
    })

    it('only admin can add inventory', async()=>{
      let rentalNonAdmin = util.getRentalV2(util.rentalV2.address, util.bob)
      let tx = rentalNonAdmin.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it('can add inventory unique by amount', async()=>{
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 2, erc721Nft.address, 123, 1, true)
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 2, erc721Nft.address, 123, 4, true)
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 2, erc721Nft.address, 456, 1, true)
      let assets = await util.rentalV2.GetAssetIds()
      expect(assets.length).to.equal(3)
      let pairs = await util.rentalV2.GetPairIds()
      expect(pairs.length).to.equal(4)
      let inventory = await util.rentalV2.GetInventoryIds()
      expect(inventory.length).to.equal(5)
    })

    it('non admin can not remove inventory', async()=>{
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      rentalNonAdmin = util.getRentalV2(util.rentalV2.address, util.bob)
      let tx = rentalNonAdmin.DeleteInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it('admin can remove inventory', async()=>{
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let inventoryId = util.getWeb3().utils.soliditySha3(erc1155Nft.address, 789, 1)
      let inventoryIds = await util.rentalV2.GetInventoryIds()
      expect(inventoryIds.length).to.equal(2)
      await util.rentalV2.DeleteInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      inventory = await util.rentalV2.GetInventory(inventoryId)
      expect(inventory[0]).to.equal("0x0000000000000000000000000000000000000000000000000000000000000000")
    })

    it('only matching inventory can be deleted', async()=>{
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let tx = util.rentalV2.DeleteInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 456, 1, true)
      await expect(tx).to.be.revertedWith("inventory does not exist")
    })

    it('can not deposit without contract inventory balance', async()=>{
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let tx = util.rentalV2.Rent(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1)
      await expect(tx).to.be.revertedWith("contract balance not enough")
    })

    it('can not deposit without user cost balance', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rentalV2.address, 789, 1) // mint 1 ask asset to rental contract
      await erc721Nft.mint(util.alice.address, 123, "test", 0x0) // mint 1 cost to alice so token exists
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let tx = util.rentalV2.Rent(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1)
      await expect(tx).to.be.revertedWith("user balance is not enough")
    })

    it('can not deposit without allowance', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rentalV2.address, 789, 1) // mint 1 ask asset to rental contract
      await erc721Nft.mint(util.deployer.address, 123, "test", 0x0) // mint 1 cost to deployer
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let tx = util.rentalV2.Rent(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1)
      await expect(tx).to.be.revertedWith("not allowed to swap")
    })

    it('can swap erc1155 <> erc721', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rentalV2.address, 789, 1) // mint 1 ask asset to rental contract
      await erc721Nft.mint(util.deployer.address, 123, "test", 0x0) // mint 1 cost to deployer

      let contractAskBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 789)
      expect(contractAskBalance).to.equal(1)
      let costOwner = await erc721Nft.ownerOf(123)
      expect(costOwner).to.equal(util.deployer.address)
      
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      await erc721Nft.setApprovalForAll(util.rentalV2.address, true)
      await util.rentalV2.Rent(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1)

      contractAskBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 789)
      expect(contractAskBalance).to.equal(0)

      let renterAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(renterAskBalance).to.equal(1)

      costOwner = await erc721Nft.ownerOf(123)
      expect(costOwner).to.equal(util.rentalV2.address)
    })

    it('can swap erc1155 <> erc20', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rentalV2.address, 789, 1) // mint 1 ask asset to rental contract
      await erc20.mint(util.deployer.address, 1)

      let contractAskBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 789)
      expect(contractAskBalance).to.equal(1)
      let contractCostBalance = await erc20.balanceOf(util.rentalV2.address)
      expect(contractCostBalance).to.equal(0)
      
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc20.address, 0, 1, true)
      await erc20.approve(util.rentalV2.address, 1)
      await util.rentalV2.Rent(erc1155Nft.address, 789, 1, erc20.address, 0, 1)

      contractAskBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 789)
      expect(contractAskBalance).to.equal(0)

      let renterAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(renterAskBalance).to.equal(1)

      contractCostBalance = await erc20.balanceOf(util.rentalV2.address)
      expect(contractCostBalance).to.equal(1)

      await erc1155Nft.setApprovalForAll(util.rentalV2.address, true)
      await util.rentalV2.Rent(erc20.address, 0, 1, erc1155Nft.address, 789, 1)
    })

    it('can swap erc1155 <> erc1155 ', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rentalV2.address, 789, 1) // mint 1 ask asset to rental contract
      await erc1155Nft.mint(util.deployer.address, 123,1) // mint 1 cost to deployer

      let contractAskBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 789)
      expect(contractAskBalance).to.equal(1)

      let contractCostBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 123)
      expect(contractCostBalance).to.equal(0)
      
      let ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(0)

      let ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(1)
      
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 1, true)
      await erc1155Nft.setApprovalForAll(util.rentalV2.address, true)
      await util.rentalV2.Rent(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 1)

      contractAskBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 789)
      expect(contractAskBalance).to.equal(0)

      contractCostBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 123)
      expect(contractCostBalance).to.equal(1)

      ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(1)

      ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(0)
    })

    it('can swap specific erc1155 amount <> specific erc1155 amount <exp>', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rentalV2.address, 789, 4) // mint 4 ask asset to rental contract
      await erc1155Nft.mint(util.deployer.address, 123, 4) // mint 4 cost to deployer

      let contractAskBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 789)
      expect(contractAskBalance).to.equal(4)

      let contractCostBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 123)
      expect(contractCostBalance).to.equal(0)
      
      let ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(0)

      let ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(4)
      
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 2, erc1155Nft.address, 123, 1, true)
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 1, true)
      await erc1155Nft.setApprovalForAll(util.rentalV2.address, true)
      await util.rentalV2.Rent(erc1155Nft.address, 789, 2, erc1155Nft.address, 123, 1)

      contractAskBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 789)
      expect(contractAskBalance).to.equal(2)

      contractCostBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 123)
      expect(contractCostBalance).to.equal(1)

      ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(2)

      ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(3)

      await util.rentalV2.Rent(erc1155Nft.address, 123, 1, erc1155Nft.address, 789, 1)

      contractAskBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 789)
      expect(contractAskBalance).to.equal(3)

      contractCostBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 123)
      expect(contractCostBalance).to.equal(0)

      ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(1)

      ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(4)
    })

    it('can swap single erc1155 <> for multiple erc1155 with amounts', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rentalV2.address, 789, 2) // mint 1 ask asset to rental contract
      await erc1155Nft.mint(util.deployer.address, 123, 4) // mint 2 cost to deployer

      let contractAskBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 789)
      expect(contractAskBalance).to.equal(2)

      let contractCostBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 123)
      expect(contractCostBalance).to.equal(0)
      
      let ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(0)

      let ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(4)
      
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, false)
      await erc1155Nft.setApprovalForAll(util.rentalV2.address, true)
      await util.rentalV2.Rent(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2)

      contractAskBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 789)
      expect(contractAskBalance).to.equal(1)

      contractCostBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 123)
      expect(contractCostBalance).to.equal(2)

      ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(1)

      ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(2)
    })

    it('can swap single erc1155 <> for multiple erc1155 with amounts twice', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rentalV2.address, 789, 2) // mint 1 ask asset to rental contract
      await erc1155Nft.mint(util.deployer.address, 123, 4) // mint 2 cost to deployer
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await erc1155Nft.setApprovalForAll(util.rentalV2.address, true)
      await util.rentalV2.Rent(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2)
      await util.rentalV2.Rent(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2)

      let contractAskBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 789)
      expect(contractAskBalance).to.equal(0)

      let contractCostBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 123)
      expect(contractCostBalance).to.equal(4)

      let ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(2)

      let ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(0)
    })

    it('can swap return multiple erc1155 <> for single erc1155 after deposit', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rentalV2.address, 789, 2) // mint 1 ask asset to rental contract
      await erc1155Nft.mint(util.deployer.address, 123, 4) // mint 2 cost to deployer
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await erc1155Nft.setApprovalForAll(util.rentalV2.address, true)

      await util.rentalV2.Rent(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2)
      await util.rentalV2.Rent(erc1155Nft.address, 123, 2, erc1155Nft.address, 789, 1)

      let contractAskBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 789)
      expect(contractAskBalance).to.equal(2)

      let contractCostBalance = await erc1155Nft.balanceOf(util.rentalV2.address, 123)
      expect(contractCostBalance).to.equal(0)

      let ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(0)

      let ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(4)
    })

    it('removed inventory should revert on deposit', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rentalV2.address, 789, 2) // mint 1 ask asset to rental contract
      await erc1155Nft.mint(util.deployer.address, 123, 4) // mint 2 cost to deployer
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await erc1155Nft.setApprovalForAll(util.rentalV2.address, true)
      await util.rentalV2.Rent(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2)
      await util.rentalV2.DeleteInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      let tx = util.rentalV2.Rent(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2)
      await expect(tx).to.be.revertedWith("invalid inventory")
    })

    it('prevent over writing inventory', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rentalV2.address, 789, 2)
      await erc1155Nft.mint(util.deployer.address, 123, 4)
      await erc1155Nft.mint(util.deployer.address, 456, 2)
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      let tx = util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await expect(tx).to.be.revertedWith("pair already exists")
      tx = util.rentalV2.AddInventory(erc1155Nft.address, 123, 2, erc1155Nft.address, 789, 1, true)
      await expect(tx).to.be.revertedWith("pair already exists")
    })

    it('can add different pairs using same asset on one side', async()=>{
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 456, 1, true)
      let assets = await util.rentalV2.GetAssetIds()
      expect(assets.length).to.equal(3)
      // let rentalInventory = await Inventory()
      // console.log(JSON.stringify(rentalInventory, null, 4))
      // expect(JSON.stringify(rentalInventory)).equal(JSON.stringify(MOCKS.simple3))
    })

    it('can get empty inventory', async () => {
      let assets = await util.rentalV2.GetAssetIds()
      console.log(assets)
      expect(assets.length).to.equal(0)
      let rentalInventory = await Inventory() //await getInventoryFromAssetIdentifiers(assets)
      expect(JSON.stringify(rentalInventory)).equal(JSON.stringify({"asks":{}}))
    })

    it('can get inventory when same erc1155', async () => {
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      let assets = await util.rentalV2.GetAssetIds()
      expect(assets.length).to.equal(2)
      // let rentalInventory = await Inventory() //await getInventoryFromAssetIdentifiers(assets)
      // expect(JSON.stringify(rentalInventory)).equal(JSON.stringify(MOCKS.simple1))
    })

    it('can get inventory when erc1155 tokenId and contract address are the same', async () => { 
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 555, 2, true)
      let assets = await util.rentalV2.GetAssetIds()
      expect(assets.length).to.equal(3)
      // let rentalInventory = await Inventory() //await getInventoryFromAssetIdentifiers(assets)
      // expect(JSON.stringify(rentalInventory)).equal(JSON.stringify(MOCKS.simple2))
      // console.log(JSON.stringify(rentalInventory))
    })

    it('can get inventory when erc1155 mixed with erc721', async () => { 
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 456, 1, true)
      await util.rentalV2.AddInventory(erc1155Nft.address, 555, 1, erc1155Nft.address, 789, 2, true)
      let assets = await util.rentalV2.GetAssetIds()
      expect(assets.length).to.equal(4)
      // let rentalInventory = await Inventory() //await getInventoryFromAssetIdentifiers(assets)
      // expect(JSON.stringify(rentalInventory)).equal(JSON.stringify(MOCKS.complex))
      // console.log(JSON.stringify(rentalInventory))
    })

    it('can get inventory after single add and single delete', async () => { 
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      let inventory = await util.rentalV2.GetInventoryIds()
      expect(inventory.length).to.equal(2)
      await util.rentalV2.DeleteInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      inventory = await util.rentalV2.GetInventoryIds()
      expect(inventory.length).to.equal(0)
      // let rentalInventory = await Inventory() //await getInventoryFromAssetIdentifiers(assets)
      // expect(JSON.stringify(rentalInventory)).equal(JSON.stringify({"asks":{}}))
      // console.log(JSON.stringify(rentalInventory))
      // let assets = await util.rentalV2.GetAssetIds();
      // expect(assets.length).to.equal(0)
    })

    it('can get inventory after multiple add and single delete', async () => { 
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 555, 2, true)
      await util.rentalV2.DeleteInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      let inventory = await util.rentalV2.GetInventoryIds()
      expect(inventory.length).to.equal(2)
      // let rentalInventory = await Inventory() //await getInventoryFromAssetIdentifiers(assets)
      // expect(JSON.stringify(rentalInventory)).equal(JSON.stringify(MOCKS.delete1))
      // console.log(JSON.stringify(rentalInventory))
    })

    it('can get inventory after multiple add and multiple delete', async () => {
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rentalV2.AddInventory(erc1155Nft.address, 7890, 1, erc1155Nft.address, 555, 2, true)
      await util.rentalV2.AddInventory(erc1155Nft.address, 555, 1, erc1155Nft.address, 789, 2, true)

      await util.rentalV2.DeleteInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rentalV2.DeleteInventory(erc1155Nft.address, 7890, 1, erc1155Nft.address, 555, 2, true)
      let pairs = await util.rentalV2.GetInventoryIds()
      expect(pairs.length).to.equal(2)
      // let rentalInventory = await Inventory() //await getInventoryFromAssetIdentifiers(assets)
      // expect(JSON.stringify(rentalInventory)).equal(JSON.stringify({"asks":{}}))
      // console.log(JSON.stringify(rentalInventory))
    })

    // it('reverts when adding fee to non-existent inventory', async () => {
    //   let tx = util.rental.AddFee(erc1155Nft.address, 789, erc1155Nft.address, 123, erc20.address, 1, 1)
    //   await expect(tx).to.be.revertedWith('unknown inventory')
    // })

    // it('can get inventory with fees on only inventory pair', async () => {
    //   await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
    //   await util.rental.AddFee(erc1155Nft.address, 789, erc1155Nft.address, 123, erc20.address, 1, 1)
    //   let assets = await util.rental.GetAssets()
    //   expect(assets.length).to.equal(2)
    //   let rentalInventory = await getInventoryFromAssetIdentifiers(assets)
    //   expect(JSON.stringify(rentalInventory)).equal(JSON.stringify(MOCKS.fees1))
    // })

    // it('can get inventory with fees on one inventory pair', async () => {
    //   await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
    //   await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 555, 2, true)
    //   await util.rental.AddFee(erc1155Nft.address, 789, erc1155Nft.address, 555, erc20.address, 1, 1)
    //   let assets = await util.rental.GetAssets()
    //   expect(assets.length).to.equal(3)
    //   let rentalInventory = await getInventoryFromAssetIdentifiers(assets)
    //   expect(JSON.stringify(rentalInventory)).equal(JSON.stringify(MOCKS.fees2))
    //   // console.log(JSON.stringify(rentalInventory))
    // })

    it('can create one sided pairing', async () => {
      await util.rentalV2.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, false)
      let assets = await util.rentalV2.GetAssetIds()
      expect(assets.length).eq(2)
      let pairs = await util.rentalV2.GetPairIds()
      expect(pairs.length).eq(1)
      // let inventory = await Inventory()
      // expect(JSON.stringify(inventory)).equal(JSON.stringify(MOCKS.single))
    })
  })

async function Inventory() {
  let pairIds = await util.rentalV2.GetPairIds()
  let rentalInventory = {asks: {}}
  return await forEveryPair(rentalInventory, pairIds, 0, (inventory)=>{
    return inventory
  })
  async function forEveryPair(inventory, ids, index, cb) {
    if (ids.length == 0) return cb(inventory)
    let pairId = ids[index]
    let pair = await util.rentalV2.GetPair(pairId)
    let ask = await util.rentalV2.GetInventory(pair.askInventoryId)
    let cost = await util.rentalV2.GetInventory(pair.costInventoryId)
    let askAsset = await util.rentalV2.GetAsset(ask.assetId)
    let costAsset = await util.rentalV2.GetAsset(cost.assetId)
    let costObject = {askIdentifier: pair.costInventoryId,'contractAddress': costAsset.contractAddress, 'tokenId': costAsset.tokenId.toNumber(), amount: cost.amount.toNumber(), assetType: costAsset.interfaceId == 0xd9b67a26? "ERC1155": costAsset.interfaceId == 0x80ac58cd? "ERC721": "ERC20" }
    
    if(askAsset.contractAddress != "0x0000000000000000000000000000000000000000") {
      inventory.asks[pairId] = {
        askIdentifier: pair.askInventoryId,
        amount: ask.amount.toNumber(), 
        assetType: askAsset.interfaceId == 0xd9b67a26? "ERC1155": askAsset.interfaceId == 0x80ac58cd? "ERC721": "ERC20", 
        contractAddress: askAsset.contractAddress, 
        costs: [costObject], 
        tokenId: askAsset.tokenId.toNumber()
      }
    }
    if (ids.length > index+1) {
      return forEveryPair(inventory, ids, index +1, cb)
    } else {
      return cb(inventory)
    }
  }
}
async function getInventoryFromId(assets, index, inventory, cb) {
  if (assets.length <= index) {
    return cb(inventory)
  } else {
    let inventoryItem = await util.rentalV2.GetInventory(assets[index])
    let asset = await util.rentalV2.GetAsset(inventoryItem.assetId)
    if (inventoryItem && asset.contractAddress != '0x0000000000000000000000000000000000000000') {
      let calculated = util.getWeb3().utils.soliditySha3(asset.contractAddress, asset.tokenId)
      let costObject = {askIdentifier: calculated,'contractAddress': asset.contractAddress, 'tokenId': asset.tokenId.toNumber(), amount: inventoryItem.amount.toNumber(), assetType: asset.interfaceId == 0xd9b67a26? "ERC1155": asset.interfaceId == 0x80ac58cd? "ERC721": "ERC20" }
      inventory.asks[assets[index]] = {costs: [costObject]}
    }
    if (assets.length > index + 1) { 
      return getInventoryFromId(assets, index + 1, inventory, cb)
    } else {
      let flat = Object.keys(inventory.asks).map(id=>{ return inventory.asks[id].costs}).flat()
      let deduped = removeDuplicates(flat, 'askIdentifier')
      deduped.forEach(asset=>{
        inventory.asks[asset.askIdentifier].contractAddress = asset.contractAddress
        inventory.asks[asset.askIdentifier].tokenId = asset.tokenId
        inventory.asks[asset.askIdentifier].amount = asset.amount
        inventory.asks[asset.askIdentifier].assetType = asset.assetType
        if (asset.fee) {
          inventory.asks[asset.askIdentifier].fee = asset.fee
        }
      })
      return cb(inventory)
    }
  }
}

async function getInventoryFromPairId(pairs, index, inventory, cb) {
  if (pairs.length <= index) {
    return cb(inventory)
  } else {
    let pairItem = await util.rentalV2.GetPair(pairs[index])
    let askAsset = await util.rentalV2.GetAsset(pairItem.askAsset)
    let costAsset = await util.rentalV2.GetAsset(pairItem.costAsset)
    if (inventoryItem && asset.contractAddress != '0x0000000000000000000000000000000000000000') {
      let calculated = util.getWeb3().utils.soliditySha3(askAsset.contractAddress, askAsset.tokenId)
      let costObject = {askIdentifier: calculated,'contractAddress': costAsset.contractAddress, 'tokenId': costAsset.tokenId.toNumber(), amount: inventoryItem.amount.toNumber(), assetType: asset.interfaceId == 0xd9b67a26? "ERC1155": asset.interfaceId == 0x80ac58cd? "ERC721": "ERC20" }
      inventory.asks[inventoryItem.askAsset] = {costs: [costObject]}
    }
    if (assets.length > index + 1) { 
      return getInventoryFromId(assets, index + 1, inventory, cb)
    } else {
      let flat = Object.keys(inventory.asks).map(id=>{ return inventory.asks[id].costs}).flat()
      let deduped = removeDuplicates(flat, 'askIdentifier')
      deduped.forEach(asset=>{
        inventory.asks[asset.askIdentifier].contractAddress = asset.contractAddress
        inventory.asks[asset.askIdentifier].tokenId = asset.tokenId
        inventory.asks[asset.askIdentifier].amount = asset.amount
        inventory.asks[asset.askIdentifier].assetType = asset.assetType
        if (asset.fee) {
          inventory.asks[asset.askIdentifier].fee = asset.fee
        }
      })
      return cb(inventory)
    }
  }
}

async function getInventoryFromPairIdentifiers(pairs) {
  let rentalInventory = {asks: {}}

  return await getInventoryFromPairId(pairs,0, rentalInventory, inventory=>{
    return inventory
  })
}

async function getInventoryFromAssetIdentifiers(assets) {
  let rentalInventory = {asks: {}}
  return await getInventoryFromId(assets,0, rentalInventory, inventory=>{
    return inventory
  })
  // await assets.asyncForEach(async (item, index) => {
    
    // let inventoryIdentifiers = await util.rentalV2.GetInventory(item)
    // rentalInventory.asks[item] = {costs: []}
    
    // await inventoryIdentifiers.asyncForEach(async (identifier) => {
      // let fee = await util.rentalV2.InventoryFee(identifier)
      // let inventory = await util.rentalV2.GetInventory(identifier)
      // let asset = await util.rentalV2.GetAsset(inventory.assetId)
      // console.log("inventory", inventory)
      // if (inventory && asset.contractAddress != '0x0000000000000000000000000000000000000000') {
      //   let calculated = util.getWeb3().utils.soliditySha3(asset.contractAddress, asset.tokenId)
      //   let costObject = {askIdentifier: calculated,'contractAddress': asset.contractAddress, 'tokenId': asset.tokenId.toString(), amount: inventory.amount.toString(), assetType: asset.interfaceId == 0xd9b67a26? "ERC1155": asset.interfaceId == 0x80ac58cd? "ERC721": "ERC20" }
      //   // if (fee['feeType'] !== 0) {
      //   //   costObject.fee = {
      //   //     contractAddress: fee['contractAddress'],
      //   //     amount: fee['amount'].toNumber(),
      //   //     feeType: fee['feeType']
      //   //   }
      //   // }
      //   //rentalInventory.asks[item].costs.push( costObject )
      // }
    // })
  // })
  
}

!Array.prototype.asyncForEach ?
Object.defineProperty(Array.prototype, 'asyncForEach', {
  value: async function (callback) {
    await asyncForEach(this, callback);
    async function asyncForEach(array, callback) {
      for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
      }
    }
  }
}) : null

function removeDuplicates(originalArray, prop) {
  var newArray = [];
  var lookupObject  = {};

  for(var i in originalArray) {
     lookupObject[originalArray[i][prop]] = originalArray[i];
  }

  for(i in lookupObject) {
      newArray.push(lookupObject[i]);
  }
   return newArray;
}

let MOCKS = {
  single: {"asks":{"0xf69c586e335001507d8d32a7cdd4962e1d7c35507a17691c925b769af8cbe29b":{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","amount":1,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x6f3eec4acff72588318e756328221b9d0944ea69732100af72f75d996c13a107","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":123,"amount":2,"assetType":"ERC1155"}],"tokenId":789}}},
  simple1: {"asks":{"0xf69c586e335001507d8d32a7cdd4962e1d7c35507a17691c925b769af8cbe29b":{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","amount":1,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x6f3eec4acff72588318e756328221b9d0944ea69732100af72f75d996c13a107","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":123,"amount":2,"assetType":"ERC1155"}],"tokenId":789},"0x20ad0fc5612d5322a36ec1c1cf247393b886ce8c6dabc92ed2d26ef9fb6be089":{"askIdentifier":"0x6f3eec4acff72588318e756328221b9d0944ea69732100af72f75d996c13a107","amount":2,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":789,"amount":1,"assetType":"ERC1155"}],"tokenId":123}}},
  simple2: {"asks":{"0xf69c586e335001507d8d32a7cdd4962e1d7c35507a17691c925b769af8cbe29b":{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","amount":1,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x6f3eec4acff72588318e756328221b9d0944ea69732100af72f75d996c13a107","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":123,"amount":2,"assetType":"ERC1155"}],"tokenId":789},"0x20ad0fc5612d5322a36ec1c1cf247393b886ce8c6dabc92ed2d26ef9fb6be089":{"askIdentifier":"0x6f3eec4acff72588318e756328221b9d0944ea69732100af72f75d996c13a107","amount":2,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":789,"amount":1,"assetType":"ERC1155"}],"tokenId":123},"0x4ef76ca86ea392f6038562d7561902668267977ccf79fe0b1b2bbeda9f6e780a":{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","amount":1,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0xfc78b391b44f61ddd27889da744c9b739b4c857470c40fffa589c489c89fe750","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":555,"amount":2,"assetType":"ERC1155"}],"tokenId":789},"0x2527a713d4073a50e3e2b252464bf2dab7e49102b86b0f5634475e4340f383ed":{"askIdentifier":"0xfc78b391b44f61ddd27889da744c9b739b4c857470c40fffa589c489c89fe750","amount":2,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":789,"amount":1,"assetType":"ERC1155"}],"tokenId":555}}},
  simple3: {"asks":{"0xf69c586e335001507d8d32a7cdd4962e1d7c35507a17691c925b769af8cbe29b":{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","amount":1,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x6f3eec4acff72588318e756328221b9d0944ea69732100af72f75d996c13a107","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":123,"amount":2,"assetType":"ERC1155"}],"tokenId":789},"0x20ad0fc5612d5322a36ec1c1cf247393b886ce8c6dabc92ed2d26ef9fb6be089":{"askIdentifier":"0x6f3eec4acff72588318e756328221b9d0944ea69732100af72f75d996c13a107","amount":2,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":789,"amount":1,"assetType":"ERC1155"}],"tokenId":123},"0x8b46ae96d232c15ae57016652dac7bb18b80500896b388c60b818810d823e44c":{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","amount":1,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x0df380aaf67f6cacfa943a1ee83403f25f399de40e2a17cd36d8d9e86c2513cb","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":456,"amount":1,"assetType":"ERC1155"}],"tokenId":789},"0x1ada69b818097107b3bdba98413cd4fbb4eb705826d37f5af564a33e8fe12be8":{"askIdentifier":"0x0df380aaf67f6cacfa943a1ee83403f25f399de40e2a17cd36d8d9e86c2513cb","amount":1,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":789,"amount":1,"assetType":"ERC1155"}],"tokenId":456}}},
  complex: {"asks":{"0xf69c586e335001507d8d32a7cdd4962e1d7c35507a17691c925b769af8cbe29b":{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","amount":1,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x6f3eec4acff72588318e756328221b9d0944ea69732100af72f75d996c13a107","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":123,"amount":2,"assetType":"ERC1155"}],"tokenId":789},"0x20ad0fc5612d5322a36ec1c1cf247393b886ce8c6dabc92ed2d26ef9fb6be089":{"askIdentifier":"0x6f3eec4acff72588318e756328221b9d0944ea69732100af72f75d996c13a107","amount":2,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":789,"amount":1,"assetType":"ERC1155"}],"tokenId":123},"0x41a8d8728e34eb6fba035a1c730633b8133aa0510e6abf6a83db8079b1baf899":{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","amount":1,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x5b8f70c489d9d2291b2185c1f2cc9ca130508da572f24b24c8befa2c65d9e9ed","contractAddress":"0x9E02f3a8567587D27d7EB1D087408D062b4c6a1c","tokenId":456,"amount":1,"assetType":"ERC721"}],"tokenId":789},"0x65e0bdc5ac1db8e64f53a940a73f6f20fe5112bc6ee4af0724fa484f42feb946":{"askIdentifier":"0x5b8f70c489d9d2291b2185c1f2cc9ca130508da572f24b24c8befa2c65d9e9ed","amount":1,"assetType":"ERC721","contractAddress":"0x9E02f3a8567587D27d7EB1D087408D062b4c6a1c","costs":[{"askIdentifier":"0x65b46bd469cde530a0404caeff7e144002293c29d9cffd64ae2a195307cc1992","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":789,"amount":1,"assetType":"ERC1155"}],"tokenId":456},"0x2527a713d4073a50e3e2b252464bf2dab7e49102b86b0f5634475e4340f383ed":{"askIdentifier":"0xefd80378ee29fb65ad6a23ffcb12ede8a4642f93fbfa2eb1ec257c11c1db640c","amount":1,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0x9c1bc355771b7d7bc85c6bcd369a7b3c263309002b941bcd6b11b0641fa121e2","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":789,"amount":2,"assetType":"ERC1155"}],"tokenId":555},"0x4ef76ca86ea392f6038562d7561902668267977ccf79fe0b1b2bbeda9f6e780a":{"askIdentifier":"0x9c1bc355771b7d7bc85c6bcd369a7b3c263309002b941bcd6b11b0641fa121e2","amount":2,"assetType":"ERC1155","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","costs":[{"askIdentifier":"0xefd80378ee29fb65ad6a23ffcb12ede8a4642f93fbfa2eb1ec257c11c1db640c","contractAddress":"0x4fBd2B1681897666FCc9E953839f3F49cA16bf20","tokenId":555,"amount":1,"assetType":"ERC1155"}],"tokenId":789}}},
  delete1: { "asks": { "0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47": { "costs": [{ "askIdentifier": "0xbbb346ae59edabe06231bdc589ce2a9bc26e7642a735821d44d665ecfa200793", "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 555, "amount": 2, "assetType": "ERC1155" }], "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 789, "amount": 1, "assetType": "ERC1155" }, "0xbbb346ae59edabe06231bdc589ce2a9bc26e7642a735821d44d665ecfa200793": { "costs": [{ "askIdentifier": "0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47", "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 789, "amount": 1, "assetType": "ERC1155" }], "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 555, "amount": 2, "assetType": "ERC1155" } } },
  fees1: { "asks": { "0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47": { "costs": [{ "askIdentifier": "0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210", "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 123, "amount": 2, "assetType": "ERC1155", "fee": { "contractAddress": "0xdEB0Ba412852a0b4e2191f3DedE0Fc585fcd72Ea", "amount": 1, "feeType": 1 } }], "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 789, "amount": 1, "assetType": "ERC1155" }, "0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210": { "costs": [{ "askIdentifier": "0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47", "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 789, "amount": 1, "assetType": "ERC1155" }], "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 123, "amount": 2, "assetType": "ERC1155", "fee": { "contractAddress": "0xdEB0Ba412852a0b4e2191f3DedE0Fc585fcd72Ea", "amount": 1, "feeType": 1 } } } },
  fees2: { "asks": { "0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47": { "costs": [{ "askIdentifier": "0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210", "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 123, "amount": 2, "assetType": "ERC1155" }, { "askIdentifier": "0xbbb346ae59edabe06231bdc589ce2a9bc26e7642a735821d44d665ecfa200793", "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 555, "amount": 2, "assetType": "ERC1155", "fee": { "contractAddress": "0xdEB0Ba412852a0b4e2191f3DedE0Fc585fcd72Ea", "amount": 1, "feeType": 1 } }], "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 789, "amount": 1, "assetType": "ERC1155" }, "0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210": { "costs": [{ "askIdentifier": "0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47", "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 789, "amount": 1, "assetType": "ERC1155" }], "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 123, "amount": 2, "assetType": "ERC1155" }, "0xbbb346ae59edabe06231bdc589ce2a9bc26e7642a735821d44d665ecfa200793": { "costs": [{ "askIdentifier": "0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47", "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 789, "amount": 1, "assetType": "ERC1155" }], "contractAddress": "0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c", "tokenId": 555, "amount": 2, "assetType": "ERC1155", "fee": { "contractAddress": "0xdEB0Ba412852a0b4e2191f3DedE0Fc585fcd72Ea", "amount": 1, "feeType": 1 } } } },
}


