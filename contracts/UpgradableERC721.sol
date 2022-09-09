// SPDX-License-Identifier: CLOSED - Pending Licensing Audit.
pragma solidity ^0.8.4;

import "./SafeMath.sol";
import "./EventableERC721.sol";

interface IUpgradableERC721 {
    function upgradeFrom(address oldContract) external;
}

abstract contract UpgradableERC721 is IUpgradableERC721, EventableERC721  {
    using SafeMath for uint256;

    bool internal _isUpgrade;
    address public upgradedFrom;
    uint256 internal _totalMoved;
    mapping(address => uint256) internal _supplyMoved;
    mapping(address => bool) public seen;

    function isUpgrade() public view returns (bool) {
        return _isUpgrade;
    }

    function upgradeFrom(address oldContract) public virtual override {
        require(!_isUpgrade, "Contract already an upgrade");
        require(oldContract != address(0), "Invalid Upgrade");
        _isUpgrade = true;
        upgradedFrom = oldContract;
    }

    function canTransferHook(uint256 tokenId) internal view returns (bool) {
        uint256 pastSenderBalance = 0;
        address seenAddress = tokenIdToAddress(msg.sender, tokenId);
        if (!seen[seenAddress]) {
            pastSenderBalance = IERC721(upgradedFrom).balanceOf(msg.sender);
            return pastSenderBalance ==1? true: false;
        } else {
            return false;
        }
    }

    function validNFTokenHook(uint256 tokenId) internal view returns (bool) {
        uint256 pastSenderBalance = 0;
        address seenAddress = tokenIdToAddress(msg.sender, tokenId);
        if (!seen[seenAddress]) {
            pastSenderBalance = IERC721(upgradedFrom).balanceOf(msg.sender);
            return pastSenderBalance ==1? true: false;
        } else {
            return false;
        }
    }

    function transferHook(address sender, address recipient, uint256 tokenId, mapping (uint256 => address) storage idToOwner, mapping (address => uint256) storage ownerToNFTokenCount) internal returns (address, uint256) {
        uint256 pastSenderBalance = 0;
        uint256 pastRecipientBalance = 0;
        
        if (isUpgrade()) {
            if (!seen[sender]) {
                seen[sender] = true;
                pastSenderBalance = IERC721(upgradedFrom).balanceOf(sender);
                require(pastSenderBalance == 1, 'sender Not owner of tokenId');
                ownerToNFTokenCount[sender] = ownerToNFTokenCount[sender] + 1;
                idToOwner[tokenId] == sender;
                _supplyMoved[sender] = _supplyMoved[sender].add(pastSenderBalance);

                idToOwner[tokenId] = sender;
                // ownerToIds[sender].push(tokenId);
                // idToOwnerIndex[tokenId] = ownerToIds[sender].length - 1;

                // _balances[tokenId][sender] = _balances[tokenId][sender].add(pastSenderBalance);
                _totalMoved = _totalMoved.add(pastSenderBalance);
            }
            if (!seen[recipient]) {
                seen[recipient] = true;
                pastRecipientBalance = IERC721(upgradedFrom).balanceOf(sender);
                require(pastRecipientBalance == 1, 'recipient already owner of tokenId');
                _supplyMoved[sender] = _supplyMoved[sender].add(pastRecipientBalance);
                // _balances[tokenId][recipient] = _balances[tokenId][recipient].add(pastRecipientBalance);
            }
        } else {
            if (!seen[sender]) {
                seen[sender] = true;
            }
            if (!seen[recipient]) {
                seen[recipient] = true;
            }
        }
        return (idToOwner[tokenId], ownerToNFTokenCount[sender]); //, ownerToIds[sender], idToOwnerIndex[tokenId]);
    }

    function transferEventHook(address sender, address recipient, uint256 tokenId, uint256 pastSenderBalance, uint256 pastRecipientBalance) internal {
        if (pastSenderBalance > 0) {
                emit Transfer(address(0), sender, tokenId);
            }
            if (pastRecipientBalance >0) {
                emit Transfer(address(0), recipient, tokenId);
            }
    }

    function balanceOfHook(address account, mapping(address => uint256[]) storage _balances) internal view returns(uint256) {
        uint256 oldBalance = 0;
        if (isUpgrade()) {
            oldBalance = IERC721(upgradedFrom).balanceOf(account);
        }
        return (isUpgrade() && !seen[account]) ? IERC721(upgradedFrom).balanceOf(account):  _balances[account].length;
    }

    function totalSupplyHook(uint256[] storage _totalSupply) internal view returns(uint256) {
        return isUpgrade() ? (ERC721Enumerable(upgradedFrom).totalSupply() - _totalMoved) + (_totalSupply.length + _totalMoved) : _totalSupply.length;
    }

    function mintHook(address account, uint256 tokenId) internal  {
        if (!seen[account]) {
            seen[account] = true;
        }
        address seenAddress = tokenIdToAddress(account, tokenId);
        if (isUpgrade()) {
            if (!seen[seenAddress]) {
                seen[seenAddress] = true;
                try IERC721(upgradedFrom).ownerOf(tokenId) returns (address currentOwner) {
                    require(account == currentOwner, "old nft not owned by recipient");
                    uint256 pastSenderBalance = IERC721(upgradedFrom).balanceOf(account);
                    _supplyMoved[account] = _supplyMoved[account].add(pastSenderBalance);
                    _totalMoved = _totalMoved.add(pastSenderBalance);
                } catch { }
            }
        } else {
            if (!seen[seenAddress]) {
                seen[seenAddress] = true;
            }
        }
    }

    function tokenIdToAddress(address account, uint256 tokenId) internal pure returns (address) {
        bytes32 seenHash = keccak256(abi.encodePacked(account, tokenId));
        return address(uint160(uint256(seenHash)));
    }
}