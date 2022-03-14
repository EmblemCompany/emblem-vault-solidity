pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./VaultHandlerV8.sol";
import "./DemoCallbackCatch.sol";

contract DemoCallbackCatchV3 is DemoCallbackCatch {

  uint256 tokensPerEvent;

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

  function version() override public pure returns (uint256 _version) {
    return 3;
  }

}
