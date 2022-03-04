pragma solidity 0.8.4;
import "./Context.sol";
import "./Ownable.sol";

contract IsSerialized is Context, Ownable {
    bool internal serialized;
    bool internal hasSerialized = false;
    mapping(uint256 => bytes20[]) internal tokenIdToSerials;
    mapping(bytes20 => uint256) internal serialToTokenId;
    mapping(bytes20 => address) internal serialToOwner;

    function isSerialized() public view returns (bool) {
        return serialized;
    }

    function toggleSerialization() public onlyOwner {
        require(!hasSerialized, "Already has serialized items");
        serialized = !serialized;
    }

    function mintSerial(uint256 tokenId, address owner) public onlyOwner {
        uint256 index = tokenIdToSerials[tokenId].length;
        bytes20 serialNumber = ripemd160(abi.encode(tokenId, block.number, index));
        tokenIdToSerials[tokenId].push(serialNumber);
        serialToTokenId[serialNumber] = tokenId;
        serialToOwner[serialNumber] = owner;
        if (!hasSerialized) {
            hasSerialized = true;
        }
    }

    function transferSerial(bytes20 serialNumber, address from, address to) public onlyOwner {
        require(serialToOwner[serialNumber] == from, 'Not correct owner of serialnumber');
        serialToOwner[serialNumber] = to;
    }

    function getSerial(uint256 tokenId, uint256 index) public view returns (bytes20) {
        if(tokenIdToSerials[tokenId].length == 0) {
            return 0;
        } else {
            return tokenIdToSerials[tokenId][index];
        }
    }

    function getFirstSerialByOwner(address owner, uint256 tokenId) public view returns (bytes20) {
        for (uint256 i = 0; i < tokenIdToSerials[tokenId].length; ++i) {
           bytes20 serialNumber = tokenIdToSerials[tokenId][i];
           if (serialToOwner[serialNumber] == owner) {
               return serialNumber;
           }
        }
        return 0;
    }

    function getOwnerOfSerial(bytes20 serialNumber) public view returns (address) {
        return serialToOwner[serialNumber];
    }

    function getSerialForTokenId(bytes20 serialNumber) public view returns (uint256) {
        return serialToTokenId[serialNumber];
    }
    
}