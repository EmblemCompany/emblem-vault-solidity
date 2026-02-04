const { run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Verifying HustleERC20 on", network.name);

  // Determine the deployment file
  let deploymentFileName;
  if (network.name === "hederaTestnet") {
    deploymentFileName = "hedera-testnet.json";
  } else if (network.name === "hederaMainnet") {
    deploymentFileName = "hedera-mainnet.json";
  } else {
    throw new Error(`Unsupported network: ${network.name}`);
  }

  const deploymentsPath = path.join(__dirname, "..", "deployments", deploymentFileName);

  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`No deployments found at ${deploymentsPath}`);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const latestDeployment = Array.isArray(deployments) ? deployments[deployments.length - 1] : deployments;

  const implementationAddress = latestDeployment.implementation;

  console.log("\n=== Deployment Info ===");
  console.log("Proxy Address:", latestDeployment.proxy);
  console.log("Implementation Address:", implementationAddress);

  console.log("\n=== Verifying via Sourcify ===");

  try {
    // Use sourcify verification
    await run("verify:sourcify", {
      address: implementationAddress,
    });

    console.log("\nVerification successful!");
  } catch (error) {
    if (error.message.includes("already verified")) {
      console.log("Contract is already verified!");
    } else {
      console.error("Sourcify verification failed:", error.message);
      console.log("\nTrying manual Sourcify submission...");

      // Provide manual instructions
      console.log("\n=== Manual Verification ===");
      console.log("1. Go to: https://sourcify.dev/#/verifier");
      console.log("2. Select chain: Hedera " + (network.name === "hederaMainnet" ? "Mainnet (295)" : "Testnet (296)"));
      console.log("3. Enter address:", implementationAddress);
      console.log("4. Upload the source files from contracts/ and artifacts/");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
