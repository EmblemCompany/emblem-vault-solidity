const { CID } = require('multiformats/cid');
const crypto = require('crypto')
const fs = require('fs');
const path = require('path')
const { ethers, upgrades } = require('hardhat');
const Web3 = require('web3');
const { util } = require('chai');
const HDWalletProvider = require("@truffle/hdwallet-provider")
require('dotenv').config()
class Util {
  all = ethers.utils.formatBytes32String("")
  _cid = "0x" + this.toHexString(CID.parse('bafybeifpcgydc47j67wv7chqzbi56sbnee72kenmn5si66wpkqnghxsbx4').toJSON().hash).slice(4);
  toHexString (bytes) {
    return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
  }
  async deploy (price) {
    const [_deployer, u1, u2] = await ethers.getSigners();
    this.alice = u1;
    this.bob = u2;
    this.deployer = _deployer;
    let Factory = await ethers.getContractFactory('Factory');
    this.factory = await Factory.deploy()
    await this.factory.deployed();
    await fs.promises.mkdir(path.resolve(__dirname, "../artifacts"), { recursive: true }).catch((e) => {})
    await fs.promises.writeFile(path.resolve(__dirname, "../artifacts/Deployed.json"), JSON.stringify({ address: this.factory.address }))
    let signers = await ethers.getSigners();
    this.signers = signers
    this.addresses = signers.map((s) => {
      return s.address
    })
  }
  async deployBalanceUpgradable(deployType = null) {
    const [_deployer, u1, u2] = await ethers.getSigners();
    this.alice = u1;
    this.bob = u2;
    this.deployer = _deployer;
    let BalanceUpgradable = await ethers.getContractFactory('BalanceUpgradable');
    if (deployType && deployType == "upgradable") {
      this.balanceUpgradable = await upgrades.deployProxy(BalanceUpgradable)
    } else {
      this.balanceUpgradable = await BalanceUpgradable.deploy()
      await this.balanceUpgradable.initialize()
    }
    await this.balanceUpgradable.deployed();
    await fs.promises.mkdir(path.resolve(__dirname, "../artifacts"), { recursive: true }).catch((e) => {})
    await fs.promises.writeFile(path.resolve(__dirname, "../artifacts/Deployed.json"), JSON.stringify({ address: this.balanceUpgradable.address }))
    let signers = await ethers.getSigners();
    this.signers = signers
    this.addresses = signers.map((s) => {
      return s.address
    })
  }
  async deployERC721Factory(deployType = null) {
    const [_deployer, u1, u2] = await ethers.getSigners();
    this.alice = u1;
    this.bob = u2;
    this.deployer = _deployer;
    let ERC721Factory = await ethers.getContractFactory('ERC721Factory');
    if (deployType && deployType == "upgradable") {
      this.erc721Factory = await upgrades.deployProxy(ERC721Factory)
    } else {
      this.erc721Factory = await ERC721Factory.deploy()
      await this.handler.registerContract(this.erc721Factory.address, 8)
      await this.erc721Factory.deployed();
      await this.erc721Factory.initialize()
      
      await this.erc721Factory.initializeStage2(this.handler.address)
    }
    
    await this.erc721Factory.createClone(this.deployer.address)
    let clones = await this.erc721Factory.getClones()
    this.erc721Factory.clone = this.getContract(clones[0], 'EmblemVault', _deployer)
    await this.handler.registerContract(this.erc721Factory.address, 2)
    this.emblem = this.erc721Factory.clone // temporary till I clean up tests
    await fs.promises.mkdir(path.resolve(__dirname, "../artifacts"), { recursive: true }).catch((e) => {})
    await fs.promises.writeFile(path.resolve(__dirname, "../artifacts/Deployed.json"), JSON.stringify({ address: this.erc721Factory.address }))
    let signers = await ethers.getSigners();
    this.signers = signers
    this.addresses = signers.map((s) => {
      return s.address
    })
  }
  async deployERC20Factory(deployType = null) {
    const [_deployer, u1, u2] = await ethers.getSigners();
    this.alice = u1;
    this.bob = u2;
    this.deployer = _deployer;
    let ERC20Factory = await ethers.getContractFactory('ERC20Factory');
    if (deployType && deployType == "upgradable") {
      this.erc20Factory = await upgrades.deployProxy(ERC20Factory)
    } else {
      this.erc20Factory = await ERC20Factory.deploy()
      await this.handler.registerContract(this.erc20Factory.address, 8)
      await this.erc20Factory.deployed();
      await this.erc20Factory.initialize()
      await this.erc20Factory.initializeStage2(this.handler.address)
    }
    
    await this.erc20Factory.createClone(this.deployer.address)
    let clones = await this.erc20Factory.getClones()
    this.erc20Factory.clone = this.getContract(clones[0], 'ConfigurableERC20Upgradable', _deployer)
    await this.erc20Factory.clone.changeContractDetails("ERC20Clone", "clone", 8)
    await this.handler.registerContract(this.erc20Factory.address, 2)
    this.erc20 = this.erc20Factory.clone // temporary till I clean up tests
    await fs.promises.mkdir(path.resolve(__dirname, "../artifacts"), { recursive: true }).catch((e) => {})
    await fs.promises.writeFile(path.resolve(__dirname, "../artifacts/Deployed.json"), JSON.stringify({ address: this.erc20Factory.address }))
    let signers = await ethers.getSigners();
    this.signers = signers
    this.addresses = signers.map((s) => {
      return s.address
    })
  }

