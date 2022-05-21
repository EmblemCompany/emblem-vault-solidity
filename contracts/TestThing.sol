// SPDX-License-Identifier: CLOSED - Pending Licensing Audit
pragma solidity ^0.8.4;

import "./OwnableUpgradeable.sol";
import "./Clonable.sol";
contract TestThing is OwnableUpgradeable, Clonable {

    function initialize() public virtual override initializer {
        __Ownable_init();
    }

    function version() public pure virtual override returns (uint256) {
        return 1;
    }

}