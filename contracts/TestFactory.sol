// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "./TestThing.sol";
import "./ClonableFactory.sol";

contract TestFactory is ClonableFactory {

  function initialize() virtual override public initializer {
    __Ownable_init();
    ClonableFactory.initialize();
  }

  function version() virtual override public view returns (uint256) {
    return 1;
  }

  function implement() virtual override public returns(address) {
    return address(new TestThing());
  }

  function afterClone(address newOwner, address clone) public virtual override onlyOwner {
    OwnableUpgradeable(clone).transferOwnership(newOwner);
  }
}
