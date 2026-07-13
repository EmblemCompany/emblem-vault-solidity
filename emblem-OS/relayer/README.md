# Solana → Hedera Bridge Relayer

This directory will contain the automated relayer service when the Solana side is ready.

## Current Status

**Manual Relaying** - Admin EOA acts as the relayer via the Admin UI.

## Future Implementation

When Solana program is deployed:

### Components

1. **solana-watcher.ts** - WebSocket listener for Solana program events
   - Subscribes to program logs
   - Parses deposit events
   - Queues for processing

2. **hedera-sender.ts** - Hedera transaction submitter
   - Calls `finalizeSolanaDeposit()` on bridge contract
   - Handles retry logic
   - Tracks processed deposits

3. **orchestrator.ts** - Main coordinator
   - Manages watcher and sender
   - Health monitoring
   - Database for state persistence

### Required Dependencies

```json
{
  "@solana/web3.js": "^1.x",
  "ethers": "^6.x",
  "redis": "^4.x"
}
```

### Environment Variables

```bash
# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PROGRAM_ID=...

# Hedera
RELAYER_PRIVATE_KEY=0x...
BRIDGE_PROXY_ADDRESS=0x...
HEDERA_RPC_URL=https://mainnet.hashio.io/api

# Database
REDIS_URL=redis://localhost:6379
```

### Security Considerations

1. Relayer key should be a dedicated EOA with minimal funds
2. Use hardware security module (HSM) for production keys
3. Implement rate limiting at relayer level
4. Monitor for unusual activity
5. Rotate relayer keys periodically

## Manual Relaying (Current)

Use the Admin UI at `/bridge` to manually finalize deposits:

1. Get deposit details from Solana (depositId, recipient, amount, txHash)
2. Navigate to Bridge > Finalize Deposit
3. Enter details and submit transaction
4. Verify on HashScan
