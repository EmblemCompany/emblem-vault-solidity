const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

const HASHSCAN_VERIFY_API = "https://server-verify.hashscan.io";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying HustleERC20 with account:", deployer.address);
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "HBAR");

  // Get the contract factory
  const HustleERC20 = await ethers.getContractFactory("HustleERC20");

  console.log("\nDeploying HustleERC20 as transparent proxy...");

  // Deploy using transparent proxy pattern
  const proxy = await upgrades.deployProxy(
    HustleERC20,
    [deployer.address], // initialOwner
    {
      kind: "transparent",
      initializer: "initialize"
    }
  );

  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);

  console.log("\n=== Deployment Successful ===");
  console.log("Proxy Address:", proxyAddress);
  console.log("Implementation Address:", implementationAddress);
  console.log("ProxyAdmin Address:", proxyAdminAddress);

  // Verify the deployment
  const name = await proxy.name();
  const symbol = await proxy.symbol();
  const owner = await proxy.owner();

  console.log("\n=== Contract Info ===");
  console.log("Token Name:", name);
  console.log("Token Symbol:", symbol);
  console.log("Owner:", owner);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    proxy: proxyAddress,
    implementation: implementationAddress,
    proxyAdmin: proxyAdminAddress,
    tokenName: name,
    tokenSymbol: symbol,
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    verified: false
  };

  // Determine the deployment file name
  let deploymentFileName;
  let chainId;
  if (network.name === "hederaTestnet") {
    deploymentFileName = "hedera-testnet.json";
    chainId = "296";
  } else if (network.name === "hederaMainnet") {
    deploymentFileName = "hedera-mainnet.json";
    chainId = "295";
  } else {
    deploymentFileName = `${network.name}.json`;
    chainId = null;
  }

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const deploymentPath = path.join(deploymentsDir, deploymentFileName);

  // Load existing deployments or create new array
  let deployments = [];
  if (fs.existsSync(deploymentPath)) {
    const existing = fs.readFileSync(deploymentPath, "utf8");
    deployments = JSON.parse(existing);
    if (!Array.isArray(deployments)) {
      deployments = [deployments];
    }
  }

  // Add new deployment
  deployments.push(deploymentInfo);

  // Save to file
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
  console.log("\nDeployment info saved to:", deploymentPath);

  // Verify on HashScan if on Hedera network
  if (chainId) {
    console.log("\n=== Verifying Contract on HashScan ===");
    console.log("Waiting 15 seconds for deployment to propagate...");
    await new Promise(resolve => setTimeout(resolve, 15000));

    try {
      const verified = await verifyOnHashscan(implementationAddress, chainId);

      if (verified) {
        deploymentInfo.verified = true;
        deployments[deployments.length - 1] = deploymentInfo;
        fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
        console.log("\n✅ Contract verified on HashScan!");
        console.log(`View: https://hashscan.io/${network.name === "hederaMainnet" ? "mainnet" : "testnet"}/contract/${implementationAddress}`);
      }
    } catch (error) {
      console.warn("\n⚠️  Verification failed:", error.message);
      console.log("You can verify manually with: npm run verify:testnet");
    }
  }

  return deploymentInfo;
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

  // Step 2: If we need to choose a contract, find HustleERC20 and submit with index
  if (result.contractsToChoose && result.contractsToChoose.length > 0) {
    const contractIndex = result.contractsToChoose.findIndex(c => c.name === "HustleERC20");

    if (contractIndex >= 0) {
      console.log("Multiple contracts detected, selecting HustleERC20 (index:", contractIndex, ")");

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
    console.log("\nDeployment complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
