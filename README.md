# Emblem Vault Solidity Test Suite Results

## Balance
- <span style="color:green">✔</span> should deploy storage
- <span style="color:green">✔</span> storage should be owned by deployer
- <span style="color:green">✔</span> should deploy balance
- <span style="color:green">✔</span> uninitialized storage should reflect current version of zero
- <span style="color:green">✔</span> adding balance by non owner reverts (91ms)
- <span style="color:green">✔</span> uninitialized storage can not add balance (219ms)
- <span style="color:green">✔</span> initialized storage should reflect current version (47ms)
- <span style="color:green">✔</span> promote version should prevent balance from working (131ms)
- <span style="color:green">✔</span> should revert with invalid signature (208ms)
- <span style="color:green">✔</span> initialized storage and valid signature can add single balance (484ms)
- <span style="color:green">✔</span> can add multiple balances (582ms)
- <span style="color:green">✔</span> can hash balances in contract
- <span style="color:green">✔</span> hashed balances in contract matched client hashed balances (89ms)
- <span style="color:green">✔</span> hashed balance object in contract matched client hashed balance object
- <span style="color:green">✔</span> hashed balance object with 10 balances matches (48ms)
- <span style="color:green">✔</span> adding witness by non owner should revert (90ms)
- <span style="color:green">✔</span> owner should be able to add witness (131ms)
- <span style="color:green">✔</span> removing witness by non owner should revert (140ms)
- <span style="color:green">✔</span> owner should be able to remove witness (170ms)
- <span style="color:green">✔</span> signature from witness with used nonce should revert (499ms)
- <span style="color:green">✔</span> should get all tokenIds for nftAddress (739ms)
- <span style="color:green">✔</span> should get single tokenId for nftAddress by index (800ms)
- <span style="color:green">✔</span> should get tokenIds from map (1575ms)
- <span style="color:green">✔</span> should get tokenIds from map by index (1134ms)
## Burn tokens
- <span style="color:green">✔</span> should burn directly via vault contract (176ms)
- <span style="color:green">✔</span> should not claim via handler without permission (160ms)
- <span style="color:green">✔</span> should claim via handler with permission (277ms)
- <span style="color:green">✔</span> should not be able to mint previously claimed vault (278ms)
- <span style="color:green">✔</span> unminted should not return claimed (86ms)
- <span style="color:green">✔</span> burnt via emblem vault should not return claimed (224ms)

## Claimed
- <span style="color:green">✔</span> should deploy storage
- <span style="color:green">✔</span> storage should be owned by deployer
- <span style="color:green">✔</span> should deploy claimed
- <span style="color:green">✔</span> should transfer ownership to deployer
- <span style="color:green">✔</span> uninitialized storage should reflect current version of zero
- <span style="color:green">✔</span> uninitialized claimed can not add to legacy claim (64ms)
- <span style="color:green">✔</span> initialized storage should reflect current version (45ms)
- <span style="color:green">✔</span> initialized storage can add legacy claim (77ms)
- <span style="color:green">✔</span> should not be legacy claimed when legacy claimed root not stored (46ms)
- <span style="color:green">✔</span> should be claimed by ZERO ADDRESS when not minted (41ms)
- <span style="color:green">✔</span> should be claimed by type of "unknown" when not minted (46ms)
- <span style="color:green">✔</span> should be claimed when legacy (73ms)
- <span style="color:green">✔</span> should verify valid merklescript (73ms)
- <span style="color:green">✔</span> should verify valid merkle proof (70ms)
- <span style="color:green">✔</span> should not verify invalid merkle proof (56ms)
- <span style="color:green">✔</span> should verify valid complex merkle proof (59ms)

## Emblem Vault
- <span style="color:green">✔</span> should deploy vault (42ms)
- <span style="color:green">✔</span> should not allow minting if not owned (44ms)
- <span style="color:green">✔</span> should allow minting if owned (162ms)
- <span style="color:green">✔</span> should serialize and hash locally (43ms)
- <span style="color:green">✔</span> should verify signature and hash in handler (162ms)
- <span style="color:green">✔</span> should not be witnessed if signer not a witness (149ms)
- <span style="color:green">✔</span> should be witnessed if signer is a witness (174ms)
- <span style="color:green">✔</span> should get correct address from signature (215ms)
- <span style="color:green">✔</span> should fail to mint with signature if signer is not a witness (234ms)
- <span style="color:green">✔</span> should mint with signature if signer is a witness (424ms)
- <span style="color:green">✔</span> should mint with signed price (692ms)

## Vault Handler
- <span style="color:green">✔</span> should deploy handler (47ms)
- <span style="color:green">✔</span> should transfer vault ownership to handler (50ms)

## NFT Stake
- <span style="color:green">✔</span> should deploy staking contract
- <span style="color:green">✔</span> should not accept NFT if not initialized (188ms)
- <span style="color:green">✔</span> should accept NFT if initialized (319ms)
- <span style="color:green">✔</span> staking one should record one staked NFT (296ms)
- <span style="color:green">✔</span> staking one should record expected value (309ms)
- <span style="color:green">✔</span> staking two should record two staked NFTs (506ms)
- <span style="color:green">✔</span> staking two should record expected value for each (508ms)
- <span style="color:green">✔</span> un-staking one should reflect correct number of staked NFTs (758ms)
- <span style="color:green">✔</span> un-staking one should reflect correct value for staked NFT (545ms)
- <span style="color:green">✔</span> un-staking one should return to owner (567ms)
- <span style="color:green">✔</span> un-staking two should reflect correct number of staked NFTs (626ms)
- <span style="color:green">✔</span> un-staking two should reflect correct NFT values (623ms)
- <span style="color:green">✔</span> re-staking one should reflect correct number of staked NFTs (741ms)
- <span style="color:green">✔</span> un-staking same nft twice should revert (550ms)
- <span style="color:green">✔</span> staking nft should reflect correct block (489ms)
- <span style="color:green"><span style="color:green">✔</span></span> un-staking nft should reflect block 0 (356ms)
