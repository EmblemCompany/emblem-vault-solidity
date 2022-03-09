pragma solidity 0.8.4;
import "./Ownable.sol";

contract Storage is Ownable {

    address public latestVersion;
    
    address DEADADDRESS = 0x000000000000000000000000000000000000dEaD;
    address BURNADDRESS = 0x5D152dd902CC9198B97E5b6Cf5fc23a8e4330180;
    
    mapping(address => bytes32) LegacyClaims;
    mapping(address => bytes32) LegacyClaimsBy;
    mapping(address => mapping(uint => address)) Claims;
    mapping(address => uint256[]) ClaimsFor;
    address[] BurnAddresses;
    
    constructor() {
        BurnAddresses.push(DEADADDRESS);
        BurnAddresses.push(BURNADDRESS);
    }
    
    modifier onlyLatestVersion() {
       require(msg.sender == latestVersion, 'Not latest version');
        _;
    }

    function upgradeVersion(address _newVersion) public {
        require(msg.sender == owner || msg.sender == _newVersion, 'Only owner can upgrade');
        latestVersion = _newVersion;
    }
    
    function getDead() external view returns(address) {
        return DEADADDRESS;
    }
    
    function getBurnAddresses() external view returns (address[] memory){
        return BurnAddresses;
    }
    
    function getLegacyClaims(address nftAddress) external view returns(bytes32) {
        return LegacyClaims[nftAddress];
    }
    function getLegacyClaimsBy(address nftAddress) external view returns(bytes32) {
        return LegacyClaimsBy[nftAddress];
    }
    
    function getClaims(address nftAddress, uint tokenId) external view returns (address) {
        return Claims[nftAddress][tokenId];
    }
    
    function getClaimsFor(address _owner) external view returns (uint256[] memory) {
        return ClaimsFor[_owner];
    }

    /* ADD : Protected by only current version */
    
    function addToBurnAddresses(address burnAddress) external onlyLatestVersion() {
         BurnAddresses.push(burnAddress);
    }
    
    function addToLegacy(address nftAddress, bytes32 root) external onlyLatestVersion() {
        LegacyClaims[nftAddress] = root;
    }
    function addToLegacyClaimedBy(address nftAddress, bytes32 root) external onlyLatestVersion() {
        LegacyClaimsBy[nftAddress] = root;
    }
    
    function addToClaims(address nftAddress, uint tokenId, address _owner) external onlyLatestVersion() {
        Claims[nftAddress][tokenId] = _owner;
        ClaimsFor[_owner].push(tokenId);
    }
}