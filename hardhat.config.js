/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require('dotenv').config()
require('@nomiclabs/hardhat-waffle')
require('hardhat-abi-exporter');
require("hardhat-gas-reporter");
require('hardhat-contract-sizer');
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");

module.exports = {
//  solidity: "0.8.4",
  gasReporter: {
    currency: "USD",
//    gasPrice: 150,
    coinmarketcap: "abb5abcf-5b1f-443b-873f-3bc21d6019f7",
    enabled: true,
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
    }
  },
  mocha: {
    timeout: 2000000000
  },
  networks: {
    hardhat: {
      chainId: 1337,
      timeout: 1000 * 60 * 60 * 24, // 1 day
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      //timeout: 1800000
    },
    rinkeby: {
      //gasPrice: 32000000000,
      //gasPrice: 133000000000,
      url: process.env.RINKEBY || "https://rinkeby.infura.io/v3/6112845322b74decbf08005aea176252",
      timeout: 1000 * 60 * 60 * 24, // 1 day
      accounts: ['a819fcd7afa2c39a7f9baf70273a128875b6c9f03001b218824559ccad6ef11c'],
    },
    mainnet: {
      //gasPrice: 80000000000,
      //gasPrice: 96000000000,
      timeout: 1000 * 60 * 60 * 24, // 1 day
      url: process.env.MAINNET || "",
      accounts: process.env.MAINNET_PRIVATE_KEY ? [process.env.MAINNET_PRIVATE_KEY]: [],
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
    // apiKey: {
    //   mainnet: "YOUR_ETHERSCAN_API_KEY",
    //   ropsten: "YOUR_ETHERSCAN_API_KEY",
    //   rinkeby: process.env.ETHERSCAN_API_KEY,
    //   goerli: "YOUR_ETHERSCAN_API_KEY",
    //   kovan: "YOUR_ETHERSCAN_API_KEY",
    //   // binance smart chain
    //   bsc: "YOUR_BSCSCAN_API_KEY",
    //   bscTestnet: "YOUR_BSCSCAN_API_KEY",
    //   // huobi eco chain
    //   heco: "YOUR_HECOINFO_API_KEY",
    //   hecoTestnet: "YOUR_HECOINFO_API_KEY",
    //   // fantom mainnet
    //   opera: "YOUR_FTMSCAN_API_KEY",
    //   ftmTestnet: "YOUR_FTMSCAN_API_KEY",
    //   // optimism
    //   optimisticEthereum: "YOUR_OPTIMISTIC_ETHERSCAN_API_KEY",
    //   optimisticKovan: "YOUR_OPTIMISTIC_ETHERSCAN_API_KEY",
    //   // polygon
    //   polygon: "YOUR_POLYGONSCAN_API_KEY",
    //   polygonMumbai: "YOUR_POLYGONSCAN_API_KEY",
    //   // arbitrum
    //   arbitrumOne: "YOUR_ARBISCAN_API_KEY",
    //   arbitrumTestnet: "YOUR_ARBISCAN_API_KEY",
    //   // avalanche
    //   avalanche: "YOUR_SNOWTRACE_API_KEY",
    //   avalancheFujiTestnet: "YOUR_SNOWTRACE_API_KEY",
    //   // moonbeam
    //   moonbeam: "YOUR_MOONBEAM_MOONSCAN_API_KEY",
    //   moonriver: "YOUR_MOONRIVER_MOONSCAN_API_KEY",
    //   moonbaseAlpha: "YOUR_MOONBEAM_MOONSCAN_API_KEY",
    //   // harmony
    //   harmony: "YOUR_HARMONY_API_KEY",
    //   harmonyTest: "YOUR_HARMONY_API_KEY",
    //   // xdai and sokol don't need an API key, but you still need
    //   // to specify one; any string placeholder will work
    //   xdai: "api-key",
    //   sokol: "api-key",
    //   aurora: "api-key",
    //   auroraTestnet: "api-key"
    // }
  }
};
