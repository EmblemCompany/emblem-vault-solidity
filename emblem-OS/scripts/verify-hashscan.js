const fs = require("fs");
const path = require("path");
const { network } = require("hardhat");

/**
 * Verify contract on HashScan using Hedera's Sourcify instance
 * For Hardhat: Only the build-info JSON file is needed for Full Match
 *
 * API Endpoint: https://server-verify.hashscan.io
 */

const HASHSCAN_VERIFY_API = "https://server-verify.hashscan.io";

async function main() {
  console.log("=== HashScan Contract Verification ===\n");
  console.log("Network:", network.name);

  // Get chain ID
  let chainId;
  if (network.name === "hederaTestnet") {
    chainId = "296";
  } else if (network.name === "hederaMainnet") {
    chainId = "295";
  } else {
    throw new Error(`Unsupported network: ${network.name}. Use hederaTestnet or hederaMainnet.`);
  }

  // Load deployment info
  const deploymentFileName = network.name === "hederaMainnet" ? "hedera-mainnet.json" : "hedera-testnet.json";
  const deploymentsPath = path.join(__dirname, "..", "deployments", deploymentFileName);

  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`No deployments found at ${deploymentsPath}. Deploy first.`);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const latestDeployment = Array.isArray(deployments) ? deployments[deployments.length - 1] : deployments;

  const contractAddress = latestDeployment.implementation;

  console.log("Contract Address:", contractAddress);
  console.log("Chain ID:", chainId);

  // Find the build-info JSON file
  const buildInfoDir = path.join(__dirname, "..", "artifacts", "build-info");

  if (!fs.existsSync(buildInfoDir)) {
    throw new Error("No build-info directory found. Run 'npx hardhat compile' first.");
  }

  const buildInfoFiles = fs.readdirSync(buildInfoDir).filter(f => f.endsWith(".json"));

  if (buildInfoFiles.length === 0) {
    throw new Error("No build-info JSON files found. Run 'npx hardhat compile' first.");
  }

  // Use the most recent build-info file
  const buildInfoPath = path.join(buildInfoDir, buildInfoFiles[buildInfoFiles.length - 1]);
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));

  console.log("\nBuild Info File:", buildInfoFiles[buildInfoFiles.length - 1]);

  console.log("\n=== Submitting to HashScan Sourcify ===");
  console.log("API Endpoint:", `${HASHSCAN_VERIFY_API}/verify`);

  try {
    const verified = await verifyWithSourceFiles(contractAddress, chainId, buildInfo);

    if (verified) {
      // Update deployment record
      latestDeployment.verified = true;
      latestDeployment.verificationStatus = "verified";
      deployments[deployments.length - 1] = latestDeployment;
      fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    } else {
      printManualInstructions(contractAddress, chainId, buildInfoPath);
    }

  } catch (error) {
    console.error("\n❌ Request failed:", error.message);
    console.log("\n=== Manual Verification Instructions ===");
    printManualInstructions(contractAddress, chainId, buildInfoPath);
  }
}

async function verifyWithSourceFiles(contractAddress, chainId, buildInfo) {
  // Extract source files and metadata from build-info
  const sources = buildInfo.input?.sources || {};

  // Create individual file entries
  const files = {};

  for (const [filePath, source] of Object.entries(sources)) {
    files[filePath] = source.content;
  }

  // Also add metadata if available - this is crucial for verification
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

  // First, try without chosenContract to get the available contracts
  let requestBody = {
    address: contractAddress,
    chain: chainId,
    files: files,
  };

  try {
    console.log("Submitting source files to HashScan...");
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
      console.log("\n✅ Verification result:", status);
      console.log(`https://hashscan.io/${chainId === "295" ? "mainnet" : "testnet"}/contract/${contractAddress}`);
      return true;
    }

    // If we need to choose a contract
    if (result.contractsToChoose && result.contractsToChoose.length > 0) {
      // Find our contract in the list - try V2 first, then V1
      let hustleContract = result.contractsToChoose.find(c => c.name === "HustleERC20V2");
      let contractName = "HustleERC20V2";

      if (!hustleContract) {
        hustleContract = result.contractsToChoose.find(c => c.name === "HustleERC20");
        contractName = "HustleERC20";
      }

      if (hustleContract) {
        console.log(`Multiple contracts detected, selecting ${contractName}...`);

        // Try with the index (0-based position in the array)
        const contractIndex = result.contractsToChoose.findIndex(c => c.name === contractName);

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
          console.log("\n✅ Verification result:", status);
          console.log(`https://hashscan.io/${chainId === "295" ? "mainnet" : "testnet"}/contract/${contractAddress}`);
          return true;
        }

        console.log("Index-based selection failed, trying name-based...");

        // Try with just the name
        requestBody.chosenContract = contractName;

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
          console.log("\n✅ Verification result:", status);
          console.log(`https://hashscan.io/${chainId === "295" ? "mainnet" : "testnet"}/contract/${contractAddress}`);
          return true;
        }
      }
    }

    console.error("Verification failed:", JSON.stringify(result, null, 2));
    printManualInstructions(contractAddress, chainId);
    return false;

  } catch (error) {
    console.error("Verification error:", error.message);
    printManualInstructions(contractAddress, chainId);
    return false;
  }
}

function printManualInstructions(contractAddress, chainId, buildInfoPath) {
  console.log("\n=== Manual Verification via HashScan UI ===");
  console.log("1. Go to: https://verify.hashscan.io/");
  console.log(`2. Enter address: ${contractAddress}`);
  console.log(`3. Select chain: Hedera ${chainId === "295" ? "Mainnet" : "Testnet"} (${chainId})`);
  console.log("4. Upload the build-info JSON file:");
  if (buildInfoPath) {
    console.log(`   ${buildInfoPath}`);
  } else {
    console.log("   Located in: artifacts/build-info/*.json");
  }
  console.log("5. Click Verify");
  console.log("\nFor Hardhat projects, ONLY the build-info JSON is needed for Full Match.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
