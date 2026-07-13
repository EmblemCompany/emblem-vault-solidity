// SPDX-License-Identifier: CLOSED - Pending Licensing Audit
pragma solidity ^0.8.4;
import "./HasRegistration.sol";
import "./IHandlerCallback.sol";

// NOTE: The callback *management* surface (register/unregister/query/toggle) was
// removed to keep VaultHandlerV8Upgradable under the 24576-byte size limit.
// executeCallbacks MUST stay: the vault contracts (EmblemVault721AUpgradeable,
// ERC1155Upgradable, EmblemVault, ...) call back into it on every mint/burn/
// transfer when the handler is registered — removing it makes those operations
// revert with unrecognized-selector. With no callbacks registered on-chain the
// loop is an empty no-op. The storage variables must also be preserved in this
// exact order so the proxy storage layout stays compatible across the upgrade.
contract HasCallbacksUpgradable is HasRegistration {

    bool allowCallbacks;

    event CallbackExecuted(address _from, address _to, address target, uint256 tokenId, bytes4 targetFunction, IHandlerCallback.CallbackType _type, bytes returnData);
    event CallbackReverted(address _from, address _to, address target, uint256 tokenId, bytes4 targetFunction, IHandlerCallback.CallbackType _type);
    event CallbackFailed(address _from, address _to, address target, uint256 tokenId, bytes4 targetFunction, IHandlerCallback.CallbackType _type);

    mapping(address => mapping(uint256 => mapping(IHandlerCallback.CallbackType => IHandlerCallback.Callback[]))) public registeredCallbacks;
    mapping(address => mapping(IHandlerCallback.CallbackType => IHandlerCallback.Callback[])) public registeredWildcardCallbacks;

    function executeCallbacks(address _from, address _to, uint256 tokenId, IHandlerCallback.CallbackType _type) public isRegisteredContract(_msgSender()) {
        if (allowCallbacks) {
            IHandlerCallback.Callback[] memory callbacks = registeredCallbacks[_msgSender()][tokenId][_type];
            if (callbacks.length > 0) executeCallbackLoop(callbacks, _from, _to, tokenId, _type);
            IHandlerCallback.Callback[] memory wildCardCallbacks = registeredWildcardCallbacks[_msgSender()][_type];
            if (wildCardCallbacks.length > 0) executeCallbackLoop(wildCardCallbacks, _from, _to, tokenId, _type);
        }
    }

    function executeCallbacksInternal(address _nftAddress, address _from, address _to, uint256 tokenId, IHandlerCallback.CallbackType _type) internal isRegisteredContract(_nftAddress) {
        if (allowCallbacks) {
            IHandlerCallback.Callback[] memory callbacks = registeredCallbacks[_nftAddress][tokenId][_type];
            if (callbacks.length > 0) executeCallbackLoop(callbacks, _from, _to, tokenId, _type);
            IHandlerCallback.Callback[] memory wildCardCallbacks = registeredWildcardCallbacks[_nftAddress][_type];
            if (wildCardCallbacks.length > 0) executeCallbackLoop(wildCardCallbacks, _from, _to, tokenId, _type);
        }
    }

    function executeCallbackLoop(IHandlerCallback.Callback[] memory callbacks, address _from, address _to, uint256 tokenId, IHandlerCallback.CallbackType _type) internal {
        bool canRevert = false;
        for (uint256 i = 0; i < callbacks.length; ++i) {
            IHandlerCallback.Callback memory cb = callbacks[i];
            canRevert = cb.canRevert;
            if (cb.target != address(0)) {
                (bool success, bytes memory returnData) =
                    address(cb.target).call(
                        abi.encodePacked(
                            cb.targetFunction,
                            abi.encode(_from),
                            abi.encode(_to),
                            abi.encode(tokenId)
                        )
                    );
                if (success) {
                    emit CallbackExecuted(_from, _to, cb.target, tokenId, cb.targetFunction, _type, returnData);
                } else if (canRevert) {
                    emit CallbackReverted(_from, _to, cb.target, tokenId, cb.targetFunction, _type);
                    revert("Callback Reverted");
                } else {
                    emit CallbackFailed(_from, _to, cb.target, tokenId, cb.targetFunction, _type);
                }
            }
        }
    }

}
