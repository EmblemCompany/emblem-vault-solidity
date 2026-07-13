// SPDX-License-Identifier: CLOSED - Pending Licensing Audit
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "./ClonableFactory.sol";
import "./MakeTake.sol";

contract MakeTakeFactory is ClonableFactory {
  function initialize() virtual override public initializer {
    __Ownable_init();
    factoryType = "MAKETAKE";
  }

  function implement() virtual override internal returns(address) {
    return address(new MakeTake());
  }

  function afterClone(address newOwner, address clone) internal override onlyOwner {
    OwnableUpgradeable(clone).transferOwnership(newOwner);
  }

  function version() virtual override public view returns (uint256 _version) {
    return 1;
  }
}

