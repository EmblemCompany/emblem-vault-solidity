/**
 * Create HTS Token for Solana → Hedera Bridge
 *
 * This script creates an HTS token where:
 * - Treasury = Bridge proxy contract (holds all minted tokens)
 * - SupplyKey = Contract key → Bridge proxy (allows contract to mint)
 * - PauseKey = Contract key → Bridge proxy (allows contract to pause token)
 * - AdminKey = None (immutable after creation)
 *
 * Prerequisites:
 * 1. Bridge proxy must be deployed (run deploy-bridge.ts first)
 * 2. Environment variables set:
 *    - OPERATOR_ID: Hedera account ID (0.0.xxxxx)
 *    - OPERATOR_PRIVATE_KEY: Hedera private key (302e...)
 *    - BRIDGE_PROXY_ADDRESS: Deployed bridge proxy EVM address
 *
 * Usage:
 *   npx ts-node scripts/create-hts-token.ts [--network testnet|mainnet]
 */

import {
  Client,
  AccountId,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  ContractId,
} from "@hashgraph/sdk";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

// Token configuration
const TOKEN_NAME = "Hustle";
const TOKEN_SYMBOL = "HUSTLE";
const TOKEN_DECIMALS = 8; // HTS standard
const TOKEN_MEMO = "Hustle on Hedera";
const INITIAL_SUPPLY = 0; // No pre-mint, all minted on finalize

interface TokenInfo {
  tokenId: string;
  tokenSolidityAddress: string;
  treasuryAccountId: string;
  treasurySolidityAddress: string;
  network: string;
  name: string;
  symbol: string;
  decimals: number;
  createdAt: string;
}

