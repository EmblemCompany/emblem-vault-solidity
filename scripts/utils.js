const { ethers, upgrades} = require("hardhat");
const REGISTRATION_TYPE = {"EMPTY": 0, "ERC1155": 1, "ERC721":2, "HANDLER":3, "ERC20":4, "BALANCE":5, "CLAIM":6, "UNKNOWN":7, "FACTORY":8, "STAKING":9}

async function deploy(name, ContractClass, constructorArgs = null) {
    console.log("Deploying", name)
    let contract = await ContractClass.deploy(...constructorArgs)
    await contract.deployed()
    console.log(name, "deployed to", contract.address)
    return {action: "deploy", address: contract.address, contract: contract, verified: false, registrations: []}
}

async function deployProxy(name, ContractClass, constructorArgs = []) {
    console.log("Deploying Proxy", name)
    let contract = await upgrades.deployProxy(ContractClass, constructorArgs)
    await contract.deployed()
    console.log(name, "deployed to", contract.address)
    const implementationAddress = await getImplementationAddress(contract.address);
    return {action: "deploy", address: contract.address, delegation: implementationAddress, contract: contract, verified: false, registrations: []}
}

async function upgradeProxy(PROXY, name, ContractClass, constructorArgs = []) {
    console.log("Upgrading", name)
    let contract = await upgrades.upgradeProxy(PROXY, ContractClass, constructorArgs);
    await contract.deployed()
    const implementationAddress = await getImplementationAddress(contract.address);
    console.log(name, "upgraded to", implementationAddress)
    return {address: contract.address, delegation: implementationAddress, contract: contract, verified: false, registrations: []}
}

async function verify(contractResult, constructor = []) {
    let address = contractResult.delegation ? contractResult.delegation : contractResult.address
    console.log("Verifying contract at address", address )
    let results = await verifyAddress(address, constructor)
    return { action: contractResult.action, contract: contractResult.contract, delegation: contractResult.delegation? contractResult.delegation : null, address: contractResult.address, verified: results.verified, registrations: contractResult.registrations}
}

async function verifyAddress(address, constructor = []) {
    console.log("sleeping 5 seconds")
    await new Promise(resolve => setTimeout(resolve, 5000));
    try {
        await hre.run("verify:verify", {
            address: address,
            constructorArguments: constructor,
        })
        return { address: address, verified: true }
    } catch (e) {
        let reason
        try {
            reason = e.toString().split("Reason: ")[1].split(" at ")[0]
        } catch(err) {
            reason = "Unknown " + e + " " +err
        }
        if (reason.includes("does not have bytecode") || reason.includes("has no bytecode") || reason.includes("but its bytecode doesn't")) {
            console.log("Trying again : etherscan is slow")
            return await(verifyAddress(address, constructor))
        } else {
            console.log("Error reason:", reason)
            return { address: address, verified: reason.includes("already verified")? true: false }
        }    
    }
}

async function registerWithContract(registrationType, registerWhere, contractResult) {
    console.log("registering", registerWhere.address, registrationType)
    let results = {registered: contractResult.address, asType: registrationType}
    let found = registerWhere.registrations.filter(registration => { return registration.registered == contractResult.address && registration.asType == registrationType }).length > 0? true : false
    if (!found) {
        await registerWhere.contract.registerContract(contractResult.address, registrationType)
        contractResult.contractType = registrationType
        registerWhere.registrations.push(results)
    }
    return results
}

async function getImplementationAddress(proxyAddress) {
    const implHex = await ethers.provider.getStorageAt(
        proxyAddress,
        "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
    );
    return ethers.utils.hexStripZeros(implHex);
}

function formatResults(results) {
    let formatted = {time: results.time}
    Object.keys(results).forEach((key, index)=>{
        key!= "time"? formatted[key] = {
            address: results[key].address? results[key].address: null,
            delegation: results[key].delegation? results[key].delegation: null, 
            verified: results[key].verified? results[key].verified: false,
            registrations: results[key].registrations? results[key].registrations: [],
            contractType: results[key].contractType? results[key].contractType: 7
        } : null
    })
    Object.keys(formatted).forEach((key, index)=>{
        if (key.includes("Factory") && !formatted[key].clones) {
            formatted[key].clones = []
        }
    })

    // console.log(formatted)
    return formatted
}

function saveFile(content, fileName) {
    const fs = require('fs')
    try {
        fs.writeFileSync(fileName, JSON.stringify(content, null, 4))
    } catch (err) {
        console.error(err)
    }
}

async function getOrDeploy(proxyAddress, className, contractClass, args = null) {
    let [_deployer] = await hre.ethers.getSigners();
    proxyAddress? console.log("Looking up contract from deployment") : null
    return proxyAddress ? { verified: true, address: proxyAddress, contract: await getContract(proxyAddress, className, _deployer) } : await deploy(className, contractClass, args);
}
  
async function getOrDeployProxy(proxyAddress, className, contractClass, args = []) {
    let [_deployer] = await hre.ethers.getSigners();
    proxyAddress? console.log("Looking up contract from deployment") : null
    return proxyAddress? { verified: true, address: proxyAddress, contract: await getContract(proxyAddress, className, _deployer)}: await deployProxy(className, contractClass, args);
}

async function getContract(address, _class, signer) {
    let ABI = require("../artifacts/contracts/"+_class+".sol/"+_class+".json")
    let contract = new hre.ethers.Contract(address, ABI.abi, signer)
    return contract;
}

async function perform(deployment, method, args = []) {
    console.log("Attempting to perform", method, args, deployment.action)
    if(deployment.contract && deployment.action == "deploy") {
        console.log("Performing", method, args)
        let tx = await deployment.contract[method](...args)
        await tx.wait(1)
    }
}

module.exports = {
    deploy,
    verify,
    deployProxy,
    verifyAddress,
    getImplementationAddress,
    registerWithContract,
    formatResults,
    upgradeProxy,
    saveFile,
    getContract,
    getOrDeploy,
    getOrDeployProxy,
    perform,
    REGISTRATION_TYPE
}