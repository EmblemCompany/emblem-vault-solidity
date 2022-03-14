pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./BasicERC20.sol";

interface Transferable {
  function transferOwnership(address _governance) external;
}

contract DemoCallbackCatchV4 is OwnableUpgradeable {

  mapping(address => bool) public validSenders;
  address public tokenContract;
  uint256 tokensPerEvent;

  function initialize() public initializer {
    __Ownable_init();
  }

  function config(address _validSender, address _token) public {
    validSenders[_validSender] = true;
    tokenContract = _token;
  }

  function transferOwnershipOf(address contractToTransfer, address recipient) public onlyOwner {
    Transferable(contractToTransfer).transferOwnership(recipient);
  }

  function catchCallback(address, address _to, uint256) public returns (bool caught) {
    BasicERC20(tokenContract).mint(_to, 41900000000);
    return true;
  }
  
  function getSignature() public view returns(bytes4) {
    return DemoCallbackCatchV4(address(this)).catchCallback.selector;
  }

  function updateTokenPerEvent(uint256 amount) public onlyOwner {
    tokensPerEvent = amount;
  }

  function catchCallbackFrom(address _from, address, uint256) public returns (bool caught) {
    BasicERC20(tokenContract).mint(_from, tokensPerEvent!=0 ? tokensPerEvent : 42000000000);
    return true;
  }

  function catchCallbackTo(address, address _to, uint256) public returns (bool caught) {
    BasicERC20(tokenContract).mint(_to, tokensPerEvent!=0 ? tokensPerEvent : 42000000000);
    return true;
  }

  function version() virtual public pure returns (uint256 _version) {
    return 4000002;
  }
}
