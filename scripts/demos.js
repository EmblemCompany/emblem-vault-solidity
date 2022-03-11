const { ethers, upgrades} = require("hardhat");
const spawn = require('await-spawn')

const utils = require("./utils")
let HANDLER_ADDRESS // = "0x404d4FfB1887aA8Ca5973B4F1C5257DE4d887D59"
let VERIFY = true
let results = {}
async function main() {
  const [_deployer] = await hre.ethers.getSigners();
  const CallbackCatch = await ethers.getContractFactory("DemoCallbackCatch");

  /* ERC1155 Factory */
  results.catcher = await utils.deployProxy("CallbackCatch", CallbackCatch)
  results.catcher = VERIFY? await utils.verify(results.catcher): results.catcher
  
  utils.formatResults(results)
}

main();

async function getContract(_class, address, signer) {
  let ABI = require("../artifacts/contracts/"+_class+".sol/"+_class+".json")
  let contract = new hre.ethers.Contract(address, ABI.abi, signer)
  return contract;
}