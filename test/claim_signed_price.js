const { ethers } = require('hardhat');
const { expect } = require('chai');
const Util = require('./util.js');
const Web3 = require('web3');

const util = new Util();

// Signs `hash` with the key baked into util.selectProvider (accounts[0]).
async function sign(web3, hash) {
  const accounts = await web3.eth.getAccounts();
  return web3.eth.sign(hash, accounts[0]);
}

describe('Claim with signed price', () => {
  let web3, emblemAddress, emblemContract;

  let handler;
  let WITNESS; // the address that sign() actually signs with

  beforeEach(async () => {
    // deployHandler() (VaultHandlerV8) is needed for the factory helpers, which
    // wire clones to util.handler. Our signed-price functions live on the
    // upgradeable handler, so we deploy that too and register everything to it.
    await util.deployHandler();
    await util.deployHandlerUpgradable();
    handler = util.handler_upgradable;
    await util.deployBalanceUpgradable();
    await util.deployClaimedUpgradable();
    await util.deployERC721Factory();
    await util.deployERC20Factory();
    await util.deployERC1155Factory();

    web3 = new Web3(util.selectProvider('mainnet'));
    WITNESS = (await web3.eth.getAccounts())[0];

    // Wire up the claim registry, witness, and the ERC721 vault against the
    // upgradeable handler.
    await handler.registerContract(util.claimedUpgradable.address, 6);
    await util.claimedUpgradable.registerContract(handler.address, 3);
    await handler.addWitness(WITNESS);

    emblemAddress = util.emblem.address;
    emblemContract = util.emblem;
    await handler.registerContract(emblemAddress, 2);
    await emblemContract.transferOwnership(handler.address);

    // Send payments to a distinct address (bob) so balance deltas aren't muddied
    // by the deployer paying gas AND receiving the payment.
    await handler.changeRecipient(util.bob.address);
  });

  // Mint tokenId to the deployer and approve the handler to burn it on claim.
  async function mintAndApprove(tokenId) {
    await handler.mint(emblemAddress, util.deployer.address, tokenId, 'test', 0x0, 1);
    await emblemContract.setApprovalForAll(handler.address, true);
  }

  // ethers.solidityKeccak256 matches abi.encodePacked exactly (incl. array packing).
  function claimHash(payment, price, tokenId, nonce) {
    // keccak256(abi.encodePacked(_nftAddress, _payment, _price, msgSender, _tokenId, _nonce))
    return ethers.utils.solidityKeccak256(
      ['address', 'address', 'uint256', 'address', 'uint256', 'uint256'],
      [emblemAddress, payment, price, util.deployer.address, tokenId, nonce]
    );
  }

  function batchHash(nftAddresses, tokenIds, payment, price, nonce) {
    // keccak256(abi.encodePacked(nftAddresses, tokenIds, _payment, _price, msgSender, _nonce))
    return ethers.utils.solidityKeccak256(
      ['address[]', 'uint256[]', 'address', 'uint256', 'address', 'uint256'],
      [nftAddresses, tokenIds, payment, price, util.deployer.address, nonce]
    );
  }

  it('claims with a valid signed ETH price and forwards payment to recipient', async () => {
    await mintAndApprove(1);
    const price = ethers.utils.parseEther('0.01');
    const sig = await sign(web3, claimHash(ethers.constants.AddressZero, price, 1, 111));

    const recipient = await handler.recipientAddress();
    const before = await ethers.provider.getBalance(recipient);

    expect(await util.claimedUpgradable.isClaimed(emblemAddress, 1, [])).to.be.false;
    await handler.claimWithSignedPrice(emblemAddress, 1, ethers.constants.AddressZero, price, 111, sig, { value: price });

    expect(await util.claimedUpgradable.isClaimed(emblemAddress, 1, [])).to.be.true;
    const after = await ethers.provider.getBalance(recipient);
    expect(after.sub(before)).to.equal(price);
  });

  it('claims for free when price is zero', async () => {
    await mintAndApprove(2);
    const sig = await sign(web3, claimHash(ethers.constants.AddressZero, 0, 2, 222));
    await handler.claimWithSignedPrice(emblemAddress, 2, ethers.constants.AddressZero, 0, 222, sig);
    expect(await util.claimedUpgradable.isClaimed(emblemAddress, 2, [])).to.be.true;
  });

  it('reverts if the signer is not a witness', async () => {
    await mintAndApprove(3);
    await handler.removeWitness(WITNESS);
    const price = ethers.utils.parseEther('0.01');
    const sig = await sign(web3, claimHash(ethers.constants.AddressZero, price, 3, 333));
    const tx = handler.claimWithSignedPrice(emblemAddress, 3, ethers.constants.AddressZero, price, 333, sig, { value: price });
    await expect(tx).to.be.revertedWith('Not Witnessed');
  });

  it('reverts when underpaying the signed ETH price', async () => {
    await mintAndApprove(4);
    const price = ethers.utils.parseEther('0.01');
    const sig = await sign(web3, claimHash(ethers.constants.AddressZero, price, 4, 444));
    const tx = handler.claimWithSignedPrice(
      emblemAddress, 4, ethers.constants.AddressZero, price, 444, sig,
      { value: ethers.utils.parseEther('0.009') }
    );
    await expect(tx).to.be.revertedWith('Incorrect ETH amount sent');
  });

  it('reverts on nonce replay', async () => {
    await mintAndApprove(5);
    const price = ethers.utils.parseEther('0.01');
    const sig = await sign(web3, claimHash(ethers.constants.AddressZero, price, 5, 555));
    await handler.claimWithSignedPrice(emblemAddress, 5, ethers.constants.AddressZero, price, 555, sig, { value: price });

    // Mint a fresh token but reuse the same nonce — must reject.
    await handler.mint(emblemAddress, util.deployer.address, 6, 'test', 0x0, 1);
    const sig2 = await sign(web3, claimHash(ethers.constants.AddressZero, price, 6, 555));
    const tx = handler.claimWithSignedPrice(emblemAddress, 6, ethers.constants.AddressZero, price, 555, sig2, { value: price });
    await expect(tx).to.be.revertedWith('Nonce already used');
  });

  it('batch claims multiple tokens with a single signed price', async () => {
    await mintAndApprove(10);
    await handler.mint(emblemAddress, util.deployer.address, 11, 'test', 0x0, 1);

    const price = ethers.utils.parseEther('0.02');
    const nftAddresses = [emblemAddress, emblemAddress];
    const tokenIds = [10, 11];
    const sig = await sign(web3, batchHash(nftAddresses, tokenIds, ethers.constants.AddressZero, price, 777));

    const recipient = await handler.recipientAddress();
    const before = await ethers.provider.getBalance(recipient);

    await handler.batchClaimWithSignedPrice(nftAddresses, tokenIds, ethers.constants.AddressZero, price, 777, sig, { value: price });

    expect(await util.claimedUpgradable.isClaimed(emblemAddress, 10, [])).to.be.true;
    expect(await util.claimedUpgradable.isClaimed(emblemAddress, 11, [])).to.be.true;
    const after = await ethers.provider.getBalance(recipient);
    expect(after.sub(before)).to.equal(price);
  });

  it('batch claim reverts on array length mismatch', async () => {
    await mintAndApprove(12);
    const price = 0;
    const nftAddresses = [emblemAddress, emblemAddress];
    const tokenIds = [12];
    const sig = await sign(web3, batchHash(nftAddresses, tokenIds, ethers.constants.AddressZero, price, 888));
    const tx = handler.batchClaimWithSignedPrice(nftAddresses, tokenIds, ethers.constants.AddressZero, price, 888, sig);
    await expect(tx).to.be.revertedWith('LEN');
  });

  it('retired free claim(address,uint256) reverts with guidance', async () => {
    await mintAndApprove(20);
    // Selector is preserved so legacy callers get a clear revert, not a silent failure.
    const tx = handler['claim(address,uint256)'](emblemAddress, 20);
    await expect(tx).to.be.revertedWith('Use claimWithSignedPrice');
  });
});
