const { ethers, upgrades} = require("hardhat");
const spawn = require('await-spawn')

const utils = require("./utils")
let HANDLER_ADDRESS = "0x404d4FfB1887aA8Ca5973B4F1C5257DE4d887D59"
let VERIFY = true
let results = {}
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

  /* HANDLER */
  results.handler = HANDLER_ADDRESS? {address: HANDLER_ADDRESS, contract: await getHandler(HANDLER_ADDRESS, _deployer)}: await utils.deploy("Vault handler", VaultHandlerV8);
  // results.handler = VERIFY? await utils.verify(results.handler): results.handler
  
  // /* BALANCE */
  // results.balanceStorage = await utils.deploy("Balance storage", BalanceStorage)
  // results.balanceStorage = VERIFY? await utils.verify(results.balanceStorage): results.balanceStorage
  // results.balances = await utils.deploy("Balance", Balance, results.balanceStorage.address)
  // results.balances = VERIFY? await utils.verify(results.balances, [results.balanceStorage.address]): results.balances
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.BALANCE, results.handler, results.balances)
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.balances, results.handler)

  // /* CLAIM */
  // results.claimStorage = await utils.deploy("Claim storage", ClaimStorage)
  // results.claimStorage = VERIFY? await utils.verify(results.claimStorage): results.claimStorage
  // results.claimed = await utils.deploy("Claim", Claimed, results.claimStorage.address)
  // results.claimed = VERIFY? await utils.verify(results.claimed, [results.claimStorage.address]): results.claimed
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.CLAIM, results.handler, results.claimed)
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.HANDLER, results.claimed, results.handler)

  // /* ERC1155 Factory */
  // results.erc1155Factory = await utils.deployProxy("ERC1155Factory", ERC1155Factory, [results.handler.address])
  // results.erc1155Factory = VERIFY? await utils.verify(results.erc1155Factory): results.erc1155Factory
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.erc1155Factory)
  // results.erc1155Base = {address: await results.erc1155Factory.contract.erc1155Implementation()}
  // results.erc1155Base = VERIFY? await utils.verifyAddress(results.erc1155Base.address): results.erc1155Base
  
  // /* ERC721 Factory */
  // results.erc721Factory = await utils.deployProxy("ERC721Factory", ERC721Factory, [results.handler.address])
  // results.erc721Factory = VERIFY? await utils.verify(results.erc721Factory): results.erc721Factory
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.erc721Factory)
  // results.erc721Base = {address: await results.erc721Factory.contract.erc721Implementation()}
  // results.erc721Base = VERIFY? await utils.verifyAddress(results.erc721Base.address): results.erc721Base

  /* ERC20 Factory */
  results.erc20Factory = await utils.deployProxy("ERC20Factory", ERC20Factory, [results.handler.address])
  results.erc20Factory = VERIFY? await utils.verify(results.erc20Factory): results.erc20Factory
  await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.erc20Factory)
  results.erc20Base = {address: await results.erc20Factory.contract.erc20Implementation()}
  results.erc20Base = VERIFY? await utils.verifyAddress(results.erc20Base.address): results.erc20Base

  // /* Staking Factory */
  // results.stakingFactory = await utils.deployProxy("StakingFactory", StakingFactory, [results.handler.address])
  // results.stakingFactory = VERIFY? await utils.verify(results.stakingFactory): results.stakingFactory
  // await utils.registerWithContract(utils.REGISTRATION_TYPE.FACTORY, results.handler, results.stakingFactory)
  // results.stakingBase = {address: await results.stakingFactory.contract.stakingImplementation()}
  // results.stakingBase = VERIFY? await utils.verifyAddress(results.stakingBase.address): results.stakingBase
  
  utils.formatResults(results)
}

main();

async function getHandler(address, signer) {
  let ABI = require("../artifacts/contracts/VaultHandlerV8.sol/VaultHandlerV8.json")
  let contract = new hre.ethers.Contract(address, ABI.abi, signer)
  return contract;
}