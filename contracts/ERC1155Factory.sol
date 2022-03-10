pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./VaultHandlerV8.sol";

contract ERC1155Factory is OwnableUpgradeable {

  address public handlerAddress;
  address public erc1155Implementation;

  event ERC1155Created(address indexed newThingAddress, address indexed libraryAddress);
  
  address[] public ERC1155Clones;

  function initialize(address _handlerAddress) public initializer {
    __Ownable_init();
    handlerAddress = _handlerAddress;
    erc1155Implementation = address(new ERC1155());
  }

  function updateHandler(address _handlerAddress) public onlyOwner {
    handlerAddress = _handlerAddress;
  }

  function getOwner() public view returns (address _owner) {
    return owner();
  }

  function createERC1155(address _newOwner) public onlyOwner returns (address clone){
    address _clone = ClonesUpgradeable.clone(erc1155Implementation);
    ERC1155(_clone).init(_newOwner);
    ERC1155Clones.push(_clone);
    emit ERC1155Created(_clone, erc1155Implementation);
    return _clone;
  }

  function version() virtual public view returns (uint256 _version) {
    return 1;
  }
}
