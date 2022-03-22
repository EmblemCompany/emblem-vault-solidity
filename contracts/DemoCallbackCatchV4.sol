// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "./BasicERC20.sol";
import "./IsBypassable.sol";

interface Transferable {
  function transferOwnership(address _governance) external;
}

contract DemoCallbackCatchV4 is IsBypassable {

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
    return 8;
  }
}
