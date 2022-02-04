pragma solidity 0.8.4;
import "./Ownable.sol";

contract RegistrationStorage is Ownable {

    address public latestVersion;

    constructor() {
        
    }
    
    modifier onlyLatestVersion() {
       require(msg.sender == latestVersion, 'Not latest version');
        _;
    }

    function upgradeVersion(address _newVersion) public {
        require(msg.sender == owner || msg.sender == _newVersion, 'Only owner can upgrade');
        latestVersion = _newVersion;
    }    
    
}