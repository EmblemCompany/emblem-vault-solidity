// SPDX-License-Identifier: CLOSED - Pending Licensing Audit
pragma solidity ^0.8.4;
import "./Array.sol";
import "./IERC721.sol";
import "./IERC1155.sol";
import "./IERC165.sol";
import "./IERC20.sol";
import "./OwnableUpgradeable.sol";
import "./SafeMath.sol";
import "./ReentrancyGuardUpgradable.sol";

contract Taker is ReentrancyGuardUpgradable, OwnableUpgradeable {

    using SafeMath for uint256;
    using Array for bytes32[];
    
    bytes4 private constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 private constant _INTERFACE_ID_ERC20 = 0x74a1476f;
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;

    enum InventoryType {
        CALCULATED, STATIC
    }

    enum FeeType {
        EMPTY, FLAT, BLOCK
    }

    struct Asset {
        address contractAddress;
        uint256 tokenId;
        bytes4 interfaceId;
    }

    struct Fee {
        address contractAddress;
        uint256 amount;
        FeeType feeType;
    }

    struct Inventory {
        bytes32 assetId;
        uint amount;
        InventoryType inventoryType;
    }

    struct Pair {
        bytes32 askInventoryId;
        bytes32 costInventoryId;
        bool visible;
    }

    struct Royalty {
        address receiver;
        uint96 amount;
    }

    bytes32[] private pairIds;
    bytes32[] private inventoryIds;
    bytes32[] private assetIds;

    mapping(bytes32 => Pair) public pair;
    mapping(bytes32 => Inventory) public inventory;
    mapping(bytes32 => Asset) public asset;

    mapping(bytes32 => Royalty) public royalty;
    mapping(bytes32 => Fee) public fees;

    mapping(bytes32 => bool) private pairUsed;
    mapping(bytes32 => bool) private inventoryUsed;
    mapping(bytes32 => bool) private assetUsed;

    function initialize() public initializer {
        __Ownable_init();
        ReentrancyGuardUpgradable.init();
    }

    function Make(address askAddress, uint256 askTokenId, uint256 askAmount, address costAddress, uint256 costTokenId, uint256 costAmount, bool returnable) onlyOwner public {
        bytes32 askInventoryId = CalculateInventoryId(askAddress, askTokenId, askAmount);
        bytes32 costInventoryId = CalculateInventoryId(costAddress, costTokenId, costAmount);
        require(askInventoryId != costInventoryId, "ask and cost should not be the same");
        require(!inventoryUsed[askInventoryId] || !inventoryUsed[costInventoryId], 'pair already exists');
        _addInventory(askAddress, askTokenId, askAmount);
        _addInventory(costAddress, costTokenId, costAmount);
        _addPair(askAddress, askTokenId, costAddress, costTokenId, askInventoryId, costInventoryId);

        if (returnable) {
            _addPair(costAddress, costTokenId, askAddress, askTokenId, costInventoryId, askInventoryId);
        }
    }

    function _addInventory(address assetAddress, uint256 tokenId, uint256 amount) internal  returns (bytes32){
        bytes32 inventoryId = CalculateInventoryId(assetAddress, tokenId, amount);  
        bytes32 assetId = _addAsset(assetAddress, tokenId);
        if (!inventoryUsed[inventoryId]) {
            inventoryUsed[inventoryId] = true;
            inventoryIds.push(inventoryId);
            inventory[inventoryId] = Inventory(assetId, amount, InventoryType.STATIC );
        }
        return inventoryId;
    }

    function _addPair(address askAddress, uint256 askTokenId, address costAddress, uint256 costTokenId, bytes32 askInventoryId, bytes32 costInventoryId) internal returns (bytes32){
        bytes32 pairId = keccak256(abi.encodePacked(askAddress, askTokenId, costAddress, costTokenId));
        if (!pairUsed[pairId]) {
            pairUsed[pairId] = true;
            pairIds.push(pairId);
            pair[pairId] = Pair(askInventoryId, costInventoryId, true);
        }
        return pairId;
    }

    function _addAsset(address assetAddress, uint256 tokenId) internal returns (bytes32) {
        bytes32 assetId = CalculateId(assetAddress, tokenId);
        if (!assetUsed[assetId]) {
            assetUsed[assetId] = true;
            assetIds.push(assetId);
            asset[assetId] = Asset(assetAddress, tokenId, _determineTokenInterface(assetAddress));
        }
        return assetId;
    }

    function GetInventoryIds() public view returns(bytes32[] memory){
        return inventoryIds;
    }

    function CalculateInventoryId(address assetAddress, uint256 tokenId, uint256 amount) private pure returns(bytes32) {
        return keccak256(abi.encodePacked(assetAddress, tokenId, amount));
    }

    function CalculateId(address assetAddress, uint256 tokenId) public pure returns(bytes32) {
        return keccak256(abi.encodePacked(assetAddress, tokenId));
    }

    function GetAssetIds() public view returns(bytes32[] memory){
        return assetIds;
    }

    function GetPairIds() public view returns(bytes32[] memory){
        return pairIds;
    }

    function GetInventory(bytes32 inventoryId) public view returns (Inventory memory) {
        return inventory[inventoryId];
    }

    function GetAsset(bytes32 assetId) public view returns (Asset memory) {
        return asset[assetId];
    }

    function GetPair(bytes32 pairId) public view returns (Pair memory) {
        return pair[pairId];
    }

    function Take(address askAddress, uint256 askTokenId, uint256 askAmount, address costAddress, uint256 costTokenId, uint256 costAmount) public nonReentrant {
        bytes32 costInventoryId = CalculateInventoryId(costAddress, costTokenId, costAmount);  
        Inventory memory costInventory = inventory[costInventoryId];
        Asset memory costAsset = asset[costInventory.assetId];

        bytes32 askInventoryId = CalculateInventoryId(askAddress, askTokenId, askAmount);  
        Inventory memory askInventory = inventory[askInventoryId];
        Asset memory askAsset = asset[askInventory.assetId];

        require(costAsset.contractAddress != address(0), 'invalid inventory');
        require(_checkBalanceOfAsset(askAddress, askTokenId, address(this), askAsset.interfaceId) >= askInventory.amount, 'contract balance not enough');
        require(_checkBalanceOfAsset(costAsset.contractAddress, costAsset.tokenId, _msgSender(), costAsset.interfaceId) >= costInventory.amount, 'user balance is not enough');
        require(_checkAllowanceOfAsset(costAsset.contractAddress, costAsset.interfaceId, costInventory.amount), 'not allowed to swap');
        require(_transferAsset(askAddress, askTokenId, askAsset.interfaceId, address(this), _msgSender(), askInventory.amount), 'error swapping ask');
        require(_transferAsset(costAsset.contractAddress, costAsset.tokenId, costAsset.interfaceId, _msgSender(), address(this), costInventory.amount), 'error swapping cost');
    }

    // // onlyOwner function to rescue assets

    // function AddFee(address askAddress, uint256 askTokenId,address costAddress, uint256 costTokenId, address feeContract, uint256 amount, uint8 feeType ) public onlyOwner {
    //     bytes32 askInventoryIdentifier = keccak256(abi.encodePacked(askAddress, askTokenId, costAddress, costTokenId));
    //     require(_InventoryIdentifierUsed[askInventoryIdentifier], 'unknown inventory');
    //     InventoryFee[askInventoryIdentifier] = Fee(feeContract, amount, feeType);
    // }

    // function _addAsset(bytes32 assetTokenIdentifier, bytes32 assetInventoryIdentifier) private {
    //     if (!_containsAsset(assetTokenIdentifier)) {
    //         _Assets.push(assetTokenIdentifier);
    //     }
    //     if (!_InventoryIdentifierUsed[assetInventoryIdentifier]) {
    //         _AssetToAssetInventory[assetTokenIdentifier].push(assetInventoryIdentifier);
    //         _InventoryIdentifierUsed[assetInventoryIdentifier] = true;
    //         _Identifiers.push(assetInventoryIdentifier);
    //     }
    // }

    function DeleteInventory(address askAddress, uint256 askTokenId, uint256 askAmount, address costAddress, uint256 costTokenId, uint256 costAmount, bool returnable) public onlyOwner {
        bytes32 costInventoryId = CalculateInventoryId(costAddress, costTokenId, costAmount);
        bytes32 askInventoryId = CalculateInventoryId(askAddress, askTokenId, askAmount);
        require(inventoryUsed[costInventoryId] && inventoryUsed[askInventoryId], 'inventory does not exist');
        _removePair(askAddress, askTokenId, costAddress, costTokenId, askInventoryId, costInventoryId);
        if (returnable) {
            _removePair(costAddress, costTokenId, askAddress, askTokenId, costInventoryId, askInventoryId);
        }
    }
    
    function _removePair(address askAddress, uint256 askTokenId, address costAddress, uint256 costTokenId, bytes32 askInventoryId, bytes32 costInventoryId) internal returns (bytes32){
        bytes32 pairId = keccak256(abi.encodePacked(askAddress, askTokenId, costAddress, costTokenId));
        require(pairUsed[pairId], 'Pair does not exist');
        bool askSeen;
        bool costSeen;
        for(uint i=0; i< pairIds.length; i++) {
            if (pairIds[i] == pairId) {
                pairIds[i] = pairIds[pairIds.length - 1];
                pairIds.pop();
            }
        }
        for (uint i = 0; i < pairIds.length; i++) {
            if (pair[pairIds[i]].askInventoryId == askInventoryId) {
                askSeen = true;
            }
            if (pair[pairIds[i]].costInventoryId == costInventoryId) {
                costSeen = true;
            }
        }
        if (!askSeen) { _removeFromInventory(askInventoryId);}
        if (!costSeen) { _removeFromInventory(costInventoryId);}
        pairUsed[pairId] = false;
        delete pair[pairId];
    }

    function _removeFromInventory(bytes32 inventoryId) private {
        bytes32 assetId = inventory[inventoryId].assetId;
        bool assetSeen;
        for(uint i=0; i< assetIds.length; i++) {
            if (assetIds[i] == inventoryId) {
                assetIds[i] = assetIds[assetIds.length - 1];
                assetIds.pop();
            }
        }
        for (uint i = 0; i < assetIds.length; i++) {
            if (assetIds[i] == assetId) {
                assetSeen = true;
            }
        }
        if (!assetSeen) { 
            assetUsed[assetId] = false;
            delete asset[assetId];
        }
        inventoryUsed[inventoryId] = false;
        delete inventory[inventoryId];
        _deleteFromArray(inventoryIds, inventoryId);
    }


    function _deleteFromArray(bytes32[] storage arr, bytes32 assetIdentifier) private {
        for(uint i=0; i<arr.length; i++) {
            if (arr[i] == assetIdentifier) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
            }
        }
    }

    // function _containsAsset(bytes32 assetIdentifier) private view returns (bool seen) {
    //     seen = false;
    //     for(uint i=0; i<_Assets.length; i++) {
    //         if (_Assets[i] == assetIdentifier) {
    //            seen = true;
    //         }
    //     }      
    // }

    // function Version() public virtual pure returns (uint256 version) {
    //     return 2;
    // }

    function _determineTokenInterface(address contractAddress) private view returns (bytes4 interfaceId) {
        if (_checkInterface(contractAddress, _INTERFACE_ID_ERC1155)) {
            return _INTERFACE_ID_ERC1155;
        } else if (_checkInterface(contractAddress, _INTERFACE_ID_ERC721)) {
            return _INTERFACE_ID_ERC721;
        }
        return _INTERFACE_ID_ERC20;
    }

    function _checkBalanceOfAsset(address contractAddress, uint256 tokenId, address account, bytes4 interfaceId) private view returns (uint256 balance) {
        if (interfaceId == _INTERFACE_ID_ERC1155) {
            return IERC1155(contractAddress).balanceOf(account, tokenId);
        } else if (interfaceId == _INTERFACE_ID_ERC721) {
            return (IERC721(contractAddress).ownerOf(tokenId) == account)? 1: 0;
        } else {
            return IERC20(contractAddress).balanceOf(account);
        }
    }

    function _checkAllowanceOfAsset(address contractAddress, bytes4 interfaceId, uint256 amount) private view returns (bool approved) {
        if (interfaceId == _INTERFACE_ID_ERC1155) {
            return IERC1155(contractAddress).isApprovedForAll(_msgSender(), address(this));
        } else if (interfaceId == _INTERFACE_ID_ERC721) {
            return IERC721(contractAddress).isApprovedForAll(_msgSender(), address(this));
        } else {
            return IERC20(contractAddress).allowance(_msgSender(), address(this)) >= amount;
        }
    }

    function _transferAsset(address contractAddress, uint256 tokenId, bytes4 interfaceId, address fromAddress, address destinationAddress, uint256 amount) private returns (bool transferred) {
        if (interfaceId == _INTERFACE_ID_ERC1155) {
            IERC1155(contractAddress).safeTransferFrom(fromAddress, destinationAddress, tokenId, amount, "");
        } else if (interfaceId == _INTERFACE_ID_ERC721) {
            try IERC721(contractAddress).safeTransferFrom(fromAddress, destinationAddress, tokenId) {} // erc721 should safe transfer
            catch {
                IERC721(contractAddress).transferFrom(fromAddress, destinationAddress, tokenId); // emblem safe transfer is non standard
            }
        } else {
            IERC20(contractAddress).transferFrom(fromAddress, destinationAddress, amount);
        }
        return _checkBalanceOfAsset(contractAddress, tokenId, destinationAddress, interfaceId) >= amount;
    }

    function _checkInterface(address token, bytes4 _interface) private view returns (bool) {
        IERC165 nftToken = IERC165(token);
        bool supportsInterface = false;
        try  nftToken.supportsInterface(_interface) returns (bool _supports) {
            supportsInterface = _supports;
        } catch {
            if (_interface == 0x74a1476f) {
                supportsInterface = true;
            }
        }
        return supportsInterface;
    }

    
}