  async deployHandler() {
    const [_deployer, u1, u2] = await ethers.getSigners();
    this.alice = u1;
    this.bob = u2;
    this.deployer = _deployer;
    let VaultHandlerV8 = await ethers.getContractFactory('VaultHandlerV8');
    this.handler = await VaultHandlerV8.deploy()
    await this.handler.deployed();
    await this.handler.initialize()
    await fs.promises.mkdir(path.resolve(__dirname, "../artifacts"), { recursive: true }).catch((e) => {})
    await fs.promises.writeFile(path.resolve(__dirname, "../artifacts/Deployed.json"), JSON.stringify({ address: this.handler.address }))
    let signers = await ethers.getSigners();
    this.signers = signers
    this.addresses = signers.map((s) => {
      return s.address
    })
  }
  async deployERC1155Upgradable(deployType = null) {
    const [_deployer, u1, u2] = await ethers.getSigners();
    this.alice = u1;
    this.bob = u2;
    this.deployer = _deployer;
    let ERC1155Factory = await ethers.getContractFactory('ERC1155Factory');
    if (deployType && deployType == "upgradable") {
      this.erc1155Factory = await upgrades.deployProxy(ERC1155Factory)
    } else {
      this.erc1155Factory = await ERC1155Factory.deploy()
      await this.handler.registerContract(this.erc1155Factory.address, 8)
      await this.erc1155Factory.deployed();
      await this.erc1155Factory.initialize()
      await this.erc1155Factory.initializeStage2(this.handler.address)
    }
    
    await this.erc1155Factory.createClone(this.deployer.address)
    let clones = await this.erc1155Factory.getClones()
    this.erc1155Factory.clone = this.getContract(clones[0], 'ERC1155Upgradable', _deployer)
    // await this.erc1155Factory.clone.changeContractDetails("ERC20Clone", "clone", 8)
    await this.handler.registerContract(this.erc1155Factory.address, 2)
    this.erc1155 = this.erc1155Factory.clone // temporary till I clean up tests
    await fs.promises.mkdir(path.resolve(__dirname, "../artifacts"), { recursive: true }).catch((e) => {})
    await fs.promises.writeFile(path.resolve(__dirname, "../artifacts/Deployed.json"), JSON.stringify({ address: this.erc1155Factory.address }))
    let signers = await ethers.getSigners();
    this.signers = signers
    this.addresses = signers.map((s) => {
      return s.address
    })
  }

