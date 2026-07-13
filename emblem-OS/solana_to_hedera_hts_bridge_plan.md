# Solana → Hedera (HTS) Bridge Plan (Upgradeable, MetaMask Admin, Rotatable Relayer)

**Goal:** Bridge an asset from **Solana → Hedera** by minting a **native Hedera HTS fungible token** on Hedera after a Solana-side deposit/burn is verified off-chain.  
**Core design choices (locked):**
- The Hedera asset is an **HTS fungible token**.
- The **bridge contract is the HTS token treasury**.
- The **bridge contract is upgradeable** (OpenZeppelin UUPS).
- **Mint/Burn/Pause** authority is held by the **bridge contract** via HTS token keys.
- A **rotatable relayer bot EOA** calls `finalizeSolanaDeposit(...)` (a.k.a. “release”) automatically.
- An **admin MetaMask EOA** manages pause + relayer allowlist + upgrades.

---

## 1) Architecture Overview

### 1.1 Actors
- **Admin EOA (MetaMask)**: owns the bridge contract; can pause/unpause, rotate relayers, upgrade implementation.
- **Relayer Bot EOA**: watches Solana; calls `finalizeSolanaDeposit(...)` on Hedera.
- **Users**: deposit on Solana and receive HTS tokens on Hedera.

### 1.2 On-chain components
- **Solana program** (your choice): emits a deposit/burn event with (amount, destination, nonce, etc.).
- **Hedera EVM Bridge Contract (Upgradeable Proxy)**:
  - Calls HTS system contract (precompile) to **mint HTS** and **transfer HTS**.
  - Maintains replay protection for Solana deposits.
  - Maintains relayer allowlist.
  - Pauses bridging (and can also pause the underlying HTS token).
- **HTS Token (fungible)**:
  - **Treasury**: the bridge **proxy address**.
  - **Supply key**: contract key pointing to bridge **proxy address**.
  - **Pause key**: contract key pointing to bridge **proxy address**.

### 1.3 Critical Hedera invariants
- **Minting credits the token treasury**. Therefore, the bridge flow is:
  1) `mint` → minted units credited to treasury
  2) `transfer` → treasury sends to recipient  
  When the **bridge proxy is the treasury**, the contract can mint and then immediately transfer in one transaction.

- **Upgradeable proxy address matters**:
  - Token treasury and token keys must be assigned to the **proxy address** (not the implementation address).
  - Reason: the proxy is the address that actually holds token balance and makes calls to HTS.

---

## 2) Repo Layout (Recommended)

```
/bridge-hedera
  /contracts
    /hedera               # vendored hedera-smart-contracts HTS Solidity libs
      IHederaTokenService.sol
      HederaTokenService.sol
      HederaResponseCodes.sol
    SolanaToHederaBridgeUpgradeable.sol
  /scripts
    deploy-bridge.ts
    upgrade-bridge.ts
    create-hts-token.ts
    set-token-on-bridge.ts
  /relayer
    solana-watcher.ts
    hedera-sender.ts
    types.ts
  /app-next
    /src
      /app
        /admin            # MetaMask admin UI
        /bridge           # user UI
      /lib
        hedera.ts         # ethers provider + helpers
        bridgeAbi.ts
        tokenHelpers.ts
  hardhat.config.ts
  .env.example
  README.md
```

---

## 3) Tooling & Dependencies

### 3.1 Contracts / deployment
- Hardhat
- Ethers
- OpenZeppelin:
  - `@openzeppelin/contracts`
  - `@openzeppelin/contracts-upgradeable`
  - `@openzeppelin/hardhat-upgrades`

### 3.2 Hedera HTS Solidity libraries
Vendor the official Hedera HTS Solidity wrappers (from `hashgraph/hedera-smart-contracts`):
- `IHederaTokenService.sol`
- `HederaTokenService.sol`
- `HederaResponseCodes.sol`

### 3.3 Token creation (one-time)
- Node.js script using `@hashgraph/sdk` (Hedera JS SDK) to create the HTS token with treasury+keys set correctly.

### 3.4 Relayer
- Node.js / TypeScript
- Solana client libraries (e.g., `@solana/web3.js`)
- Ethers for Hedera EVM tx

---

## 4) Network Config

