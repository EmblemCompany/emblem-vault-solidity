const { ethers } = require('hardhat');
const { expect } = require('chai')
const path = require('path')
const Util = require('./util.js')
const util = new Util()


describe('Factory', () => {
  beforeEach(async () => { })
  describe('Non upgradable', ()=>{
    it.only('TestFactory should not initialize twice', async () => {
      await util.deployTestFactory()
      let tx = util.testFactory.initialize()
      await expect(tx).to.be.revertedWith("Initializable: contract is already initialized")
    })
    it.only('deploys TestFactory as non upgradable', async () => {
      await util.deployTestFactory(); 
      expect(await util.testFactory.owner()).to.equal(util.deployer.address)
    })
    it.only('TestFactory should report a single implementation', async () => {
      await util.deployTestFactory()
      let versions = await util.testFactory.versions()
      expect(versions).to.equal(1)
    })
    it.only('TestFactory implementation be owned by testFactory', async () => {
      await util.deployTestFactory()
      let implementationAddress = await util.testFactory.CurrentImplementation()
      let implementation = util.getContract(implementationAddress, "TestThing", util.deployer)
      expect(await implementation.owner()).to.equal(util.testFactory.address)
    })
    it.only('TestFactory should report no clones', async () => {
      await util.deployTestFactory(); 
      let clones = await util.testFactory.getClones()
      expect(clones.length).to.equal(0)
    })
    it.only('TestFactory create a clone', async () => {
      await util.deployTestFactory()
      await util.testFactory.createClone(util.deployer.address)
      let clones = await util.testFactory.getClones()
      expect(clones.length).to.equal(1)
    })
    it.only('Clone should be owned by deployer', async () => {
      await util.deployTestFactory()
      await util.testFactory.createClone(util.deployer.address)
      let clones = await util.testFactory.getClones()
      let clone = util.getContract(clones[0], "TestThing", util.deployer)
      let owner = await clone.owner()
      expect(owner).to.equal(util.deployer.address)
    })
  })
  describe('Upgradable', ()=>{
    it.only('deploys TestFactory as upgradable', async () => {
      await util.deployTestFactory("upgradable")
      expect(await util.testFactory.owner()).to.equal(util.deployer.address)
      expect(await util.testFactory.CurrentImplementation()).to.not.equal("0x0000000000000000000000000000000000000000")
    })
    it.only('TestFactory should report a single implementation', async () => {
      await util.deployTestFactory("upgradable")
      let versions = await util.testFactory.versions()
      expect(versions).to.equal(1)
    })
    it.only('TestFactory implementation be owned by testFactory', async () => {
      await util.deployTestFactory("upgradable")
      let implementationAddress = await util.testFactory.CurrentImplementation()
      let implementation = util.getContract(implementationAddress, "TestThing", util.deployer)
      expect(await implementation.owner()).to.equal(util.testFactory.address)
    })
    it.only('TestFactory should report no clones', async () => {
      await util.deployTestFactory("upgradable"); 
      let clones = await util.testFactory.getClones()
      expect(clones.length).to.equal(0)
    })
    it.only('TestFactory create a clone', async () => {
      await util.deployTestFactory("upgradable")
      await util.testFactory.createClone(util.deployer.address)
      let clones = await util.testFactory.getClones()
      expect(clones.length).to.equal(1)
    })
    it.only('Clone should be owned by deployer', async () => {
      await util.deployTestFactory("upgradable")
      await util.testFactory.createClone(util.deployer.address)
      let clones = await util.testFactory.getClones()
      let clone = util.getContract(clones[0], "TestThing", util.deployer)
      let owner = await clone.owner()
      expect(owner).to.equal(util.deployer.address)
    })
    it.only('Should be able to upgrade TestFactory', async () => {
      await util.deployTestFactory("upgradable")
      await util.upgradeTestFactory()
      let version = await util.testFactory.version()
      expect(version).to.equal(2)
    })
    it.only('Upgraded factory - should not be re-initialized', async () => {
      await util.deployTestFactory("upgradable")
      await util.upgradeTestFactory()
      let initialized = await util.testFactory.initialized()
      expect(initialized).to.equal(false)
    })

    it.only('Upgraded factory - should have implementation version of 1 before updating implementation', async () => {
      await util.deployTestFactory("upgradable")
      await util.upgradeTestFactory()
      let implementationAddress = await util.testFactory.CurrentImplementation()
      let implementation = util.getContract(implementationAddress, "TestThing", util.deployer)
      let version = await implementation.version()
      expect(version).to.equal(1)
    })

    it.only('Upgraded factory - not updated implementation makes clones of version 1', async () => {
      await util.deployTestFactory("upgradable")
      await util.upgradeTestFactory()
      await util.testFactory.createClone(util.deployer.address)
      let clones = await util.testFactory.getClones()
      clone = util.getContract(clones[0], "TestThingV2", util.deployer)
      let cloneVersion = await clone.version()
      expect(cloneVersion).to.equal(1)
    })

    it.only('Upgraded factory - updated implementation reflects version of 2', async () => {
      await util.deployTestFactory("upgradable");
      await util.upgradeTestFactory()
      await util.testFactory.updateImplementation()
      let implementationAddress = await util.testFactory.CurrentImplementation()
      let implementation = util.getContract(implementationAddress, "TestThingV2", util.deployer)
      let version = await implementation.version()
      expect(version).to.equal(2)
    })

    it.only('Upgraded factory - updated implementation can make clones of version 2', async () => {
      await util.deployTestFactory("upgradable");
      await util.upgradeTestFactory()
      await util.testFactory.updateImplementation()
      await util.testFactory.createCloneAtVersion(util.deployer.address, 1)
      let versions = await util.testFactory.versions()
      expect(versions).to.equal(2)
      let clones = await util.testFactory.getClones()
      clone = util.getContract(clones[0], "TestThing", util.deployer)
      let cloneVersion = await clone.version()
      expect(cloneVersion).to.equal(1)
    })

    it.only('Upgraded factory - updated implementation should be able to clone version 1', async () => {
      await util.deployTestFactory("upgradable");
      await util.upgradeTestFactory()
      await util.testFactory.updateImplementation()
      await util.testFactory.createClone(util.deployer.address)
      let clones = await util.testFactory.getClones()
      clone = util.getContract(clones[0], "TestThingV2", util.deployer)
      let cloneVersion = await clone.version()
      expect(cloneVersion).to.equal(2)
    })

    it.only('Upgraded factory - clones should be owned by deployer', async () => {
      await util.deployTestFactory("upgradable");
      await util.upgradeTestFactory()
      await util.testFactory.createClone(util.deployer.address)
      let clones = await util.testFactory.getClones()
      clone = util.getContract(clones[0], "TestThingV2", util.deployer)
      let cloneOwner = await clone.owner()
      expect(cloneOwner).to.equal(util.deployer.address)
    })
  })

  
  
})
describe('Thing', ()=>{
  it.only('should be able to be deployed as non upgradable')
  it.only('should be able to be deployed as upgradable')
  it.only('should be able to be upgraded')
})