  // async deployERC1155Upgradable (handler) {
  //   const [_deployer, u1, u2] = await ethers.getSigners();
  //   this.alice = u1;
  //   this.bob = u2;
  //   this.deployer = _deployer;
    
  //   let ERC1155Factory = await ethers.getContractFactory('ERC1155Factory');
  //   this.erc1155Factory =await ERC1155Factory.deploy(handler.address)
  //   await this.erc1155Factory.deployed();
  //   await this.handler.registerContract(this.erc1155Factory.address, 8)
    
  //   let clones = [];
  //   console.log('--------> handler address', this.handler.address)
  //   console.log('-------------------- registered with handler ----', await this.handler.isRegistered(this.erc1155Factory.address, 8))
  //   console.log('-------------------- erc1155Implementation ----', clones = [await this.erc1155Factory.erc1155Implementation()])
  //   console.log('-------------------- erc1155Implementation owner ----', await (await this.getContract(clones[0], "ERC1155Upgradable", _deployer)).owner())
  //   console.log('-------------------- erc1155Implementation name ----', await (await this.getContract(clones[0], "ERC1155Upgradable", _deployer)).name())
  //   console.log('-------------------- Factory ----', await this.erc1155Factory.address)
  //   console.log('--------> Factory handler address',await this.erc1155Factory.handlerAddress())
  //   console.log('haldner owner', await this.handler.owner())
  //   console.log('--------------------------- version -----', await this.erc1155Factory.version())
  //   await this.erc1155Factory.createClone(_deployer.address, "ERC1155", "1155")
  //    clones = await this.erc1155Factory.getClones()
  //   console.log('--------------------------- clones -----', clones)
    
  //   this.erc1155Clone = this.getContract(clones[0], "ERC1155Upgradable", _deployer)