### 4.1 Hedera RPC (for MetaMask + Ethers)
- Testnet RPC: `https://testnet.hashio.io/api` (chainId 296)
- Mainnet RPC: `https://mainnet.hashio.io/api` (chainId 295)

### 4.2 Explorer
- Hashscan for transaction inspection.

---

## 5) Smart Contract Spec (Upgradeable UUPS)

### 5.1 Storage
- `address public token;` (Solidity “token address” form used by HTS wrappers)
- `mapping(address => bool) public relayer;`
- `mapping(bytes32 => bool) public usedDepositId;`
- OZ upgradeable state (OwnableUpgradeable, PausableUpgradeable, etc.)

### 5.2 Roles / access
- `onlyOwner`:
  - `pauseBridge()` / `unpauseBridge()`
  - `setRelayer(address,bool)`
  - `_authorizeUpgrade(address)`
  - optional: `setToken(address)` (only if you want it mutable)
- `onlyRelayer`:
  - `finalizeSolanaDeposit(...)`

### 5.3 Replay protection
- `depositId` is a `bytes32` derived from the Solana event (tx hash, log index, nonce, recipient, amount, chainId, etc.).
- Contract checks `usedDepositId[depositId] == false` then sets it `true`.

### 5.4 Bridging function
Name it something explicit (avoid “wrapped token release” wording):

`finalizeSolanaDeposit(bytes32 depositId, address recipient, uint64 amount, bytes32 solanaTxHash)`

Internal steps:
1) Verify relayer and not paused.
2) Verify `depositId` unused.
3) Mint `amount` via HTS (`mintToken`).
4) Transfer from `address(this)` (treasury) to `recipient` via HTS (`transferToken`).
5) Emit event.

### 5.5 Pause behavior
Recommended dual pause:
- **Contract-level** pause: prevents `finalizeSolanaDeposit` being callable.
- **HTS token-level** pause: prevents token movement if compromised systems try to move it.
  - `pauseBridge()` calls HTS `pauseToken(token)` then `_pause()`.
  - `unpauseBridge()` calls HTS `unpauseToken(token)` then `_unpause()`.

### 5.6 Events
- `event DepositFinalized(bytes32 indexed depositId, address indexed recipient, uint256 amount, bytes32 solanaTxHash);`
- `event RelayerSet(address indexed relayer, bool allowed);`
- `event TokenSet(address indexed token);`

### 5.7 Reentrancy
- Use `ReentrancyGuardUpgradeable` on `finalizeSolanaDeposit`.

---

## 6) Solidity Contract Implementation (UUPS Skeleton)

Create `contracts/SolanaToHederaBridgeUpgradeable.sol`:

- Inherit:
  - `Initializable`
  - `UUPSUpgradeable`
  - `OwnableUpgradeable`
  - `PausableUpgradeable`
  - `ReentrancyGuardUpgradeable`
  - `HederaTokenService`

- Constructor disables initializers.

- `initialize(tokenAddress, initialOwner, initialRelayer)` sets storage and roles.

**Important:** Use `address(this)` as treasury for transfers since the proxy address is the treasury.

---

## 7) HTS Token Creation Plan (One-time, via Hedera JS SDK)

### 7.1 Sequence
1) **Deploy bridge proxy** first (so you know proxy address).
2) **Create HTS token** with:
   - `treasuryAccountId` = proxy-as-account/contract treasury (SDK supports contract treasury)
   - `supplyKey` = contract key pointing to **proxy**
   - `pauseKey` = contract key pointing to **proxy**
   - `decimals` = choose (e.g., match Solana asset decimals)
   - `initialSupply` = 0 (typical for bridges)
   - supply type: infinite or finite (choose; most bridges use infinite with off-chain controls, or finite if you need hard cap)
3) Convert returned `tokenId (0.0.x)` → **Solidity address form** for your contract calls (Hedera tooling can provide this conversion).
4) Call `setToken(solidityTokenAddress)` on the bridge proxy if you deployed with placeholder.

### 7.2 Why proxy must be treasury + key target
- Mint always credits treasury.
- Contract-key authorization for mint/pause is evaluated against the calling contract address.
- With upgradeability, **proxy** is the stable address, implementation changes.

