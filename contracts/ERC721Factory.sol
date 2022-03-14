pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./EmblemVault.sol";

interface IHasRegistration {
  function isRegistered(address _contract, uint256 _type) external returns (bool);
  function registerContract(address _contract, uint _type) external;
}

contract ERC721Factory is OwnableUpgradeable {

  address public handlerAddress;
  address public erc721Implementation;

  event ERC721Created(address indexed newThingAddress, address indexed libraryAddress);
  address[] public ERC721Clones;

  function initialize(address _handlerAddress) public initializer {
    __Ownable_init();
    handlerAddress = _handlerAddress;
    erc721Implementation = address(new EmblemVault());
  }

  function updateImplementation() public onlyOwner {
    erc721Implementation = address(new EmblemVault());
  }

  function updateHandler(address _handlerAddress) public onlyOwner {
    handlerAddress = _handlerAddress;
  }

  function getClones() public view returns (address[] memory) {
    return ERC721Clones;
  }

  function createClone(address _newOwner) public onlyOwner returns (address clone){
    address _clone = ClonesUpgradeable.clone(erc721Implementation);
    IHasRegistration handler = IHasRegistration(handlerAddress);
    if (handler.isRegistered(address(this), 8)) { // if factory registered with handler
      handler.registerContract(_clone, 2);
    }
    EmblemVault(_clone).init(address(this)); // owned by this contract
    EmblemVault(_clone).registerContract(handlerAddress, 3); // register handler on erc721
    EmblemVault(_clone).transferOwnership(_newOwner); // transfer to newOwner
    ERC721Clones.push(_clone);
    emit ERC721Created(_clone, erc721Implementation);
    return _clone;
  }

  function version() virtual public view returns (uint256 _version) {
    return 3;
  }
}