  //   await fs.promises.mkdir(path.resolve(__dirname, "../artifacts"), { recursive: true }).catch((e) => {})
  //   await fs.promises.writeFile(path.resolve(__dirname, "../artifacts/Deployed.json"), JSON.stringify({ address: this.factory.address }))
  //   let signers = await ethers.getSigners();
  //   this.signers = signers
  //   this.addresses = signers.map((s) => {
  //     return s.address
  //   })
  // }
  async deployContractNFTFactory(deployType = null) {
    const [_deployer, u1, u2] = await ethers.getSigners();
    this.alice = u1;
    this.bob = u2;
    this.deployer = _deployer;
    let ContractNFTFactory = await ethers.getContractFactory('ContractNFTFactory');
    if (deployType && deployType == "upgradable") {
      this.contractNFTFactory = await upgrades.deployProxy(ContractNFTFactory)
    } else {
      this.contractNFTFactory = await ContractNFTFactory.deploy()
      await this.handler.registerContract(this.contractNFTFactory.address, 8)
      await this.contractNFTFactory.deployed();
      await this.contractNFTFactory.initialize()
    }
    
    await this.contractNFTFactory.createClone(this.deployer.address, 789)
    let clones = await this.contractNFTFactory.getClones()
    this.contractNFTFactory.clone = this.getContract(clones[0], 'ContractNFT', _deployer)
    this.contractNFT = this.contractNFTFactory.clone // temporary till I clean up tests
    await fs.promises.mkdir(path.resolve(__dirname, "../artifacts"), { recursive: true }).catch((e) => {})
    await fs.promises.writeFile(path.resolve(__dirname, "../artifacts/Deployed.json"), JSON.stringify({ address: this.contractNFTFactory.address }))
    let signers = await ethers.getSigners();
    this.signers = signers
    this.addresses = signers.map((s) => {
      return s.address
    })
  }
  async deployTestFactory(deployType = null) {
    const [_deployer, u1, u2] = await ethers.getSigners();
    this.alice = u1;
    this.bob = u2;
    this.deployer = _deployer;
    
    let TestFactory = await ethers.getContractFactory('TestFactory');
    if (deployType && deployType == "upgradable") {
      this.testFactory = await upgrades.deployProxy(TestFactory)
    } else {
      this.testFactory = await TestFactory.deploy()
      await this.testFactory.initialize()
    }
    
    await this.testFactory.deployed();

    await fs.promises.mkdir(path.resolve(__dirname, "../artifacts"), { recursive: true }).catch((e) => {})
    await fs.promises.writeFile(path.resolve(__dirname, "../artifacts/Deployed.json"), JSON.stringify({ address: this.testFactory.address }))

    let signers = await ethers.getSigners();
    this.signers = signers
    this.addresses = signers.map((s) => {
      return s.address
    })
  }
  async upgradeTestFactory() {
    const [_deployer, u1, u2] = await ethers.getSigners();
    this.alice = u1;
    this.bob = u2;
    this.deployer = _deployer;
    
    let TestFactoryV2 = await ethers.getContractFactory('TestFactoryV2');
    this.testFactory = await upgrades.upgradeProxy(this.testFactory.address, TestFactoryV2);
    await this.testFactory.deployed();

    await fs.promises.mkdir(path.resolve(__dirname, "../artifacts"), { recursive: true }).catch((e) => {})
    await fs.promises.writeFile(path.resolve(__dirname, "../artifacts/Deployed.json"), JSON.stringify({ address: this.testFactory.address }))

    let signers = await ethers.getSigners();
    this.signers = signers
    this.addresses = signers.map((s) => {
      return s.address
    })
  }
  async deployClaimedUpgradable(deployType = null) {
    const [_deployer, u1, u2] = await ethers.getSigners();
    this.alice = u1;
    this.bob = u2;
    this.deployer = _deployer;
    let ClaimedUpgradable = await ethers.getContractFactory('ClaimedUpgradable');
    if (deployType && deployType == "upgradable") {
      this.claimedUpgradable = await upgrades.deployProxy(ClaimedUpgradable)
    } else {
      this.claimedUpgradable = await ClaimedUpgradable.deploy()
      await this.claimedUpgradable.initialize()
    }
    await this.claimedUpgradable.deployed();
    await fs.promises.mkdir(path.resolve(__dirname, "../artifacts"), { recursive: true }).catch((e) => {})
    await fs.promises.writeFile(path.resolve(__dirname, "../artifacts/Deployed.json"), JSON.stringify({ address: this.claimedUpgradable.address }))
    let signers = await ethers.getSigners();
    this.signers = signers
    this.addresses = signers.map((s) => {
      return s.address
    })
  }
  // async deployClaimedUpgradable() {
  //   const [_deployer, u1, u2] = await ethers.getSigners();
  //   this.alice = u1;
  //   this.bob = u2;
  //   this.deployer = _deployer;
    
  //   let ClaimedUpgradable = await ethers.getContractFactory('ClaimedUpgradable');
  //   this.claimedUpgradable =await ClaimedUpgradable.deploy(ClaimedUpgradable)
  //   await this.handler.registerContract(this.claimedUpgradable.address, 6)
  //   await this.claimedUpgradable.deployed();
  //   await this.claimedUpgradable.registerContract(this.handler.address, 6)

