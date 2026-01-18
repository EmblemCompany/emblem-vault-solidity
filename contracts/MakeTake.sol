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
import "./Clonable.sol";

interface IERC20Permit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

contract MakeTake is Clonable, ReentrancyGuardUpgradable, OwnableUpgradeable {
    using SafeMath for uint256;

    bytes4 private constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 private constant _INTERFACE_ID_ERC20 = 0x74a1476f; // sentinel for ERC20
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;

    enum InventoryType { CALCULATED, STATIC }
    enum FeeType { EMPTY, FLAT, BLOCK }

    struct Asset {
        address contractAddress;
        uint256 tokenId;
        bytes4 interfaceId;
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

    // Storage
    bytes32[] private pairIds;
    bytes32[] private inventoryIds;
    bytes32[] private assetIds;

    mapping(bytes32 => Pair) public pair;
    mapping(bytes32 => Inventory) public inventory;
    mapping(bytes32 => Asset) public asset;

    mapping(bytes32 => bool) private pairUsed;
    mapping(bytes32 => bool) private inventoryUsed;
    mapping(bytes32 => bool) private assetUsed;

    // Events
    event Made(bytes32 indexed pairId, bytes32 indexed askInventoryId, bytes32 indexed costInventoryId, bool returnable, bool visible);
    event Unmade(bytes32 indexed pairId);
    event Taken(bytes32 indexed pairId, address indexed taker, uint256 askAmount, uint256 costAmount);
    event PairVisibilitySet(bytes32 indexed pairId, bool visible);

    function initialize() public override initializer {
        __Ownable_init();
        ReentrancyGuardUpgradable.init();
    }

    // Make: create pair(s). If returnable = true, also creates reverse pair.
    function Make(
        address askAddress,
        uint256 askTokenId,
        uint256 askAmount,
        address costAddress,
        uint256 costTokenId,
        uint256 costAmount,
        bool returnable,
        bool visible
    ) public onlyOwner {
        bytes32 askInventoryId = _addInventory(askAddress, askTokenId, askAmount);
        bytes32 costInventoryId = _addInventory(costAddress, costTokenId, costAmount);
        bytes32 forwardPairId = _addPair(askAddress, askTokenId, costAddress, costTokenId, askInventoryId, costInventoryId, visible);
        emit Made(forwardPairId, askInventoryId, costInventoryId, returnable, visible);
        if (returnable) {
            bytes32 reversePairId = _addPair(costAddress, costTokenId, askAddress, askTokenId, costInventoryId, askInventoryId, visible);
            emit Made(reversePairId, costInventoryId, askInventoryId, returnable, visible);
        }
    }

    // Unmake: remove pair(s) and cleanup orphan inventories/assets
    function Unmake(
        address askAddress,
        uint256 askTokenId,
        address costAddress,
        uint256 costTokenId,
        bool returnable
    ) public onlyOwner {
        bytes32 forwardPairId = _pairId(askAddress, askTokenId, costAddress, costTokenId);
        _removePair(forwardPairId);
        emit Unmade(forwardPairId);
        if (returnable) {
            bytes32 reversePairId = _pairId(costAddress, costTokenId, askAddress, askTokenId);
            _removePair(reversePairId);
            emit Unmade(reversePairId);
        }
    }

    // Take: users swap cost asset for ask asset, validated by existing, visible pair
    function Take(
        address askAddress,
        uint256 askTokenId,
        uint256 askAmount,
        address costAddress,
        uint256 costTokenId,
        uint256 costAmount
    ) public nonReentrant {
        bytes32 pId = _requireVisiblePair(askAddress, askTokenId, costAddress, costTokenId);
        Pair memory pr = pair[pId];
        require(inventoryUsed[pr.askInventoryId] && inventoryUsed[pr.costInventoryId], "inventory missing");
        Inventory memory askInv = inventory[pr.askInventoryId];
        Inventory memory costInv = inventory[pr.costInventoryId];
        require(askInv.amount == askAmount && costInv.amount == costAmount, "amount mismatch");

        Asset memory askAsset = asset[askInv.assetId];
        Asset memory costAsset = asset[costInv.assetId];

        require(_checkBalanceOfAsset(askAsset.contractAddress, askAsset.tokenId, address(this), askAsset.interfaceId) >= askInv.amount, "ask insufficient");
        require(_checkBalanceOfAsset(costAsset.contractAddress, costAsset.tokenId, msg.sender, costAsset.interfaceId) >= costInv.amount, "cost insufficient");
        require(_checkAllowanceOfAsset(costAsset.contractAddress, costAsset.interfaceId, costInv.amount), "not approved");

        require(_transferAsset(askAsset.contractAddress, askAsset.tokenId, askAsset.interfaceId, address(this), msg.sender, askInv.amount), "ask transfer");
        require(_transferAsset(costAsset.contractAddress, costAsset.tokenId, costAsset.interfaceId, msg.sender, address(this), costInv.amount), "cost transfer");

        emit Taken(pId, msg.sender, askInv.amount, costInv.amount);
    }

    // Take with EIP-2612 permit for ERC20 cost assets
    function TakeWithPermit(
        address askAddress,
        uint256 askTokenId,
        uint256 askAmount,
        address costAddress,
        uint256 costTokenId,
        uint256 costAmount,
        uint256 permitDeadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // If cost is ERC20, set allowance via permit before Take
        bytes32 pId = _pairId(askAddress, askTokenId, costAddress, costTokenId);
        require(pairUsed[pId], "pair missing");
        Pair memory pr = pair[pId];
        Inventory memory costInv = inventory[pr.costInventoryId];
        Asset memory costAsset = asset[costInv.assetId];
        if (costAsset.interfaceId == _INTERFACE_ID_ERC20) {
            IERC20Permit(costAsset.contractAddress).permit(
                msg.sender,
                address(this),
                costAmount,
                permitDeadline,
                v,
                r,
                s
            );
        }
        Take(askAddress, askTokenId, askAmount, costAddress, costTokenId, costAmount);
    }

    function setPairVisible(bytes32 pairId, bool visible) external onlyOwner {
        require(pairUsed[pairId], "pair missing");
        pair[pairId].visible = visible;
        emit PairVisibilitySet(pairId, visible);
    }

    // View helpers
    function GetInventoryIds() public view returns (bytes32[] memory) { return inventoryIds; }
    function GetAssetIds() public view returns (bytes32[] memory) { return assetIds; }
    function GetPairIds() public view returns (bytes32[] memory) { return pairIds; }
    function version() public pure override returns (uint256) { return 2; }

    // Helper: fetch pair id and visibility by addresses/tokenIds
    function GetPairByAddresses(
        address askAddress,
        uint256 askTokenId,
        address costAddress,
        uint256 costTokenId
    ) external view returns (bytes32 pairId, bool exists, bool visible) {
        pairId = _pairId(askAddress, askTokenId, costAddress, costTokenId);
        exists = pairUsed[pairId];
        visible = exists ? pair[pairId].visible : false;
    }

    // Rescue functions for owner
    function rescueERC20(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).transfer(to, amount);
    }
    function rescueERC721(address token, uint256 tokenId, address to) external onlyOwner {
        IERC721(token).transferFrom(address(this), to, tokenId);
    }
    function rescueERC1155(address token, uint256 id, uint256 amount, address to) external onlyOwner {
        IERC1155(token).safeTransferFrom(address(this), to, id, amount, "");
    }
    function rescueETH(address payable to, uint256 amount) external onlyOwner {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "eth");
    }

    // Internals
    function _addInventory(address assetAddress, uint256 tokenId, uint256 amount) internal returns (bytes32){
        bytes32 inventoryId = _inventoryId(assetAddress, tokenId, amount);
        bytes32 assetId = _addAsset(assetAddress, tokenId);
        if (!inventoryUsed[inventoryId]) {
            inventoryUsed[inventoryId] = true;
            inventoryIds.push(inventoryId);
            inventory[inventoryId] = Inventory(assetId, amount, InventoryType.STATIC);
        }
        return inventoryId;
    }

    function _addPair(
        address askAddress,
        uint256 askTokenId,
        address costAddress,
        uint256 costTokenId,
        bytes32 askInventoryId,
        bytes32 costInventoryId,
        bool visible
    ) internal returns (bytes32){
        bytes32 pairId = _pairId(askAddress, askTokenId, costAddress, costTokenId);
        require(askInventoryId != costInventoryId, "same inv");
        require(!pairUsed[pairId], "pair exists");
        pairUsed[pairId] = true;
        pairIds.push(pairId);
        pair[pairId] = Pair(askInventoryId, costInventoryId, visible);
        return pairId;
    }

    function _addAsset(address assetAddress, uint256 tokenId) internal returns (bytes32) {
        bytes32 assetId = _assetId(assetAddress, tokenId);
        if (!assetUsed[assetId]) {
            assetUsed[assetId] = true;
            assetIds.push(assetId);
            asset[assetId] = Asset(assetAddress, tokenId, _determineTokenInterface(assetAddress));
        }
        return assetId;
    }

    function _removePair(bytes32 pairId) internal {
        require(pairUsed[pairId], "pair missing");
        Pair memory pr = pair[pairId];

        // remove pairId from array by pop/replace
        for (uint i = 0; i < pairIds.length; i++) {
            if (pairIds[i] == pairId) {
                pairIds[i] = pairIds[pairIds.length - 1];
                pairIds.pop();
                break;
            }
        }
        pairUsed[pairId] = false;
        delete pair[pairId];

        // check if ask/cost inventories are still referenced by any pair
        bool askSeen;
        bool costSeen;
        for (uint i = 0; i < pairIds.length; i++) {
            if (pair[pairIds[i]].askInventoryId == pr.askInventoryId) { askSeen = true; }
            if (pair[pairIds[i]].costInventoryId == pr.costInventoryId) { costSeen = true; }
            if (askSeen && costSeen) break;
        }
        if (!askSeen) { _removeInventoryId(pr.askInventoryId); }
        if (!costSeen) { _removeInventoryId(pr.costInventoryId); }
    }

    function _removeInventoryId(bytes32 inventoryId) internal {
        // Remove the inventory id from list
        for (uint i = 0; i < inventoryIds.length; i++) {
            if (inventoryIds[i] == inventoryId) {
                inventoryIds[i] = inventoryIds[inventoryIds.length - 1];
                inventoryIds.pop();
                break;
            }
        }
        // capture asset id before deleting inventory mapping
        bytes32 assetId = inventory[inventoryId].assetId;
        inventoryUsed[inventoryId] = false;
        delete inventory[inventoryId];

        // check if asset is still referenced by any inventory
        bool assetSeen;
        for (uint i = 0; i < inventoryIds.length; i++) {
            if (inventory[inventoryIds[i]].assetId == assetId) { assetSeen = true; break; }
        }
        if (!assetSeen) {
            _removeAssetId(assetId);
        }
    }

    function _removeAssetId(bytes32 assetId) internal {
        for (uint i = 0; i < assetIds.length; i++) {
            if (assetIds[i] == assetId) {
                assetIds[i] = assetIds[assetIds.length - 1];
                assetIds.pop();
                break;
            }
        }
        assetUsed[assetId] = false;
        delete asset[assetId];
    }

    function _pairId(address askAddress, uint256 askTokenId, address costAddress, uint256 costTokenId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(askAddress, askTokenId, costAddress, costTokenId));
    }
    function _inventoryId(address assetAddress, uint256 tokenId, uint256 amount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(assetAddress, tokenId, amount));
    }
    function _assetId(address assetAddress, uint256 tokenId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(assetAddress, tokenId));
    }

    function _requireVisiblePair(address askAddress, uint256 askTokenId, address costAddress, uint256 costTokenId) internal view returns (bytes32) {
        bytes32 pId = _pairId(askAddress, askTokenId, costAddress, costTokenId);
        require(pairUsed[pId], "pair missing");
        require(pair[pId].visible, "pair hidden");
        return pId;
    }

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
            return (IERC721(contractAddress).ownerOf(tokenId) == account) ? 1 : 0;
        } else {
            return IERC20(contractAddress).balanceOf(account);
        }
    }

    function _checkAllowanceOfAsset(address contractAddress, bytes4 interfaceId, uint256 amount) private view returns (bool approved) {
        if (interfaceId == _INTERFACE_ID_ERC1155) {
            return IERC1155(contractAddress).isApprovedForAll(msg.sender, address(this));
        } else if (interfaceId == _INTERFACE_ID_ERC721) {
            return IERC721(contractAddress).isApprovedForAll(msg.sender, address(this));
        } else {
            return IERC20(contractAddress).allowance(msg.sender, address(this)) >= amount;
        }
    }

    function _transferAsset(address contractAddress, uint256 tokenId, bytes4 interfaceId, address fromAddress, address destinationAddress, uint256 amount) private returns (bool transferred) {
        if (interfaceId == _INTERFACE_ID_ERC1155) {
            IERC1155(contractAddress).safeTransferFrom(fromAddress, destinationAddress, tokenId, amount, "");
        } else if (interfaceId == _INTERFACE_ID_ERC721) {
            try IERC721(contractAddress).safeTransferFrom(fromAddress, destinationAddress, tokenId) {} // ERC721 should safe transfer
            catch {
                IERC721(contractAddress).transferFrom(fromAddress, destinationAddress, tokenId); // fallback for nonstandard implementations
            }
        } else {
            IERC20(contractAddress).transferFrom(fromAddress, destinationAddress, amount);
        }
        return _checkBalanceOfAsset(contractAddress, tokenId, destinationAddress, interfaceId) >= amount;
    }

    function _checkInterface(address token, bytes4 _interface) private view returns (bool) {
        IERC165 nftToken = IERC165(token);
        bool supportsInterface = false;
        try nftToken.supportsInterface(_interface) returns (bool _supports) {
            supportsInterface = _supports;
        } catch {
            if (_interface == _INTERFACE_ID_ERC20) {
                supportsInterface = true;
            }
        }
        return supportsInterface;
    }

    // receive to enable ETH rescue and possible future flows
    receive() external payable {}
}
