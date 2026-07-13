import { ethers, upgrades, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const HASHSCAN_VERIFY_API = "https://server-verify.hashscan.io";

// Default rate limits (adjust as needed)
// HTS tokens have 8 decimals
const DEFAULT_MAX_PER_TX = BigInt(1_000_000_00000000); // 1M tokens
const DEFAULT_DAILY_LIMIT = BigInt(10_000_000_00000000); // 10M tokens

interface DeploymentInfo {
  network: string;
  chainId: number | undefined;
  deployer: string;
  proxy: string;
  implementation: string;
  version: string;
  maxPerTx: string;
  dailyLimit: string;
  deployedAt: string;
  blockNumber: number;
  verified: boolean;
  htsTokenId?: string;
  htsTokenAddress?: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying SolanaToHederaBridge with account:", deployer.address);
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "HBAR");

  // Get the contract factory
  const Bridge = await ethers.getContractFactory("SolanaToHederaBridgeUpgradeable");

  console.log("\nDeploying SolanaToHederaBridgeUpgradeable as UUPS proxy...");

  // Parse rate limits from env or use defaults
  const maxPerTx = process.env.BRIDGE_MAX_PER_TX
    ? BigInt(process.env.BRIDGE_MAX_PER_TX)
    : DEFAULT_MAX_PER_TX;
  const dailyLimit = process.env.BRIDGE_DAILY_LIMIT
    ? BigInt(process.env.BRIDGE_DAILY_LIMIT)
    : DEFAULT_DAILY_LIMIT;

  console.log("Max per TX:", maxPerTx.toString());
  console.log("Daily limit:", dailyLimit.toString());

  // Deploy using UUPS proxy pattern
  const proxy = await upgrades.deployProxy(
    Bridge,
    [deployer.address, maxPerTx, dailyLimit],
    {
      kind: "uups",
      initializer: "initialize",
    }
  );

  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\n=== Deployment Successful ===");
  console.log("Proxy Address:", proxyAddress);
  console.log("Implementation Address:", implementationAddress);

  // Verify the deployment
  const version = await proxy.VERSION();
  const owner = await proxy.owner();
  const isOwnerRelayer = await proxy.isRelayer(owner);
  const isPaused = await proxy.paused();

  console.log("\n=== Contract Info ===");
  console.log("Version:", version);
  console.log("Owner:", owner);
  console.log("Owner is relayer:", isOwnerRelayer);
  console.log("Contract Paused:", isPaused);
  console.log("\n⚠️  Next step: Create HTS token with treasury = proxy address");
  console.log("   Run: npx ts-node scripts/create-hts-token.ts");

  // Save deployment info
  const deploymentInfo: DeploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    proxy: proxyAddress,
    implementation: implementationAddress,
    version: version,
    maxPerTx: maxPerTx.toString(),
    dailyLimit: dailyLimit.toString(),
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    verified: false,
  };

  // Determine the deployment file name
  let deploymentFileName: string;
  let chainId: string | null;
  if (network.name === "hederaTestnet") {
    deploymentFileName = "bridge-hedera-testnet.json";
    chainId = "296";
  } else if (network.name === "hederaMainnet") {
    deploymentFileName = "bridge-hedera-mainnet.json";
    chainId = "295";
  } else {
    deploymentFileName = `bridge-${network.name}.json`;
    chainId = null;
  }

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const deploymentPath = path.join(deploymentsDir, deploymentFileName);

  // Ensure deployments directory exists
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save to file
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
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
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log("\n✅ Contract verified on HashScan!");
        console.log(`View: https://hashscan.io/${network.name === "hederaMainnet" ? "mainnet" : "testnet"}/contract/${implementationAddress}`);
      }
    } catch (error: any) {
      console.warn("\n⚠️  Verification failed:", error.message);
      console.log("You can verify manually later.");
    }
  }

  return deploymentInfo;
}

async function verifyOnHashscan(contractAddress: string, chainId: string): Promise<boolean> {
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
  const files: Record<string, string> = {};

  for (const [filePath, source] of Object.entries(sources)) {
    files[filePath] = (source as any).content;
  }

  // Extract metadata for each contract
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

  // Step 1: Submit files without chosenContract to get the list of contracts
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

  // If it succeeded on first try (only one contract)
  if (response.ok && result.result) {
    const status = result.result[0]?.status;
    console.log("Verification status:", status);
    return status === "perfect" || status === "partial" || status === "full";
  }

  // Step 2: If we need to choose a contract, find our bridge contract
  if (result.contractsToChoose && result.contractsToChoose.length > 0) {
    let contractIndex = result.contractsToChoose.findIndex(
      (c: any) => c.name === "SolanaToHederaBridgeUpgradeable"
    );

    if (contractIndex >= 0) {
      console.log(`Multiple contracts detected, selecting SolanaToHederaBridgeUpgradeable (index:`, contractIndex, ")");

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
