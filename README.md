# Emblem Vault Solidity Test Suite Results

- <span style="color:green">- <span style="color:green">✔</span></span>

  Balance
    - <span style="color:green">✔</span> should deploy storage
    - <span style="color:green">✔</span> storage should be owned by deployer
    - <span style="color:green">✔</span> should deploy balance
    - <span style="color:green">✔</span> uninitialized storage should reflect current version of zero (48ms)
    - <span style="color:green">✔</span> adding balance by non owner reverts (114ms)
    - <span style="color:green">✔</span> uninitialized storage can not add balance (220ms)
    - <span style="color:green">✔</span> initialized storage should reflect current version (52ms)
    - <span style="color:green">✔</span> promote version should prevent balance from working (146ms)
    - <span style="color:green">✔</span> should revert with invalid signature (213ms)
    - <span style="color:green">✔</span> initialized storage and valid signature can add single balance (538ms)
    - <span style="color:green">✔</span> can add multiple balances (646ms)
    - <span style="color:green">✔</span> can hash balances in contract
    - <span style="color:green">✔</span> hashed balances in contract matched client hashed balances
    - <span style="color:green">✔</span> hashed balance object in contract matched client hashed balance object
    - <span style="color:green">✔</span> hashed balance object with 10 balances matches (49ms)
    - <span style="color:green">✔</span> adding witness by non owner should revert (114ms)
    - <span style="color:green">✔</span> owner should be able to add witness (153ms)
    - <span style="color:green">✔</span> removing witness by non owner should revert (151ms)
    - <span style="color:green">✔</span> owner should be able to remove witness (210ms)
    - <span style="color:green">✔</span> signature from witness with used nonce should revert (502ms)
    - <span style="color:green">✔</span> should get all tokenIds for nftAddress (769ms)
    - <span style="color:green">✔</span> should get single tokenId for nftAddress by index (1163ms)
    - <span style="color:green">✔</span> should get tokenIds from map (1069ms)
    - <span style="color:green">✔</span> should get tokenIds from map by index (1349ms)

  Burn tokens
    - <span style="color:green">✔</span> should burn directly via vault contract (199ms)
    - <span style="color:green">✔</span> should not claim via handler without permission (176ms)
    - <span style="color:green">✔</span> should claim via handler with permission (318ms)
    - <span style="color:green">✔</span> should not be able to mint previously claimed vault (265ms)
    - <span style="color:green">✔</span> unminted should not return claimed (106ms)
    - <span style="color:green">✔</span> burnt via emblem vault should not return claimed (266ms)

  Claimed
    - <span style="color:green">✔</span> should deploy storage
    - <span style="color:green">✔</span> storage should be owned by deployer
    - <span style="color:green">✔</span> should deploy claimed
    - <span style="color:green">✔</span> should transfer ownership to deployer (55ms)
    - <span style="color:green">✔</span> uninitialized storage should reflect current version of zero (40ms)
    - <span style="color:green">✔</span> uninitialized claimed can not add to legacy claim (94ms)
    - <span style="color:green">✔</span> initialized storage should reflect current version (54ms)
    - <span style="color:green">✔</span> initialized storage can add legacy claim (362ms)
    - <span style="color:green">✔</span> should not be legacy claimed when legacy claimed root not stored (57ms)
    - <span style="color:green">✔</span> should be claimed by ZERO ADDRESS when not minted (48ms)
    - <span style="color:green">✔</span> should be claimed by type of "unknown" when not minted (49ms)
    - <span style="color:green">✔</span> should be claimed when legacy (328ms)
    - <span style="color:green">✔</span> should verify valid merklescript (79ms)
    - <span style="color:green">✔</span> should verify valid merkle proof (80ms)
    - <span style="color:green">✔</span> should not verify invalid merkle proof (77ms)
    - <span style="color:green">✔</span> should verify valid complex merkle proof (81ms)

  Emblem Vault
    - <span style="color:green">✔</span> should deploy vault (57ms)
    - <span style="color:green">✔</span> should not allow minting if not owned (58ms)
    - <span style="color:green">✔</span> should allow minting if owned (161ms)
    - <span style="color:green">✔</span> should serialize and hash locally (58ms)
    - <span style="color:green">✔</span> should verify signature and hash in handler (187ms)
    - <span style="color:green">✔</span> should not be witnessed if signer not a witness (187ms)
    - <span style="color:green">✔</span> should be witnessed if signer is a witness (223ms)
    - <span style="color:green">✔</span> should get correct address from signature (197ms)
    - <span style="color:green">✔</span> should fail to mint with signature if signer is not a witness (510ms)
    - <span style="color:green">✔</span> should mint with signature if signer is a witness (445ms)
    - <span style="color:green">✔</span> should mint with signed price (499ms)

  Vault Handler
    - <span style="color:green">✔</span> should deploy handler (58ms)
    - <span style="color:green">✔</span> should transfer vault ownership to handler (66ms)

  NFTradeV2 NFT
    - <span style="color:green">✔</span> has correct name
    - <span style="color:green">✔</span> can mint (186ms)
    - <span style="color:green">✔</span> users have expected balances (644ms)

  NFTradeV2 Trade
    - <span style="color:green">✔</span> reflects correct version
    - <span style="color:green">✔</span> cannot place offer without approval
    - <span style="color:green">✔</span> cannot offer un-owned token
    - <span style="color:green">✔</span> can place offer after approval (54ms)
    - <span style="color:green">✔</span> cannot add erc20 token offer when canOfferERC20 off (44ms)
    - <span style="color:green">✔</span> cannot add erc20 token offer before allowance
    - can place offer against erc20
    - <span style="color:green">✔</span> can add erc20 token offer after allowance (88ms)
    - <span style="color:green">✔</span> can withdraw offer (128ms)
    - <span style="color:green">✔</span> rejecting another users offer fails (48ms)
    - <span style="color:green">✔</span> can reject offer (606ms)
    - <span style="color:green">✔</span> cannot accept offer without approval (59ms)
    - <span style="color:green">✔</span> cannot accept erc20 offer without approval (111ms)
    - <span style="color:green">✔</span> can accept erc20 offer with approval (507ms)
    - <span style="color:green">✔</span> can withdraw erc20 offer (114ms)
    - <span style="color:green">✔</span> can reject erc20 offer (159ms)
    - <span style="color:green">✔</span> can accept offer after approval (542ms)
    - <span style="color:green">✔</span> cannot accept offer for un-owned nft (62ms)
    - <span style="color:green">✔</span> accepting offer removes all other offers (557ms)
    - <span style="color:green">✔</span> can get outstanding offers placed (111ms)
    - <span style="color:green">✔</span> can get accepted offer for nft  (752ms)
    - <span style="color:green">✔</span> accepting offer removes all outstanding offers for nft (1038ms)

  NFTradeV2 Payment
    - <span style="color:green">✔</span> reflects correct token balances before trades
    - <span style="color:green">✔</span> toggles pay to make and accept offers
    - <span style="color:green">✔</span> can charge separate prices to make and accept offers
    Pay to make offer
      - <span style="color:green">✔</span> fails to add offer if trade contract not approved to spend
      - <span style="color:green">✔</span> fails to add offer if too broke (68ms)
      - <span style="color:green">✔</span> can make offer (248ms)
      - <span style="color:green">✔</span> bank receives fee
    Pay to accept offer
      - <span style="color:green">✔</span> fails to accept offer if trade contract not approved to spend
      - <span style="color:green">✔</span> fails to accept offer if too broke (66ms)
      - <span style="color:green">✔</span> can accept offer (529ms)
      - <span style="color:green">✔</span> bank receives fee (871ms)

  NFTradeV2 Trade Types
    - <span style="color:green">✔</span> 2 separate nft contracts exist
    - <span style="color:green">✔</span> users have correct balances of nfts before trades
    - <span style="color:green">✔</span> can swap erc721 for erc721 (422ms)
    - <span style="color:green">✔</span> can detect erc1155 vs erc721 vs erc20
    1) can swap erc721 for erc1155
    2) can swap erc1155 for erc1155
    - <span style="color:green">✔</span> can swap erc20 for erc721 (360ms)
    - <span style="color:green">✔</span> can swap erc20 for erc1155 (361ms)

  NFTradeV2 Percentage
    - <span style="color:green">✔</span> can calculate percentage of even
    - <span style="color:green">✔</span> can calculate percentage of odd
    - <span style="color:green">✔</span> can calculate 100%
    - <span style="color:green">✔</span> can calculate 1000%
    - <span style="color:green">✔</span> can calculate 0%
    - <span style="color:green">✔</span> can calculate % of single
    3) fails on attempt to calculate negative
    percentage fee for erc20 offer
      4) "before each" hook for "Percentage fees are paid when percentage fee for erc20 on"

  NFT Stake
    - <span style="color:green">✔</span> should deploy staking contract
    - <span style="color:green">✔</span> should not accept NFT if not initialized (227ms)
    - <span style="color:green">✔</span> should accept NFT if initialized (335ms)
    - <span style="color:green">✔</span> staking one should record one staked NFT (356ms)
    - <span style="color:green">✔</span> staking one should record expected value (350ms)
    - <span style="color:green">✔</span> staking two should record two staked NFTs (569ms)
    - <span style="color:green">✔</span> staking two should record expected value for each (998ms)
    - <span style="color:green">✔</span> un-staking one should reflect correct number of staked NFTs (681ms)
    - <span style="color:green">✔</span> un-staking one should reflect correct value for staked NFT (606ms)
    - <span style="color:green">✔</span> un-staking one should return to owner (625ms)
    - <span style="color:green">✔</span> un-staking two should reflect correct number of staked NFTs (694ms)
    - <span style="color:green">✔</span> un-staking two should reflect correct NFT values (1768ms)
    - <span style="color:green">✔</span> re-staking one should reflect correct number of staked NFTs (811ms)
    - <span style="color:green">✔</span> un-staking same nft twice should revert (587ms)
    - <span style="color:green">✔</span> staking nft should reflect correct block (338ms)
    - <span style="color:green">✔</span> un-staking nft should reflect block 0 (412ms)


  122 passing (3m)
  1 pending
  4 failing

  1) NFTradeV2 Trade Types
       can swap erc721 for erc1155:
     Error: VM Exception while processing transaction: reverted with reason string '005007'
    at EmblemVault.validNFToken (contracts/EmblemVault.sol:494)
    at runMicrotasks (<anonymous>)
    at proces
