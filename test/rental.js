const { ethers } = require('hardhat');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const util = new Util()


let erc721Nft, erc1155Nft
describe('Rentals', () => {
  
    beforeEach(async () => {
      await util.deployHandler()
      await util.deployERC721Factory()
      await util.deployERC1155Factory()
      await util.deployERC20Factory()
      erc721Nft = util.erc721Factory.clone
      erc1155Nft = util.erc1155Factory.clone
      erc20 = util.erc20
      await util.deployRental()
    })
    it('deploys rental', async()=>{
      let version = await util.rental.Version()
      expect(version).to.equal(2)
    })

    it('can add erc1155 <> erc721 inventory', async()=>{
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let askIdentifier = util.getWeb3().utils.soliditySha3(erc1155Nft.address, 789, erc721Nft.address, 123)
      let askToCostInventory = await util.rental.Inventory(askIdentifier)
      expect(askToCostInventory.asset.contractAddress).to.equal(erc721Nft.address)
      expect(askToCostInventory.asset.tokenId).to.equal(123)
      expect(askToCostInventory.asset.interfaceId).to.equal("0x80ac58cd")
      let costIdentifier = util.getWeb3().utils.soliditySha3(erc721Nft.address, 123, erc1155Nft.address, 789)
      let costToAskInventory = await util.rental.Inventory(costIdentifier)
      expect(costToAskInventory.asset.contractAddress).to.equal(erc1155Nft.address)
      expect(costToAskInventory.asset.tokenId).to.equal(789)
      expect(costToAskInventory.asset.interfaceId).to.equal("0xd9b67a26")
    })


    it('ask and cost can not be equal', async()=>{
      let tx = util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 789, 1, true)
      await expect(tx).to.be.revertedWith("ask and cost should not be the same")
    })

    it('cant cost more than 1 erc721')
    it('cant ask more than 1 erc721')

    it('can not deposit without inventory defined', async()=>{
      let tx = util.rental.Rent(erc1155Nft.address, 789, erc1155Nft.address, 123)
      await expect(tx).to.be.revertedWith("invalid inventory")
    })

    it('only admin can add inventory', async()=>{
      let rentalNonAdmin = util.getRental(util.rental.address, util.bob)
      let tx = rentalNonAdmin.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it('only admin can remove inventory', async()=>{
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      rentalNonAdmin = util.getRental(util.rental.address, util.bob)
      let tx = rentalNonAdmin.DeleteInventory(erc1155Nft.address, 789, erc721Nft.address, 123)
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it('only matching inventory can be deleted', async()=>{
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let tx = util.rental.DeleteInventory(erc1155Nft.address, 789, erc721Nft.address, 456)
      await expect(tx).to.be.revertedWith("inventory does not exist")
    })

    it('can not deposit without contract inventory balance', async()=>{
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let tx = util.rental.Rent(erc1155Nft.address, 789, erc721Nft.address, 123)
      await expect(tx).to.be.revertedWith("contract balance not enough")
    })

    it('can not deposit without user cost balance', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rental.address, 789, 1) // mint 1 ask asset to rental contract
      await erc721Nft.mint(util.alice.address, 123, "test", 0x0) // mint 1 cost to alice so token exists
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let tx = util.rental.Rent(erc1155Nft.address, 789, erc721Nft.address, 123)
      await expect(tx).to.be.revertedWith("user balance is not enough")
    })

    it('can not deposit without allowance', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rental.address, 789, 1) // mint 1 ask asset to rental contract
      await erc721Nft.mint(util.deployer.address, 123, "test", 0x0) // mint 1 cost to deployer
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      let tx = util.rental.Rent(erc1155Nft.address, 789, erc721Nft.address, 123)
      await expect(tx).to.be.revertedWith("not allowed to swap")
    })

    it('can swap erc1155 <> erc721', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rental.address, 789, 1) // mint 1 ask asset to rental contract
      await erc721Nft.mint(util.deployer.address, 123, "test", 0x0) // mint 1 cost to deployer

      let contractAskBalance = await erc1155Nft.balanceOf(util.rental.address, 789)
      expect(contractAskBalance).to.equal(1)
      let costOwner = await erc721Nft.ownerOf(123)
      expect(costOwner).to.equal(util.deployer.address)
      
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 123, 1, true)
      await erc721Nft.setApprovalForAll(util.rental.address, true)
      await util.rental.Rent(erc1155Nft.address, 789, erc721Nft.address, 123)

      contractAskBalance = await erc1155Nft.balanceOf(util.rental.address, 789)
      expect(contractAskBalance).to.equal(0)

      let renterAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(renterAskBalance).to.equal(1)

      costOwner = await erc721Nft.ownerOf(123)
      expect(costOwner).to.equal(util.rental.address)
    })

    it('can swap erc1155 <> erc20', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rental.address, 789, 1) // mint 1 ask asset to rental contract
      await erc20.mint(util.deployer.address, 1)

      let contractAskBalance = await erc1155Nft.balanceOf(util.rental.address, 789)
      expect(contractAskBalance).to.equal(1)
      let contractCostBalance = await erc20.balanceOf(util.rental.address)
      expect(contractCostBalance).to.equal(0)
      
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc20.address, 0, 1, true)
      await erc20.approve(util.rental.address, 1)
      await util.rental.Rent(erc1155Nft.address, 789, erc20.address, 0)

      contractAskBalance = await erc1155Nft.balanceOf(util.rental.address, 789)
      expect(contractAskBalance).to.equal(0)

      let renterAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(renterAskBalance).to.equal(1)

      contractCostBalance = await erc20.balanceOf(util.rental.address)
      expect(contractCostBalance).to.equal(1)

      await erc1155Nft.setApprovalForAll(util.rental.address, true)
      await util.rental.Rent(erc20.address, 0, erc1155Nft.address, 789)
    })

    it('can swap erc1155 <> erc1155 ', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rental.address, 789, 1) // mint 1 ask asset to rental contract
      await erc1155Nft.mint(util.deployer.address, 123,1) // mint 1 cost to deployer

      let contractAskBalance = await erc1155Nft.balanceOf(util.rental.address, 789)
      expect(contractAskBalance).to.equal(1)

      let contractCostBalance = await erc1155Nft.balanceOf(util.rental.address, 123)
      expect(contractCostBalance).to.equal(0)
      
      let ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(0)

      let ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(1)
      
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 1, true)
      await erc1155Nft.setApprovalForAll(util.rental.address, true)
      await util.rental.Rent(erc1155Nft.address, 789, erc1155Nft.address, 123)

      contractAskBalance = await erc1155Nft.balanceOf(util.rental.address, 789)
      expect(contractAskBalance).to.equal(0)

      contractCostBalance = await erc1155Nft.balanceOf(util.rental.address, 123)
      expect(contractCostBalance).to.equal(1)

      ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(1)

      ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(0)
    })

    it('can swap single erc1155 <> for multiple erc1155 with amounts', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rental.address, 789, 2) // mint 1 ask asset to rental contract
      await erc1155Nft.mint(util.deployer.address, 123, 4) // mint 2 cost to deployer

      let contractAskBalance = await erc1155Nft.balanceOf(util.rental.address, 789)
      expect(contractAskBalance).to.equal(2)

      let contractCostBalance = await erc1155Nft.balanceOf(util.rental.address, 123)
      expect(contractCostBalance).to.equal(0)
      
      let ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(0)

      let ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(4)
      
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await erc1155Nft.setApprovalForAll(util.rental.address, true)
      await util.rental.Rent(erc1155Nft.address, 789, erc1155Nft.address, 123)

      contractAskBalance = await erc1155Nft.balanceOf(util.rental.address, 789)
      expect(contractAskBalance).to.equal(1)

      contractCostBalance = await erc1155Nft.balanceOf(util.rental.address, 123)
      expect(contractCostBalance).to.equal(2)

      ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(1)

      ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(2)
    })

    it('can swap single erc1155 <> for multiple erc1155 with amounts twice', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rental.address, 789, 2) // mint 1 ask asset to rental contract
      await erc1155Nft.mint(util.deployer.address, 123, 4) // mint 2 cost to deployer
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await erc1155Nft.setApprovalForAll(util.rental.address, true)
      await util.rental.Rent(erc1155Nft.address, 789, erc1155Nft.address, 123)
      await util.rental.Rent(erc1155Nft.address, 789, erc1155Nft.address, 123)

      let contractAskBalance = await erc1155Nft.balanceOf(util.rental.address, 789)
      expect(contractAskBalance).to.equal(0)

      let contractCostBalance = await erc1155Nft.balanceOf(util.rental.address, 123)
      expect(contractCostBalance).to.equal(4)

      let ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(2)

      let ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(0)
    })

    it('can swap return multiple erc1155 <> for single erc1155 after deposit', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rental.address, 789, 2) // mint 1 ask asset to rental contract
      await erc1155Nft.mint(util.deployer.address, 123, 4) // mint 2 cost to deployer
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await erc1155Nft.setApprovalForAll(util.rental.address, true)

      await util.rental.Rent(erc1155Nft.address, 789, erc1155Nft.address, 123)
      await util.rental.Rent(erc1155Nft.address, 123, erc1155Nft.address, 789)

      let contractAskBalance = await erc1155Nft.balanceOf(util.rental.address, 789)
      expect(contractAskBalance).to.equal(2)

      let contractCostBalance = await erc1155Nft.balanceOf(util.rental.address, 123)
      expect(contractCostBalance).to.equal(0)

      let ownerAskBalance = await erc1155Nft.balanceOf(util.deployer.address, 789)
      expect(ownerAskBalance).to.equal(0)

      let ownerCostBalance = await erc1155Nft.balanceOf(util.deployer.address, 123)
      expect(ownerCostBalance).to.equal(4)
    })

    it('removed inventory should revert on deposit', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rental.address, 789, 2) // mint 1 ask asset to rental contract
      await erc1155Nft.mint(util.deployer.address, 123, 4) // mint 2 cost to deployer
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await erc1155Nft.setApprovalForAll(util.rental.address, true)
      await util.rental.Rent(erc1155Nft.address, 789, erc1155Nft.address, 123)
      await util.rental.DeleteInventory(erc1155Nft.address, 789, erc1155Nft.address, 123)
      let tx = util.rental.Rent(erc1155Nft.address, 789, erc1155Nft.address, 123)
      await expect(tx).to.be.revertedWith("invalid inventory")
    })

    it('prevent over writing inventory', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rental.address, 789, 2)
      await erc1155Nft.mint(util.deployer.address, 123, 4)
      await erc1155Nft.mint(util.deployer.address, 456, 2)
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      let tx = util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await expect(tx).to.be.revertedWith("inventory already exists")
      tx = util.rental.AddInventory(erc1155Nft.address, 123, 1, erc1155Nft.address, 789, 2, true)
      await expect(tx).to.be.revertedWith("inventory already exists")
    })

    it('can add different pairs using same asset on one side', async()=>{
      await erc1155Nft.toggleSerialization()
      await erc1155Nft.mint(util.rental.address, 789, 2)
      await erc1155Nft.mint(util.deployer.address, 123, 4)
      await erc1155Nft.mint(util.deployer.address, 456, 2)
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 456, 1, true)
      let assets = await util.rental.GetAssets()
      expect(assets.length).to.equal(3)
    })

    it('can get empty inventory', async () => { 
      // await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      let assets = await util.rental.GetAssets()
      expect(assets.length).to.equal(0)
      let rentalInventory = await getInventoryFromAssetIdentifiers(assets)
      expect(JSON.stringify(rentalInventory)).equal(JSON.stringify({"asks":{}}))
      // console.log(JSON.stringify(rentalInventory))
    })

    it('can get inventory when same erc1155', async () => { 
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      let assets = await util.rental.GetAssets()
      expect(assets.length).to.equal(2)
      let rentalInventory = await getInventoryFromAssetIdentifiers(assets)
      expect(JSON.stringify(rentalInventory)).equal(JSON.stringify(MOCKS.simple1))
      // console.log(JSON.stringify(rentalInventory))
    })

    it('can get inventory when erc1155 tokenId and contract address are the same', async () => { 
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 555, 2, true)
      let assets = await util.rental.GetAssets()
      expect(assets.length).to.equal(3)
      let rentalInventory = await getInventoryFromAssetIdentifiers(assets)
      // expect(JSON.stringify(rentalInventory)).equal(JSON.stringify(MOCKS.simple2))
      console.log(JSON.stringify(rentalInventory))
    })

    it('can get inventory when erc1155 mixed with erc721', async () => { 
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc721Nft.address, 456, 1, true)
      await util.rental.AddInventory(erc1155Nft.address, 555, 1, erc1155Nft.address, 789, 2, true)
      let assets = await util.rental.GetAssets()
      expect(assets.length).to.equal(4)
      let rentalInventory = await getInventoryFromAssetIdentifiers(assets)
      expect(JSON.stringify(rentalInventory)).equal(JSON.stringify(MOCKS.complex))
      // console.log(JSON.stringify(rentalInventory))
    })

    it('can get inventory after single add and single delete', async () => { 
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rental.DeleteInventory(erc1155Nft.address, 789, erc1155Nft.address, 123)
      let assets = await util.rental.GetAssets()
      expect(assets.length).to.equal(0)
      let rentalInventory = await getInventoryFromAssetIdentifiers(assets)
      expect(JSON.stringify(rentalInventory)).equal(JSON.stringify({"asks":{}}))
      // console.log(JSON.stringify(rentalInventory))
    })

    it('can get inventory after multiple add and single delete', async () => { 
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 555, 2, true)
      await util.rental.DeleteInventory(erc1155Nft.address, 789, erc1155Nft.address, 123)
      let assets = await util.rental.GetAssets()
      expect(assets.length).to.equal(2)
      let rentalInventory = await getInventoryFromAssetIdentifiers(assets)
      expect(JSON.stringify(rentalInventory)).equal(JSON.stringify(MOCKS.delete1))
      // console.log(JSON.stringify(rentalInventory))
    })

    it('can get inventory after multiple add and multiple delete', async () => {
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 555, 2, true)
      await util.rental.DeleteInventory(erc1155Nft.address, 789, erc1155Nft.address, 123)
      await util.rental.DeleteInventory(erc1155Nft.address, 789, erc1155Nft.address, 555)
      let assets = await util.rental.GetAssets()
      console.log(assets)
      expect(assets.length).to.equal(0)
      let rentalInventory = await getInventoryFromAssetIdentifiers(assets)
      expect(JSON.stringify(rentalInventory)).equal(JSON.stringify({"asks":{}}))
      // console.log(JSON.stringify(rentalInventory))
    })

    it('reverts when adding fee to non-existent inventory', async () => {
      let tx = util.rental.AddFee(erc1155Nft.address, 789, erc1155Nft.address, 123, erc20.address, 1, 1)
      await expect(tx).to.be.revertedWith('unknown inventory')
    })

    it('can get inventory with fees on only inventory pair', async () => {
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rental.AddFee(erc1155Nft.address, 789, erc1155Nft.address, 123, erc20.address, 1, 1)
      let assets = await util.rental.GetAssets()
      expect(assets.length).to.equal(2)
      let rentalInventory = await getInventoryFromAssetIdentifiers(assets)
      expect(JSON.stringify(rentalInventory)).equal(JSON.stringify(MOCKS.fees1))
    })

    it('can get inventory with fees on one inventory pair', async () => {
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, true)
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 555, 2, true)
      await util.rental.AddFee(erc1155Nft.address, 789, erc1155Nft.address, 555, erc20.address, 1, 1)
      let assets = await util.rental.GetAssets()
      expect(assets.length).to.equal(3)
      let rentalInventory = await getInventoryFromAssetIdentifiers(assets)
      expect(JSON.stringify(rentalInventory)).equal(JSON.stringify(MOCKS.fees2))
      // console.log(JSON.stringify(rentalInventory))
    })

    it('can create one sided pairing', async () => {
      await util.rental.AddInventory(erc1155Nft.address, 789, 1, erc1155Nft.address, 123, 2, false)
      let assets = await util.rental.GetAssets()
      expect(assets.length).eq(1)
      let rentalInventory = await getInventoryFromAssetIdentifiers(assets)
      console.log(JSON.stringify(rentalInventory, null, 2))
      
    })
  })

