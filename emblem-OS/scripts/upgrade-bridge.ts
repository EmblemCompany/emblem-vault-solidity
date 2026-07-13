/**
 * Upgrade Bridge Implementation (UUPS)
 *
 * This script upgrades the SolanaToHederaBridge implementation.
 * The proxy address stays the same, only the implementation changes.
 *
 * Usage:
 *   npx hardhat run scripts/upgrade-bridge.ts --network hederaTestnet
 */

import { ethers, upgrades, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const HASHSCAN_VERIFY_API = "https://server-verify.hashscan.io";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=== Upgrade Bridge Implementation ===");
  console.log("Account:", deployer.address);
  console.log("Network:", network.name);

  // Determine network for file names
  let networkSuffix: string;
  let chainId: string | null;
  if (network.name === "hederaTestnet") {
    networkSuffix = "testnet";
    chainId = "296";
  } else if (network.name === "hederaMainnet") {
    networkSuffix = "mainnet";
    chainId = "295";
  } else {
    networkSuffix = network.name;
    chainId = null;
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

  console.log("\nProxy Address:", deployment.proxy);
  console.log("Current Implementation:", deployment.implementation);

  // Get the new contract factory
  // If you have a V2 contract, change this to that contract name
  const BridgeV2 = await ethers.getContractFactory("SolanaToHederaBridgeUpgradeable");

  console.log("\nUpgrading to new implementation...");

  // For UUPS, upgradeProxy handles calling the upgrade
  const upgraded = await upgrades.upgradeProxy(deployment.proxy, BridgeV2, {
    kind: "uups",
  });

  await upgraded.waitForDeployment();

  const newImplementation = await upgrades.erc1967.getImplementationAddress(deployment.proxy);

  console.log("\n=== Upgrade Successful ===");
  console.log("Proxy Address:", deployment.proxy);
  console.log("Old Implementation:", deployment.implementation);
  console.log("New Implementation:", newImplementation);

  // Verify new version
  const version = await upgraded.VERSION();
  console.log("Contract Version:", version);

  // Save upgrade info
  const previousImplementation = deployment.implementation;
  deployment.implementation = newImplementation;
  deployment.version = version;
  deployment.upgradedAt = new Date().toISOString();
  deployment.upgradeHistory = deployment.upgradeHistory || [];
  deployment.upgradeHistory.push({
    from: previousImplementation,
    to: newImplementation,
    at: new Date().toISOString(),
    version: version,
  });
  deployment.verified = false;

  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
  console.log("\nDeployment file updated");

  // Verify new implementation on HashScan
  if (chainId) {
    console.log("\n=== Verifying New Implementation on HashScan ===");
    console.log("Waiting 15 seconds for deployment to propagate...");
    await new Promise(resolve => setTimeout(resolve, 15000));

    try {
      const verified = await verifyOnHashscan(newImplementation, chainId);

      if (verified) {
        deployment.verified = true;
        fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
        console.log("\n✅ Contract verified on HashScan!");
        console.log(`View: https://hashscan.io/${networkSuffix}/contract/${newImplementation}`);
      }
    } catch (error: any) {
      console.warn("\n⚠️  Verification failed:", error.message);
    }
  }
}

async function verifyOnHashscan(contractAddress: string, chainId: string): Promise<boolean> {
  const buildInfoDir = path.join(__dirname, "..", "artifacts", "build-info");

  if (!fs.existsSync(buildInfoDir)) {
    throw new Error("No build-info directory found.");
  }

  const buildInfoFiles = fs.readdirSync(buildInfoDir).filter(f => f.endsWith(".json"));

  if (buildInfoFiles.length === 0) {
    throw new Error("No build-info JSON files found.");
  }

  const buildInfoPath = path.join(buildInfoDir, buildInfoFiles[buildInfoFiles.length - 1]);
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));

  console.log("Using build-info:", buildInfoFiles[buildInfoFiles.length - 1]);

  const sources = buildInfo.input?.sources || {};
  const files: Record<string, string> = {};

  for (const [filePath, source] of Object.entries(sources)) {
    files[filePath] = (source as any).content;
  }

  const output = buildInfo.output;
  if (output?.contracts) {
    for (const [filePath, contracts] of Object.entries(output.contracts)) {
      for (const [contractName, contractData] of Object.entries(contracts as any)) {
        if ((contractData as any).metadata) {
          files[`${contractName}.metadata.json`] = (contractData as any).metadata;
        }
      }
    }
  }

  console.log("Submitting to:", `${HASHSCAN_VERIFY_API}/verify`);
  console.log("Files included:", Object.keys(files).length);

  let requestBody: any = {
    address: contractAddress,
    chain: chainId,
    files: files,
  };

  let response = await fetch(`${HASHSCAN_VERIFY_API}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  let result: any = await response.json();

  if (response.ok && result.result) {
    const status = result.result[0]?.status;
    console.log("Verification status:", status);
    return status === "perfect" || status === "partial" || status === "full";
  }

  if (result.contractsToChoose && result.contractsToChoose.length > 0) {
    let contractIndex = result.contractsToChoose.findIndex(
      (c: any) => c.name === "SolanaToHederaBridgeUpgradeable"
    );

    if (contractIndex >= 0) {
      console.log(`Selecting SolanaToHederaBridgeUpgradeable (index: ${contractIndex})`);

      requestBody.chosenContract = contractIndex.toString();

      response = await fetch(`${HASHSCAN_VERIFY_API}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      result = await response.json();

      if (response.ok && result.result) {
        const status = result.result[0]?.status;
        console.log("Verification status:", status);
        return status === "perfect" || status === "partial" || status === "full";
      }
    }
  }

  console.log("Verification response:", JSON.stringify(result, null, 2));
  return false;
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Upgrade failed:", error);
    process.exit(1);
  });
