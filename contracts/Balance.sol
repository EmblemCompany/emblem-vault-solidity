pragma solidity ^0.8.4;
import "./IERC721.sol";
import "./Ownable.sol";
import "./Context.sol";
import "./Storage.sol";

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

interface IBalanceStorage {
    function upgradeVersion(address _newVersion) external;
    function getBalance(address nftAddress, uint256 tokenId) external view returns (Balances calldata balance);
    function addBalanceToAsset(address nftAddress, uint256 tokenId, Balances calldata balance) external;
    function addWitness(address nftAddress, address _witness) external;
    function removeWitness(address nftAddress, address _witness) external;
    function isWitness(address nftAddress, address witness) external view returns (bool);
    function usedNonce(uint256 nonce) external view returns (bool);
    function addNonce(uint256 nonce) external returns (bool);
    function getAssetsForContract(address nftAddress) external view returns (uint256[] memory);
    function getAssetsForContractAtIndex(address nftAddress, uint256 index) external view returns (uint256);
    function addTokenToMap(address nftAddress, bytes32 token, uint256 tokenId) external;
    function getTokensFromMap(address nftAddress, bytes32 token) external view returns (uint256[] memory);
}

contract Balance is Ownable, Context {

    address StorageAddress;
    bool initialized = false;
    
    constructor(address storageContract) {
        StorageAddress = storageContract;
    }
    
    function initialize() public {
        require(!initialized, 'already initialized');
        IBalanceStorage _storage = IBalanceStorage(StorageAddress);
        _storage.upgradeVersion(address(this));
        initialized = true;
    }

    /* ADMIN WRITE */
    function addWitness(address nftAddress, address witness) external onlyOwner {
        IBalanceStorage _storage = IBalanceStorage(StorageAddress);
        return _storage.addWitness(nftAddress, witness);
    }

    function removeWitness(address nftAddress, address witness) external onlyOwner {
        IBalanceStorage _storage = IBalanceStorage(StorageAddress);
        return _storage.removeWitness(nftAddress, witness);
    }

    function promoteVersion(address balanceContract) external onlyOwner {
        IBalanceStorage _storage = IBalanceStorage(StorageAddress);
        _storage.upgradeVersion(balanceContract);
    }

    /* USER WRITE */

    function addBalanceToAsset(address nftAddress, uint256 tokenId, Balances calldata balance, uint256 nonce, bytes calldata signature) public {
        IBalanceStorage _storage = IBalanceStorage(StorageAddress);
        require(IERC721(nftAddress).ownerOf(tokenId) == _msgSender(), 'Only owner can add balance');
        require(!_storage.usedNonce(nonce), 'Nonce already used');
        require(_storage.addNonce(nonce), 'Nonce not added');
        bytes32 serializedBalance = getSerializedBalance(balance);
        bytes32 _hash = addNonceToSerializedBalance(serializedBalance, nonce);
        require(isWitnessed(nftAddress, _hash, signature), 'Not a witness');
        _storage.addBalanceToAsset(nftAddress, tokenId, balance);
        addTokensToMap(nftAddress, tokenId, balance);
        
    }

    function addTokensToMap(address nftAddress, uint256 tokenId, Balances calldata balances) internal {
        for (uint i = 0; i < balances.balances.length; i++) {
            BalanceObject memory balance = balances.balances[i];
            bytes32 _hash = keccak256(abi.encodePacked(balance.blockchain, balance.name));
            IBalanceStorage _storage = IBalanceStorage(StorageAddress);
            _storage.addTokenToMap(nftAddress, _hash, tokenId);
        }
    }

    /* READ */
    function getBalance(address nftAddress, uint256 tokenId) external view returns (Balances memory balance) {
        IBalanceStorage _storage = IBalanceStorage(StorageAddress);
        return _storage.getBalance(nftAddress, tokenId);
    }

    function getSerializedBalances(Balances calldata balances) public pure returns (bytes32[] memory) {
        bytes32[] memory hashes = new bytes32[](balances.balances.length);
        for (uint i = 0; i < balances.balances.length; i++) {
            BalanceObject memory balance = balances.balances[i];
            hashes[i] = keccak256(abi.encodePacked(balance.balance, balance.blockchain, balance.name, balance.symbol, balance.tokenId, balance._address, balance._type));
        }
        return hashes;
    }

    function getSerializedBalance(Balances calldata balances) public pure returns (bytes32) {
        bytes32[] memory hashes = getSerializedBalances(balances);
        bytes32 _hash = keccak256(abi.encodePacked(hashes[0]));
        for (uint i = 1; i < hashes.length; i++) {
            _hash = keccak256(abi.encodePacked(_hash, hashes[i]));
        }
        return _hash;
    }    

    function addNonceToSerializedBalance(bytes32 _hash, uint256 nonce) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(nonce, _hash));
    }

    function isWitnessed(address nftAddress, bytes32 _hash, bytes calldata signature) public view returns (bool) {
        IBalanceStorage _storage = IBalanceStorage(StorageAddress);
        address addressFromSig = recoverSigner(_hash, signature);
        return _storage.isWitness(nftAddress, addressFromSig);
    }    

    function getAssetsForContract(address nftAddress) external view returns (uint256[] memory) {
        IBalanceStorage _storage = IBalanceStorage(StorageAddress);
        return _storage.getAssetsForContract(nftAddress);
    }

    function getAssetCountForContract(address nftAddress) external view returns (uint256) {
        IBalanceStorage _storage = IBalanceStorage(StorageAddress);
        return _storage.getAssetsForContract(nftAddress).length;
    }

    function getAssetsForContractAtIndex(address nftAddress, uint256 index) external view returns (uint256) {
        IBalanceStorage _storage = IBalanceStorage(StorageAddress);
        return _storage.getAssetsForContractAtIndex(nftAddress, index);
    }

    function getTokenIdsFromMap(address nftAddress, uint blockchain, string calldata name) public view returns (uint256[] memory) {
        bytes32 _hash = keccak256(abi.encodePacked(blockchain, name));
        IBalanceStorage _storage = IBalanceStorage(StorageAddress);
        return _storage.getTokensFromMap(nftAddress, _hash);
    }

    function getTokenIdCountFromMap(address nftAddress, uint blockchain, string calldata name) public view returns(uint256) {
        bytes32 _hash = keccak256(abi.encodePacked(blockchain, name));
        IBalanceStorage _storage = IBalanceStorage(StorageAddress);
        return _storage.getTokensFromMap(nftAddress, _hash).length;
    }

    function getTokenIdsFromMapAtIndex(address nftAddress, uint blockchain, string calldata name, uint256 index) public view returns (uint256) {
        bytes32 _hash = keccak256(abi.encodePacked(blockchain, name));
        IBalanceStorage _storage = IBalanceStorage(StorageAddress);
        return _storage.getTokensFromMap(nftAddress, _hash)[index];
    }

    /* UTIL */
    function getAddressFromSignatureHash(bytes32 _hash, bytes calldata signature) public pure returns (address) {
        address addressFromSig = recoverSigner(_hash, signature);
        return addressFromSig;
    }

    function recoverSigner(bytes32 hash, bytes memory sig) public pure returns (address) {
        require(sig.length == 65, "Require correct length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        // Divide the signature in r, s and v variables
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Signature version not match");

        return recoverSigner2(hash, v, r, s);
    }

    function recoverSigner2(bytes32 h, uint8 v, bytes32 r, bytes32 s) internal pure returns (address) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, h));
        address addr = ecrecover(prefixedHash, v, r, s);

        return addr;
    }

}