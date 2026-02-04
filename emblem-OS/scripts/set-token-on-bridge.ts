/**
 * Set HTS Token on Bridge Contract
 *
 * This script calls bridge.setToken(tokenAddress) to configure the HTS token.
 * Must be run after both deploy-bridge.ts and create-hts-token.ts.
 *
 * Usage:
 *   npx hardhat run scripts/set-token-on-bridge.ts --network hederaTestnet
 */

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=== Set Token on Bridge ===");
  console.log("Account:", deployer.address);
  console.log("Network:", network.name);

  // Determine network for file names
  let networkSuffix: string;
  if (network.name === "hederaTestnet") {
    networkSuffix = "testnet";
  } else if (network.name === "hederaMainnet") {
    networkSuffix = "mainnet";
  } else {
    networkSuffix = network.name;
  }

  // Load deployment info
  const deploymentFile = path.join(
    __dirname,
    "..",
    "deployments",
    `bridge-hedera-${networkSuffix}.json`
  );

  if (!fs.existsSync(deploymentFile)) {
    console.error("Error: Deployment file not found:", deploymentFile);
    console.error("Run deploy-bridge.ts first");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

  if (!deployment.proxy) {
    console.error("Error: Bridge proxy address not found in deployment");
    process.exit(1);
  }

  if (!deployment.htsTokenAddress) {
    console.error("Error: HTS token address not found in deployment");
    console.error("Run create-hts-token.ts first");
    process.exit(1);
  }

  console.log("\nBridge Proxy:", deployment.proxy);
  console.log("HTS Token Address:", deployment.htsTokenAddress);
  console.log("HTS Token ID:", deployment.htsTokenId);

  // Get bridge contract
  const Bridge = await ethers.getContractFactory("SolanaToHederaBridgeUpgradeable");
  const bridge = Bridge.attach(deployment.proxy);

  // Check if token is already set
  const currentToken = await bridge.token();
  if (currentToken !== ethers.ZeroAddress) {
    console.log("\n⚠️  Token already set:", currentToken);
    if (currentToken.toLowerCase() === deployment.htsTokenAddress.toLowerCase()) {
      console.log("Token matches expected address. Nothing to do.");
    } else {
      console.error("Token does not match expected address!");
      console.error("Expected:", deployment.htsTokenAddress);
    }
    process.exit(0);
  }

  // Set the token
  console.log("\nSetting token on bridge...");
  const tx = await bridge.setToken(deployment.htsTokenAddress);
  console.log("Transaction hash:", tx.hash);

  await tx.wait();
  console.log("Transaction confirmed!");

  // Verify
  const newToken = await bridge.token();
  console.log("\n=== Token Set Successfully ===");
  console.log("Bridge Token Address:", newToken);

  // Update deployment with completion flag
  deployment.tokenConfigured = true;
  deployment.tokenConfiguredAt = new Date().toISOString();
  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));

  console.log("\n✅ Bridge is now fully configured!");
  console.log("\nNext steps:");
  console.log("1. Use the admin UI to finalize deposits (human relayer)");
  console.log("2. Or add a bot relayer: bridge.setRelayer(botAddress, true)");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to set token:", error);
    process.exit(1);
  });
