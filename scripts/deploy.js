const { ethers, upgrades} = require("hardhat");
const spawn = require('await-spawn')

let HANDLER_ADDRESS //= "0x6a042F1752EF3eaB5D7efBE25994f7c2D14E2a35"

async function main() {
  const [_deployer] = await hre.ethers.getSigners();
  const VaultHandlerV8 = await hre.ethers.getContractFactory("VaultHandlerV8");
  const ERC1155Factory = await ethers.getContractFactory("ERC1155Factory");
  const ERC721Factory = await ethers.getContractFactory("ERC721Factory");
  const ERC20Factory = await ethers.getContractFactory("ERC20Factory");
  const Storage = await ethers.getContractFactory("Storage");
  const Claimed = await ethers.getContractFactory("Claimed");
  const BalanceStorage = await ethers.getContractFactory("BalanceStorage");
  const Balance = await ethers.getContractFactory("Balance");

  console.log("Deploying balance storage")
  let balanceStorage =  await BalanceStorage.deploy()
  await balanceStorage.deployed()  
  console.log("Balance storage deployed to", balanceStorage.address)
  
  await verify(balanceStorage.address)
  process.exit(1)
  
  let balances = await Balance.deploy(balanceStorage.address)
  await balances.deployed()
  console.log("Balance deployed to", balances.address)

  console.log("Deploying claim storage")
  let claimStorage =  await Storage.deploy()
  await claimStorage.deployed()
  console.log("Claim storage deployed to", claimStorage.address)
  let claimed = await Claimed.deploy(claimStorage.address)
  await claimed.deployed()
  console.log("Claim deployed to", claimed.address)
  
  let master
  if (!HANDLER_ADDRESS) {
    console.log("Deploying Handler...");
    master = await VaultHandlerV8.deploy()
    // master = await hre.upgrades.deployProxy(VaultHandlerV8);
    await master.deployed()
    console.log("Handler deployed to", master.address)
    
  } else {
    console.log("Getting Handler at address", HANDLER_ADDRESS);
    master = await getHandler(HANDLER_ADDRESS, _deployer)
  }
  // process.exit(1)
  console.log("Deploying ERC1155Factory...")
  factory = await hre.upgrades.deployProxy(ERC1155Factory, [master.address]);
  await factory.deployed()
  console.log("ERC1155Factory deployed to:", factory.address);

  let erc1155 = await factory.erc1155Implementation();
  console.log('erc1155', erc1155);


  console.log("Deploying ERC721Factory...")
  factory = await hre.upgrades.deployProxy(ERC721Factory, [master.address]);
  await factory.deployed()
  console.log("ERC721Factory deployed to:", factory.address);
  let erc721 = await factory.erc721Implementation();
  console.log('erc721', erc721);

  console.log("Deploying ERC20Factory...")
  factory = await hre.upgrades.deployProxy(ERC20Factory, [master.address]);
  await factory.deployed()
  console.log("ERC20Factory deployed to:", factory.address);
  let erc20 = await factory.erc20Implementation();
  console.log('erc20', erc20);
}

main();

async function verify(address, constructor = []) {
  console.log("sleeping a sec")
  await new Promise(resolve => setTimeout(resolve, 1000));
  try {
    return await hre.run("verify:verify", {
      address: address,
      constructorArguments: constructor,
    });
  } catch (e) {
    // console.log("error",e)
    return console.log("Reason", e.toString().split("Reason: ")[1].split(" at ")[0])
  }
}

async function getHandler(address, signer) {
  let ABI = require("../artifacts/contracts/VaultHandlerV8.sol/VaultHandlerV8.json")
  let contract = new hre.ethers.Contract(address, ABI.abi, signer)
  return contract;
}