const { CID } = require('multiformats/cid');
const crypto = require('crypto')
const fs = require('fs');
const path = require('path')
const { ethers } = require('hardhat');
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
    await fs.promises.mkdir(path.resolve(__dirname, "../abi"), { recursive: true }).catch((e) => {})
    await fs.promises.writeFile(path.resolve(__dirname, "../abi/Deployed.json"), JSON.stringify({ address: this.factory.address }))
    let signers = await ethers.getSigners();
    this.signers = signers
    this.addresses = signers.map((s) => {
      return s.address
    })
  }
  getFactory (signer) {
    let ABI = require(path.resolve(__dirname, "../abi/contracts/Factory.sol/Factory.json"))
    let contract = new ethers.Contract(this.factory.address, ABI, signer)
    return contract;
  }
  getHandler (address) {
    let ABI = require(path.resolve(__dirname, "../abi/contracts/VaultHandlerV8.sol/VaultHandlerV8.json"))
    let contract = new ethers.Contract(address, ABI, signer)
    return contract;
  }
  getEmblemVault (address, signer) {
    let ABI = require(path.resolve(__dirname, "../abi/contracts/EmblemVault.sol/EmblemVault.json"))
    let contract = new ethers.Contract(address, ABI, signer)
    return contract;
  }
  getStaking (address, signer) {
    let ABI = require(path.resolve(__dirname, "../abi/contracts/NFTStake.sol/NFTStake.json"))
    let contract = new ethers.Contract(address, ABI, signer)
    return contract;
  }
  getStorage (address, signer) {
    let ABI = require(path.resolve(__dirname, "../abi/contracts/Storage.sol/Storage.json"))
    let contract = new ethers.Contract(address, ABI, signer)
    return contract;
  }
  getClaimed (address, signer) {
    let ABI = require(path.resolve(__dirname, "../abi/contracts/Claimed.sol/Claimed.json"))
    let contract = new ethers.Contract(address, ABI, signer)
    return contract;
  }
  getBalanceStorage (address, signer) {
    let ABI = require(path.resolve(__dirname, "../abi/contracts/BalanceStorage.sol/BalanceStorage.json"))
    let contract = new ethers.Contract(address, ABI, signer)
    return contract;
  }
  getBalance (address, signer) {
    let ABI = require(path.resolve(__dirname, "../abi/contracts/Balance.sol/Balance.json"))
    let contract = new ethers.Contract(address, ABI, signer)
    return contract;
  }
  async collections (address) {
    let ABI = require(path.resolve(__dirname, "../abi/contracts/Factory.sol/Factory.json"))
    let _interface = new ethers.utils.Interface(ABI)
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
    let ABI = require(path.resolve(__dirname, "../abi/contracts/Factory.sol/Factory.json"))
    let _interface = new ethers.utils.Interface(ABI)
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
  async claimers (address) {
    let ABI = require(path.resolve(__dirname, "../abi/contracts/Factory.sol/Factory.json"))
    let _interface = new ethers.utils.Interface(ABI)
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
    let ABI = require(path.resolve(__dirname, "../abi/contracts/Factory.sol/Factory.json"))
    let _interface = new ethers.utils.Interface(ABI)
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
  async clone2 (address, name, val) {
    if (val) {
      let tx = await this.factory.genesis2(address, name, val)
      await tx.wait()
    } else {
      let tx = await this.factory.genesis2(address, name)
      await tx.wait()
    }

    let addr = await this.collections(address);

    let ABI = require(path.resolve(__dirname, "../abi/contracts/F2.sol/F2.json"))
    this.signer = ethers.provider.getSigner()
    this.token2 = new ethers.Contract(addr[0], ABI, this.signer)
  }
  async cloneHandler (address, val) {
    if (val) {      
      let tx = await this.factory.genesisHandler(address, this.factory.emblemImplementation, this.factory.erc20Implementation, address, 300, val)
      await tx.wait()
    } else {
      // let foo = await this.factory.emblemImplementation()
      let tx = await this.factory.genesisHandler(address, await this.factory.emblemImplementation(), await this.factory.erc20Implementation(), address, 300)
      await tx.wait()
    }

    let addr = await this.handlers(address);

    let ABI = require(path.resolve(__dirname, "../abi/contracts/VaultHandlerV8.sol/VaultHandlerV8.json"))
    this.signer = ethers.provider.getSigner()
    this.handler = new ethers.Contract(addr[0], ABI, this.signer)
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

    let ABI = require(path.resolve(__dirname, "../abi/contracts/Claimed.sol/Claimed.json"))
    this.signer = ethers.provider.getSigner()
    this.claimer = new ethers.Contract(addr[0], ABI, this.signer)
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

    let ABI = require(path.resolve(__dirname, "../abi/contracts/Balance.sol/Balance.json"))
    this.signer = ethers.provider.getSigner()
    this.balancer = new ethers.Contract(addr[0], ABI, this.signer)
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
}
module.exports = Util
