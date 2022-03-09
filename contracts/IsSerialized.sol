pragma solidity 0.8.4;
import "./Context.sol";
import "./Ownable.sol";

interface IIsSerialized {
    function isSerialized() external view returns (bool);
    function getSerial(uint256 tokenId, uint256 index) external view returns (uint256);
    function getFirstSerialByOwner(address owner, uint256 tokenId) external view returns (uint256);
    function getOwnerOfSerial(uint256 serialNumber) external view returns (address);
    function getTokenIdForSerialNumber(uint256 serialNumber) external view returns (uint256);
}

contract IsSerialized is Context, Ownable {
    bool internal serialized;
    bool internal hasSerialized = false;
    mapping(uint256 => uint256[]) internal tokenIdToSerials;
    mapping(uint256 => uint256) internal serialToTokenId;
    mapping(uint256 => address) internal serialToOwner;

    function isSerialized() public view returns (bool) {
        return serialized;
    }

    function toggleSerialization() public onlyOwner {
        require(!hasSerialized, "Already has serialized items");
        serialized = !serialized;
    }

    function mintSerial(uint256 tokenId, address owner) public onlyOwner {
        uint256 index = tokenIdToSerials[tokenId].length;
        uint256 serialNumber = uint256(keccak256(abi.encode(tokenId, block.number, index)));
        tokenIdToSerials[tokenId].push(serialNumber);
        serialToTokenId[serialNumber] = tokenId;
        serialToOwner[serialNumber] = owner;
        if (!hasSerialized) {
            hasSerialized = true;
        }
    }

    function transferSerial(uint256 serialNumber, address from, address to) internal {
        require(serialToOwner[serialNumber] == from, 'Not correct owner of serialnumber');
        serialToOwner[serialNumber] = to;
    }

    function getSerial(uint256 tokenId, uint256 index) public view returns (uint256) {
        if(tokenIdToSerials[tokenId].length == 0) {
            return 0;
        } else {
            return tokenIdToSerials[tokenId][index];
        }
    }

    function getFirstSerialByOwner(address owner, uint256 tokenId) public view returns (uint256) {
        for (uint256 i = 0; i < tokenIdToSerials[tokenId].length; ++i) {
           uint256 serialNumber = tokenIdToSerials[tokenId][i];
           if (serialToOwner[serialNumber] == owner) {
               return serialNumber;
           }
        }
        return 0;
    }

    function getOwnerOfSerial(uint256 serialNumber) public view returns (address) {
        return serialToOwner[serialNumber];
    }

    function getTokenIdForSerialNumber(uint256 serialNumber) public view returns (uint256) {
        return serialToTokenId[serialNumber];
    }
    
}