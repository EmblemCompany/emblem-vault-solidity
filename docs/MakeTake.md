MakeTake Contract – Owner‑configured Make/Take swaps (ERC20/721/1155)

- Purpose: Create visible swap pairs that let users trade a “cost” asset they own for an “ask” asset the contract holds. Works across ERC20, ERC721, and ERC1155. Includes EIP‑2612 permit path for ERC20 and rescue functions for safety.

Key Concepts
- Asset: `{contractAddress, tokenId, interfaceId}`. Interface is detected via IERC165 (ERC1155/721) and defaults to ERC20.
- Inventory: `{assetId, amount, type}` keyed by `keccak256(asset, tokenId, amount)`.
- Pair: `{askInventoryId, costInventoryId, visible}` keyed by `keccak256(askAddress, askTokenId, costAddress, costTokenId)`.

Core Contracts
- `contracts/MakeTake.sol` – The swapper implementation (Clonable, OwnableUpgradeable, ReentrancyGuardUpgradable).
- `contracts/MakeTakeFactory.sol` – Minimal factory using OZ Clones to deploy clones of `MakeTake`.

Deploying and Cloning
- Deploy `MakeTakeFactory` and call `initialize()`.
- Create a clone for an owner: `createClone(newOwner)` or for a specific implementation index: `createCloneAtVersion(newOwner, versionIndex)`.
- Each clone runs `initialize()` (sets Ownable + ReentrancyGuard) and is owned by `newOwner`.

Owner Workflow (Make / Unmake)
- Make(askAddress, askTokenId, askAmount, costAddress, costTokenId, costAmount, returnable, visible)
  - Registers both inventories and the forward pair. If `returnable` is true, also creates the reverse pair.
  - Emits `Made(pairId, askInv, costInv, returnable, visible)` for each created pair.
  - The contract must actually hold the ask asset in the specified amount before users can Take.

- setPairVisible(pairId, visible)
  - Toggle pair visibility without deleting it. `Take` enforces visibility.

- Unmake(askAddress, askTokenId, costAddress, costTokenId, returnable)
  - Removes the forward pair and, if `returnable`, also removes the reverse pair.
  - Uses pop/replace array removals and cleans up orphaned inventories/assets.
  - Emits `Unmade(pairId)` for each removed pair.

User Workflow (Take)
- Take(askAddress, askTokenId, askAmount, costAddress, costTokenId, costAmount)
  - Requires an existing visible pair matching these addresses/tokenIds and amounts.
  - Validates that the contract holds the ask amount, and the user holds and has approved the cost amount.
  - Transfers ask from contract → user, and cost from user → contract atomically.
  - Emits `Taken(pairId, taker, askAmount, costAmount)`.

- TakeWithPermit(..., permitDeadline, v, r, s)
  - Same as `Take`, but first calls EIP‑2612 `permit` if the cost asset is ERC20 supporting `permit`, so the user can approve in the same transaction.

Read Helpers
- GetPairByAddresses(askAddress, askTokenId, costAddress, costTokenId) → `(pairId, exists, visible)`
  - Resolve a pair and its visibility without computing the id off‑chain.
  
- GetPairIds(), GetAssetIds(), GetInventoryIds()
  - Enumerate current configuration ids.

Rescue Functions (Owner)
- rescueERC20(token, to, amount)
- rescueERC721(token, tokenId, to)
- rescueERC1155(token, id, amount, to)
- rescueETH(to, amount)

Events
- Made(pairId, askInventoryId, costInventoryId, returnable, visible)
- Unmade(pairId)
- Taken(pairId, taker, askAmount, costAmount)
- PairVisibilitySet(pairId, visible)

Integrating as a dapp
- ABI and address
  - Use the ABI for `MakeTake` and the deployed clone’s address. If you manage deployment, get the clone address from `MakeTakeFactory` after `createClone`.

- Example (ethers.js)
  - const mm = new ethers.Contract(cloneAddress, MakeTakeABI, signer)
  - Owner: await mm.Make(ask, askId, askAmt, cost, costId, costAmt, true, true)
  - User (standard approval):
    - For ERC20: await erc20.approve(cloneAddress, costAmt); await mm.Take(ask, askId, askAmt, cost, costId, costAmt)
    - For ERC721: setApprovalForAll(cloneAddress, true); await mm.Take(...)
    - For ERC1155: setApprovalForAll(cloneAddress, true); await mm.Take(...)
  - User (ERC20 with permit): await mm.TakeWithPermit(ask, askId, askAmt, cost, costId, costAmt, deadline, v, r, s)
  - Toggle visibility: await mm.setPairVisible(pairId, false)
  - Remove pair: await mm.Unmake(ask, askId, cost, costId, true)

Operational Notes
- Visibility: `Take` requires `pairUsed[pairId]` and `pair[pairId].visible`.
- Amount validation: `Take` ensures the amounts match the configured inventories (prevents mis‑routed calls).
- Non‑standard ERC721: If `safeTransferFrom` fails, falls back to `transferFrom` (for older/non‑standard implementations).
- Gas: Arrays use pop/replace to keep removals O(1) average; enumeration order is not preserved.
- Security: ReentrancyGuard protects `Take`. Use `rescue*` functions for mistakenly sent assets.

Upgrades and Versions
- `MakeTake` implements `Clonable` and returns `version() = 2`.
- `MakeTakeFactory` can pin new implementations through your standard `ClonableFactory.updateImplementation()` flow.

Testing Checklist
- After Make: the pair exists, is visible, and the contract holds the ask amount.
- Taking with ERC20: allowance or permit succeeds, balances move as expected, event emitted.
- Taking with ERC721/1155: approvals set, ownership/balance transfers correctly, event emitted.
- Unmake: pair removed, inventories/assets cleaned up if no longer referenced.

