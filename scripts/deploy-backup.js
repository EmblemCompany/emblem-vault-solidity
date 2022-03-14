const { ethers, upgrades} = require("hardhat");
const spawn = require('await-spawn')
const utils = require("./utils")
const fs = require('fs')
let Deployments = require('../deployed.json')

let HANDLER_ADDRESS //= "0x404d4FfB1887aA8Ca5973B4F1C5257DE4d887D59"
let CALLBACK_STORAGE //= "0xcA00Eb2CC4fb26f5eb07CF49BB907af3536CD036";
let CALLBACK_WITH_STORAGE //= "0x8c2282a3311cB856fF2677Dd9c4985B08Dd55B3f";
let BALANCE_STORAGE, BALANCE, CLAIM_STORAGE, CLAIMED, ERC1155FACTORY_PROXY, ERC721FACTORY_PROXY, ERC20FACTORY_PROXY, STAKINGFACTORY_PROXY
let VERIFY = false
let results = {time: Date.now()}

async function main() {
  const [_deployer] = await hre.ethers.getSigners();
  const VaultHandlerV8 = await hre.ethers.getContractFactory("VaultHandlerV8");
  const VaultHandlerV9 = await hre.ethers.getContractFactory("VaultHandlerV9");
  const CallbackStorage = await hre.ethers.getContractFactory("CallbackStorage");
  const Callback = await hre.ethers.getContractFactory("Callback");
  const ERC1155Factory = await ethers.getContractFactory("ERC1155Factory");
  const ERC721Factory = await ethers.getContractFactory("ERC721Factory");
  const ERC20Factory = await ethers.getContractFactory("ERC20Factory");
  const StakingFactory = await ethers.getContractFactory("StakingFactory");
  const ClaimStorage = await ethers.getContractFactory("Storage");
  const Claimed = await ethers.getContractFactory("Claimed");
  const BalanceStorage = await ethers.getContractFactory("BalanceStorage");
  const Balance = await ethers.getContractFactory("Balance");

  // /* Callback Storage */
  // results.callbackStorage = CALLBACK_STORAGE ? {verified: true, address: CALLBACK_STORAGE, contract: await utils.getContract(CALLBACK_STORAGE, 'CallbackStorage', _deployer)} : await utils.deployProxy("CallbackStorage", CallbackStorage)
  // results.callbackStorage = VERIFY && !results.callbackStorage.verified? await utils.verify(results.callbackStorage): results.callbackStorage
  // results.callbacksWithStorage = CALLBACK_WITH_STORAGE ? {verified: true, address: CALLBACK_WITH_STORAGE, contract: await utils.getContract(CALLBACK_WITH_STORAGE, 'Callback', _deployer)}: await utils.deployProxy("Callback", Callback, [results.callbackStorage.address])
  // results.callbacksWithStorage = VERIFY? await utils.verify(results.callbacksWithStorage): results.callbacksWithStorage
  
  // /* HANDLER Upgradable Callbacks */
  // results.handlerWithCallbackStorage = HANDLER_ADDRESS? {verified: true, address: HANDLER_ADDRESS, contract: await utils.getContract(HANDLER_ADDRESS, 'VaultHandlerV9', _deployer)}: await utils.deploy("Vault handler", VaultHandlerV9, results.callbacksWithStorage.address);
  // results.handlerWithCallbackStorage = VERIFY && !results.handlerWithCallbackStorage.verified? await utils.verify(results.handlerWithCallbackStorage, [results.handlerWithCallbackStorage.address]): results.handlerWithCallbackStorage
  
  // /* HANDLER */
  results.handler = await verifyContract(await getOrDeploy(HANDLER_ADDRESS, "VaultHandlerV8", VaultHandlerV8))

  // /* BALANCE */
  results.balanceStorage = await verifyContract(await getOrDeploy(BALANCE_STORAGE, "BalanceStorage", BalanceStorage))
  results.balances = await verifyContract(await getOrDeploy(BALANCE, "Balance", Balance, results.balanceStorage.address), [results.balanceStorage.address])
  await utils.registerWithContract(utils.REGISTRATION_TYPE.BALANCE, results.handler, results.balances)
  await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.balances, results.handler)

  /* BALANCE OLD DEPLOYMENT METHOD */
  // results.balances = await utils.deploy("Balance", Balance, results.balanceStorage.address)
  // results.balances = VERIFY? await utils.verify(results.balances, [results.balanceStorage.address]): results.balances
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.BALANCE, results.handler, results.balances)
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.balances, results.handler)

  // /* CLAIM */
  results.claimStorage = await verifyContract(await getOrDeployProxy(CLAIM_STORAGE, "ClaimStorage", ClaimStorage))
  results.claimed = await verifyContract(await getOrDeploy(CLAIMED, "Claimed", Claimed, results.claimStorage.address), [results.claimStorage.address])
  await utils.registerWithContract(utils.REGISTRATION_TYPE.CLAIM, results.handler, results.claimed)
  await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.claimed, results.handler)

  // /* ERC1155 Factory */
  results.erc1155Factory = await verifyContract(await getOrDeployProxy(ERC1155FACTORY_PROXY, "ERC1155Factory", ERC1155Factory))
  await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.erc1155Factory)

  results.erc1155Base = await verifyAddress({address: await results.erc1155Factory.contract.erc1155Implementation()})
  
  // /* ERC721 Factory */
  results.erc721Factory = await verifyContract(await getOrDeployProxy(ERC721FACTORY_PROXY, "ERC721Factory", ERC721Factory))
  await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.erc721Factory)

  results.erc721Base = await verifyAddress({address: await results.erc721Factory.contract.erc721Implementation()})

  // /* ERC20 Factory */
  results.erc20Factory = await verifyContract(await getOrDeployProxy(ERC20FACTORY_PROXY, "ERC20Factory", ERC20Factory))
  await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.erc20Factory)

  results.erc20Base = await verifyAddress({address: await results.erc20Factory.contract.erc20Implementation()})

  // /* Staking Factory */
  results.stakingFactory = await verifyContract(await getOrDeployProxy(STAKINGFACTORY_PROXY, "StakingFactory", StakingFactory))
  await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.stakingFactory)
  
  results.stakingBase = await verifyAddress({address: await results.stakingBase.contract.stakingImplementation()})

  /* Save Results */
  Deployments.push(utils.formatResults(results))
  utils.saveFile(Deployments, "./deployed.json")  
}

async function getOrDeploy(proxyAddress, className, contractClass, args = null) {
  return proxyAddress ? { verified: true, address: proxyAddress, contract: await utils.getContract(proxyAddress, className, _deployer) } : await utils.deploy(className, contractClass, args);
}

async function getOrDeployProxy(proxyAddress, className, contractClass, args = []) {
  return proxyAddress ? { verified: true, address: proxyAddress, contract: await utils.getContract(proxyAddress, className, _deployer) } : await utils.deployProxy(className, contractClass, args);
}

async function verifyContract(deployment, args = []) {
  return VERIFY && !deployment.verified ? await utils.verify(deployment, args) : deployment;
}

async function verifyAddress(deployment, args = []) {
  return VERIFY && !deployment.verified? await utils.verifyAddress(deployment): deployment
}

  

main();