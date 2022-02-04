pragma solidity 0.8.4;
import "./Ownable.sol";

contract BalanceStorage is Ownable {
    
    address public latestVersion = address(0x0);
    mapping(uint256 => bool) public usedNonces;

    struct BalanceObject {
        uint balance;
        uint blockchain;
        string name;
        string symbol;
        uint256 tokenId;
        address _address;
        uint256 _type;
    }

    struct Balances {
        BalanceObject[] balances;
    }

    mapping(address => mapping(uint256 => Balances)) internal balances;
    mapping(address => uint256[]) contractTokenIds;
    mapping(address=> mapping(address => bool)) public witnesses;
    mapping(bytes32 => mapping(address => uint256[])) public tokensToContractMap;

    constructor() {
        
    }
    
    modifier onlyLatestVersion() {
       require(msg.sender == latestVersion || msg.sender == owner, 'Not Owner or Latest version');
        _;
    }

    function addWitness(address nftAddress, address _witness) public onlyLatestVersion {
        witnesses[nftAddress][_witness] = true;
    }

    function removeWitness(address nftAddress, address _witness) public onlyLatestVersion {
        witnesses[nftAddress][_witness] = false;
    }

    function isWitness(address nftAddress, address witness) public view onlyLatestVersion returns (bool) {
        return witnesses[nftAddress][witness];
    }

    function upgradeVersion(address _newVersion) public {
        require(msg.sender == owner || (msg.sender == _newVersion && latestVersion == address(0x0) || msg.sender == latestVersion), 'Only owner can upgrade');
        latestVersion = _newVersion;
    }

    function getBalance(address nftAddress, uint256 tokenId) public view onlyLatestVersion returns (Balances memory) {
        return balances[nftAddress][tokenId];
    } 

    function getAssetsForContract(address nftAddress) public view onlyLatestVersion returns (uint256[] memory) {
        return contractTokenIds[nftAddress];
    }

    function getAssetsForContractAtIndex(address nftAddress, uint256 index) public view onlyLatestVersion returns (uint256) {
        return contractTokenIds[nftAddress][index];
    }

    function usedNonce(uint256 nonce) public view onlyLatestVersion returns (bool) {
        return usedNonces[nonce];
    }

    function getTokensFromMap(address nftAddress, bytes32 token) public view onlyLatestVersion returns(uint256[] memory) {
        return tokensToContractMap[token][nftAddress];
    }

    function addBalanceToAsset(address nftAddress, uint256 tokenId, Balances calldata balance) public onlyLatestVersion {
         balances[nftAddress][tokenId] = balance;
         contractTokenIds[nftAddress].push(tokenId);
    }

    function addTokenToMap(address nftAddress, bytes32 token, uint256 tokenId) public onlyLatestVersion {
        tokensToContractMap[token][nftAddress].push(tokenId);
    }

    function addNonce(uint256 nonce) public onlyLatestVersion returns (bool) {
        require(!usedNonces[nonce], 'Nonce already used');
        return usedNonces[nonce] = true;
    }
    
}