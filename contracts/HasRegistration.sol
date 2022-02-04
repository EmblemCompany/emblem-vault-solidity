pragma solidity 0.8.4;
import "./Context.sol";
import "./Ownable.sol";


struct ContractDetails {
    uint256 _type; // 0 EMPTY, 1 ERC1155, 2 ERC721, 3 HANDLER, 4 ERC20, 5 BALANCE, 6 CLAIM 7 UNKNOWN
    bool curated; // TODO Deprecate this
}

interface IRegistrationStorage {
    function upgradeVersion(address _newVersion) external;    
}

contract HasRegistration is Context, Ownable {

    // address StorageAddress;
    // bool initialized = false;

    mapping(address => ContractDetails) public registeredContracts;
    mapping(uint256 => address) public registeredOfType;
    
    uint256 public contractCount = 0;
    address public ZEROADDRESS = 0x0000000000000000000000000000000000000000;

    modifier isRegisteredContract(address _contract) {
        require(registeredContracts[_contract]._type > 0, "Contract is not registered");
        _;
    }

    // constructor(address storageContract) {
    //     StorageAddress = storageContract;
    // }

    // function initialize() public {
    //     require(!initialized, 'already initialized');
    //     IRegistrationStorage _storage = IRegistrationStorage(StorageAddress);
    //     _storage.upgradeVersion(address(this));
    //     initialized = true;
    // }

    function registerContract(address _contract, uint _type, bool curated) public onlyOwner {
        require(_msgSender() == owner, 'Only owner can add contract');
        contractCount++;
        registeredContracts[_contract] = ContractDetails(_type, curated);
        registeredOfType[_type] = _contract;
    }

    function unregisterContract(address _contract) public onlyOwner isRegisteredContract(_contract) {
        require(contractCount > 0, 'No vault contracts to remove');
        delete registeredOfType[registeredContracts[_contract]._type];
        delete registeredContracts[_contract];
        contractCount--;
    }

    function isRegistered(address _contract, uint256 _type) public view returns (bool) {
        return registeredContracts[_contract]._type == _type;
    }
}