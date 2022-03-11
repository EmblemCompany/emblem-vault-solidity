pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./VaultHandlerV8.sol";

contract DemoCallbackCatch is OwnableUpgradeable {

  mapping(address => bool) public validSenders;
  address public tokenContract;

  function initialize() public initializer {
    __Ownable_init();
  }

  function config(address _validSender, address _token) public {
    validSenders[_validSender] = true;
    tokenContract = _token;
  }

  function transferOwnershipOf(address contractToTransfer, address recipient) public onlyOwner {
    Ownable(contractToTransfer).transferOwnership(recipient);
  }

  function catchCallback(address, address _to, uint256) public returns (bool caught) {
    BasicERC20(tokenContract).mint(_to, 42000000000);
    return true;
  }
  
  function getSignature() public view returns(bytes4) {
    return DemoCallbackCatch(address(this)).catchCallback.selector;
  }

  function version() virtual public view returns (uint256 _version) {
    return 1;
  }
}
