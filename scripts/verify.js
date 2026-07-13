const { ethers, upgrades} = require("hardhat");
const spawn = require('await-spawn')

let HANDLER_ADDRESS //= "0x6a042F1752EF3eaB5D7efBE25994f7c2D14E2a35"
let ADDRESS = "0x5434ba8b4a37755cb3867c9fde39342c0d382857"
async function main() {
  const [_deployer] = await hre.ethers.getSigners();
  console.log("Verifying", ADDRESS)
  await verify(ADDRESS)
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
    console.log("error",e)
    // return console.log("Reason", e.toString().split("Reason: ")[1].split(" at ")[0])
    const msg = (e && (e.shortMessage || e.message || e.toString())) || "";
    const m = msg.match(/Reason:\\s*(.*?)(?:\\s+at\\s+|$)/);
    console.log("Error reason:", m ? m[1] : msg);
  }
}

async function getHandler(address, signer) {
  let ABI = require("../artifacts/contracts/VaultHandlerV8.sol/VaultHandlerV8.json")
  let contract = new hre.ethers.Contract(address, ABI.abi, signer)
  return contract;
}