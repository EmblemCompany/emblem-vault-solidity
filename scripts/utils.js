const REGISTRATION_TYPE = {"EMPTY": 0, "ERC1155": 1, "ERC721":2, "HANDLER":3, "ERC20":4, "BALANCE":5, "CLAIM":6, "UNKNOWN":7, "FACTORY":8, "STAKING":9}

async function deploy(name, ContractClass, constructorArgs = null) {
    console.log("Deploying", name)
    let contract = await ContractClass.deploy(constructorArgs)
    await contract.deployed()
    console.log(name, "deployed to", contract.address)
    return {address: contract.address, contract: contract, verified: false}
}

async function deployProxy(name, ContractClass, constructorArgs = []) {
    console.log("Deploying", name)
    let contract = await hre.upgrades.deployProxy(ContractClass, constructorArgs)
    await contract.deployed()
    console.log(name, "deployed to", contract.address)
    const implementationAddress = await getImplementationAddress(contract.address);
    return {address: contract.address, delegation: implementationAddress, contract: contract, verified: true}
}

async function verify(contractResult, constructor = []) {
    let address = contractResult.delegation ? contractResult.delegation : contractResult.address
    let results = await verifyAddress(address, constructor)
    return { contract: contractResult.contract, delegation: contractResult.delegation? contractResult.delegation : null, address: contractResult.address, verified: results.verified }
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
        if (reason.includes("does not have bytecode") || reason.includes("has no bytecode")) {
            console.log("Trying again : etherscan is slow")
            return await(verifyAddress(address, constructor))
        } else {
            console.log("Error reason:", reason)
            return { address: address, verified: false }
        }    
    }
}

async function registerWithContract(registrationType, registerWhere, contractResult) {
    await registerWhere.contract.registerContract(contractResult.address, registrationType)
    // contractResult.registeredWith = []
    return contractResult
}

async function getImplementationAddress(proxyAddress) {
    const implHex = await ethers.provider.getStorageAt(
        proxyAddress,
        "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
    );
    return ethers.utils.hexStripZeros(implHex);
}

function formatResults(results) {
    let formatted = {}
    Object.keys(results).forEach((key, index)=>{
        formatted[key] = {address: results[key]?.address? results[key].address: null , delegation: results[key]?.delegation? results[key]?.delegation: null, verified: results[key]?.verified? results[key]?.verified: false  }
    })
    console.log(formatted)
}
module.exports = {
    deploy,
    verify,
    deployProxy,
    verifyAddress,
    getImplementationAddress,
    registerWithContract,
    formatResults,
    REGISTRATION_TYPE
}