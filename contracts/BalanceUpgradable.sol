pragma solidity ^0.8.4;
import "./IERC721.sol";
import "./ReentrancyGuardUpgradable.sol";
import "./HasRegistrationUpgradable.sol";

contract BalanceUpgradable is ReentrancyGuardUpgradable, HasRegistrationUpgradable {

    bool canAddBalances;
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
    
    function initialize() public initializer {
        __Ownable_init();
        ReentrancyGuardUpgradable.init();
        canAddBalances = true;
    }

    /* ADMIN WRITE */
    function addWitness(address nftAddress, address _witness) public onlyOwner {
        witnesses[nftAddress][_witness] = true;
    }

    function removeWitness(address nftAddress, address _witness) public onlyOwner {
        witnesses[nftAddress][_witness] = false;
    }

    function isWitness(address nftAddress, address witness) public view onlyOwner returns (bool) {
        return witnesses[nftAddress][witness];
    }

    function getBalance(address nftAddress, uint256 tokenId) public view onlyOwner returns (Balances memory) {
        return balances[nftAddress][tokenId];
    } 

    function getAssetsForContract(address nftAddress) public view onlyOwner returns (uint256[] memory) {
        return contractTokenIds[nftAddress];
    }

    function getAssetCountForContract(address nftAddress) external view returns (uint256) {
        return contractTokenIds[nftAddress].length;
    }

    function getAssetsForContractAtIndex(address nftAddress, uint256 index) public view onlyOwner returns (uint256) {
        return contractTokenIds[nftAddress][index];
    }

    function getTokensFromMap(address nftAddress, bytes32 token) public view onlyOwner returns(uint256[] memory) {
        return tokensToContractMap[token][nftAddress];
    }

    function addTokenToMap(address nftAddress, bytes32 token, uint256 tokenId) public onlyOwner {
        tokensToContractMap[token][nftAddress].push(tokenId);
    }

    function addNonce(uint256 nonce) public onlyOwner returns (bool) {
        require(!usedNonces[nonce], 'Nonce already used');
        return usedNonces[nonce] = true;
    }

    function toggleCanAddBalances() public onlyOwner {
        canAddBalances = !canAddBalances;
    }

    /* USER WRITE */

    function addBalanceToAsset(address nftAddress, uint256 tokenId, Balances calldata balance, uint256 nonce, bytes calldata signature) public nonReentrant {
        if (canAddBalances) {
            require(IERC721(nftAddress).ownerOf(tokenId) == _msgSender(), 'Only owner can add balance');
            require(!usedNonces[nonce], 'Nonce already used');
            require(addNonce(nonce), 'Nonce not added');
            bytes32 serializedBalance = getSerializedBalance(balance);
            bytes32 _hash = addNonceToSerializedBalance(serializedBalance, nonce);
            require(isWitnessed(nftAddress, _hash, signature), 'Not a witness');
            balances[nftAddress][tokenId] = balance;
            contractTokenIds[nftAddress].push(tokenId);
            addTokensToMap(nftAddress, tokenId, balance);
        } else {
            revert("Adding balances is disabled");
        }
        
    }

    function addTokensToMap(address nftAddress, uint256 tokenId, Balances calldata _balances) internal {
        for (uint i = 0; i < _balances.balances.length; i++) {
            BalanceObject memory balance = _balances.balances[i];
            bytes32 _hash = keccak256(abi.encodePacked(balance.blockchain, balance.name));
            addTokenToMap(nftAddress, _hash, tokenId);
        }
    }


    function getSerializedBalances(Balances calldata _balances) public pure returns (bytes32[] memory) {
        bytes32[] memory hashes = new bytes32[](_balances.balances.length);
        for (uint i = 0; i < _balances.balances.length; i++) {
            BalanceObject memory balance = _balances.balances[i];
            hashes[i] = keccak256(abi.encodePacked(balance.balance, balance.blockchain, balance.name, balance.symbol, balance.tokenId, balance._address, balance._type));
        }
        return hashes;
    }

    function getSerializedBalance(Balances calldata _balances) public pure returns (bytes32) {
        bytes32[] memory hashes = getSerializedBalances(_balances);
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
        address addressFromSig = recoverSigner(_hash, signature);
        return isWitness(nftAddress, addressFromSig);
    }

    function getTokenIdsFromMap(address nftAddress, uint blockchain, string calldata name) public view returns (uint256[] memory) {
        bytes32 _hash = keccak256(abi.encodePacked(blockchain, name));
        return getTokensFromMap(nftAddress, _hash);
    }

    function getTokenIdCountFromMap(address nftAddress, uint blockchain, string calldata name) public view returns(uint256) {
        bytes32 _hash = keccak256(abi.encodePacked(blockchain, name));
        return getTokensFromMap(nftAddress, _hash).length;
    }

    function getTokenIdsFromMapAtIndex(address nftAddress, uint blockchain, string calldata name, uint256 index) public view returns (uint256) {
        bytes32 _hash = keccak256(abi.encodePacked(blockchain, name));
        return getTokensFromMap(nftAddress, _hash)[index];
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