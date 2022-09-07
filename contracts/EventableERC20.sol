// SPDX-License-Identifier: CLOSED - Pending Licensing Audit
pragma solidity ^0.8.4;

import "./IERC20.sol";

interface IEventableERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function makeEvents(address[] calldata _from, address[] calldata _to, uint256[] calldata amounts) external;
}

abstract contract EventableERC20 is IEventableERC20 {
    function makeEvents(address[] calldata _from, address[] calldata _to, uint256[] calldata amounts) public virtual override {
        _handleEventFromLoops(_from, _to, amounts);
    }

    function _handleEventFromLoops(address[] calldata _from, address[] calldata _to, uint256[] calldata amounts) internal {
        for (uint i=0; i < _from.length; i++) {
            if (amounts.length == _from.length && amounts.length == _to.length) {
                _handleEventEmits(_from[i], _to[i], makeSingleArray(amounts, i));
            } else if (amounts.length == _from.length && amounts.length != _to.length) {
                _handleEventToLoops(_from[i], _to, makeSingleArray(amounts, i));
            } else {
                _handleEventToLoops(_from[i], _to, amounts);
            }
        }
    }
    function _handleEventToLoops(address _from, address[] calldata _to, uint256[] memory amounts) internal {
        for (uint i=0; i < _to.length; i++) {
            if (amounts.length == _to.length) {
                _handleEventEmits(_from, _to[i], makeSingleArray(amounts, i));
            } else {
                _handleEventEmits(_from, _to[i], amounts);
            }
        }
    }
    function _handleEventEmits(address _from, address _to, uint256[] memory amounts) internal {
        for (uint i=0; i < amounts.length; i++) {
            emit Transfer(_from, _to, amounts[i]);
        }
    }
    function makeSingleArray(uint256[] memory amount, uint index) internal pure returns (uint256[] memory) {
        uint256[] memory arr = new uint256[](1);
        arr[0] = amount[index];
        return arr;
    }
}