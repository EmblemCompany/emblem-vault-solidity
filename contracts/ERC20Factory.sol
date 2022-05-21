// SPDX-License-Identifier: CLOSED - Pending Licensing Audit
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "./ConfigurableERC20Upgradable.sol";
import "./ClonableFactory.sol";

interface IHasRegistration {
  function isRegistered(address _contract, uint256 _type) external returns (bool);
  function registerContract(address _contract, uint _type) external;
}

contract ERC20Factory is ClonableFactory {

  address public handlerAddress;

  function initialize() virtual override public initializer {
    __Ownable_init();
    factoryType = "ERC20";
  }

  function initializeStage2(address _handlerAddress) public onlyOwner {
    handlerAddress = _handlerAddress;
    ClonableFactory.initialize();
  }

  function implement() virtual override internal returns(address) {
    return address(new ConfigurableERC20Upgradable());
  }

  function updateHandler(address _handlerAddress) public onlyOwner {
    handlerAddress = _handlerAddress;
  }

  function afterClone(address newOwner, address clone) internal override onlyOwner {
    if (IHasRegistration(handlerAddress).isRegistered(address(this), 8)) { // if factory registered with handler
      IHasRegistration(handlerAddress).registerContract(clone, 4);
    }
    IHasRegistration(clone).registerContract(handlerAddress, 3); // register handler on erc721
    OwnableUpgradeable(clone).transferOwnership(newOwner); // transfer to newOwner
  }

  function version() virtual override public view returns (uint256 _version) {
    return 1;
  }

}
