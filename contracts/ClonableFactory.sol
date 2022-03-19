pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "./OwnableUpgradeable.sol";
import "./SafeMath.sol";
import "./Clonable.sol";
abstract contract ClonableFactory is OwnableUpgradeable {

    using SafeMath for uint256;

    struct ImplementationsRecord {
        uint256 version;
        address implementation;
        uint256 contractVersion;
    }

    address public CurrentImplementation;
    ImplementationsRecord[] public AllImplementations;

    event CloneCreated(address indexed newThingAddress, address indexed libraryAddress);
    address[] public Clones;

    function initialize() public virtual onlyOwner {
        updateImplementation();
    }

    function version() public view virtual returns (uint256) {
        return 1;
    }

    function versions() public view returns (uint256 _version) {
        return AllImplementations.length;
    }

    function updateImplementation() public onlyOwner {
        CurrentImplementation = implement();
        IClonable(CurrentImplementation).initialize();
        AllImplementations.push(ImplementationsRecord(AllImplementations.length.add(1), address(CurrentImplementation), IClonable(CurrentImplementation).version()));
    }

    function implement() public virtual returns(address);
    function afterClone(address,address) public virtual;

    function getClones() public view returns (address[] memory) {
        return Clones;
    }
    function createClone(address _newOwner) public onlyOwner {
        address clone = ClonesUpgradeable.clone(CurrentImplementation);
        IClonable(clone).initialize();
        Clones.push(clone);
        emit CloneCreated(clone, CurrentImplementation);
        afterClone(_newOwner, clone);
    }

    function createCloneAtVersion(address _newOwner, uint256 version) public onlyOwner {
        address clone = ClonesUpgradeable.clone(AllImplementations[version.sub(1)].implementation);
        Clones.push(clone);
        emit CloneCreated(clone, CurrentImplementation);
    }

}