async function main() {
  // Parse network from args
  const args = process.argv.slice(2);
  let networkName = "testnet";
  const networkArgIndex = args.indexOf("--network");
  if (networkArgIndex !== -1 && args[networkArgIndex + 1]) {
    networkName = args[networkArgIndex + 1];
  }

  console.log("=== Create HTS Token for Bridge ===");
  console.log("Network:", networkName);

  // Validate environment
  const operatorId = process.env.OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_PRIVATE_KEY;
  let bridgeProxyAddress = process.env.BRIDGE_PROXY_ADDRESS;

  if (!operatorId || !operatorKey) {
    console.error("Error: Missing OPERATOR_ID or OPERATOR_PRIVATE_KEY environment variables");
    console.error("Set these in .env file:");
    console.error("  OPERATOR_ID=0.0.xxxxx");
    console.error("  OPERATOR_PRIVATE_KEY=302e...");
    process.exit(1);
  }

  // Load bridge proxy address from deployment if not in env
  if (!bridgeProxyAddress) {
    const deploymentFile = path.join(
      __dirname,
      "..",
      "deployments",
      `bridge-hedera-${networkName}.json`
    );

    if (fs.existsSync(deploymentFile)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
      bridgeProxyAddress = deployment.proxy;
      console.log("Loaded bridge proxy from deployment file:", bridgeProxyAddress);
    }
  }

  if (!bridgeProxyAddress) {
    console.error("Error: Missing BRIDGE_PROXY_ADDRESS");
    console.error("Either set in .env or run deploy-bridge.ts first");
    process.exit(1);
  }

  // Initialize Hedera client
  let client: Client;
  if (networkName === "mainnet") {
    client = Client.forMainnet();
  } else {
    client = Client.forTestnet();
  }

  client.setOperator(
    AccountId.fromString(operatorId!),
    PrivateKey.fromStringDer(operatorKey!)
  );

  console.log("\nOperator Account:", operatorId);
  console.log("Bridge Proxy Address:", bridgeProxyAddress);

  // Look up the contract ID from the mirror node (EVM address -> Hedera ID)
  const mirrorUrl = networkName === "mainnet"
    ? "https://mainnet-public.mirrornode.hedera.com"
    : "https://testnet.mirrornode.hedera.com";

  console.log("Looking up contract ID from mirror node...");
  const contractResponse = await fetch(`${mirrorUrl}/api/v1/contracts/${bridgeProxyAddress}`);
  if (!contractResponse.ok) {
    console.error("Error: Could not find contract on mirror node");
    console.error("Make sure the bridge proxy is deployed and the address is correct");
    process.exit(1);
  }
  const contractData = await contractResponse.json();
  const contractIdString = contractData.contract_id;

  const bridgeContractId = ContractId.fromString(contractIdString);
  // Convert ContractId to AccountId for treasury (same underlying ID)
  const bridgeAccountId = AccountId.fromString(contractIdString);
  console.log("Bridge Contract ID:", bridgeContractId.toString());

  // Create the token
  console.log("\nCreating HTS token...");
  console.log("  Name:", TOKEN_NAME);
  console.log("  Symbol:", TOKEN_SYMBOL);
  console.log("  Decimals:", TOKEN_DECIMALS);
  console.log("  Treasury:", bridgeAccountId.toString());

  const tokenCreateTx = new TokenCreateTransaction()
    .setTokenName(TOKEN_NAME)
    .setTokenSymbol(TOKEN_SYMBOL)
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(TOKEN_DECIMALS)
    .setInitialSupply(INITIAL_SUPPLY)
    .setTreasuryAccountId(bridgeAccountId)
    .setSupplyType(TokenSupplyType.Infinite)
    // Supply key allows minting - set to contract
    .setSupplyKey(bridgeContractId)
    // Pause key allows pausing transfers - set to contract
    .setPauseKey(bridgeContractId)
    // No admin key = immutable token config
    // No freeze key = cannot freeze individual accounts
    // No wipe key = cannot wipe from accounts
    .setTokenMemo(TOKEN_MEMO)
    .setMaxTransactionFee(30); // 30 HBAR max

  // Execute and get receipt
  const tokenCreateSubmit = await tokenCreateTx.execute(client);
  const tokenCreateReceipt = await tokenCreateSubmit.getReceipt(client);

  const tokenId = tokenCreateReceipt.tokenId!;
  const tokenSolidityAddress = tokenId.toSolidityAddress();

  console.log("\n=== Token Created Successfully ===");
  console.log("Token ID:", tokenId.toString());
  console.log("Token Solidity Address:", `0x${tokenSolidityAddress}`);

  // Save token info
  const tokenInfo: TokenInfo = {
    tokenId: tokenId.toString(),
    tokenSolidityAddress: `0x${tokenSolidityAddress}`,
    treasuryAccountId: bridgeAccountId.toString(),
    treasurySolidityAddress: bridgeProxyAddress,
    network: networkName,
    name: TOKEN_NAME,
    symbol: TOKEN_SYMBOL,
    decimals: TOKEN_DECIMALS,
    createdAt: new Date().toISOString(),
  };

  // Save to artifacts directory
  const artifactsDir = path.join(__dirname, "..", "artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const tokenInfoPath = path.join(artifactsDir, "token.json");
  fs.writeFileSync(tokenInfoPath, JSON.stringify(tokenInfo, null, 2));
  console.log("\nToken info saved to:", tokenInfoPath);

  // Update deployment file with token info
  const deploymentFile = path.join(
    __dirname,
    "..",
    "deployments",
    `bridge-hedera-${networkName}.json`
  );

  if (fs.existsSync(deploymentFile)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    deployment.htsTokenId = tokenId.toString();
    deployment.htsTokenAddress = `0x${tokenSolidityAddress}`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
    console.log("Updated deployment file with token info");
  }

  console.log("\n⚠️  Next step: Set token on bridge contract");
  console.log("   Run: npx hardhat run scripts/set-token-on-bridge.ts --network hedera" + (networkName === "mainnet" ? "Mainnet" : "Testnet"));

  return tokenInfo;
}

main()
  .then(() => {
    console.log("\nToken creation complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Token creation failed:", error);
    process.exit(1);
  });