### 7.3 Script: `scripts/create-hts-token.ts`
This script should:
- Read operator credentials (payer) from env.
- Read bridge proxy address (or ContractId) from env.
- Construct token create tx with treasury = proxy and keys = proxy (contract keys).
- Output:
  - `TOKEN_ID` (0.0.x)
  - `TOKEN_SOLIDITY_ADDRESS` (0x...)
- Write results to `./artifacts/token.json` for the app + relayer.

---

## 8) Deployment & Upgrade Plan

### 8.1 Deploy (testnet)
1) `hardhat run scripts/deploy-bridge.ts --network hedera_testnet`
   - Deploy UUPS proxy.
   - Output proxy address.
2) Run `create-hts-token.ts` with proxy address as treasury + key target.
3) Call `setTokenOnBridge.ts` to set the token in bridge contract (if needed).
4) Verify:
   - HTS token treasury = proxy address
   - HTS token keys = proxy contract key
5) In MetaMask admin UI, add relayer and test pause/unpause.

### 8.2 Upgrade (UUPS)
- `upgrade-bridge.ts` uses `upgrades.upgradeProxy(proxyAddress, NewImplFactory)`.
- Contract must implement `_authorizeUpgrade` with `onlyOwner`.
- Maintain storage layout discipline (append-only new vars).

---

## 9) Relayer Bot (Rotatable EOA)

### 9.1 Responsibilities
- Watch Solana program logs for deposit/burn events.
- Wait for finality threshold.
- Compute canonical `depositId`.
- Send Hedera tx to `finalizeSolanaDeposit(...)`.

### 9.2 Deposit ID scheme (deterministic)
Define one canonical hash format and do not change it lightly:

Example (pseudo):
```
depositId = keccak256(
  abi.encodePacked(
    "solana->hedera",
    solanaTxHash,
    logIndex,
    amount,
    recipientEvmAddress,
    solanaMintOrAssetId,
    sourceChainId
  )
)
```

### 9.3 Idempotency
- If the bot retries the same deposit, the contract rejects because `usedDepositId[depositId] == true`.
- Bot should treat “already used” as success.

### 9.4 Rotation
- Admin uses MetaMask to call `setRelayer(newBot,true)` then `setRelayer(oldBot,false)`.
- No token key rotation required because keys are bound to the contract/proxy.

### 9.5 Operational safeguards
- Rate limits on finalize calls.
- Monitoring: alert on revert reasons, HTS response codes, unusual volumes.
- Hot key security: store relayer key in secret manager/HSM if possible.

---

## 10) Next.js App

### 10.1 Admin UI (MetaMask)
Admin actions:
- Pause/unpause (calls `pauseBridge`/`unpauseBridge`).
- Rotate relayers (calls `setRelayer`).
- (Optional) upgrade trigger (usually done via ops scripts rather than UI).

### 10.2 User UI
User flow:
1) Show Solana deposit instruction (connect Phantom, etc.).
2) Show Hedera recipient address (EVM address / MetaMask).
3) **Token association requirement**: user may need to associate HTS token before receiving.
   - Provide “Associate token” CTA if your UX can support it.
4) Show deposit status and Hedera receipt after relayer finalizes.

### 10.3 Token association handling (important)
Hedera recipients often must associate a token before they can receive it.

You have two implementation options:

**Option A (simple UX requirement):**
- Require user to associate before bridging.
- If finalize fails due to association, relayer retries later after user associates.
- Contract leaves `usedDepositId` unset until success (meaning you only mark used after mint+transfer succeed).

**Option B (best UX / more code): “Mint-now, claim-later”**
- On finalize:
  - mint to treasury
  - store `claimable[depositId] = {recipient, amount}`
  - emit `DepositFinalizedPendingClaim`
- User associates, then calls `claim(depositId)`:
  - transfer treasury → recipient
  - mark claimed
This avoids blocking finality on user association but introduces custody of claimables.

Pick one and implement consistently.

---

## 11) Testing Plan

### 11.1 Unit tests (Hardhat)
- `onlyRelayer` enforced
- replay protection (`depositId` cannot be reused)
- pause blocks finalize
- pause triggers HTS token pause (verify response code success)
- transfer uses `address(this)` as source
- upgrade tests:
  - deploy proxy → upgrade implementation → state preserved

