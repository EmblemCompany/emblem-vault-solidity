// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.2.0
pragma solidity ^0.8.27;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC1363Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC1363Upgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import {ERC20PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @custom:oz-upgrades-from HustleERC20
contract HustleERC20V2 is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    OwnableUpgradeable,  // Keep for storage compatibility with V1
    ERC1363Upgradeable,
    AccessControlUpgradeable,  // Add after Ownable to preserve storage layout
    ERC20PausableUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Original V1 initializer - DO NOT MODIFY
    function initialize(address initialOwner) public initializer {
        __ERC20_init("Hustle", "HUSTLE");
        __ERC20Burnable_init();
        __Ownable_init(initialOwner);
        __ERC1363_init();
    }

    /// @notice V2 upgrade initializer - call this after upgrading
    function initializeV2() public reinitializer(2) {
        __AccessControl_init();
        __ERC20Pausable_init();

        // Grant admin role to current owner
        address currentOwner = owner();
        _grantRole(DEFAULT_ADMIN_ROLE, currentOwner);
        _grantRole(PAUSER_ROLE, currentOwner);
        _grantRole(MINTER_ROLE, currentOwner);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Mint tokens - requires MINTER_ROLE or owner (backwards compatible)
    function mint(address to, uint256 amount) public {
        require(
            hasRole(MINTER_ROLE, _msgSender()) || owner() == _msgSender(),
            "HustleERC20V2: must have minter role or be owner"
        );
        _mint(to, amount);
    }

    // Required overrides

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        super._update(from, to, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable, ERC1363Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
