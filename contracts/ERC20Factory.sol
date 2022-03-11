pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./VaultHandlerV8.sol";

contract ERC20Factory is OwnableUpgradeable {

  address public handlerAddress;
  address public erc20Implementation;

  event ERC20Created(address indexed newThingAddress, address indexed libraryAddress);

  address[] public ERC20Clones;

  function initialize(address _handlerAddress) public initializer {
    __Ownable_init();
    handlerAddress = _handlerAddress;
    erc20Implementation = address(new ConfigurableERC20());
  }

  function updateHandler(address _handlerAddress) public onlyOwner {
    handlerAddress = _handlerAddress;
  }

  function getOwner() public view returns (address _owner) {
    return owner();
  }

  function createERC20(address _newOwner, string memory _name, string memory _symbol, uint8 _decimals) public onlyOwner returns (address clone){
    address _clone = ClonesUpgradeable.clone(erc20Implementation);
    ConfigurableERC20(_clone).init(_newOwner, _name, _symbol, _decimals); // owned by this contract
    ERC20Clones.push(_clone);
    emit ERC20Created(_clone, erc20Implementation);
    return _clone;
  }

  function version() virtual public view returns (uint256 _version) {
    return 1;
  }
}