async function getInventoryFromAssetIdentifiers(assets) {
  let rentalInventory = {asks: {}}
  await assets.asyncForEach(async (item, index) => {
    let inventoryIdentifiers = await util.rental.GetAssetInventory(item)
    rentalInventory.asks[item] = {costs: []}
    
    await inventoryIdentifiers.asyncForEach(async (identifier) => {
      let fee = await util.rental.InventoryFee(identifier)
      let inventory = await util.rental.Inventory(identifier)
      if (inventory && inventory.asset.contractAddress != '0x0000000000000000000000000000000000000000') {
        let calculated = util.getWeb3().utils.soliditySha3(inventory['asset'].contractAddress, inventory['asset'].tokenId)
        let costObject = {askIdentifier: calculated,'contractAddress': inventory['asset'].contractAddress, 'tokenId': inventory['asset'].tokenId.toNumber(), amount: inventory['amount'].toNumber(), assetType: inventory['asset'].interfaceId == 0xd9b67a26? "ERC1155":inventory['asset'].interfaceId == 0x80ac58cd? "ERC721": "ERC20" }
        if (fee['feeType'] !== 0) {
          costObject.fee = {
            contractAddress: fee['contractAddress'],
            amount: fee['amount'].toNumber(),
            feeType: fee['feeType']
          }
        }
        rentalInventory.asks[item].costs.push( costObject )
      }
    })
  })
  let flat = Object.keys(rentalInventory.asks).map(id=>{ return rentalInventory.asks[id].costs}).flat()
  let deduped = removeDuplicates(flat, 'askIdentifier')
  deduped.forEach(asset=>{
    rentalInventory.asks[asset.askIdentifier].contractAddress = asset.contractAddress
    rentalInventory.asks[asset.askIdentifier].tokenId = asset.tokenId
    rentalInventory.asks[asset.askIdentifier].amount = asset.amount
    rentalInventory.asks[asset.askIdentifier].assetType = asset.assetType
    if (asset.fee) {
      rentalInventory.asks[asset.askIdentifier].fee = asset.fee
    }
  })
  return rentalInventory
}

