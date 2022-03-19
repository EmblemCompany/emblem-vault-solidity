pragma solidity 0.8.4;
import "./OwnableUpgradeable.sol";

contract RegistrationStorage is OwnableUpgradeable {

    address public latestVersion;
    
    modifier onlyLatestVersion() {
       require(_msgSender() == latestVersion, 'Not latest version');
        _;
    }

    function upgradeVersion(address _newVersion) public {
        require(_msgSender() == owner() || _msgSender() == _newVersion, 'Only owner can upgrade');
        latestVersion = _newVersion;
    }    
    
}