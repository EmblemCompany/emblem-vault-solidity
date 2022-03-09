pragma solidity 0.8.4;
import "./IERC721.sol";
import "./Ownable.sol";
import "./Context.sol";
import "./ReentrancyGuard.sol";
import "./HasRegistration.sol";

interface IStorage {
    function getDead() external view returns(address);
    function addToLegacy(address nftAddress, bytes32 root) external;
    function addToLegacyClaimedBy(address nftAddress, bytes32 root) external;
    function getLegacyClaims(address nftAddress) external view returns (bytes32);
    function getLegacyClaimsBy(address nftAddress) external view returns (bytes32);
    function addToClaims(address nftAddress, uint tokenId, address _owner) external;
    function getClaims(address nftAddress, uint tokenId) external view returns (address);
    function getClaimsFor(address _owner) external view returns (uint256[] memory);
    function getBurnAddresses() external view returns (address[] memory);
    function addToBurnAddresses(address burnAddress) external;
    function upgradeVersion(address _newVersion) external;
}

contract Claimed is ReentrancyGuard, HasRegistration {
    
    address StorageAddress;
    bool initialized = false;
    bool canClaim = true;
    
    constructor(address storageContract) {
        StorageAddress = storageContract;
    }
    
    function initialize() public {
        require(!initialized, 'already initialized');
        IStorage _storage = IStorage(StorageAddress);
        _storage.upgradeVersion(address(this));
        initialized = true;
    }
    
    function isBurnAddress(address needle) public view returns (bool) {
        address[] memory BurnAddresses = IStorage(StorageAddress).getBurnAddresses();
        for (uint i=0; i < BurnAddresses.length; i++) {
            if (BurnAddresses[i] == needle) {
                return true;
            }
        }
        return false;
    }

    function toggleCanClaim() public onlyOwner {
        canClaim = !canClaim;
    }
    
    function claim(address nftAddress, uint tokenId, address _claimedBy) public nonReentrant isRegisteredContract(_msgSender()) {        
        if (canClaim) {
            IStorage(StorageAddress).addToClaims(nftAddress, tokenId, _claimedBy);
        } else { 
            revert("Claiming is turned off");
        }
    }
    
    function isClaimed(address nftAddress, uint tokenId, bytes32[] calldata proof ) public view returns(bool) {
        bytes32 _hash = keccak256(abi.encodePacked(tokenId));
        IERC721 token = IERC721(nftAddress);        
        if (proof.length == 0) {
            bool claimed = IStorage(StorageAddress).getClaims(nftAddress, tokenId) != address(0);
            bool addressClaimed = false;
            try token.ownerOf(tokenId) returns (address _owner) {
                if (isBurnAddress(_owner)) {
                    addressClaimed = true;
                }
            } catch {}
            return addressClaimed || claimed;
        } else {
            bytes32 root = IStorage(StorageAddress).getLegacyClaims(nftAddress);
            return verifyScript(root, _hash, proof);
        }
    }

    function getClaimsFor(address _owner) public view returns (uint256[] memory) {
        return IStorage(StorageAddress).getClaimsFor(_owner);
    }

    function getLegacyClaims(address nftAddress) external view returns(bytes32) {
        return IStorage(StorageAddress).getLegacyClaims(nftAddress);
    }
    
    function claimedBy(address nftAddress, uint tokenId) public view returns (address _owner, string memory _type) {
        address claimed = IStorage(StorageAddress).getClaims(nftAddress, tokenId);
        if (claimed != address(0)) {
            return (claimed, "record");
        } else {
            return (address(0), "unknown");
        }
    }

    function legacyClaimedBy(address nftAddress, address claimant, uint tokenId, bytes32[] calldata proof) public view returns (address _owner, string memory _type) {
        bytes32 root = IStorage(StorageAddress).getLegacyClaimsBy(nftAddress);
        bytes32 _hash = keccak256(abi.encodePacked(claimant, tokenId));
        require(verifyScript(root, _hash, proof), "invalid proof");
        return (claimant, 'legacy');
    }

    function addLegacy(address nftAddress, bytes32 root) onlyOwner public {
        IStorage(StorageAddress).addToLegacy(nftAddress, root);        
    }

    function addLegacyClaimedBy(address nftAddress, bytes32 root) onlyOwner public {
        IStorage(StorageAddress).addToLegacyClaimedBy(nftAddress, root);        
    }

    function verifyScript(bytes32 root, bytes32 _hash, bytes32[] calldata proof) public pure returns (bool) {
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (_hash <= proofElement) {
                _hash = optihash(_hash, proofElement);
            } else {
                _hash = optihash(proofElement, _hash);
            }
        }
        return _hash == root;
    }
    // memory optimization from: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/3039
    function optihash(bytes32 a, bytes32 b) private pure returns (bytes32 value) {
        assembly {
        mstore(0x00, a)
        mstore(0x20, b)
        value := keccak256(0x00, 0x40)
        }
    }

}