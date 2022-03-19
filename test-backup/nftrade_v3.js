const Util = require('./util.js')
const util = new Util()
const { expect } = require('chai')
let Token, NFT, Trade, NFT2, NFT3
const fromBank = { from: "0x102e5f644e6ed79ee2a3c221fe16d8711f028952" }

beforeEach(async () => {
  await util.deploy();
  await util.cloneHandler(util.deployer.address)
  await util.cloneERC20(util.deployer.address)
  Token = util.getERC20(util.erc20.address, util.deployer)
  NFT = util.getEmblemVault((await util.factory.emblemImplementation()), util.deployer)
  await util.cloneEmblem(util.deployer.address) //await NFT.new();
  NFT2 = util.getEmblemVault(util.emblem.address, util.deployer)
  NFT3 = util.getERC1155((await util.factory.erc1155Implementation()), util.deployer)
  await NFT2.changeName("Other NFT", "other.nft");
  await util.cloneTradeV3(util.deployer.address)
  Trade = util.traderV3
});
describe('NFTradeV3 (Multi-Tenant)', () => {
  describe('NFTradeV3 NFT', () => {

    it('has correct name', async () => {
      let name = await NFT.name()
      expect(name).to.equal("Emblem Vault V2")
    })

    it('can mint', async () => {
      await util.handler.transferNftOwnership(NFT.address, util.deployer.address)
      await NFT.mint(util.deployer.address, 123, 'a', 0x0)
      await NFT.mint(util.alice.address, 456, 'a', 0x0)
      let totalSupply = await NFT.totalSupply()
      expect(totalSupply).to.equal(2)
    })

    it('users have expected balances', async () => {
      await util.handler.transferNftOwnership(NFT.address, util.deployer.address)
      await NFT.mint(util.deployer.address, 123, 'a', 0x0)
      await NFT.mint(util.alice.address, 456, 'a', 0x0)
      let user1Nft = await NFT.tokenOfOwnerByIndex(util.deployer.address, 0)
      let user2Nft = await NFT.tokenOfOwnerByIndex(util.alice.address, 0)
      expect(user1Nft).to.equal(123)
      expect(user2Nft).to.equal(456)
    })
  })
  describe('NFTradeV3 Trade', () => {

    beforeEach(async () => {
      await util.handler.transferNftOwnership(NFT.address, util.deployer.address)
      await NFT.mint(util.deployer.address, 123, 'a', 0x0)
      await NFT.mint(util.alice.address, 456, 'a', 0x0)
      await NFT.mint(util.bob.address, 789, 'a', 0x0)
    })

    it('reflects correct version', async () => {
      let version = await Trade.getVersion()
      expect(version).to.equal(1)
    })

    // it('cannot place offer against erc20', async () => {
    //   await truffleAssert.reverts(Trade.addOffer(NFT.address, 123, Token.address, 456, 1, 1337), 'Not allowed to make offers for erc20')
    // })

    it('cannot place offer without approval', async () => {
      let tx = Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
      await expect(tx).to.be.revertedWith('Handler unable to transfer NFT')
    })

    it('cannot offer un-owned token', async () => {
      let tx = Trade.addOffer(NFT.address, 456, NFT.address, 123, 1, 1337)
      await expect(tx).to.be.revertedWith('Sender not owner of NFT')
    })

    it('can place offer after approval', async () => {
      await NFT.setApprovalForAll(Trade.address, true)
      await Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
      let offer = await Trade.getOffer(NFT.address, 456, 0)
      expect(offer._from, util.deployer.address)
      expect(offer.tokenId, 123)
      expect(offer.token, NFT.address)
    })

    it('cannot add erc20 token offer when canOfferERC20 off', async () => {
      await Token.addMinter(util.deployer.address)
      await Token.mint(util.deployer.address, 10000000000000)
      Trade = await util.getTradeV3(Trade.address, util.alice)
      let tx = Trade.addOffer(Token.address, 0, NFT.address, 456, 1, 1337)
      await expect(tx).to.be.revertedWith('Not allowed to make offers of erc20')
    })

    it('cannot add erc20 token offer before allowance', async () => {
      await Trade.toggleCanOfferERC20(1337)
      await Token.mint(util.deployer.address, 10000000000000)
      let tx = Trade.addOffer(Token.address, 0, NFT.address, 456, 1, 1337)
      await expect(tx).to.be.revertedWith('Not Enough Allowance')
    })

    it('can add erc20 token offer after allowance', async () => {
      await Trade.toggleCanOfferERC20(1337)
      await Token.mint(util.alice.address, 10000000000000)
      Token = util.getERC20(Token.address, util.alice)
      await Token.approve(Trade.address, 100)
      Trade = await util.getTradeV3(Trade.address, util.alice)
      await Trade.addOffer(Token.address, 0, NFT.address, 456, 1, 1337)
      let offer = await Trade.getOffer(NFT.address, 456, 0)
      expect(offer._from).to.equal(util.alice.address)
      expect(offer.tokenId).to.equal(0)
      expect(offer.token).to.equal(Token.address)
      expect(offer.amount).to.equal(1)
    })

    it('can withdraw offer', async () => {
      await Trade.toggleCanOfferERC20(1337)
      await Token.mint(util.alice.address, 10000000000000)
      Token = util.getERC20(Token.address, util.alice)
      await Token.approve(Trade.address, 100)
      Trade = await util.getTradeV3(Trade.address, util.alice)
      await Trade.addOffer(Token.address, 0, NFT.address, 456, 1, 1337)
      await Trade.withdrawOffer(NFT.address, 456, 0)
      let offer = await Trade.getOffer(NFT.address, 456, 0)
      expect(offer._from, '0x0000000000000000000000000000000000000000')
      expect(offer.tokenId, 0)
      expect(offer.token, '0x0000000000000000000000000000000000000000')
    })

    it('rejecting another users offer fails', async () => {
      await NFT.setApprovalForAll(Trade.address, true)
      await Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
      let tx = Trade.rejectOffer(NFT.address, 456, 0)
      expect(tx).to.be.revertedWith('Sender is not owner of NFT')
    })

    it('can reject offer', async () => {
      await NFT.setApprovalForAll(Trade.address, true)
      await Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
      let offer = await Trade.getOffer(NFT.address, 456, 0)
      expect(offer._from).to.equal(util.deployer.address)
      expect(offer.tokenId).to.equal(123)
      expect(offer.token).to.equal(NFT.address)
      Trade = util.getTradeV3(Trade.address, util.alice)
      await Trade.rejectOffer(NFT.address, 456, 0)
      offer = await Trade.getOffer(NFT.address, 456, 0)
      expect(offer._from, '0x0000000000000000000000000000000000000000')
      expect(offer.tokenId, 0)
      expect(offer.token, '0x0000000000000000000000000000000000000000')
    })

    it('cannot accept offer without approval', async () => {
      await NFT.setApprovalForAll(Trade.address, true)
      await Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
      Trade = util.getTradeV3(Trade.address, util.alice)
      let tx = Trade.acceptOffer(NFT.address, 456, 0, 1337)
      expect(tx).to.be.revertedWith('Handler unable to transfer NFT')
    })

    it('cannot accept erc20 offer without approval', async () => {
      await Trade.toggleCanOfferERC20(1337)
      await Token.mint(util.alice.address, 10000000000000)
      Token = util.getERC20(Token.address, util.alice)
      await Token.approve(Trade.address, 100)
      Trade = util.getTradeV3(Trade.address, util.alice)
      await Trade.addOffer(Token.address, 0, NFT.address, 789, 1, 1337)
      Trade = util.getTradeV3(Trade.address, util.bob)
      let tx = Trade.acceptOffer(NFT.address, 789, 0, 1337)
      expect(tx).to.be.revertedWith('Handler unable to transfer NFT')
    })

    it('can accept erc20 offer with approval', async () => {
      await Trade.toggleCanOfferERC20(1337)
      await Token.mint(util.alice.address, 10000000000000)
      Token = util.getERC20(Token.address, util.alice)
      await Token.approve(Trade.address, 100)
      Trade = util.getTradeV3(Trade.address, util.alice)
      await Trade.addOffer(Token.address, 0, NFT.address, 789, 1, 1337)
      Trade = util.getTradeV3(Trade.address, util.bob)
      NFT = util.getEmblemVault(NFT.address, util.bob)
      await NFT.setApprovalForAll(Trade.address, true)
      await Trade.acceptOffer(NFT.address, 789, 0, 1337)
      let balance = await Token.balanceOf(util.bob.address)
      expect(balance).to.equal(1)
      let owner = await NFT.ownerOf(789)
      expect(owner).to.equal(util.alice.address)
    })

    it('can withdraw erc20 offer', async () => {
      await Trade.toggleCanOfferERC20(1337)
      await Token.mint(util.alice.address, 10000000000000)
      Token = util.getERC20(Token.address, util.alice)
      await Token.approve(Trade.address, 100)
      Trade = util.getTradeV3(Trade.address, util.alice)
      await Trade.addOffer(Token.address, 0, NFT.address, 789, 1, 1337)
      let offer = await Trade.getOffer(NFT.address, 789, 0)
      expect(offer._from).to.equal(util.alice.address)
      expect(offer.tokenId).to.equal(0)
      expect(offer.token).to.equal(Token.address)
      expect(offer.amount).to.equal(1)
      await Trade.withdrawOffer(NFT.address, 789, 0)
      offer = await Trade.getOffer(NFT.address, 789, 0)
      expect(offer._from).to.equal('0x0000000000000000000000000000000000000000')
      expect(offer.tokenId).to.equal(0)
      expect(offer.token).to.equal('0x0000000000000000000000000000000000000000')
    })

    it('can reject erc20 offer', async () => {
      await Trade.toggleCanOfferERC20(1337)
      await Token.mint(util.alice.address, 10000000000000)
      Token = util.getERC20(Token.address, util.alice)
      await Token.approve(Trade.address, 100)
      Trade = util.getTradeV3(Trade.address, util.alice)
      await Trade.addOffer(Token.address, 0, NFT.address, 789, 1, 1337)
      Trade = await util.getTradeV3(Trade.address, util.bob)
      await Trade.rejectOffer(NFT.address, 789, 0)
      offer = await Trade.getOffer(NFT.address, 789, 0)
      expect(offer._from).to.equal('0x0000000000000000000000000000000000000000')
      expect(offer.tokenId).to.equal(0)
      expect(offer.token).to.equal('0x0000000000000000000000000000000000000000')
    })

    it('can accept offer after approval', async () => {
      expect(await NFT.ownerOf(123)).to.equal(util.deployer.address)
      expect(await NFT.ownerOf(456)).to.equal(util.alice.address)
      await NFT.setApprovalForAll(Trade.address, true)
      await Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
      NFT = util.getEmblemVault(NFT.address, util.alice)
      await NFT.setApprovalForAll(Trade.address, true)
      Trade = util.getTradeV3(Trade.address, util.alice)
      await Trade.acceptOffer(NFT.address, 456, 0, 1337)
      expect(await NFT.ownerOf(123)).to.equal(util.alice.address)
      expect(await NFT.ownerOf(456)).to.equal(util.deployer.address)
    })

    it('cannot accept offer for un-owned nft', async () => {
      await NFT.setApprovalForAll(Trade.address, true)
      await Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
      NFT = util.getEmblemVault(NFT.address, util.bob)
      await NFT.setApprovalForAll(Trade.address, true)
      Trade = util.getTradeV3(Trade.address, util.bob)
      let tx = Trade.acceptOffer(NFT.address, 456, 0, 1337)
      await expect(tx).to.revertedWith('Sender is not owner of NFT')
    })

    it('accepting offer removes all other offers', async () => {
      await NFT.setApprovalForAll(Trade.address, true)
      NFT = util.getEmblemVault(NFT.address, util.alice)
      await NFT.setApprovalForAll(Trade.address, true)
      NFT = util.getEmblemVault(NFT.address, util.bob)
      await NFT.setApprovalForAll(Trade.address, true)

      await Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
      Trade = await util.getTradeV3(Trade.address, util.bob)
      await Trade.addOffer(NFT.address, 789, NFT.address, 456, 1, 1337)

      let count = await Trade.getOfferCount(NFT.address, 456)
      expect(count).to.equal(2)
      Trade = util.getTradeV3(Trade.address, util.alice)
      await Trade.acceptOffer(NFT.address, 456, 1, 1337)
      expect(await NFT.ownerOf(789)).to.equal(util.alice.address)
      expect(await NFT.ownerOf(456)).to.equal(util.bob.address)
      count = await Trade.getOfferCount(NFT.address, 456)
      expect(count).to.equal(0)
    })

    it('can get outstanding offers placed', async () => {
      await NFT.setApprovalForAll(Trade.address, true)
      await Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
      await Trade.addOffer(NFT.address, 123, NFT.address, 789, 1, 1337)
      let offered = await Trade.getOffered(NFT.address, 123)
      expect(offered[0].tokenId).to.equal('456')
      expect(offered[1].tokenId).to.equal('789')
    })

    it('can get accepted offer for nft ', async () => {
      await NFT.setApprovalForAll(Trade.address, true)
      NFT = util.getEmblemVault(NFT.address, util.alice)
      await NFT.setApprovalForAll(Trade.address, true)
      await Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
      await Trade.addOffer(NFT.address, 123, NFT.address, 789, 1, 1337)
      Trade = util.getTradeV3(Trade.address, util.alice)
      await Trade.acceptOffer(NFT.address, 456, 0, 1337)
      let accepted = await Trade.getAcceptedOffers(NFT.address, 456)
      expect(accepted[0].tokenId).to.equal('123')
    })

    it('accepting offer removes all outstanding offers for nft', async () => {
      await NFT.setApprovalForAll(Trade.address, true)
      NFT = util.getEmblemVault(NFT.address, util.alice)
      await NFT.setApprovalForAll(Trade.address, true)
      await Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
      await Trade.addOffer(NFT.address, 123, NFT.address, 789, 1, 1337)
      Trade = util.getTradeV3(Trade.address, util.alice)
      await Trade.acceptOffer(NFT.address, 456, 0, 1337)

      let offered = await Trade.getOffered(NFT.address, 123)
      expect(offered.length).to.equal(0)
    })
  })
  describe('NFTradeV3 Payment', () => {

    beforeEach(async () => {
      await util.handler.transferNftOwnership(NFT.address, util.deployer.address)
      await NFT.mint(util.deployer.address, 123, 'a', 0x0)
      await NFT.mint(util.alice.address, 456, 'a', 0x0)
      await NFT.setApprovalForAll(Trade.address, true)
      NFT = util.getEmblemVault(NFT.address, util.alice)
      await NFT.setApprovalForAll(Trade.address, true)

      await Token.mint(util.deployer.address, 10000000000000)
      await Token.mint(util.alice.address, 10000000000000)
      await Trade.togglePayToMakeOffer(1337)
      await Trade.togglePayToAcceptOffer(1337)
      await Trade.changeOfferPrices(1000000000, 10000000000, 0, 1337)
    })

    it('reflects correct token balances before trades', async () => {
      expect((await Token.balanceOf(util.deployer.address))).to.equal(10000000000000)
      expect((await Token.balanceOf(util.alice.address))).to.equal(10000000000000)
      expect((await Token.balanceOf(fromBank.from))).to.equal(0)
    })

    it('toggles pay to make and accept offers', async () => {
      let config = await Trade.getConfig(1337)
      expect(await config.payToMakeOffer).to.be.true
      expect(await config.payToAcceptOffer).to.be.true
    })

    it('can charge separate prices to make and accept offers', async () => {
      let config = await Trade.getConfig(1337)
      expect((await config.makeOfferPrice)).to.equal(1000000000)
      expect((await config.acceptOfferPrice)).to.equal(10000000000)
    })

    describe('Pay to make offer', () => {
      it('fails to add offer if trade contract not approved to spend', async () => {
        let tx = Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
        await expect(tx).to.revertedWith('Handler unable take payment for offer')
      })

      it('fails to add offer if too broke', async () => {
        await Token.approve(Trade.address, 10000000000000)
        await Token["transfer(address,uint256)"](util.alice.address, 10000000000000)
        let tx = Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
        await expect(tx).to.revertedWith('Insufficient Balance for payment')
      })

      it('can make offer', async () => {
        await Token.approve(Trade.address, 10000000000000)
        await Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
      })

      it('bank receives fee', async () => {
        expect((await Token.balanceOf(fromBank.from)).toNumber(), 0)
        Token.approve(Trade.address, 10000000000)
        Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
        let config = await Trade.getConfig(1337)
        expect((await Token.balanceOf(config.recipientAddress)).toNumber(), 1000000000)
      })
    })

    describe('Pay to accept offer', () => {

      beforeEach(async() => {
        await Token.approve(Trade.address, 10000000000)
        await Trade.addOffer(NFT.address, 123, NFT.address, 456, 1, 1337)
      })

      it('fails to accept offer if trade contract not approved to spend', async () => {
        Trade = util.getTradeV3(Trade.address, util.alice)
        let tx = Trade.acceptOffer(NFT.address, 456, 0, 1337)
        await expect(tx).to.revertedWith('Handler unable take payment for offer')
      })

      it('fails to accept offer if too broke', async () => {
        Token = util.getERC20(Token.address, util.alice)
        await Token.approve(Trade.address, 10000000000000)
        await Token["transfer(address,uint256)"](util.deployer.address, 10000000000000)
        Trade = util.getTradeV3(Trade.address, util.alice)
        let tx = Trade.acceptOffer(NFT.address, 456, 0, 1337)
        await expect(tx).to.be.revertedWith('Insufficient Balance for payment')
      })

      it('can accept offer', async () => {
        let owner = await NFT.ownerOf(456)
        expect(owner).to.equal(util.alice.address)
        await Trade.changeOfferPrices(10, 100, 0, 1337)
        Token = util.getERC20(Token.address, util.alice)
        await Token.approve(Trade.address, 1000)
        Trade = util.getTradeV3(Trade.address, util.alice)
        await Trade.acceptOffer(NFT.address, 456, 0, 1337)
        owner = await NFT.ownerOf(456)
        expect(owner).to.equal(util.deployer.address)
      })

      it('bank receives fee', async () => {
        await Trade.changeOfferPrices(10, 100, 0, 1337)
        let config = await Trade.getConfig(1337)
        let previousBalance = (await Token.balanceOf(config.recipientAddress)).toNumber()
        Token = util.getERC20(Token.address, util.alice)
        await Token.approve(Trade.address, 1000)
        Trade = util.getTradeV3(Trade.address, util.alice)
        await Trade.acceptOffer(NFT.address, 456, 0, 1337)
        let newBalance = (await Token.balanceOf(await config.recipientAddress)).toNumber()
        expect(newBalance).to.equal(previousBalance + 100)
      })
    })
  })
  describe('NFTradeV3 Trade Types', () => {
    beforeEach(async() => {
      await util.handler.transferNftOwnership(NFT.address, util.deployer.address)
      await NFT.mint(util.deployer.address, 123, 'a', 0x0)
      await NFT2.mint(util.alice.address, 456, 'a', 0x0)
      await NFT3.mint(util.bob.address, 789, 2)
      await NFT3.mint(util.alice.address, 1337, 2)
      await NFT3.mint(util.bob.address, 1447, 2)
      await Trade.toggleCanOfferERC20(1337)
      await Token.mint(util.deployer.address, 10000000000000)
      await Token.approve(Trade.address, 100)
      await NFT.setApprovalForAll(Trade.address, true)
      NFT2 = util.getEmblemVault(NFT2.address, util.alice)
      await NFT2.setApprovalForAll(Trade.address, true)
      NFT3 = util.getERC1155(NFT3.address, util.bob)
      NFT3.setApprovalForAll(Trade.address, true)
      NFT3 = util.getERC1155(NFT3.address, util.alice)
      NFT3.setApprovalForAll(Trade.address, true)
      await Trade.addOffer(NFT.address, 123, NFT2.address, 456, 1, 1337)
      await Trade.addOffer(Token.address, 0, NFT2.address, 456, 1, 1337)
      await Trade.addOffer(Token.address, 0, NFT3.address, 789, 1, 1337)
      await Trade.addOffer(Token.address, 0, NFT3.address, 1337, 1, 1337)
      Trade = util.getTradeV3(Trade.address, util.alice)
      await Trade.addOffer(NFT2.address, 456, NFT3.address, 789, 2, 1337)
      await Trade.addOffer(NFT3.address, 1337, NFT3.address, 1447, 2, 1337)
      await Trade.addOffer(NFT2.address, 456, NFT3.address, 1447, 2, 1337)
    })

    it('2 separate nft contracts exist', async () => {
      expect(await NFT.name(), 'Emblem Vault V2')
      expect(await NFT2.name(), 'Other NFT')
    })

    it('users have correct balances of nfts before trades', async () => {
      let user1Nft = await NFT.tokenOfOwnerByIndex(util.deployer.address, 0)
      let user2Nft = await NFT2.tokenOfOwnerByIndex(util.alice.address, 0)
      let user3Nft = await NFT3.balanceOf(util.bob.address, 789)
      expect(user1Nft.toNumber()).to.equal(123)
      expect(user2Nft.toNumber()).to.equal(456)
      expect(user3Nft.toNumber()).to.equal(2)
    })

    it('can swap erc721 for erc721', async () => {
      Trade = util.getTradeV3(Trade.address, util.alice)
      await Trade.acceptOffer(NFT2.address, 456, 0, 1337)
      let user1Nft = await NFT2.tokenOfOwnerByIndex(util.deployer.address, 0)
      let user2Nft = await NFT.tokenOfOwnerByIndex(util.alice.address, 0)
      expect(user1Nft.toNumber()).to.equal(456)
      expect(user2Nft.toNumber()).to.equal(123)
    })

    it('can detect erc1155 vs erc721 vs erc20', async () => {
      expect(await Trade.checkInterface(NFT3.address, '0xd9b67a26')).to.be.true
      expect(await Trade.checkInterface(NFT.address, '0x80ac58cd')).to.be.true
      expect(await Trade.checkInterface(Token.address, '0x74a1476f')).to.be.true
    })

    it('can swap erc721 for erc1155', async () => {
      Trade = util.getTradeV3(Trade.address, util.bob)
      await Trade.acceptOffer(NFT3.address, 1447, 1, 1337)
      let user2Nft = await NFT3.balanceOf(util.alice.address, 1337)
      let user3Nft = await NFT2.balanceOf(util.bob.address)
      let erc20Owner = await NFT2.ownerOf(456)
      expect(user2Nft.toNumber()).to.equal(2)
      expect(user3Nft.toNumber()).to.equal(1)
      expect(erc20Owner).to.equal(util.bob.address)
    })

    it('can swap erc1155 for erc1155', async () => {
      Trade = util.getTradeV3(Trade.address, util.bob)
      await Trade.acceptOffer(NFT3.address, 1447, 0, 1337)
      let user3Nft = await NFT3.balanceOf(util.bob.address, 1337)
      let user4Nft = await NFT3.balanceOf(util.alice.address, 1447)
      expect(user3Nft.toNumber()).to.equal(2)
      expect(user4Nft.toNumber()).to.equal(2)
    })

    it('can swap erc20 for erc721', async () => {
      let balanceOfErc20 = await Token.balanceOf(util.alice.address)
      let ownerOfERC721 = await NFT2.ownerOf(456)
      expect(balanceOfErc20.toNumber()).to.equal(0)
      expect(ownerOfERC721).to.equal(util.alice.address)
      Trade = util.getTradeV3(Trade.address, util.alice)
      await Trade.acceptOffer(NFT2.address, 456, 1, 1337)
      balanceOfErc20 = await Token.balanceOf(util.alice.address)
      ownerOfERC721 = await NFT2.ownerOf(456)
      expect(balanceOfErc20.toNumber()).to.equal(1)
      expect(ownerOfERC721).to.equal(util.deployer.address)
    })

    it('can swap erc20 for erc1155', async () => {
      let balanceOfErc20 = await Token.balanceOf(util.alice.address)
      let balanceOfERC1155 = await NFT3.balanceOf(util.alice.address, 1337)
      expect(balanceOfErc20.toNumber()).to.equal(0)
      expect(balanceOfERC1155).to.equal(2)
      Trade = util.getTradeV3(Trade.address, util.alice)
      await Trade.acceptOffer(NFT3.address, 1337, 0, 1337)
      balanceOfErc20 = await Token.balanceOf(util.alice.address)
      balanceOfERC1155 = await NFT3.balanceOf(util.deployer.address, 1337)
      expect(balanceOfErc20.toNumber()).to.equal(1)
      expect(balanceOfERC1155).to.equal(1)
    })

  })
  describe('NFTradeV3 Percentage', () => {
    it('can calculate percentage of even', async () => {
      let total = await Trade.fromPercent(100, 10)
      expect(total.toNumber(), 10)
    })
    it('can calculate percentage of odd', async () => {
      let total = await Trade.fromPercent(105, 10)
      expect(total.toNumber(), 10)
    })
    it('can calculate 100%', async () => {
      let total = await Trade.fromPercent(105, 100)
      expect(total.toNumber(), 105)
    })
    it('can calculate 0%', async () => {
      let total = await Trade.fromPercent(105, 0)
      expect(total.toNumber(), 0)
    })
    it('can calculate % of single', async () => {
      let total = await Trade.fromPercent(1, 10)
      expect(total.toNumber(), 0)
    })
    it('fails on attempt to calculate negative', async () => {
      let tx = Trade.fromPercent(-105, 10)
      await expect(tx).to.be.reverted
    })
    describe('percentage fee for erc20 offer', async () => {
      beforeEach(async() => {
        await util.handler.transferNftOwnership(NFT.address, util.deployer.address)
        await NFT.mint(util.alice.address, 456, 'a', 0x0)

        await Trade.toggleCanOfferERC20(1337)
        await Trade.toggleTakePercentageOfERC20(1337)
        await Trade.changeOfferPrices(0, 0, 10, 1337)

        await Token.mint(util.bob.address, 10000000000000)
        Token = util.getERC20(Token.address, util.bob)
        await Token.approve(Trade.address, 1000)
        NFT = util.getEmblemVault(NFT.address, util.alice)
        await NFT.setApprovalForAll(Trade.address, true)
        Trade = util.getTradeV3(Trade.address, util.bob)
        await Trade.addOffer(Token.address, 0, NFT.address, 456, 10, 1337)

      })

      it('Percentage fees are paid when percentage fee for erc20 on', async () => {
        let config = await Trade.getConfig(1337)
        let balanceOfErc20 = await Token.balanceOf(util.alice.address)
        let ownerOfERC721 = await NFT.ownerOf(456)
        expect((await Token.balanceOf(config.recipientAddress)).toNumber()).to.equal(0)
        expect(balanceOfErc20.toNumber()).to.equal(0)
        expect(ownerOfERC721).to.equal(util.alice.address)
        Trade = util.getTradeV3(Trade.address, util.alice)
        await Trade.acceptOffer(NFT.address, 456, 0, 1337)
        balanceOfErc20 = await Token.balanceOf(util.alice.address)
        ownerOfERC721 = await NFT.ownerOf(456)
        expect(balanceOfErc20.toNumber()).to.equal(9)
        expect(ownerOfERC721).to.equal(util.bob.address)
        expect((await Token.balanceOf(config.recipientAddress)).toNumber()).to.equal(1)
      })

      it('Percentage fees are not paid when percentage fee for erc20 off', async () => {
        let config = await Trade.getConfig(1337)
        Trade = util.getTradeV3(Trade.address, util.deployer)
        Trade.toggleTakePercentageOfERC20(1337)
        let balanceOfErc20 = await Token.balanceOf(util.alice.address)
        let ownerOfERC721 = await NFT.ownerOf(456)
        expect((await Token.balanceOf(config.recipientAddress)).toNumber()).to.equal(0)
        expect(balanceOfErc20.toNumber()).to.equal(0)
        expect(ownerOfERC721).to.equal(util.alice.address)
        Trade = util.getTradeV3(Trade.address, util.alice)
        await Trade.acceptOffer(NFT.address, 456, 0, 1337)
        balanceOfErc20 = await Token.balanceOf(util.alice.address)
        ownerOfERC721 = await NFT.ownerOf(456)
        expect(balanceOfErc20.toNumber()).to.equal(10)
        expect(ownerOfERC721).to.equal(util.bob.address)
        expect((await Token.balanceOf(config.recipientAddress)).toNumber()).to.equal(0)
      })
    })
  })
})
