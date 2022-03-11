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
    VaultHandlerV8 handler = VaultHandlerV8(handlerAddress);
    if (handler.isRegistered(address(this), 8)) { // if factory registered with handler
      handler.registerContract(_clone, 1);
    }
    ERC1155(_clone).init(address(this)); // owned by this contract
    ERC1155(_clone).registerContract(handlerAddress, 3); // register handler on erc1155
    ERC1155(_clone).transferOwnership(_newOwner); // transfer to newOwner
    ERC1155Clones.push(_clone);
    emit ERC1155Created(_clone, erc1155Implementation);
    return _clone;
  }

  function version() virtual public view returns (uint256 _version) {
    return 1;
  }
}
