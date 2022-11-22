const { ethers, upgrades} = require("hardhat");
const spawn = require('await-spawn')
const utils = require("./utils")
const fs = require('fs')
let deploymentsFilename = "./deployed"+("-"+process.env.NETWORK || "-unknown-network")+".json"
let Deployments = fs.existsSync(deploymentsFilename) ? require("."+deploymentsFilename) : {}

let VERIFY = process.env.NETWORK == "goerli" ? true: false
let results = {time: Date.now()}


async function main() {
  const [_deployer] = await hre.ethers.getSigners();
  const VaultHandlerV8 = await hre.ethers.getContractFactory("VaultHandlerV8");
  const VaultHandlerV7 = await hre.ethers.getContractFactory("VaultHandlerV7");
  // const EmblemVaultV2 = await hre.ethers.getContractFactory("EmblemVaultV2");
  const ERC1155Factory = await ethers.getContractFactory("ERC1155Factory");
  const ERC721Factory = await ethers.getContractFactory("ERC721Factory");
  const ERC20Factory = await ethers.getContractFactory("ERC20Factory");
  const StakingFactory = await ethers.getContractFactory("StakingFactory");
  const BalanceUpgradable = await ethers.getContractFactory("BalanceUpgradable");
  const ClaimedUpgradable = await ethers.getContractFactory("ClaimedUpgradable");
  const Rental = await ethers.getContractFactory("Rental");
  const ConfigurableERC20Upgradable = await ethers.getContractFactory("ConfigurableERC20Upgradable");
  const Bytes2Uint = await ethers.getContractFactory("Bytes2Uint");
  const ERC1155Upgradable = await ethers.getContractFactory("ERC1155Upgradable");
  const ContractNFTFactory = await ethers.getContractFactory("ContractNFTFactory");
  const UpgradableTest = await hre.ethers.getContractFactory("UpgradableTest");
  const UpgradableTestV2 = await hre.ethers.getContractFactory("UpgradableTestV2");

  results = Deployments
  

  // // /* RENTAL UPGRADABLE */
  // results.rental = await verifyContract(await getOrDeployProxy(results.rental, "Rental", Rental))
  // save()

  // results.rental2 = await verifyContract(await getOrDeployProxy(results.rental2, "Rental", Rental))
  // save()
  

  // // /* Bytes2Uint */
  // results.bytes2uint = await verifyContract(await getOrDeployProxy(results.bytes2uint, "Bytes2Uint", Bytes2Uint))
  // save()

  // // /* LEGACY Emblem Vault */
  // results.legacyvault = await verifyContract(await getOrDeploy(results.legacyvault, "EmblemVaultV2", EmblemVaultV2))
  // save()

  // // /* LEGACY COVAL */
  // results.legacycoval = await verifyContract(await getOrDeploy(results.legacycoval, "ConfigurableERC20Upgradable", ConfigurableERC20Upgradable))
  // save()

  // // /* LEGACY HANDLER */
  // let deployArgs = [results.legacyvault.address, results.legacycoval.address, _deployer.address, 10 ]
  // results.legacyhandler = await verifyContract(await getOrDeploy(results.legacyhandler, "VaultHandlerV8", VaultHandlerV7, deployArgs), deployArgs)
  // // save()

  // /* HANDLER */
  results.handler = await verifyContract(await getOrDeploy(results.handler, "VaultHandlerV8", VaultHandlerV8))
  results.handler.action != "get"? await utils.perform(results.handler, "initialize"): null
  results.handler.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.handler, results.handler) : null // register handler with self to allow callbacks
  save()

  /* UPGRADABLE ERC1155 NO Factory */
  results.upgradableERC1155 = await verifyContract(await getOrDeployProxy(results.upgradableERC1155, "ERC1155Upgradable", ERC1155Upgradable))
  // save()
  /* UPGRADE */
  // await utils.upgradeProxy(results.upgradableERC1155.address, "ERC1155Upgradable", ERC1155Upgradable)
  /* Register */
  results.upgradableERC1155.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.ERC1155, results.handler, results.upgradableERC1155): null
  results.upgradableERC1155.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.upgradableERC1155, results.handler): null
  save()

  // // /* BALANCE UPGRADABLE */
  // results.upgradableBalances = await verifyContract(await getOrDeployProxy(results.upgradableBalances, "BalanceUpgradable", BalanceUpgradable))
  // results.upgradableBalances.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.BALANCE, results.handler, results.upgradableBalances): null
  // results.upgradableBalances.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.upgradableBalances, results.handler): null
  // // results.upgradableBalances = await verifyContract(await utils.upgradeProxy(results.upgradableBalances.address, "BalanceUpgradable", BalanceUpgradable))
  // save()

  // // /* CLAIM UPGRADABLE */
  results.upgradableClaim = await verifyContract(await getOrDeployProxy(results.upgradableClaim, "ClaimedUpgradable", ClaimedUpgradable))
  save()
  results.upgradableClaim.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.CLAIM, results.handler, results.upgradableClaim): null
  results.upgradableClaim.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.upgradableClaim, results.handler): null
  save()
  // /* UPGRADE */
  // await utils.upgradeProxy('0x3958951e27f69Ad57ee64b62C1216ac7B2B73dd3', "ClaimedUpgradable", ClaimedUpgradable)

  // /* ERC1155 Factory */
  // results.erc1155Factory = await verifyContract(await getOrDeployProxy(results.erc1155Factory, "ERC1155Factory", ERC1155Factory))
  // results.erc1155Factory.action != "get"? await utils.perform(results.erc1155Factory, "initializeStage2", [results.handler.address]): null
  // results.erc1155Factory.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.erc1155Factory): null
  // save()
  // // results.erc1155Factory = await verifyContract(await utils.upgradeProxy(results.erc1155Factory.address, "ERC1155Factory", ERC1155Factory))
  // //let tx = await results.erc1155Factory.contract.updateImplementation()
  // //await tx.wait(1)
  // await results.erc1155Factory.contract.createClone(_deployer.address)

  // results.erc1155 = await verifyContract(await getOrDeployProxy(results.erc1155, "ERC1155Upgradable", ERC1155Upgradable))
  // results.erc1155.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.ERC1155, results.handler, results.erc1155): null
  // save()
  
  // /* ERC721 Factory */
  // results.erc721Factory = await verifyContract(await getOrDeployProxy(results.erc721Factory, "ERC721Factory", ERC721Factory))
  // results.erc721Factory.action != "get"? await utils.perform(results.erc721Factory, "initializeStage2", [results.handler.address]): null
  // results.erc721Factory.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.erc721Factory): null
  // save()
  // // results.erc721Factory = await verifyContract(await utils.upgradeProxy(results.erc721Factory.address, "ERC721Factory", ERC721Factory))
  
  // /* ERC20 Factory */
  // results.erc20Factory = await verifyContract(await getOrDeployProxy(results.erc20Factory, "ERC20Factory", ERC20Factory))
  // results.erc20Factory.action != "get"? await utils.perform(results.erc20Factory, "initializeStage2", [results.handler.address]): null
  // results.erc20Factory.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.erc20Factory): null
  // save()
  // // results.erc20Factory = await verifyContract(await utils.upgradeProxy(results.erc20Factory.address, "ERC721Factory", ERC721Factory))

  // // /* Staking Factory */
  // // results.stakingFactory = await verifyContract(await getOrDeployProxy(STAKINGFACTORY_PROXY, "StakingFactory", StakingFactory, [results.handler.address]))
  // // await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.stakingFactory)
  // // save()
  // // results.stakingBase = await verifyAddress({address: await results.stakingFactory.contract.stakingImplementation()})

  // // /* ContractNFT Factory */
  // // results.contractNFTFactory = await verifyContract(await getOrDeployProxy(Deployments.contractNFTFactory, "ContractNFTFactory", ContractNFTFactory))
  // // results.contractNFTBase = await verifyAddress({address: await results.contractNFTFactory.contract.implementation()})
  // // await utils.upgradeProxy(Deployments.contractNFTFactory.address, "ContractNFTFactory", ContractNFTFactory)

  // /* Upgradable Test */
  // results.upgradableTest = await verifyContract(await getOrDeployProxy(Deployments.upgradableTest, "UpgradableTest", UpgradableTest))
  // await utils.upgradeProxy(results.upgradableTest.address, "UpgradableTestV2", UpgradableTestV2)

  /* Save Results */
  // save()


  /* utils */

  function save(){
    Object.keys(results).filter(items=>{ return items != "time"}).forEach((key, index)=>{
      Deployments[key] = results[key]
    })
    let formatted = utils.formatResults(JSON.parse(JSON.stringify(Deployments)))
    
    utils.saveFile(formatted, deploymentsFilename)
  }

  async function getOrDeploy(proxy, className, contractClass, args = []) {
    return proxy ? { action: "get", verified: proxy.verified, address: proxy.address, contractType: proxy.contractType, delegation: proxy.delegation, contract: await utils.getContract(proxy.address, className, _deployer), registrations: proxy.registrations } : await utils.deploy(className, contractClass, args);
  }
  
  async function getOrDeployProxy(proxy, className, contractClass, args = []) {
    return proxy ? { action: "get", verified: proxy.verified, address: proxy.address, contractType: proxy.contractType, delegation: proxy.delegation, contract: await utils.getContract(proxy.address, className, _deployer), registrations: proxy.registrations } : await utils.deployProxy(className, contractClass, args);
  }
  
  async function verifyContract(deployment, args = []) {
    return VERIFY && !deployment.verified ? await utils.verify(deployment, args) : deployment;
  }
}



main();