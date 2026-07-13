const { ethers, upgrades} = require("hardhat");
const spawn = require('await-spawn')
const utils = require("./utils")
var request = require('request')
const fs = require('fs')
let deploymentsFilename = "./deployed"+("-"+process.env.NETWORK || "-unknown-network")+".json"
let Deployments = fs.existsSync(deploymentsFilename) ? require("."+deploymentsFilename) : {}

let VERIFY = process.env.NETWORK == "polygon" || process.env.NETWORK == "mainnet" || process.env.NETWORK == "goerli" ? true: false
let results = {time: Date.now()}
let EXTRA = false
let TARGET = false // was 'ERC721A' — false so only the handler upgrade below runs

async function main() {
  const [_deployer] = await hre.ethers.getSigners();
  const BulkMinter = await hre.ethers.getContractFactory("BulkMinter");
  const VaultHandlerV8 = await hre.ethers.getContractFactory("VaultHandlerV8");
  const VaultHandlerV8Upgradable = await hre.ethers.getContractFactory("VaultHandlerV8Upgradable");
  const VaultHandlerV7a = await hre.ethers.getContractFactory("VaultHandlerV7a");
  const EmblemVault = await hre.ethers.getContractFactory("EmblemVault");
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
  const ERC1155UpgradableBatch = await ethers.getContractFactory("ERC1155UpgradableBatch");
  const ContractNFTFactory = await ethers.getContractFactory("ContractNFTFactory");
  const UpgradableTest = await hre.ethers.getContractFactory("UpgradableTest");
  const UpgradableTestV2 = await hre.ethers.getContractFactory("UpgradableTestV2");
  const MintVaultQuote = await hre.ethers.getContractFactory("MintVaultQuote");
  const MintScribe = await hre.ethers.getContractFactory("MintScribe");
  const EmblemVault721AUpgradeable = await hre.ethers.getContractFactory("EmblemVault721AUpgradeable");
  const EmblemVault721AUpgradeableFees = await hre.ethers.getContractFactory("EmblemVault721AUpgradeableFees");
  const ERC1155SerialManager = await hre.ethers.getContractFactory("ERC1155SerialManager");

  results = Deployments
  results.handler_upgradable = await verifyContract(await getOrDeployProxy(results.handler_upgradable, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable))

  // /* QUOTE UPGRADABLE */
  // results.quote = await verifyContract(await getOrDeployProxy(results.quote, "MintVaultQuote", MintVaultQuote))
  // upgrade
  // await verifyContract(await utils.upgradeProxy(results.quote.address, "MintVaultQuote", MintVaultQuote))
  // save()
  

  // // /* RENTAL UPGRADABLE */
  // results.rental = await verifyContract(await getOrDeployProxy(results.rental, "Rental", Rental))
  // save()

  // results.rental2 = await verifyContract(await getOrDeployProxy(results.rental2, "Rental", Rental))
  // save()
  

  // // /* Bytes2Uint */
  // results.bytes2uint = await verifyContract(await getOrDeployProxy(results.bytes2uint, "Bytes2Uint", Bytes2Uint))
  // save()



  // // /* LEGACY COVAL */
  // results.legacycoval = await verifyContract(await getOrDeploy(results.legacycoval, "ConfigurableERC20Upgradable", ConfigurableERC20Upgradable))
  // save()

  // // /* LEGACY HANDLER */
  // let deployArgs = [results.legacyvault.address, results.legacycoval.address, _deployer.address, 10 ]
  // results.legacyhandler = await verifyContract(await getOrDeploy(results.legacyhandler, "VaultHandlerV8", VaultHandlerV7, deployArgs), deployArgs)
  // // save()

  // /* LEGACY HANDLER a  */
  // let deployArgs = ["0x8b8407c6184f1f0Fd1082e83d6A3b8349cAcEd12", "0x4597c8A59Ab28B36840B82B3A674994A279593D0", _deployer.address, 250 ]
  // results.legacyhandler_a = await verifyContract(await getOrDeploy(results.legacyhandler_a, "VaultHandlerV7a", VaultHandlerV7a, deployArgs), deployArgs)
  // save()

  // /* Bulk Minter */
  // results.bulk_minter = await verifyContract(await getOrDeployProxy(results.bulk_minter, "BulkMinter", BulkMinter))
  // save()

  // /* HANDLER */
  // results.handler = await verifyContract(await getOrDeploy(results.handler, "VaultHandlerV8", VaultHandlerV8))
  // results.handler.action != "get"? await utils.perform(results.handler, "initialize"): null
  // results.handler.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.handler, results.handler) : null // register handler with self to allow callbacks
  // save()

  // /* LEGACY Emblem Vault */
  // results.legacyvault = await verifyContract(await getOrDeploy(results.legacyvault, "EmblemVaultV2", EmblemVaultV2))
  // save()

  /* UPGRADABLE ERC1155 NO Factory */
  // results.upgradableERC1155_Cursed = await verifyContract(await getOrDeployProxy(results.upgradableERC1155_CURATED, "ERC1155Upgradable", ERC1155Upgradable))
  // save()


  /* UPGRADE */
  // await verifyContract(await utils.upgradeProxy(results.upgradableERC1155.address, "ERC1155Upgradable", ERC1155Upgradable))
  /* Register */
  // results.upgradableERC1155_CURATED.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.ERC1155, results.handler, results.upgradableERC1155_CURATED): null
  // results.upgradableERC1155_CURATED.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.upgradableERC1155_CURATED, results.handler): null
  // save()

  // // /* BALANCE UPGRADABLE */
  // results.upgradableBalances = await verifyContract(await getOrDeployProxy(results.upgradableBalances, "BalanceUpgradable", BalanceUpgradable))
  // results.upgradableBalances.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.BALANCE, results.handler, results.upgradableBalances): null
  // results.upgradableBalances.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.upgradableBalances, results.handler): null
  // // results.upgradableBalances = await verifyContract(await utils.upgradeProxy(results.upgradableBalances.address, "BalanceUpgradable", BalanceUpgradable))
  // save()

  // // /* CLAIM UPGRADABLE */
  // results.upgradableClaim = await verifyContract(await getOrDeployProxy(results.upgradableClaim, "ClaimedUpgradable", ClaimedUpgradable))
  // save()
  // results.upgradableClaim.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.CLAIM, results.handler, results.upgradableClaim): null
  // results.upgradableClaim.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.upgradableClaim, results.handler): null
  // save()
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

  // /* ERC721 Upgradable no factory */
  // results.upgradableERC721_Cursed = await verifyContract(await getOrDeployProxy(results.upgradableERC721_Cursed, "EmblemVault", EmblemVault))
  // results.upgradableERC721_Cursed.action != "get"? await utils.perform(results.upgradableERC721_Cursed, "changeName", ['Cursed Ordinals','crsd']): null
  // results.upgradableERC721_Cursed.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.ERC721, results.handler, results.upgradableERC721_Cursed): null
  // results.upgradableERC721_Cursed.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.upgradableERC721_Cursed, results.handler): null
  // save()
  
  // /* ERC20 Factory */
  // results.erc20Factory = await verifyContract(await getOrDeployProxy(results.erc20Factory, "ERC20Factory", ERC20Factory))
  // results.erc20Factory.action != "get"? await utils.perform(results.erc20Factory, "initializeStage2", [results.handler.address]): null
  // results.erc20Factory.action != "get"? await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.erc20Factory): null
  // save()
  // results.erc20Factory = await verifyContract(await utils.upgradeProxy(results.erc20Factory.address, "ERC721Factory", ERC721Factory))

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

  // Upgrade _RP
  // results.upgradableERC1155_Unassigned = await verifyContract(await utils.upgradeProxy(results.upgradableERC1155_Unassigned, "ERC1155Upgradable", ERC1155Upgradable))
  // save()
  // /* HANDLER UPGRADEABLE */
  //  results.handler_upgradable = await verifyContract(await getOrDeployProxy(results.handler_upgradable, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable))
  //  results.upgradableClaim = await verifyContract(await getOrDeployProxy(results.upgradableClaim, "ClaimedUpgradable", ClaimedUpgradable))
  //  results.upgradableERC1155 = await verifyContract(await getOrDeployProxy(results.upgradableERC1155, "ERC1155Upgradable", ERC1155Upgradable))
  //  results.upgradableERC1155_RP = await verifyContract(await getOrDeployProxy(results.upgradableERC1155_RP, "ERC1155Upgradable", ERC1155Upgradable))
  //  results.upgradableERC1155_SOG = await verifyContract(await getOrDeployProxy(results.upgradableERC1155_SOG, "ERC1155Upgradable", ERC1155Upgradable))
  //  results.upgradableERC721_Rinkeby = await verifyContract(await getOrDeployProxy(results.upgradableERC721_Rinkeby, "EmblemVault721AUpgradeable", EmblemVault721AUpgradeable))
  //  save()
  //  results.handler_upgradable.action != "get"? await utils.perform(results.handler_upgradable, "initialize") : null
  /* Upgrade */
  // results.handler_upgradable = await verifyContract(await utils.upgradeProxy(results.handler_upgradable.address, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable))
  // save()

  
  // await quickRegister(results.handler_upgradable, utils.REGISTRATION_TYPE.HANDLER, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable, results.handler_upgradable)
  // await quickRegister(results.upgradableERC1155, utils.REGISTRATION_TYPE.ERC1155, "ERC1155Upgradable", ERC1155Upgradable, results.handler_upgradable)
  // await quickRegister(results.handler_upgradable, utils.REGISTRATION_TYPE.HANDLER, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable, results.upgradableERC1155)
  // await quickRegister(results.upgradableClaim, utils.REGISTRATION_TYPE.CLAIM, "ClaimedUpgradable", ClaimedUpgradable, results.handler_upgradable)
  // await quickRegister(results.handler_upgradable, utils.REGISTRATION_TYPE.HANDLER, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable, results.upgradableClaim)
  // await quickRegister(results.upgradableERC1155_RP, utils.REGISTRATION_TYPE.ERC1155, "ERC1155Upgradable", ERC1155Upgradable, results.handler_upgradable)
  // await quickRegister(results.handler_upgradable, utils.REGISTRATION_TYPE.HANDLER, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable, results.upgradableERC1155_RP)
  // await quickRegister(results.upgradableERC1155_SOG, utils.REGISTRATION_TYPE.ERC1155, "ERC1155Upgradable", ERC1155Upgradable, results.handler_upgradable)
  // await quickRegister(results.handler_upgradable, utils.REGISTRATION_TYPE.HANDLER, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable, results.upgradableERC1155_SOG)
  // await quickRegister(results.upgradableERC721_Cursed, utils.REGISTRATION_TYPE.ERC721, "EmblemVault", EmblemVault, results.handler_upgradable)
  // await quickRegister(results.handler_upgradable, utils.REGISTRATION_TYPE.HANDLER, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable, results.upgradableERC721_Cursed)
  


  // results.upgradableERC721_Ethscription = await verifyContract(await getOrDeployProxy(results.upgradableERC721_Ethscription, "EmblemVault", EmblemVault))
  // await quickRegister(results.upgradableERC721_Ethscription, utils.REGISTRATION_TYPE.ERC721, "EmblemVault", EmblemVault, results.handler_upgradable)
  // await quickRegister(results.handler_upgradable, utils.REGISTRATION_TYPE.HANDLER, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable, results.upgradableERC721_Ethscription)
  // results.upgradableERC721_Ethscription = await verifyContract(await utils.upgradeProxy(results.upgradableERC721_Ethscription.address, "EmblemVault", EmblemVault))
  // results.upgradableERC721_Cursed = await verifyContract(await utils.upgradeProxy(results.upgradableERC721_Cursed.address, "EmblemVault", EmblemVault))
  // save()
  /* Handler Upgrade */
  results.handler_upgradable = await verifyContract(await utils.upgradeProxy(results.handler_upgradable.address, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable))
  save()

  // results.upgradableScribeMint = await getOrDeployProxy(results.upgradableScribeMint, "MintScribe", MintScribe)
  // results.upgradableScribeMint = await verifyContract(await getOrDeployProxy(results.upgradableScribeMint, "MintScribe", MintScribe))
  // results.upgradableScribeMint = await verifyContract(await utils.upgradeProxy(results.upgradableScribeMint.address, "MintScribe", MintScribe))
  
  //* Upgradable ERC721A */
  // let deployArgs = ["Counterparty", "XCP" ]
  // results.upgradable721A_Belinals = await verifyContract(await getOrDeployProxy(results.upgradable721A_Belinals, "EmblemVault721AUpgradeable", EmblemVault721AUpgradeable, deployArgs))
  // save()
  // await quickRegister(results.upgradable721A_Belinals, utils.REGISTRATION_TYPE.ERC721, "EmblemVault721AUpgradeable", EmblemVault721AUpgradeable, results.handler_upgradable)
  // await quickRegister(results.handler_upgradable, utils.REGISTRATION_TYPE.HANDLER, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable, results.upgradable721A_Belinals)
  /* Upgrade */
  // results.upgradable721A_OXBT = await verifyContract(await utils.upgradeProxy(results.upgradable721A_OXBT.address, "EmblemVault721AUpgradeable", EmblemVault721AUpgradeable))
  // save()
  // results.upgradable721A_Ordi = await verifyContract(await utils.upgradeProxy(results.upgradable721A_Ordi.address, "EmblemVault721AUpgradeable", EmblemVault721AUpgradeable))
  // save()
  /* goerli */
  // results.upgradable721A_Ordi = await verifyContract(await getOrDeployProxy(results.upgradable721A_Ordi, "EmblemVault721AUpgradeable", EmblemVault721AUpgradeable, deployArgs))
  // results.upgradable721A_Ordi = await verifyContract(await utils.upgradeProxy(results.upgradable721A_Ordi.address, "EmblemVault721AUpgradeable", EmblemVault721AUpgradeable))
  // save()
  // let deployArgs = ["Rinkeby", "rinkeby" ]
  // results.upgradable721A_Rinkeby = await verifyContract(await getOrDeployProxy(results.upgradable721A_Rinkeby, "EmblemVault721AUpgradeable", EmblemVault721AUpgradeable, deployArgs))
  // await quickRegister(results.upgradable721A_Rinkeby, utils.REGISTRATION_TYPE.ERC721, "EmblemVault", EmblemVault, results.handler_upgradable)
  // await quickRegister(results.handler_upgradable, utils.REGISTRATION_TYPE.HANDLER, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable, results.upgradable721A_Rinkeby)
  // save()

  // let deployArgs = ["Stamps", "STAMPS"]
  // results.upgradableERC721A_Stamps = await verifyContract(await getOrDeployProxy(results.upgradableERC721A_Stamps, "EmblemVault721AUpgradeable", EmblemVault721AUpgradeable, deployArgs))
  // save()
  // await quickRegister(results.upgradableERC721A_Stamps, utils.REGISTRATION_TYPE.ERC721, "EmblemVault", EmblemVault, results.handler_upgradable)
  // await quickRegister(results.handler_upgradable, utils.REGISTRATION_TYPE.HANDLER, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable, results.upgradableERC721A_Stamps)
  // save()

  // await deployAndRegisterContract('dot_btc', 'ERC721a', 'BitcoinDomains','.btc')
  // await deployAndRegisterContract('bitcoinPunks', 'ERC721a', 'BitcoinPunks','BTCPunks')
  // await deployAndRegisterContract('blockheads', 'ERC721a', 'Blockheads','BNMC')
  // await deployAndRegisterContract('filthyFiat', 'ERC721a', 'FilthyFiat','FF')
  // await deployAndRegisterContract('dot_id', 'ERC721a', 'IDIdentities','ID')
  // await deployAndRegisterContract('litecoinPunks', 'ERC721a', 'LitecoinPunks','LTCPunks')
  // await deployAndRegisterContract('megaPunks', 'ERC721a', 'MegaPunks','MPunks')
  // await deployAndRegisterContract('punycodes', 'ERC721a', 'PunyCodes','PUNY')
  // await deployAndRegisterContract('twelveFold', 'ERC721a', 'TwelveFold','TF')
  // await deployAndRegisterContract('twitterEggs', 'ERC721a', 'TwitterEggs','EGGS')
  // await deployAndRegisterContract('ageOfRust', 'ERC1155')
  // await deployAndRegisterContract('bitcornCrops', 'ERC1155')
  // await deployAndRegisterContract('bitgirls', 'ERC1155')
  // await deployAndRegisterContract('forceOfWill', 'ERC1155')
  // await deployAndRegisterContract('memoryChain', 'ERC1155')
  // await deployAndRegisterContract('oasisMining', 'ERC1155')
  // await deployAndRegisterContract('sarutobiIsland', 'ERC1155')

  // if (EXTRA) {

    // await deployAndRegisterContract('unused_1', 'ERC1155')
    // await deployAndRegisterContract('unused_2', 'ERC1155')
    // await deployAndRegisterContract('unused_3', 'ERC1155')
    // await deployAndRegisterContract('unused_4', 'ERC1155')
    // await deployAndRegisterContract('unused_5', 'ERC1155')
    // await deployAndRegisterContract('unused_6', 'ERC1155')
    // await deployAndRegisterContract('unused_7', 'ERC1155')
    // await deployAndRegisterContract('unused_8', 'ERC1155')
    // await deployAndRegisterContract('unused_9', 'ERC1155')
    // await deployAndRegisterContract('unused_10', 'ERC1155')

    // await deployAndRegisterContract('unused_1', 'ERC721a', 'unused_1','1')
    // await deployAndRegisterContract('unused_2', 'ERC721a', 'unused_2','2')
    // await deployAndRegisterContract('unused_3', 'ERC721a', 'unused_3','3')
    // await deployAndRegisterContract('unused_4', 'ERC721a', 'unused_4','4')
    // await deployAndRegisterContract('unused_5', 'ERC721a', 'unused_5','5')
    // await deployAndRegisterContract('unused_6', 'ERC721a', 'unused_6','6')
    // await deployAndRegisterContract('unused_7', 'ERC721a', 'unused_7','7')
    // await deployAndRegisterContract('unused_8', 'ERC721a', 'unused_8','8')
    // await deployAndRegisterContract('unused_9', 'ERC721a', 'unused_9','9')
    // await deployAndRegisterContract('unused_10', 'ERC721a', 'unused_10','10')  
  // }

  // await deployContract('721aWithFee4', 'ERC721aFee', '721aWithFee', '721fee')
  // results.upgradableERC721aFee_721aWithFee4 = await verifyContract(await utils.upgradeProxy(results.upgradableERC721aFee_721aWithFee4.address, "EmblemVault721AUpgradeableFees", EmblemVault721AUpgradeableFees))

  // await deployContract('upgradableERC1155_Batch', 'ERC1155Batch')
  // results.upgradableERC1155_Batch = await verifyContract(await utils.upgradeProxy(results.upgradableERC1155_Batch.address, "ERC1155UpgradableBatch", ERC1155UpgradableBatch))
  // results.upgradableERC1155_unused_10 = await verifyContract(await utils.upgradeProxy(results.upgradableERC1155_unused_10.address, "ERC1155Upgradable", ERC1155Upgradable))
  // results.upgradableERC721_Ethscription = await verifyContract(await utils.upgradeProxy(results.upgradableERC721_Ethscription.address, "EmblemVault", EmblemVault))
  
  // results.erc1155SerialManager_Test = await verifyContract(await getOrDeployProxy(results.erc1155SerialManager_Test, "ERC1155SerialManager", ERC1155SerialManager))
  // results.erc1155SerialManager_Test = await verifyContract(await utils.upgradeProxy(results.erc1155SerialManager_Test.address, "ERC1155SerialManager", ERC1155SerialManager))
  


  if (TARGET) {
    if (TARGET == 'ERC1155') {
      // await upgradeContractAt(results.upgradableERC1155_SOG)
      // await upgradeContractAt(results.upgradableERC1155_FakeRares)
      // await upgradeContractAt(results.upgradableERC1155_DankRares)
      // await upgradeContractAt(results.upgradableERC1155_FakeCommons)
      // await upgradeContractAt(results.upgradableERC1155_sarutobiIsland)
      // await upgradeContractAt(results.upgradableERC1155_AgeOfChains)
      // await upgradeContractAt(results.upgradableERC1155_ageOfRust)
      // await upgradeContractAt(results.upgradableERC1155_bitcornCrops)
      // await upgradeContractAt(results.upgradableERC1155_bitgirls)
      // await upgradeContractAt(results.upgradableERC1155_forceOfWill)
      // await upgradeContractAt(results.upgradableERC1155_memoryChain)
      // await upgradeContractAt(results.upgradableERC1155_oasisMining)
      // await upgradeContractAt(results.upgradableERC1155_bitcoinApes)
      // await upgradeContractAt(results.upgradableERC1155_RP)
      // await upgradeContractAt(results.upgradableERC1155_Bells)
      // await upgradeContractAt(results.upgradableERC1155_unused_10)
      // await deployAndRegisterContract('unused_11', 'ERC1155')
      // await deployAndRegisterContract('unused_12', 'ERC1155')
      // await deployAndRegisterContract('unused_13', 'ERC1155')
      // await deployAndRegisterContract('unused_14', 'ERC1155')
      // await deployAndRegisterContract('unused_15', 'ERC1155')
      // await deployAndRegisterContract('unused_16', 'ERC1155')
      // await deployAndRegisterContract('unused_17', 'ERC1155')
      // await deployAndRegisterContract('unused_18', 'ERC1155')
      // await deployAndRegisterContract('unused_19', 'ERC1155')
      // await deployAndRegisterContract('unused_20', 'ERC1155')
      save()
      console.log("done")
    } else if (TARGET == 'ERC721') {
      // await upgradeContractAt(results.upgradableERC721_Cursed)
      // await upgradeContractAt(results.upgradableERC721_Ethscription)
      save()
      console.log("done")
    } else if (TARGET == 'ERC721A') {
      // await upgradeContractAt(results.upgradableERC721a_HoneyBadgers) // curated
      // await upgradeContractAt(results.upgradableERC721a_Ordi) // curated
      // await upgradeContractAt(results.upgradableERC721a_Rinkeby) // curated
      // await upgradeContractAt(results.upgradableERC721a_Counterparty) // curated
      // await upgradeContractAt(results.upgradableERC721a_Stamps) // curated (not allowed yet) (needs image handler)
      // await upgradeContractAt(results.upgradableERC721a_BitcoinOrdinals) // curated (not allowed yet) (needs image handler)
      // await upgradeContractAt(results.upgradableERC721a_Dogeparty) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_DogepartyStamps) // DEAD
      // await upgradeContractAt(results.upgradableERC721a_EmblemOpen) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_Litecoin) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_LitecoinOrdinals) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_LitecoinPunks) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_MonaParty) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_Namecoin) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_Solana) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_Stacks) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_Tezos) // curated (not allowed yet) (needs balance handler) (address needed)
      // await upgradeContractAt(results.upgradableERC721a_dot_btc) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_BitcoinPunks) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_Blockheads) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_filthyFiat) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_dot_id) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_megaPunks) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_punycodes) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_twelveFold) // curated (not allowed yet) (needs balance handler)
      // await upgradeContractAt(results.upgradableERC721a_twitterEggs)
      // await upgradeContractAt(results.upgradableERC721a_bitcoinDeGods)
      // await upgradeContractAt(results.upgradableERC721a_BitcoinFrogs)
      // await upgradeContractAt(results.upgradableERC721a_ordinalMaxiBiz)
      // await upgradeContractAt(results.upgradableERC721a_nodeMonkes)
      // await upgradeContractAt(results.upgradableERC721a_bitmap)
      // await upgradeContractAt(results.upgradableERC721a_ordinalPunks)
      // await upgradeContractAt(results.upgradableERC721a_bitcoinRocks)
      // await upgradeContractAt(results.upgradableERC721a_onChainMonkey)
      // await deployAndRegisterContract('unused_11', 'ERC721a', 'unused_11','11')
      // await deployAndRegisterContract('unused_12', 'ERC721a', 'unused_12','12')  
      // await deployAndRegisterContract('unused_13', 'ERC721a', 'unused_13','13')  
      // await deployAndRegisterContract('unused_14', 'ERC721a', 'unused_14','14')  
      // await deployAndRegisterContract('unused_15', 'ERC721a', 'unused_15','15')  
      // await deployAndRegisterContract('unused_16', 'ERC721a', 'unused_16','16')  
      // await deployAndRegisterContract('unused_17', 'ERC721a', 'unused_17','17')
      // await deployAndRegisterContract('unused_18', 'ERC721a', 'unused_18','18')  
      // await deployAndRegisterContract('unused_19', 'ERC721a', 'unused_19','19')  
      // await deployAndRegisterContract('unused_20', 'ERC721a', 'unused_20','20')  
      // await deployAndRegisterContract('unused_21', 'ERC721a', 'unused_21','21')  
      // await deployAndRegisterContract('unused_22', 'ERC721a', 'unused_22','22')
      // await deployAndRegisterContract('unused_23', 'ERC721a', 'unused_23','23')
      // await deployAndRegisterContract('unused_24', 'ERC721a', 'unused_24','24')
      // await deployAndRegisterContract('unused_25', 'ERC721a', 'unused_25','25')
      // await deployAndRegisterContract('unused_26', 'ERC721a', 'unused_26','26')
      // await deployAndRegisterContract('unused_27', 'ERC721a', 'unused_27','27')
      // await deployAndRegisterContract('unused_28', 'ERC721a', 'unused_28','28')
      // await deployAndRegisterContract('unused_29', 'ERC721a', 'unused_29','29')
      // await deployAndRegisterContract('Belinals', 'ERC721a', 'Belinals','Belinals')
      save()
      // await deployAndRegisterContract('upgradableERC721a_bitcoinDeGods', 'ERC721a', 'Bitcoin DeGods', 'DeGods')
      console.log("done")
    } else {
      results.handler_upgradable = await verifyContract(await utils.upgradeProxy(results.handler_upgradable.address, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable))
      save()
    }
  }

  async function upgradeContractAt(location) {
    console.log('item', location.toString())
    let contractType = {type:'', name:''}
    switch (TARGET) {
      case 'ERC1155':
        contractType = {type: ERC1155Upgradable, name: 'ERC1155Upgradable'}
        break;
      case 'ERC721':
        contractType = {type: EmblemVault, name: 'EmblemVault'}
        break;
      case 'ERC721A':
        contractType = {type: EmblemVault721AUpgradeable, name: 'EmblemVault721AUpgradeable'}
        break;
    }
    location = await verifyContract(await  utils.upgradeProxy(location.address, contractType.name, contractType.type))
    return save()
  }


  async function deployAndRegisterContract(jsonLocation, type, name, symbol) {
    await deployContract(jsonLocation, type, name, symbol)
    await registerContracts(jsonLocation, type)
    await mintPlaceholder("upgradable"+type+"_"+jsonLocation)
  }
  async function handleRemoteOperations(jsonLocation, type, name, symbol) {    
    //* IMPORTANT */
    // turn on overloadSerial for each contract
    // add bypass rule to each contract for handler of 0x156e29f6 <-- mint with serial
    await serializableAndOverride("upgradable"+type+"_"+jsonLocation)
  }

  async function deployContract(jsonLocation, type, name, symbol) {
    jsonLocation = `upgradable${type}_${jsonLocation}`
    let deployArgs = name && symbol ? [name, symbol] : []
    let contract = {
      target : type == 'ERC1155'? ERC1155Upgradable : type == 'ERC1155Batch'? ERC1155UpgradableBatch : type == 'ERC721a'? EmblemVault721AUpgradeable : type == 'ERC721aFee' ? EmblemVault721AUpgradeableFees : null,
      name: type == 'ERC1155'? 'ERC1155Upgradable' : type == 'ERC1155Batch'? 'ERC1155UpgradableBatch' : type == 'ERC721a' ? 'EmblemVault721AUpgradeable' : type == 'ERC721aFee'? 'EmblemVault721AUpgradeableFees' : null,
    }
    results[jsonLocation] = await verifyContract(await getOrDeployProxy(results[jsonLocation], contract.name, contract.target, deployArgs));
    save();    
  }

  async function registerContracts(jsonLocation, type) {
    jsonLocation = `upgradable${type}_${jsonLocation}`
    let contract = {
      target : type == 'ERC1155'? ERC1155Upgradable : type == 'ERC721a'? EmblemVault721AUpgradeable : null,
      name: type == 'ERC1155'? 'ERC1155Upgradable' : type == 'ERC721a'? 'EmblemVault721AUpgradeable' : null,
      registrationType: type == 'ERC1155'? utils.REGISTRATION_TYPE.ERC1155 : type == 'ERC721a'? utils.REGISTRATION_TYPE.ERC721 : null,
    }
    results[jsonLocation] = await verifyContract(await getOrDeployProxy(results[jsonLocation], contract.name, contract.target));
    save();
    await quickRegister(results[jsonLocation], contract.registrationType, contract.name, contract.target, results.handler_upgradable)
    await quickRegister(results.handler_upgradable, utils.REGISTRATION_TYPE.HANDLER, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable, results[jsonLocation]);
    save();

    // await quickRegister(upgradableERC721A_Counterparty, utils.REGISTRATION_TYPE.ERC721, 'EmblemVault721AUpgradeable', EmblemVault721AUpgradeable, results.handler_upgradable)
    // await quickRegister(results.handler_upgradable, utils.REGISTRATION_TYPE.HANDLER, "VaultHandlerV8Upgradable", VaultHandlerV8Upgradable, upgradableERC721A_Counterparty);
    // save();
  }

  /* utils */

  async function quickRegister(target, registrationType, contractName, contractObject, subject){
    let _target
    if (subject.registrations.filter(item=>{return item.registered == target.address && item.asType == registrationType}).length == 0) {
     _target = await verifyContract(await getOrDeployProxy(target, contractName, contractObject))
      await utils.registerWithContract(registrationType, subject, _target)
    } else {
      console.log(`-- already registered ${_target?_target.address:'err'} as type ${registrationType} on handler at ${subject.address}`)
    }
    save()
    return target
  }

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
    let contract, owner
    if (proxy) {
      contract = await utils.getContract(proxy.address, className, _deployer)
      owner = await contract.owner()
    }
    return proxy ? { action: "get", verified: proxy.verified, address: proxy.address, contractType: proxy.contractType, delegation: proxy.delegation, contract: contract, registrations: proxy.registrations, owner: owner } : await utils.deployProxy(className, contractClass, args);
  }
  
  async function verifyContract(deployment, args = []) {
    return VERIFY && !deployment.verified ? await utils.verify(deployment, args) : deployment;
  }

  async function mintPlaceholder(name) {
    var options = {
      'method': 'POST',
      'url': `https://v2.emblemvault.io:443/setUriMintPlaceholder/${name}`,
      'headers': {
        'x-api-key': '86430779-f8ac-4fb4-be14-d5b9a0eca964'
      },
      form: {

      }
    };
    return new Promise((resolve, reject) => {
      request(options, function (error, response) {
        if (error) reject(error);
        resolve(response.body);
      });
    });
  }

  
  async function serializableAndOverride(name) {
    var options = {
      'method': 'POST',
      'url': `https://v2.emblemvault.io:443/serializableAndOverride/${name}`,
      'headers': {
        'x-api-key': '86430779-f8ac-4fb4-be14-d5b9a0eca964'
      },
      form: {

      }
    };
    return new Promise((resolve, reject) => {
      request(options, function (error, response) {
        if (error) reject(error);
        resolve(response.body);
      });
    });
  }
}



main();