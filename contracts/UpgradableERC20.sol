// SPDX-License-Identifier: CLOSED - Pending Licensing Audit
pragma solidity ^0.8.4;

import "./IERC20.sol";
import "./SafeMath.sol";
import "./EventableERC20.sol";

interface IUpgradableERC20 {

    function upgradeFrom(address oldContract) external;
}

abstract contract UpgradableERC20 is IUpgradableERC20, EventableERC20  {
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

    function transferHook(address sender, address recipient, mapping(address => uint256) storage _balances) internal returns (uint256, uint256) {
        uint256 pastSenderBalance = 0;
        uint256 pastRecipientBalance = 0;

        if (isUpgrade()) {
            if (!seen[sender]) {
                seen[sender] = true;
                pastSenderBalance = IERC20(upgradedFrom).balanceOf(sender);
                _supplyMoved = _supplyMoved.add(pastSenderBalance);
                _balances[sender] = _balances[sender].add(pastSenderBalance);
            }
            if (!seen[recipient]) {
                seen[recipient] = true;
                pastRecipientBalance = IERC20(upgradedFrom).balanceOf(recipient);
                _supplyMoved = _supplyMoved.add(pastRecipientBalance);
                _balances[recipient] = _balances[recipient].add(pastRecipientBalance);
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

    function transferEventHook(address sender, address recipient, uint256 pastSenderBalance, uint256 pastRecipientBalance) internal {
        if (pastSenderBalance > 0) {
                emit Transfer(address(0), sender, pastSenderBalance);
            }
            if (pastRecipientBalance >0) {
                emit Transfer(address(0), recipient, pastRecipientBalance);
            }
    }

    function totalSupplyHook(uint256 _totalSupply) internal view returns(uint256) {
        return isUpgrade() ? (IERC20(upgradedFrom).totalSupply() - _supplyMoved) + (_totalSupply + _supplyMoved) : _totalSupply;
    }

    function balanceOfHook(address account,  mapping(address => uint256) storage _balances) internal view returns(uint256) {
        return (isUpgrade() && !seen[account]) ? IERC20(upgradedFrom).balanceOf(account):  _balances[account];
    }

    function mintHook(address account, uint256 amount) internal returns (uint256) {
        if (isUpgrade()) {
            if (!seen[account]) {
                seen[account] = true;
                uint256 pastBalance = IERC20(upgradedFrom).balanceOf(account);
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