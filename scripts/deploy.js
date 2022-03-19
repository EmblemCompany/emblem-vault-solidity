const { ethers, upgrades} = require("hardhat");
const spawn = require('await-spawn')
const utils = require("./utils")
const fs = require('fs')
let Deployments = require('../deployed.json')

let HANDLER_ADDRESS //= "0x404d4FfB1887aA8Ca5973B4F1C5257DE4d887D59"
let CALLBACK_STORAGE //= "0xcA00Eb2CC4fb26f5eb07CF49BB907af3536CD036";
let CALLBACK_WITH_STORAGE //= "0x8c2282a3311cB856fF2677Dd9c4985B08Dd55B3f";
let BALANCE_STORAGE, BALANCE, CLAIM_STORAGE, CLAIMED, ERC1155FACTORY_PROXY, ERC721FACTORY_PROXY, PROXY, ERC20FACTORY_PROXY, STAKINGFACTORY_PROXY, ERC20_PROXY, ERC20UPGRADABLE_FACTORY, ERC1155_PROXY
let VERIFY = false
let results = {time: Date.now()}

async function main() {
  const [_deployer] = await hre.ethers.getSigners();
  const VaultHandlerV8 = await hre.ethers.getContractFactory("VaultHandlerV8");
  const ERC1155Factory = await ethers.getContractFactory("ERC1155Factory");
  const ERC721Factory = await ethers.getContractFactory("ERC721Factory");
  const ERC20Factory = await ethers.getContractFactory("ERC20Factory");
  const StakingFactory = await ethers.getContractFactory("StakingFactory");
  const ClaimStorage = await ethers.getContractFactory("Storage");
  const Claimed = await ethers.getContractFactory("Claimed");
  const BalanceStorage = await ethers.getContractFactory("BalanceStorage");
  const Balance = await ethers.getContractFactory("Balance");
  const BalanceUpgradable = await ethers.getContractFactory("BalanceUpgradable");
  const ClaimedUpgradable = await ethers.getContractFactory("ClaimedUpgradable");
  const ConfigurableERC20Upgradable = await ethers.getContractFactory("ConfigurableERC20Upgradable");
  const ERC1155Upgradable = await ethers.getContractFactory("ERC1155Upgradable");
  const ContractNFTFactory = await ethers.getContractFactory("ContractNFTFactory");
  const UpgradableTest = await hre.ethers.getContractFactory("UpgradableTest");
  const UpgradableTestV2 = await hre.ethers.getContractFactory("UpgradableTestV2");

  results.handler = Deployments[0]?.handler? Deployments[0]?.handler: null
  
  // /* HANDLER */
  results.handler = await verifyContract(await getOrDeploy(results.handler, "VaultHandlerV8", VaultHandlerV8))
  await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.handler, results.handler) // register handler with self to allow callbacks
  save()

  // /* BALANCE UPGRADABLE */
  results.upgradableBalances = await verifyContract(await getOrDeployProxy(BALANCE, "BalanceUpgradable", BalanceUpgradable))
  await utils.registerWithContract(utils.REGISTRATION_TYPE.BALANCE, results.handler, results.upgradableBalances)
  await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.upgradableBalances, results.handler)
  save()
  // /* UPGRADE */
  // await utils.upgradeProxy(Deployments[0].upgradableBalances.address, "BalanceUpgradable", BalanceUpgradable)
  
  // /* BALANCE */
  // results.balanceStorage = await verifyContract(await getOrDeploy(BALANCE_STORAGE, "BalanceStorage", BalanceStorage))
  // results.balances = await verifyContract(await getOrDeploy(BALANCE, "Balance", Balance, results.balanceStorage.address), [results.balanceStorage.address])
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.BALANCE, results.handler, results.balances)
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.balances, results.handler)

  // /* BALANCE OLD DEPLOYMENT METHOD */
  // // results.balances = await utils.deploy("Balance", Balance, results.balanceStorage.address)
  // // results.balances = VERIFY? await utils.verify(results.balances, [results.balanceStorage.address]): results.balances
  // // await utils.registerWithContract(utils.REGISTRATION_TYPE.BALANCE, results.handler, results.balances)
  // // await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.balances, results.handler)

  // /* CLAIM */
  // results.claimStorage = await verifyContract(await getOrDeploy(CLAIM_STORAGE, "ClaimStorage", ClaimStorage))
  // results.claimed = await verifyContract(await getOrDeploy(CLAIMED, "Claimed", Claimed, results.claimStorage.address), [results.claimStorage.address])
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.CLAIM, results.handler, results.claimed)
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.claimed, results.handler)

  // /* CLAIM UPGRADABLE */
  results.upgradableClaim = await verifyContract(await getOrDeployProxy(BALANCE, "ClaimedUpgradable", ClaimedUpgradable))
  await utils.registerWithContract(utils.REGISTRATION_TYPE.CLAIM, results.handler, results.upgradableClaim)
  await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.upgradableClaim, results.handler)
  save()
  /* UPGRADE */
  // await utils.upgradeProxy(PROXY, "ClaimedUpgradable", ClaimedUpgradable)

  // /* ERC1155 Factory */
  results.erc1155Factory = await verifyContract(await getOrDeployProxy(ERC1155FACTORY_PROXY, "ERC1155Factory", ERC1155Factory, [results.handler.address]))
  await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.erc1155Factory)
  save()
  // results.erc1155Base = await verifyAddress({address: await results.erc1155Factory.contract.erc1155Implementation()})
  // /* Upgrade ERC1155 Factory */
  // let factory = await utils.upgradeProxy(Deployments[0].erc1155Factory.address, "ERC1155Factory", ERC1155Factory)
  // await verifyAddress({address: factory.delegation})
  
  // /* ERC1155 UPGRADABLE */
  // results.upgradableERC1155 = await verifyContract(await getOrDeployProxy(results.upgradableERC1155? results.upgradableERC1155 : null, "ERC1155Upgradable", ERC1155Upgradable, ["Name","Smb"]))
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.ERC1155, results.handler, results.upgradableERC1155)
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.upgradableERC1155, results.handler)
  // // /* UPGRADE */
  // await utils.upgradeProxy(Deployments[0].upgradableERC1155.address, "ERC1155Upgradable", ERC1155Upgradable)

  // // /* ERC721 Factory */
  results.erc721Factory = await verifyContract(await getOrDeployProxy(ERC721FACTORY_PROXY, "ERC721Factory", ERC721Factory, [results.handler.address]))
  await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.erc721Factory)
  save()
  // results.erc721Base = await verifyAddress({address: await results.erc721Factory.contract.erc721Implementation()})

  // /* Upgrade ERC721 Factory */
  // factory = await utils.upgradeProxy(Deployments[0].erc721Factory.address, "ERC721Factory", ERC721Factory)
  // await verifyAddress({address: factory.delegation})

  
  // // /* ERC20 Factory */
  results.erc20Factory = await verifyContract(await getOrDeployProxy(ERC20FACTORY_PROXY, "ERC20Factory", ERC20Factory, [results.handler.address]))
  await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.erc20Factory)
  save()
  // results.erc20Base = await verifyAddress({address: await results.erc20Factory.contract.erc20Implementation()})
  
  // /* Upgrade ERC20 Factory */
  // await utils.upgradeProxy(Deployments[0].erc20Factory.address, "ERC20Factory", ERC20Factory)

  // /* Staking Factory */
  results.stakingFactory = await verifyContract(await getOrDeployProxy(STAKINGFACTORY_PROXY, "StakingFactory", StakingFactory, [results.handler.address]))
  await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.stakingFactory)
  save()
  // results.stakingBase = await verifyAddress({address: await results.stakingFactory.contract.stakingImplementation()})

  // /* ContractNFT Factory */
  // results.contractNFTFactory = await verifyContract(await getOrDeployProxy(Deployments[0].contractNFTFactory, "ContractNFTFactory", ContractNFTFactory))
  // results.contractNFTBase = await verifyAddress({address: await results.contractNFTFactory.contract.implementation()})
  // await utils.upgradeProxy(Deployments[0].contractNFTFactory.address, "ContractNFTFactory", ContractNFTFactory)

  // results.upgradableTest = await verifyContract(await getOrDeployProxy(Deployments[0].upgradableTest, "UpgradableTest", UpgradableTest))
  // await utils.upgradeProxy(results.upgradableTest.address, "UpgradableTestV2", UpgradableTestV2)

  /* Save Results */
  save()


  /* utils */

  function save(){
    Deployments.reverse().push(utils.formatResults(results))
    utils.saveFile(Deployments.reverse(), "./deployed.json")
  }

  async function getOrDeploy(proxy, className, contractClass, args = null) {
    return proxy ? { verified: true, address: proxy.address, contract: await utils.getContract(proxy.address, className, _deployer), registrations: proxy.registrations } : await utils.deploy(className, contractClass, args);
  }
  
  async function getOrDeployProxy(proxy, className, contractClass, args = []) {
    return proxy ? { verified: true, address: proxy.address, contract: await utils.getContract(proxy.address, className, _deployer), registrations: proxy.registrations } : await utils.deployProxy(className, contractClass, args);
  }
  
  async function verifyContract(deployment, args = []) {
    return VERIFY && !deployment.verified ? await utils.verify(deployment, args) : deployment;
  }
  
  async function verifyAddress(deployment, args = []) {
    return VERIFY && !deployment.verified? await utils.verifyAddress(deployment): deployment
  }
}



main();