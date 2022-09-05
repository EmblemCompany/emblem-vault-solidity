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

contract Rental is ReentrancyGuardUpgradable, OwnableUpgradeable {

    using SafeMath for uint256;
    using Array for bytes32[];
    
    bytes4 private constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 private constant _INTERFACE_ID_ERC20 = 0x74a1476f;
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;

    struct Asset {
        address contractAddress;
        uint256 tokenId;
        bytes4 interfaceId;
    }

    struct Fee {
        address contractAddress;
        uint256 amount;
        uint8 feeType; // 0 EMPTY, 1 FLAT, 2 BLOCK
    }

    struct AssetInventory {
        Asset asset;
        uint256 amount;
    }

    mapping(bytes32 => AssetInventory) public Inventory;
    mapping(bytes32 => Fee) public InventoryFee;
    bytes32[] private _Identifiers;
    mapping(bytes32 => bool) private _InventoryIdentifierUsed;

    mapping(bytes32 => bytes32[]) private _AssetToAssetInventory;
    bytes32[] private _Assets;

    function initialize() public initializer {
        __Ownable_init();
        ReentrancyGuardUpgradable.init();
    }

    function GetAssets() public view returns (bytes32[] memory assets) {
        return _Assets;
    }

    function GetAssetInventory(bytes32 assetTokenIdentifier) public view returns (bytes32[] memory assets) {
        return _AssetToAssetInventory[assetTokenIdentifier];
    }

    function Rent(address askAddress, uint256 askTokenId, address costAddress, uint256 costTokenId) public nonReentrant {
        AssetInventory memory cost = Inventory[keccak256(abi.encodePacked(askAddress, askTokenId, costAddress, costTokenId))];
        AssetInventory memory ask = Inventory[keccak256(abi.encodePacked(cost.asset.contractAddress, cost.asset.tokenId, askAddress, askTokenId))];
        require(cost.asset.contractAddress != address(0), 'invalid inventory');
        require(_checkBalanceOfAsset(askAddress, askTokenId, address(this), ask.asset.interfaceId) >= ask.amount, 'contract balance not enough');
        require(_checkBalanceOfAsset(cost.asset.contractAddress, cost.asset.tokenId, _msgSender(), cost.asset.interfaceId) >= cost.amount, 'user balance is not enough');
        require(_checkAllowanceOfAsset(cost.asset.contractAddress, cost.asset.interfaceId, cost.amount), 'not allowed to swap');
        require(_transferAsset(askAddress, askTokenId, ask.asset.interfaceId, address(this), _msgSender(), ask.amount), 'error swapping ask');
        require(_transferAsset(cost.asset.contractAddress, cost.asset.tokenId, cost.asset.interfaceId, _msgSender(), address(this), cost.amount), 'error swapping cost');
    }

    // onlyOwner function to rescue assets

    function AddInventory(address askAddress, uint256 askTokenId, uint256 askAmount, address costAddress, uint256 costTokenId, uint256 costAmount, bool twoSided) public onlyOwner {
        bytes32 askInventoryIdentifier = keccak256(abi.encodePacked(askAddress, askTokenId, costAddress, costTokenId));
        bytes32 askTokenIdentifier = keccak256(abi.encodePacked(askAddress, askTokenId));
        bytes32 costInventoryIdentifier = keccak256(abi.encodePacked(costAddress, costTokenId, askAddress, askTokenId));
        bytes32 costTokenIdentifier = keccak256(abi.encodePacked(costAddress, costTokenId));
        require(askInventoryIdentifier != costInventoryIdentifier, "ask and cost should not be the same");
        require(!_InventoryIdentifierUsed[askInventoryIdentifier] && !_InventoryIdentifierUsed[costInventoryIdentifier], 'inventory already exists');
        _addAsset(askTokenIdentifier, askInventoryIdentifier);
        Inventory[askInventoryIdentifier] = AssetInventory(Asset(costAddress, costTokenId, _determineTokenInterface(costAddress)), costAmount);
        if (twoSided) {
            _addAsset(costTokenIdentifier, costInventoryIdentifier);
            Inventory[costInventoryIdentifier] = AssetInventory(Asset(askAddress, askTokenId, _determineTokenInterface(askAddress)), askAmount);
        } else {
        }
    }

    function AddFee(address askAddress, uint256 askTokenId,address costAddress, uint256 costTokenId, address feeContract, uint256 amount, uint8 feeType ) public onlyOwner {
        bytes32 askInventoryIdentifier = keccak256(abi.encodePacked(askAddress, askTokenId, costAddress, costTokenId));
        require(_InventoryIdentifierUsed[askInventoryIdentifier], 'unknown inventory');
        InventoryFee[askInventoryIdentifier] = Fee(feeContract, amount, feeType);
    }

    function _addAsset(bytes32 assetTokenIdentifier, bytes32 assetInventoryIdentifier) private {
        if (!_containsAsset(assetTokenIdentifier)) {
            _Assets.push(assetTokenIdentifier);
        }
        if (!_InventoryIdentifierUsed[assetInventoryIdentifier]) {
            _AssetToAssetInventory[assetTokenIdentifier].push(assetInventoryIdentifier);
            _InventoryIdentifierUsed[assetInventoryIdentifier] = true;
            _Identifiers.push(assetInventoryIdentifier);
        }
    }

    function DeleteInventory(address askAddress, uint256 askTokenId, address costAddress, uint256 costTokenId) public onlyOwner {
        bytes32 askInventoryIdentifier = keccak256(abi.encodePacked(askAddress, askTokenId, costAddress, costTokenId));
        bytes32 askTokenIdentifier = keccak256(abi.encodePacked(askAddress, askTokenId));
        bytes32 costInventoryIdentifier = keccak256(abi.encodePacked(costAddress, costTokenId, askAddress, askTokenId));
        bytes32 costTokenIdentifier = keccak256(abi.encodePacked(costAddress, costTokenId));
        require(_InventoryIdentifierUsed[askInventoryIdentifier] && _InventoryIdentifierUsed[costInventoryIdentifier], 'inventory does not exist');
        _removeFromInventory(askTokenIdentifier, askInventoryIdentifier);
        _removeFromInventory(costTokenIdentifier, costInventoryIdentifier);
    }

    function _removeFromInventory(bytes32 assetTokenIdentifier, bytes32 assetInventoryIdentifier) private {
        
        bool assetTokenUsed = false;
        for(uint i=0; i<_Identifiers.length; i++) {
            bytes32 tokenIdentifier = keccak256(abi.encodePacked(Inventory[_Identifiers[i]].asset.contractAddress, Inventory[_Identifiers[i]].asset.tokenId));
            if (_Identifiers[i] == assetInventoryIdentifier) {
                _Identifiers[i] = _Identifiers[_Identifiers.length - 1];
                _Identifiers.pop();
            }
            if (assetTokenIdentifier == tokenIdentifier) {
                assetTokenUsed = true;
            }
        }
        if (!assetTokenUsed || _Identifiers.length == 1 ) {
            _deleteFromArray(_Assets, assetTokenIdentifier);
        }
        _deleteFromArray(_AssetToAssetInventory[assetTokenIdentifier], assetInventoryIdentifier);
        delete Inventory[assetInventoryIdentifier];
        delete _InventoryIdentifierUsed[assetInventoryIdentifier];
    }

    function _deleteFromArray(bytes32[] storage arr, bytes32 assetIdentifier) private {
        for(uint i=0; i<arr.length; i++) {
            if (arr[i] == assetIdentifier) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
            }
        }
    }

    function _containsAsset(bytes32 assetIdentifier) private view returns (bool seen) {
        seen = false;
        for(uint i=0; i<_Assets.length; i++) {
            if (_Assets[i] == assetIdentifier) {
               seen = true;
            }
        }      
    }

    function Version() public virtual pure returns (uint256 version) {
        return 2;
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