Object.defineProperty(Array.prototype, 'asyncForEach', {
  value: async function (callback) {
    await asyncForEach(this, callback);
    async function asyncForEach(array, callback) {
      for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
      }
    }
  }
})

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
  simple1: {"asks":{"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47":{"costs":[{"askIdentifier":"0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":123,"amount":2,"assetType":"ERC1155"}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"},"0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210":{"costs":[{"askIdentifier":"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":123,"amount":2,"assetType":"ERC1155"}}},
  simple2: {"asks":{"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47":{"costs":[{"askIdentifier":"0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":123,"amount":2,"assetType":"ERC1155"},{"askIdentifier":"0xbbb346ae59edabe06231bdc589ce2a9bc26e7642a735821d44d665ecfa200793","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":555,"amount":2,"assetType":"ERC1155"}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"},"0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210":{"costs":[{"askIdentifier":"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":123,"amount":2,"assetType":"ERC1155"},"0xbbb346ae59edabe06231bdc589ce2a9bc26e7642a735821d44d665ecfa200793":{"costs":[{"askIdentifier":"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":555,"amount":2,"assetType":"ERC1155"}}},
  complex: {"asks":{"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47":{"costs":[{"askIdentifier":"0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":123,"amount":2,"assetType":"ERC1155"},{"askIdentifier":"0x6a7558b64b30b10304af0dc4d62fd43252451267889e57f74387d79b7d152860","contractAddress":"0xbD89b434dD59562756ED9B14B0bec5E71f3c6876","tokenId":456,"amount":1,"assetType":"ERC721"},{"askIdentifier":"0xbbb346ae59edabe06231bdc589ce2a9bc26e7642a735821d44d665ecfa200793","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":555,"amount":1,"assetType":"ERC1155"}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":2,"assetType":"ERC1155"},"0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210":{"costs":[{"askIdentifier":"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":123,"amount":2,"assetType":"ERC1155"},"0x6a7558b64b30b10304af0dc4d62fd43252451267889e57f74387d79b7d152860":{"costs":[{"askIdentifier":"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"}],"contractAddress":"0xbD89b434dD59562756ED9B14B0bec5E71f3c6876","tokenId":456,"amount":1,"assetType":"ERC721"},"0xbbb346ae59edabe06231bdc589ce2a9bc26e7642a735821d44d665ecfa200793":{"costs":[{"askIdentifier":"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":2,"assetType":"ERC1155"}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":555,"amount":1,"assetType":"ERC1155"}}},
  delete1: {"asks":{"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47":{"costs":[{"askIdentifier":"0xbbb346ae59edabe06231bdc589ce2a9bc26e7642a735821d44d665ecfa200793","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":555,"amount":2,"assetType":"ERC1155"}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"},"0xbbb346ae59edabe06231bdc589ce2a9bc26e7642a735821d44d665ecfa200793":{"costs":[{"askIdentifier":"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":555,"amount":2,"assetType":"ERC1155"}}},
  fees1: {"asks":{"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47":{"costs":[{"askIdentifier":"0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":123,"amount":2,"assetType":"ERC1155","fee":{"contractAddress":"0xdEB0Ba412852a0b4e2191f3DedE0Fc585fcd72Ea","amount":1,"feeType":1}}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"},"0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210":{"costs":[{"askIdentifier":"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":123,"amount":2,"assetType":"ERC1155","fee":{"contractAddress":"0xdEB0Ba412852a0b4e2191f3DedE0Fc585fcd72Ea","amount":1,"feeType":1}}}},
  fees2: {"asks":{"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47":{"costs":[{"askIdentifier":"0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":123,"amount":2,"assetType":"ERC1155"},{"askIdentifier":"0xbbb346ae59edabe06231bdc589ce2a9bc26e7642a735821d44d665ecfa200793","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":555,"amount":2,"assetType":"ERC1155","fee":{"contractAddress":"0xdEB0Ba412852a0b4e2191f3DedE0Fc585fcd72Ea","amount":1,"feeType":1}}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"},"0x4738c40165d98a16cbfc22542bc355b8b29df8de5dba25e01a7a084205f5b210":{"costs":[{"askIdentifier":"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":123,"amount":2,"assetType":"ERC1155"},"0xbbb346ae59edabe06231bdc589ce2a9bc26e7642a735821d44d665ecfa200793":{"costs":[{"askIdentifier":"0x8802659d9f6b42a85514a0fe61bffc71c240953500b55106131b1a07726c7a47","contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":789,"amount":1,"assetType":"ERC1155"}],"contractAddress":"0x37B37064d97eADAcc4d7A0cbC673b5C2932b673c","tokenId":555,"amount":2,"assetType":"ERC1155","fee":{"contractAddress":"0xdEB0Ba412852a0b4e2191f3DedE0Fc585fcd72Ea","amount":1,"feeType":1}}}},
}


