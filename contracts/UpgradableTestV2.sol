// SPDX-License-Identifier: CLOSED // Pending Licensing Audit
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract UpgradableTestV2 is OwnableUpgradeable {

    function initialize() public initializer {
        __Ownable_init();
    }

    function version() virtual public view returns (uint256 _version) {
        return 2;
    }
}