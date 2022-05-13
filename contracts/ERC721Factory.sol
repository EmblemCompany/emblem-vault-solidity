// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "./EmblemVault.sol";
import "./ClonableFactory.sol";

interface IHasRegistration {
  function isRegistered(address _contract, uint256 _type) external returns (bool);
  function registerContract(address _contract, uint _type) external;
}

contract ERC721Factory is ClonableFactory {

  address public handlerAddress;

  function initialize() virtual override public initializer {
    __Ownable_init();
    factoryType = "ERC721";
  }
  function initializeStage2(address _handlerAddress) public onlyOwner {
    handlerAddress = _handlerAddress;
    ClonableFactory.initialize();
  }
  function implement() virtual override internal returns(address) {
    return address(new EmblemVault());
  }

  function updateHandler(address _handlerAddress) public onlyOwner {
    handlerAddress = _handlerAddress;
  }

  function afterClone(address newOwner, address clone) internal override onlyOwner {
    if (IHasRegistration(handlerAddress).isRegistered(address(this), 8)) { // if factory registered with handler
      IHasRegistration(handlerAddress).registerContract(clone, 2);
    }
    IHasRegistration(clone).registerContract(handlerAddress, 3); // register handler on erc721
    
    Stream(EmblemVault(clone).streamAddress()).addMember(Stream.Member(newOwner, 1, 1)); // add owner as stream recipient
    IERC2981Royalties(clone).setTokenRoyalty(0, EmblemVault(clone).streamAddress(), 10000); // set contract wide royalties to stream
    OwnableUpgradeable(EmblemVault(clone).streamAddress()).transferOwnership(newOwner); // transfer stream, to new owner
    OwnableUpgradeable(clone).transferOwnership(newOwner); // transfer clone to newOwner
  }

  function version() virtual override public view returns (uint256 _version) {
    return 1;
  }
}
