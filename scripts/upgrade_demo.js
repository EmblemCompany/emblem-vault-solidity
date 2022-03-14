const { ethers, upgrades } = require("hardhat");
let Deployments = require('../deployed.json')
const utils = require("./utils")
let STORAGE //= "0x92119b2d0bbDAEd799ea88B4b3c45437b6e8D0B5"
let PROXY //= "0x5228A5Bcf65c64B7e40db530FEaFb83F6f260779"
let VERIFY = true
let results = {}
async function main() {
  const [_deployer] = await hre.ethers.getSigners();
  const DemoCallbackCatchV4 = await ethers.getContractFactory("DemoCallbackCatchV4");

  results.callbackV4 = await utils.upgradeProxy(Deployments[0].demos.catcher.address, "DemoCallbackCatchV4", DemoCallbackCatchV4)
  results.callbackV4 = VERIFY? await utils.verify(results.callbackV4): results.callbackV4
  utils.formatResults(results)

    /* Save Results */
    Deployments.push(utils.formatResults(results))
    utils.saveFile(Deployments, "./upgraded.json")
}

main();
