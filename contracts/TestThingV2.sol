// SPDX-License-Identifier: CLOSED // Pending Licensing Audit
pragma solidity ^0.8.4;

import "./TestThing.sol";
contract TestThingV2 is TestThing {

    function initialize() public virtual override initializer {
        __Ownable_init();
    }

    function version() public pure virtual override returns (uint256) {
        return 2;
    }

}