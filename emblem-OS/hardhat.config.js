require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "paris"
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    hederaTestnet: {
      url: process.env.HEDERA_TESTNET_RPC || "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto"
    },
    hederaMainnet: {
      url: process.env.HEDERA_MAINNET_RPC || "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto"
    }
  },
  // Use Sourcify for Hedera verification
  sourcify: {
    enabled: true,
  },
  // Disable etherscan (not supported by Hedera)
  etherscan: {
    enabled: false,
    apiKey: {
      hederaTestnet: "not-needed",
      hederaMainnet: "not-needed",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
