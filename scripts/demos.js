const { ethers, upgrades} = require("hardhat");
const spawn = require('await-spawn')

const utils = require("./utils")
let VERIFY = false
let results = {}
let Deployments = require('../deployed.json')

let CATCHER = Deployments[0].demos && Deployments[0].demos.catcher ? Deployments[0].demos.catcher.address : null
let HANDLER = Deployments[0].handler? Deployments[0].handler.address : null
async function main() {
  const [_deployer] = await hre.ethers.getSigners();
  const DemoCallbackCatchV4 = await ethers.getContractFactory("DemoCallbackCatchV4");
  const VaultHandlerV8 = await hre.ethers.getContractFactory("VaultHandlerV8");
  let VaultHandler = await utils.getOrDeploy(HANDLER, "VaultHandlerV8", VaultHandlerV8)
  let ERC1155 = await hre.ethers.getContractFactory("ERC1155");

  /* Demo: Callback Catcher */
  results.catcher = await verifyContract(await utils.getOrDeployProxy(CATCHER, "DemoCallbackCatchV4", DemoCallbackCatchV4))
  
  /* Create ERC20 */
  let erc20Clone = await createERC20Clone(_deployer)
  let erc1155Clone = await createERC1155Clone(_deployer)
  results.catcher.registrations = [erc20Clone, erc1155Clone]

  await results.catcher.contract.config(erc20Clone.address, erc20Clone.address) // configure catcher
  await VaultHandler.contract.registerWildcardCallback(erc1155Clone.address, results.catcher.address, 1, "0xed0d37d4", false) // add callback

  let ERC1155Contract = await utils.getOrDeploy(erc1155Clone.address, "ERC1155", ERC1155)
  await ERC1155Contract.contract.mint(_deployer.address, 326113, 1)

  Deployments[0].demos?.catcher?
    Deployments[0].demos.catcher = utils.formatResults(results).catcher:
    Deployments[0].demos = {catcher: utils.formatResults(results)}

  utils.saveFile(Deployments, "./deployed.json")
}

async function createERC20Clone(_deployer) {
  const ERC20Factory = await utils.getContract(Deployments[0].erc20Factory.address, "ERC20Factory", _deployer)
  let currentCloneCount = Deployments[0].erc20Factory.clones.length
  await ERC20Factory.createClone(results.catcher.address, "Demo Coin", "demo", 8)
  await new Promise(resolve => setTimeout(resolve, 15000)); //WTF calling too fast, have to sleep
  let clone = {address: await ERC20Factory.ERC20Clones(currentCloneCount)}
  Deployments[0].erc20Factory.clones.push(clone)
  clone.type = "erc20"
  return clone
}

async function createERC1155Clone(_deployer) {
  const ERC1155Factory = await utils.getContract(Deployments[0].erc1155Factory.address, "ERC1155Factory", _deployer)
  let currentCloneCount = Deployments[0].erc1155Factory.clones.length
  await ERC1155Factory.createClone(_deployer.address)
  await new Promise(resolve => setTimeout(resolve, 15000)); //WTF calling too fast, have to sleep
  let clone = {address: await ERC1155Factory.ERC1155Clones(currentCloneCount)}
  Deployments[0].erc1155Factory.clones.push(clone)
  clone.type = 'ERC1155'
  return clone
}

async function verifyContract(deployment, args = []) {
  return VERIFY && !deployment.verified ? await utils.verify(deployment, args) : deployment;
}

async function verifyAddress(deployment, args = []) {
  return VERIFY && !deployment.verified? await utils.verifyAddress(deployment): deployment
}

main();