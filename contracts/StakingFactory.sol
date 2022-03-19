pragma solidity 0.8.4;
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "./TokenStaking.sol";

contract StakingFactory is OwnableUpgradeable {

  address public handlerAddress;
  address public stakingImplementation;

  event StakingCreated(address indexed newThingAddress, address indexed libraryAddress);
  address[] public stakingClones;

  function initialize(address _handlerAddress) public initializer {
    __Ownable_init();
    handlerAddress = _handlerAddress;
    stakingImplementation = address(new TokenStaking());
  }

  function updateHandler(address _handlerAddress) public onlyOwner {
    handlerAddress = _handlerAddress;
  }

  function createStaking(address _newOwner, IERC20 _tokenContract, uint256 _startBlock) public onlyOwner returns (address clone){
    address _clone = ClonesUpgradeable.clone(stakingImplementation);
    HasRegistration handler = HasRegistration(handlerAddress);
    if (handler.isRegistered(address(this), 8)) { // if factory registered with handler
      handler.registerContract(_clone, 9);
    }
    TokenStaking(_clone).init(_tokenContract, _startBlock); // owned by this contract
    TokenStaking(_clone).registerContract(handlerAddress, 3); // register handler on erc721
    TokenStaking(_clone).transferOwnership(_newOwner); // transfer to newOwner
    stakingClones.push(_clone);
    emit StakingCreated(_clone, stakingImplementation);
    return _clone;
  }

  function version() virtual public view returns (uint256 _version) {
    return 1;
  }
}
