/**
 * Call createToken on the bridge contract
 *
 * Usage:
 *   npx hardhat run scripts/call-create-token.ts --network hederaTestnet
 */

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Token configuration
const TOKEN_NAME = "Hustle";
const TOKEN_SYMBOL = "HUSTLE";
const TOKEN_MEMO = "Hustle on Hedera";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=== Create HTS Token via Bridge Contract ===");
  console.log("Account:", deployer.address);
  console.log("Network:", network.name);

  // Determine network suffix
  let networkSuffix: string;
  if (network.name === "hederaTestnet") {
    networkSuffix = "testnet";
  } else if (network.name === "hederaMainnet") {
    networkSuffix = "mainnet";
  } else {
    networkSuffix = network.name;
  }

  // Load deployment
  const deploymentFile = path.join(
    __dirname,
    "..",
    "deployments",
    `bridge-hedera-${networkSuffix}.json`
  );

  if (!fs.existsSync(deploymentFile)) {
    console.error("Error: Deployment file not found:", deploymentFile);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  console.log("\nBridge Proxy:", deployment.proxy);

  // Get contract
  const Bridge = await ethers.getContractFactory("SolanaToHederaBridgeUpgradeable");
  const bridge = Bridge.attach(deployment.proxy);

  // Check if token already exists
  const currentToken = await bridge.token();
  if (currentToken !== ethers.ZeroAddress) {
    console.log("\nToken already created:", currentToken);
    process.exit(0);
  }

  console.log("\nCreating token...");
  console.log("  Name:", TOKEN_NAME);
  console.log("  Symbol:", TOKEN_SYMBOL);
  console.log("  Memo:", TOKEN_MEMO);

  // HTS token creation requires ~$1 in HBAR (send extra to be safe)
  const createFee = ethers.parseEther("20"); // 20 HBAR
  console.log("  Fee:", ethers.formatEther(createFee), "HBAR");

  const tx = await bridge.createToken(TOKEN_NAME, TOKEN_SYMBOL, TOKEN_MEMO, {
    value: createFee,
  });
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Transaction confirmed!");

  // Get the new token address
  const newToken = await bridge.token();
  console.log("\n=== Token Created ===");
  console.log("Token Address:", newToken);

  // Update deployment file
  deployment.htsTokenAddress = newToken;
  deployment.tokenConfigured = true;
  deployment.tokenConfiguredAt = new Date().toISOString();
  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
  console.log("\nDeployment file updated");

  console.log("\n✅ Bridge is now fully configured!");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