### 11.2 Integration tests (Hedera testnet)
- Deploy proxy
- Create HTS token with treasury+keys set to proxy
- Run relayer to finalize a sample deposit
- Confirm:
  - token supply increased
  - treasury balance increments then decrements after transfer
  - recipient receives balance
- Confirm pausing prevents transfers/mints as expected.

---

## 12) Security Checklist (Minimum)

- **Relayer allowlist**: only allow trusted bots.
- **Replay protection**: strong depositId derivation.
- **Limits**: per tx and per day caps to limit blast radius.
- **Pause**: both contract and HTS pause.
- **Owner**: use multisig if possible for upgrade + pause.
- **Upgrade discipline**: storage layout, audit upgrade diffs.
- **Logging**: event emissions for every finalize + relayer set + pause.
- **Monitoring**: alert on abnormal finalize volume, repeated failures, HTS error codes.

---

## 13) Build Instructions (What “Open Codex” should implement)

### 13.1 Implement contracts
1) Vendor Hedera HTS Solidity libs under `contracts/hedera/`.
2) Implement `SolanaToHederaBridgeUpgradeable.sol` (UUPS, Ownable, Pausable, ReentrancyGuard).
3) Implement optional “claim-later” path if chosen.

### 13.2 Implement scripts
- `deploy-bridge.ts`: deploy UUPS proxy; output proxy address.
- `create-hts-token.ts`: create fungible HTS token with treasury+keys bound to proxy; output tokenId and solidity address.
- `set-token-on-bridge.ts`: set token address on bridge if needed.
- `upgrade-bridge.ts`: upgrade proxy implementation.

### 13.3 Implement relayer
- Solana watcher reads program logs and produces `depositId, recipient, amount, solanaTxHash`.
- Hedera sender calls `finalizeSolanaDeposit(...)` with ethers signer key.
- Retry strategy:
  - If revert = deposit used → treat as success
  - If revert = paused → backoff
  - If association-related → backoff until user associates (or use claim-later design)

### 13.4 Implement Next.js
- Admin page: connect MetaMask (Hedera network), call pause/unpause, setRelayer.
- Bridge page: show Solana deposit action + status; show token association step; show final Hedera tx status.

---

## 14) Environment Variables (.env.example)

### Hardhat / deploy
- `DEPLOYER_PRIVATE_KEY=...`
- `ADMIN_EOA_ADDRESS=0x...`
- `RELAYER_EOA_ADDRESS=0x...`
- `HEDERA_RPC=https://testnet.hashio.io/api`

### Hedera token creation (SDK)
- `OPERATOR_ID=0.0.x`
- `OPERATOR_PRIVATE_KEY=...`
- `BRIDGE_PROXY_EVM_ADDRESS=0x...`

### Shared outputs
- `HTS_TOKEN_ID=0.0.x`
- `HTS_TOKEN_SOLIDITY_ADDRESS=0x...`
- `BRIDGE_PROXY_ADDRESS=0x...`

### Relayer
- `RELAYER_PRIVATE_KEY=...`
- `SOLANA_RPC=...`
- `SOLANA_PROGRAM_ID=...`

---

## 15) Acceptance Criteria (Definition of Done)

1) Admin can deploy bridge proxy on Hedera testnet.
2) Admin can create HTS token with treasury+keys bound to proxy.
3) Relayer can finalize a mocked Solana deposit: mint occurs and recipient receives HTS.
4) Admin can rotate relayer without touching token keys.
5) Admin pause stops bridging; unpause resumes.
6) Upgrade of implementation preserves state and continues bridging.
7) Monitoring/events are sufficient to index all deposits/finalizations.

---

## 16) Notes & Non-goals (for clarity)

- This plan assumes **off-chain verification** of Solana deposits by allowlisted relayer(s). It is not a trustless proof bridge.
- If you later want stronger security, add:
  - threshold relayers (m-of-n signatures)
  - or proof verification (heavier engineering)

---

## 17) Quick Glossary

- **HTS**: Hedera Token Service, native token layer.
- **Treasury**: the account/contract that receives minted supply by default.
- **Proxy (Upgradeable)**: stable on-chain address holding state and balances; forwards calls to an implementation.
- **Relayer**: automated EOA that submits finalize calls after verifying Solana events.
