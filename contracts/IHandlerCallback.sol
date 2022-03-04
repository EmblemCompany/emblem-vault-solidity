pragma solidity 0.8.4;

interface IHandlerCallback {
    enum CallbackType {
        MINT, TRANSFER, CLAIM
    }

    struct Callback {
        address vault;
        address registrant;
        address target;
        bytes4 targetFunction;
        bool canRevert;
    }

    function executeCallbacks(address _from, address _to, uint256 tokenId, CallbackType _type) external;
}