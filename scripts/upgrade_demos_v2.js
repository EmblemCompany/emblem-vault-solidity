const { ethers, upgrades } = require("hardhat");

const utils = require("./utils")
const PROXY = "0xdB4ceb5449db885C40552BeF64C84DD446a4aCB7"
let VERIFY = true
let results = {}
async function main() {
  const [_deployer] = await hre.ethers.getSigners();
  const DemoCallbackCatchV3 = await ethers.getContractFactory("DemoCallbackCatchV3");

  results.catcher = await utils.upgradeProxy(PROXY, "DemoCallbackCatchV3", DemoCallbackCatchV3)
  results.catcher = VERIFY? await utils.verify(results.catcher): results.catcher
  utils.formatResults(results)
}

main();
