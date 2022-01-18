#Emblem Vault

```
Balance
    ✔ should deploy storage
    ✔ storage should be owned by deployer
    ✔ should deploy balance
    ✔ uninitialized storage should reflect current version of zero
    ✔ adding balance by non owner reverts (91ms)
    ✔ uninitialized storage can not add balance (219ms)
    ✔ initialized storage should reflect current version (47ms)
    ✔ promote version should prevent balance from working (131ms)
    ✔ should revert with invalid signature (208ms)
    ✔ initialized storage and valid signature can add single balance (484ms)
    ✔ can add multiple balances (582ms)
    ✔ can hash balances in contract
    ✔ hashed balances in contract matched client hashed balances (89ms)
    ✔ hashed balance object in contract matched client hashed balance object
    ✔ hashed balance object with 10 balances matches (48ms)
    ✔ adding witness by non owner should revert (90ms)
    ✔ owner should be able to add witness (131ms)
    ✔ removing witness by non owner should revert (140ms)
    ✔ owner should be able to remove witness (170ms)
    ✔ signature from witness with used nonce should revert (499ms)
    ✔ should get all tokenIds for nftAddress (739ms)
    ✔ should get single tokenId for nftAddress by index (800ms)
    ✔ should get tokenIds from map (1575ms)
    ✔ should get tokenIds from map by index (1134ms)

  Burn tokens
    ✔ should burn directly via vault contract (176ms)
    ✔ should not claim via handler without permission (160ms)
    ✔ should claim via handler with permission (277ms)
    ✔ should not be able to mint previously claimed vault (278ms)
    ✔ unminted should not return claimed (86ms)
    ✔ burnt via emblem vault should not return claimed (224ms)

  Claimed
    ✔ should deploy storage
    ✔ storage should be owned by deployer
    ✔ should deploy claimed
    ✔ should transfer ownership to deployer
    ✔ uninitialized storage should reflect current version of zero
    ✔ uninitialized claimed can not add to legacy claim (64ms)
    ✔ initialized storage should reflect current version (45ms)
    ✔ initialized storage can add legacy claim (77ms)
    ✔ should not be legacy claimed when legacy claimed root not stored (46ms)
    ✔ should be claimed by ZERO ADDRESS when not minted (41ms)
    ✔ should be claimed by type of "unknown" when not minted (46ms)
    ✔ should be claimed when legacy (73ms)
    ✔ should verify valid merklescript (73ms)
    ✔ should verify valid merkle proof (70ms)
    ✔ should not verify invalid merkle proof (56ms)
    ✔ should verify valid complex merkle proof (59ms)

  Emblem Vault
    ✔ should deploy vault (42ms)
    ✔ should not allow minting if not owned (44ms)
    ✔ should allow minting if owned (162ms)
    ✔ should serialize and hash locally (43ms)
    ✔ should verify signature and hash in handler (162ms)
    ✔ should not be witnessed if signer not a witness (149ms)
    ✔ should be witnessed if signer is a witness (174ms)
    ✔ should get correct address from signature (215ms)
    ✔ should fail to mint with signature if signer is not a witness (234ms)
    ✔ should mint with signature if signer is a witness (424ms)
    ✔ should mint with signed price (692ms)

  ERC1155
    1) should deploy erc1155

  Vault Handler
    ✔ should deploy handler (47ms)
    ✔ should transfer vault ownership to handler (50ms)

  NFT Stake
    ✔ should deploy staking contract
    ✔ should not accept NFT if not initialized (188ms)
    ✔ should accept NFT if initialized (319ms)
    ✔ staking one should record one staked NFT (296ms)
    ✔ staking one should record expected value (309ms)
    ✔ staking two should record two staked NFTs (506ms)
    ✔ staking two should record expected value for each (508ms)
    ✔ un-staking one should reflect correct number of staked NFTs (758ms)
    ✔ un-staking one should reflect correct value for staked NFT (545ms)
    ✔ un-staking one should return to owner (567ms)
    ✔ un-staking two should reflect correct number of staked NFTs (626ms)
    ✔ un-staking two should reflect correct NFT values (623ms)
    ✔ re-staking one should reflect correct number of staked NFTs (741ms)
    ✔ un-staking same nft twice should revert (550ms)
    ✔ staking nft should reflect correct block (489ms)
    ✔ un-staking nft should reflect block 0 (356ms)

    ```
