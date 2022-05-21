// SPDX-License-Identifier: CLOSED - Pending Licensing Audit
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "./TestFactory.sol";
import "./TestThingV2.sol";
import "./SafeMath.sol";

contract TestFactoryV2 is TestFactory {

  bool public initialized;

  function initialize() virtual override public initializer {
    __Ownable_init();
    ClonableFactory.initialize();
    initialized = true;
  }
  
  function version() public pure override returns (uint256) {
    return 2;
  }

  function implement() virtual override internal returns(address) {
    return address(new TestThingV2());
  }

  function afterClone(address newOwner, address clone) internal override onlyOwner {
    OwnableUpgradeable(clone).transferOwnership(newOwner);
  }
}