  //   await fs.promises.mkdir(path.resolve(__dirname, "../artifacts"), { recursive: true }).catch((e) => {})
  //   await fs.promises.writeFile(path.resolve(__dirname, "../artifacts/Deployed.json"), JSON.stringify({ address: this.claimedUpgradable.address }))
  //   let signers = await ethers.getSigners();
  //   this.signers = signers
  //   this.addresses = signers.map((s) => {
  //     return s.address
  //   })
  // }
  getFactory (signer) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/Factory.sol/Factory.json"))
    let contract = new ethers.Contract(this.factory.address, ABI.abi, signer)
    return contract;
  }
  getHandler (address, signer = this.deployer) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/VaultHandlerV8.sol/VaultHandlerV8.json"))
    let contract = new ethers.Contract(address, ABI.abi, signer)
    return contract;
  }
  getERC20 (address, signer) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/ConfigurableERC20Upgradable.sol/ConfigurableERC20Upgradable.json"))
    let contract = new ethers.Contract(address, ABI.abi, signer)
    return contract;
  }
  getEmblemVault (address, signer) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/EmblemVault.sol/EmblemVault.json"))
    let contract = new ethers.Contract(address, ABI.abi, signer)
    return contract;
  }
  getERC1155 (address, signer) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/ERC1155Upgradable.sol/ERC1155Upgradable.json"))
    let contract = new ethers.Contract(address, ABI.abi, signer)
    return contract;
  }
  getStaking (address, signer) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/NFTStake.sol/NFTStake.json"))
    let contract = new ethers.Contract(address, ABI.abi, signer)
    return contract;
  }
  getClaimed (address, signer) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/Claimed.sol/Claimed.json"))
    let contract = new ethers.Contract(address, ABI.abi, signer)
    return contract;
  }
  getBalance (address, signer) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/Balance.sol/Balance.json"))
    let contract = new ethers.Contract(address, ABI.abi, signer)
    return contract;
  }
  getTradeV2 (address, signer) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/NFTrade_v2.sol/NFTrade_v2.json"))
    let contract = new ethers.Contract(address, ABI.abi, signer)
    return contract;
  }
  getTradeV3 (address, signer) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/NFTrade_v3.sol/NFTrade_v3.json"))
    let contract = new ethers.Contract(address, ABI.abi, signer)
    return contract;
  }
  getContract(address, _class, signer) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/"+_class+".sol/"+_class+".json"))
    let contract = new hre.ethers.Contract(address, ABI.abi, signer)
    return contract;
  }
  async collections (address) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/Factory.sol/Factory.json"))
    let _interface = new ethers.utils.Interface(ABI.abi)
    let filter = this.factory.filters.CollectionAdded(null, address)
    filter.fromBlock = 0
    filter.toBlock = 'latest'
    let events = await ethers.provider.getLogs(filter).then((events) => {
      return events.map((e) => {
        return _interface.parseLog(e).args.collection
      })
    })
    return events;
  }
  async handlers (address) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/Factory.sol/Factory.json"))
    let _interface = new ethers.utils.Interface(ABI.abi)
    let filter = this.factory.filters.HandlerAdded(null, address)
    filter.fromBlock = 0
    filter.toBlock = 'latest'
    let events = await ethers.provider.getLogs(filter).then((events) => {
      return events.map((e) => {
        return _interface.parseLog(e).args.handler
      })
    })
    return events;
  }
  async erc20s (address) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/Factory.sol/Factory.json"))
    let _interface = new ethers.utils.Interface(ABI.abi)
    let filter = this.factory.filters.ERC20Added(null, address)
    filter.fromBlock = 0
    filter.toBlock = 'latest'
    let events = await ethers.provider.getLogs(filter).then((events) => {
      return events.map((e) => {
        return _interface.parseLog(e).args.erc20
      })
    })
    return events;
  }
  async tradersV2 (address) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/Factory.sol/Factory.json"))
    let _interface = new ethers.utils.Interface(ABI.abi)
    let filter = this.factory.filters.TradeV2Added(null, address)
    filter.fromBlock = 0
    filter.toBlock = 'latest'
    let events = await ethers.provider.getLogs(filter).then((events) => {
      return events.map((e) => {
        return _interface.parseLog(e).args.trader
      })
    })
    return events;
  }
  async tradersV3 (address) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/Factory.sol/Factory.json"))
    let _interface = new ethers.utils.Interface(ABI.abi)
    let filter = this.factory.filters.TradeV3Added(null, address)
    filter.fromBlock = 0
    filter.toBlock = 'latest'
    let events = await ethers.provider.getLogs(filter).then((events) => {
      return events.map((e) => {
        return _interface.parseLog(e).args.trader
      })
    })
    return events;
  }
  async claimers (address) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/Factory.sol/Factory.json"))
    let _interface = new ethers.utils.Interface(ABI.abi)
    let filter = this.factory.filters.ClaimerAdded(null, address)
    filter.fromBlock = 0
    filter.toBlock = 'latest'
    let events = await ethers.provider.getLogs(filter).then((events) => {
      return events.map((e) => {
        return _interface.parseLog(e).args.claimer
      })
    })
    return events;
  }
  async balancers (address) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/Factory.sol/Factory.json"))
    let _interface = new ethers.utils.Interface(ABI.abi)
    let filter = this.factory.filters.BalanceAdded(null, address)
    filter.fromBlock = 0
    filter.toBlock = 'latest'
    let events = await ethers.provider.getLogs(filter).then((events) => {
      return events.map((e) => {
        return _interface.parseLog(e).args.balancer
      })
    })
    return events;
  }

  async emblems (address) {
    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/Factory.sol/Factory.json"))
    let _interface = new ethers.utils.Interface(ABI.abi)
    let filter = this.factory.filters.EmblemAdded(null, address)
    filter.fromBlock = 0
    filter.toBlock = 'latest'
    let events = await ethers.provider.getLogs(filter).then((events) => {
      return events.map((e) => {
        return _interface.parseLog(e).args.emblem
      })
    })
    return events;
  }
  
  async cloneHandler (address, val) {
    if (val) {      
      let tx = await this.factory.genesisHandler(address, val)
      await tx.wait()
    } else {
      let tx = await this.factory.genesisHandler(address)
      await tx.wait()
    }

    let addr = await this.handlers(address);

    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/VaultHandlerV8.sol/VaultHandlerV8.json"))
    this.signer = ethers.provider.getSigner()
    this.handler = new ethers.Contract(addr[0], ABI.abi, this.signer)
  }
  async cloneTradeV2 (address, val) {
    if (val) {      
      let tx = await this.factory.genesisTradeV2(address, await this.factory.erc20Implementation(), address, val)
      await tx.wait()
    } else {
      let tx = await this.factory.genesisTradeV2(address, await this.factory.erc20Implementation(), address)
      await tx.wait()
    }

    let addr = await this.tradersV2(address);

    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/NFTrade_v2.sol/NFTrade_v2.json"))
    this.signer = ethers.provider.getSigner()
    this.traderV2 = new ethers.Contract(addr[0], ABI.abi, this.signer)
  }
  async cloneTradeV3 (address, val) {
    if (val) {      
      let tx = await this.factory.genesisTradeV3(address, await this.factory.erc20Implementation(), address, val)
      await tx.wait()
    } else {
      let tx = await this.factory.genesisTradeV3(address, await this.factory.erc20Implementation(), address)
      await tx.wait()
    }

    let addr = await this.tradersV3(address);

    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/NFTrade_v3.sol/NFTrade_v3.json"))
    this.signer = ethers.provider.getSigner()
    this.traderV3 = new ethers.Contract(addr[0], ABI.abi, this.signer)
  }
  async cloneERC20 (address, val) {
    if (val) {      
      let tx = await this.factory.genesisERC20(address, val)
      await tx.wait()
    } else {
      let tx = await this.factory.genesisERC20(address)
      await tx.wait()
    }

    let addr = await this.erc20s(address);

    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/ConfigurableERC20Upgradable.sol/ConfigurableERC20Upgradable.json"))
    this.signer = ethers.provider.getSigner()
    this.erc20 = new ethers.Contract(addr[0], ABI.abi, this.signer)
  }
  async cloneClaimed (address, val) {
    if (val) {      
      let tx = await this.factory.genesisClaimed(address, val)
      await tx.wait()
    } else {
      let tx = await this.factory.genesisClaimed(address)
      await tx.wait()
    }

    let addr = await this.claimers(address);

    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/Claimed.sol/Claimed.json"))
    this.signer = ethers.provider.getSigner()
    this.claimer = new ethers.Contract(addr[0], ABI.abi, this.signer)
  }
  async cloneBalance(address, val) {
    if (val) {      
      let tx = await this.factory.genesisBalance(address, val)
      await tx.wait()
    } else {
      let tx = await this.factory.genesisBalance(address)
      await tx.wait()
    }

    let addr = await this.balancers(address);

    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/Balance.sol/Balance.json"))
    this.signer = ethers.provider.getSigner()
    this.balancer = new ethers.Contract(addr[0], ABI.abi, this.signer)
  }  
  async cloneEmblem(address, val) {
    if (val) {      
      let tx = await this.factory.genesisEmblem(address, val)
      await tx.wait()
    } else {
      let tx = await this.factory.genesisEmblem(address)
      await tx.wait()
    }

    let addr = await this.emblems(address);

    let ABI = require(path.resolve(__dirname, "../artifacts/contracts/EmblemVault.sol/EmblemVault.json"))
    this.signer = ethers.provider.getSigner()
    this.emblem = new ethers.Contract(addr[0], ABI.abi, this.signer)
  }
  account () {
    let randomAccount;
    while(true) {
      let id = crypto.randomBytes(32).toString('hex');
      let privateKey = "0x"+id;
      let wallet = new ethers.Wallet(privateKey, ethers.provider);
      if (!this.addresses.includes(wallet.address)) {
        randomAccount = wallet
        break;
      }
    }
    return randomAccount;
  }
  serializeToByteArray(arr) {
    let newArr = []
    arr.forEach((item, i)=>{
        if (typeof item == "object") {
            newArr.push(this.serializeUintArrayToBytes(item))
        } else {
            newArr.push(this.serializeUintToBytes(item))
        }
        
    })
    return newArr;
  }
  serializeUintArrayToBytes(arr) {
    var web3 = new Web3()
    return web3.eth.abi.encodeParameters(['uint256[]'],[arr]);
  }
  serializeUintToBytes(item) {
    var web3 = new Web3()
    return web3.eth.abi.encodeParameters(['uint'],[item]);
  }
  getRandom(myArray) {
    let selected = myArray[Math.floor(Math.random() * myArray.length)];
    return selected
  }
  selectProvider(network) {
    return new HDWalletProvider(process.env.ETHKEY || "a819fcd7afa2c39a7f9baf70273a128875b6c9f03001b218824559ccad6ef11c", this.selectProviderEndpoint(network), 0, 1)
  }
  selectProviderEndpoint(network) {
    return this.infuraEndpoints.filter(item => { return item.network == network })[0].address
  }
  MATIC_IDS = [
    "41f5f3cbf83536b2bf235d2be67a16bf6e5647dd"
  ]
  INFURA_IDS = [  
    "6112845322b74decbf08005aea176252", // <-- free backup
    "8e5d2af8fbe244f7b7f32e2ddc152508",
    "2e2998d61b0644fe8174bca015096245"
  ]
  infuraEndpoints = [
    { network: "rinkeby", address: "https://rinkeby.infura.io/v3/" + this.getRandom(this.INFURA_IDS) || this.INFURA_ID },
    { network: "mainnet", address: "https://mainnet.infura.io/v3/" + this.getRandom(this.INFURA_IDS) || this.INFURA_ID },
    { network: "mumbai", address: "https://rpc-mumbai.maticvigil.com/v1/" + this.getRandom(this.MATIC_IDS) },
    { network: "matic", address: "https://rpc-mainnet.maticvigil.com/v1/" + this.getRandom(this.MATIC_IDS) },
    { network: "xdai", address: "https://rpc.xdaichain.com/" },
    { network: "bsc", address: "https://bsc-dataseed.binance.org/" },
    { network: "fantom", address: "https://rpcapi.fantom.network" },
    { network: "ganache", address: "http://127.0.0.1:7545"}
  ]
}
module.exports = Util
