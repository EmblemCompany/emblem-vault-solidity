// SPDX-License-Identifier: CLOSED - Pending Licensing Audit
pragma solidity ^0.8.4;

import "./IERC1155.sol";
import "./SafeMath.sol";
import "./EventableERC1155.sol";

interface IUpgradableERC1155 {

    function upgradeFrom(address oldContract) external;
}

abstract contract UpgradableERC1155 is IUpgradableERC1155, EventableERC1155  {
    using SafeMath for uint256;

    bool internal _isUpgrade;
    address public upgradedFrom;
    uint256 private _supplyMoved;

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

    function transferHook(address sender, address recipient, uint256 tokenId, mapping(uint256 => mapping(address => uint256)) storage _balances) internal returns (uint256, uint256) {
        uint256 pastSenderBalance = 0;
        uint256 pastRecipientBalance = 0;

        if (isUpgrade()) {
            if (!seen[sender]) {
                seen[sender] = true;
                pastSenderBalance = IERC1155(upgradedFrom).balanceOf(sender, tokenId);
                _supplyMoved = _supplyMoved.add(pastSenderBalance);
                _balances[tokenId][sender] = _balances[tokenId][sender].add(pastSenderBalance);
            }
            if (!seen[recipient]) {
                seen[recipient] = true;
                pastRecipientBalance = IERC1155(upgradedFrom).balanceOf(recipient, tokenId);
                _supplyMoved = _supplyMoved.add(pastRecipientBalance);
                _balances[tokenId][recipient] = _balances[tokenId][recipient].add(pastRecipientBalance);
            }
        } else {
            if (!seen[sender]) {
                seen[sender] = true;
            }
            if (!seen[recipient]) {
                seen[recipient] = true;
            }
        }
        return (pastSenderBalance, pastRecipientBalance);
    }

    function transferEventHook(address operator, address sender, address recipient, uint256 tokenId, uint256 pastSenderBalance, uint256 pastRecipientBalance) internal {
        if (pastSenderBalance > 0) {
                emit TransferSingle(operator, address(0), sender, tokenId, pastSenderBalance);
            }
            if (pastRecipientBalance >0) {
                emit TransferSingle(operator, address(0), recipient, tokenId, pastRecipientBalance);
            }
    }

    function balanceOfHook(address account, uint256 tokenId, mapping(uint256 => mapping(address => uint256)) storage _balances) internal view returns(uint256) {
        return (isUpgrade() && !seen[account]) ? IERC1155(upgradedFrom).balanceOf(account, tokenId):  _balances[tokenId][account];
    }

    function mintHook(address account, uint256 tokenId, uint256 amount) internal returns (uint256) {
        if (isUpgrade()) {
            if (!seen[account]) {
                seen[account] = true;
                uint256 pastBalance = IERC1155(upgradedFrom).balanceOf(account, tokenId);
                _supplyMoved = _supplyMoved.add(pastBalance);
                amount = amount.add(pastBalance);
            }
        } else {
            if (!seen[account]) {
                seen[account] = true;
            }
        }
        return amount;
    }
}