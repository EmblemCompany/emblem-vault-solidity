const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

const HASHSCAN_VERIFY_API = "https://server-verify.hashscan.io";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Upgrading HustleERC20 with account:", deployer.address);
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);

  // Determine the deployment file name
  let deploymentFileName;
  if (network.name === "hederaTestnet") {
    deploymentFileName = "hedera-testnet.json";
  } else if (network.name === "hederaMainnet") {
    deploymentFileName = "hedera-mainnet.json";
  } else {
    deploymentFileName = `${network.name}.json`;
  }

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const deploymentPath = path.join(deploymentsDir, deploymentFileName);

  // Load existing deployment
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found at ${deploymentPath}. Deploy first using deploy.js`);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const latestDeployment = Array.isArray(deployments) ? deployments[deployments.length - 1] : deployments;

  const proxyAddress = latestDeployment.proxy;
  const oldImplementation = latestDeployment.implementation;

  console.log("\n=== Current Deployment ===");
  console.log("Proxy Address:", proxyAddress);
  console.log("Current Implementation:", oldImplementation);

  // Get the new contract factory
  const HustleERC20V2 = await ethers.getContractFactory("HustleERC20V2");

  console.log("\nUpgrading proxy to new implementation...");

  // Upgrade the proxy and call initializeV2
  const upgraded = await upgrades.upgradeProxy(proxyAddress, HustleERC20V2, {
    call: "initializeV2"
  });
  await upgraded.waitForDeployment();

  const newImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\n=== Upgrade Successful ===");
  console.log("Proxy Address (unchanged):", proxyAddress);
  console.log("Old Implementation:", oldImplementation);
  console.log("New Implementation:", newImplementation);

  // Verify the contract still works
  const name = await upgraded.name();
  const symbol = await upgraded.symbol();
  const owner = await upgraded.owner();

  // Check new V2 features
  const MINTER_ROLE = await upgraded.MINTER_ROLE();
  const hasMinterRole = await upgraded.hasRole(MINTER_ROLE, owner);
  console.log("Owner has MINTER_ROLE:", hasMinterRole);

  console.log("\n=== Contract Info (Verified) ===");
  console.log("Token Name:", name);
  console.log("Token Symbol:", symbol);
  console.log("Owner:", owner);

  // Save upgrade info
  const upgradeInfo = {
    network: network.name,
    chainId: network.config.chainId,
    upgrader: deployer.address,
    proxy: proxyAddress,
    oldImplementation: oldImplementation,
    newImplementation: newImplementation,
    upgradedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  // Append upgrade to deployments
  if (Array.isArray(deployments)) {
    deployments.push({
      ...latestDeployment,
      implementation: newImplementation,
      upgradedFrom: oldImplementation,
      upgradedAt: upgradeInfo.upgradedAt,
      upgradeBlockNumber: upgradeInfo.blockNumber
    });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
  console.log("\nUpgrade info saved to:", deploymentPath);

  // Verify the new implementation on HashScan
  let chainId;
  if (network.name === "hederaTestnet") {
    chainId = "296";
  } else if (network.name === "hederaMainnet") {
    chainId = "295";
  }

  if (chainId) {
    console.log("\n=== Verifying New Implementation on HashScan ===");
    console.log("Waiting 15 seconds for deployment to propagate...");
    await new Promise(resolve => setTimeout(resolve, 15000));

    try {
      const verified = await verifyOnHashscan(newImplementation, chainId);

      if (verified) {
        // Update the latest deployment with verification status
        deployments[deployments.length - 1].verified = true;
        fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
        console.log("\n✅ New implementation verified on HashScan!");
        console.log(`View: https://hashscan.io/${network.name === "hederaMainnet" ? "mainnet" : "testnet"}/contract/${newImplementation}`);
      }
    } catch (error) {
      console.warn("\n⚠️  Verification failed:", error.message);
      console.log("You can verify manually with: npm run verify:testnet");
    }
  }

  return upgradeInfo;
}

async function verifyOnHashscan(contractAddress, chainId) {
  // Find the build-info JSON file
  const buildInfoDir = path.join(__dirname, "..", "artifacts", "build-info");

  if (!fs.existsSync(buildInfoDir)) {
    throw new Error("No build-info directory found.");
  }

  const buildInfoFiles = fs.readdirSync(buildInfoDir).filter(f => f.endsWith(".json"));

  if (buildInfoFiles.length === 0) {
    throw new Error("No build-info JSON files found.");
  }

  // Use the most recent build-info file
  const buildInfoPath = path.join(buildInfoDir, buildInfoFiles[buildInfoFiles.length - 1]);
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));

  console.log("Using build-info:", buildInfoFiles[buildInfoFiles.length - 1]);

  // Extract source files from build-info
  const sources = buildInfo.input?.sources || {};
  const files = {};

  for (const [filePath, source] of Object.entries(sources)) {
    files[filePath] = source.content;
  }

  // Extract metadata for each contract
  const output = buildInfo.output;
  if (output?.contracts) {
    for (const [filePath, contracts] of Object.entries(output.contracts)) {
      for (const [contractName, contractData] of Object.entries(contracts)) {
        if (contractData.metadata) {
          files[`${contractName}.metadata.json`] = contractData.metadata;
        }
      }
    }
  }

  console.log("Submitting to:", `${HASHSCAN_VERIFY_API}/verify`);
  console.log("Files included:", Object.keys(files).length);

  // Step 1: Submit files without chosenContract to get the list of contracts
  let requestBody = {
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

  let result = await response.json();

  // If it succeeded on first try (only one contract)
  if (response.ok && result.result) {
    const status = result.result[0]?.status;
    console.log("Verification status:", status);
    return status === "perfect" || status === "partial" || status === "full";
  }

  // Step 2: If we need to choose a contract, find HustleERC20V2 or HustleERC20 and submit with index
  if (result.contractsToChoose && result.contractsToChoose.length > 0) {
    let contractIndex = result.contractsToChoose.findIndex(c => c.name === "HustleERC20V2");
    let contractName = "HustleERC20V2";

    if (contractIndex < 0) {
      contractIndex = result.contractsToChoose.findIndex(c => c.name === "HustleERC20");
      contractName = "HustleERC20";
    }

    if (contractIndex >= 0) {
      console.log(`Multiple contracts detected, selecting ${contractName} (index:`, contractIndex, ")");

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
  .then((result) => {
    console.log("\nUpgrade complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Upgrade failed:", error);
    process.exit(1);
  });
