// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import {HederaTokenService} from "./hedera/HederaTokenService.sol";
import {HederaResponseCodes} from "./hedera/HederaResponseCodes.sol";
import {IHederaTokenService} from "./hedera/IHederaTokenService.sol";

/**
 * @title SolanaToHederaBridgeUpgradeable
 * @notice UUPS upgradeable bridge for Solana → Hedera HTS token transfers
 * @dev Bridge contract acts as the HTS token treasury. Relayers call finalizeSolanaDeposit
 *      to mint and transfer tokens to recipients. Supports claim-later for unassociated accounts.
 */
contract SolanaToHederaBridgeUpgradeable is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    HederaTokenService
{
    // ============ Constants ============

    /// @notice Version string for upgrade tracking
    string public constant VERSION = "1.0.0";

    // ============ Storage ============

    /// @notice HTS token address (this contract is the treasury)
    address public token;

    /// @notice Mapping of authorized relayer addresses
    mapping(address => bool) public isRelayer;

    /// @notice Mapping of processed deposit IDs to prevent replay
    mapping(bytes32 => bool) public usedDepositId;

    /// @notice Claimable deposits for recipients who weren't associated
    struct ClaimableDeposit {
        address recipient;
        uint64 amount;
        bool claimed;
    }
    mapping(bytes32 => ClaimableDeposit) public claimable;

    // ============ Rate Limiting ============

    /// @notice Maximum tokens per single transaction
    uint64 public maxPerTx;

    /// @notice Maximum tokens per day
    uint64 public dailyLimit;

    /// @notice Current day's minted amount
    uint64 public dailyMinted;

    /// @notice Timestamp of current day start (midnight UTC)
    uint256 public currentDayStart;

    // ============ Storage Gap ============

    /// @dev Reserved storage slots for future upgrades
    uint256[44] private __gap;

    // ============ Events ============

    /// @notice Emitted when a deposit is finalized and tokens transferred
    event DepositFinalized(
        bytes32 indexed depositId,
        address indexed recipient,
        uint64 amount,
        bytes32 solanaTxHash
    );

    /// @notice Emitted when a deposit is pending claim (recipient not associated)
    event DepositPendingClaim(
        bytes32 indexed depositId,
        address indexed recipient,
        uint64 amount
    );

    /// @notice Emitted when a pending deposit is claimed
    event DepositClaimed(
        bytes32 indexed depositId,
        address indexed recipient,
        uint64 amount
    );

    /// @notice Emitted when a relayer is added or removed
    event RelayerUpdated(address indexed relayer, bool isActive);

    /// @notice Emitted when the token address is set
    event TokenSet(address indexed token);

    /// @notice Emitted when the HTS token is created
    event TokenCreated(address indexed token, string name, string symbol);

    /// @notice Emitted when rate limits are updated
    event RateLimitsUpdated(uint64 maxPerTx, uint64 dailyLimit);

    // ============ Errors ============

    error OnlyRelayer();
    error DepositAlreadyProcessed();
    error DepositNotFound();
    error DepositAlreadyClaimed();
    error NotClaimRecipient();
    error TokenNotSet();
    error InvalidAmount();
    error ExceedsPerTxLimit();
    error ExceedsDailyLimit();
    error HTSTransferFailed(int256 responseCode);
    error HTSMintFailed(int256 responseCode);
    error HTSPauseFailed(int256 responseCode);
    error HTSUnpauseFailed(int256 responseCode);
    error HTSCreateTokenFailed(int256 responseCode);
    error TokenAlreadyCreated();

    // ============ Modifiers ============

    /// @notice Restricts function to authorized relayers
    modifier onlyRelayer() {
        if (!isRelayer[msg.sender]) revert OnlyRelayer();
        _;
    }

    /// @notice Ensures token is configured
    modifier tokenConfigured() {
        if (token == address(0)) revert TokenNotSet();
        _;
    }

    // ============ Initialization ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the bridge contract
     * @param initialOwner Admin address for the bridge
     * @param _maxPerTx Maximum tokens per transaction (8 decimals)
     * @param _dailyLimit Maximum tokens per day (8 decimals)
     */
    function initialize(
        address initialOwner,
        uint64 _maxPerTx,
        uint64 _dailyLimit
    ) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        maxPerTx = _maxPerTx;
        dailyLimit = _dailyLimit;
        currentDayStart = _getDayStart(block.timestamp);

        // Owner is initially a relayer
        isRelayer[initialOwner] = true;
        emit RelayerUpdated(initialOwner, true);
    }

    // ============ Core Bridge Functions ============

    /**
     * @notice Finalize a Solana deposit by minting and transferring HTS tokens
     * @dev Called by authorized relayers. If recipient isn't associated, stores for claim-later.
     * @param depositId Unique identifier for the deposit (hash of Solana tx + log index)
     * @param recipient Hedera address to receive tokens
     * @param amount Amount of tokens to mint (8 decimals for HTS)
     * @param solanaTxHash Transaction hash from Solana for tracking
     */
    function finalizeSolanaDeposit(
        bytes32 depositId,
        address recipient,
        uint64 amount,
        bytes32 solanaTxHash
    ) external nonReentrant onlyRelayer whenNotPaused tokenConfigured {
        // Validate inputs
        if (amount == 0) revert InvalidAmount();
        if (usedDepositId[depositId]) revert DepositAlreadyProcessed();

        // Rate limiting
        _checkAndUpdateRateLimits(amount);

        // Mark as processed
        usedDepositId[depositId] = true;

        // Mint tokens to treasury (this contract)
        (int256 mintResponse, , ) = mintToken(token, int64(amount), new bytes[](0));
        if (mintResponse != HederaResponseCodes.SUCCESS) {
            revert HTSMintFailed(mintResponse);
        }

        // Transfer from treasury to recipient
        int256 transferResponse = transferToken(
            token,
            address(this),
            recipient,
            int64(amount)
        );

        // If recipient not associated, store for claim-later
        if (transferResponse == HederaResponseCodes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT) {
            claimable[depositId] = ClaimableDeposit({
                recipient: recipient,
                amount: amount,
                claimed: false
            });
            emit DepositPendingClaim(depositId, recipient, amount);
            return;
        }

        // Check for other transfer failures
        if (transferResponse != HederaResponseCodes.SUCCESS) {
            revert HTSTransferFailed(transferResponse);
        }

        emit DepositFinalized(depositId, recipient, amount, solanaTxHash);
    }

    /**
     * @notice Claim a pending deposit after associating with the token
     * @param depositId The deposit ID to claim
     */
    function claimDeposit(bytes32 depositId) external nonReentrant whenNotPaused tokenConfigured {
        ClaimableDeposit storage deposit = claimable[depositId];

        if (deposit.recipient == address(0)) revert DepositNotFound();
        if (deposit.claimed) revert DepositAlreadyClaimed();
        if (deposit.recipient != msg.sender) revert NotClaimRecipient();

        deposit.claimed = true;

        // Transfer from treasury to recipient
        int256 response = transferToken(
            token,
            address(this),
            msg.sender,
            int64(deposit.amount)
        );

        if (response != HederaResponseCodes.SUCCESS) {
            revert HTSTransferFailed(response);
        }

        emit DepositClaimed(depositId, msg.sender, deposit.amount);
    }

    // ============ Rate Limiting ============

    /**
     * @dev Check and update rate limits
     */
    function _checkAndUpdateRateLimits(uint64 amount) internal {
        // Per-transaction limit
        if (amount > maxPerTx) revert ExceedsPerTxLimit();

        // Reset daily counter if new day
        uint256 dayStart = _getDayStart(block.timestamp);
        if (dayStart > currentDayStart) {
            currentDayStart = dayStart;
            dailyMinted = 0;
        }

        // Daily limit check
        if (dailyMinted + amount > dailyLimit) revert ExceedsDailyLimit();
        dailyMinted += amount;
    }

    /**
     * @dev Get the start of the day (midnight UTC) for a timestamp
     */
    function _getDayStart(uint256 timestamp) internal pure returns (uint256) {
        return (timestamp / 1 days) * 1 days;
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the HTS token address (for externally created tokens)
     * @dev Can only be called once after token creation
     * @param _token HTS token address
     */
    function setToken(address _token) external onlyOwner {
        require(token == address(0), "Token already set");
        require(_token != address(0), "Invalid token address");
        token = _token;
        emit TokenSet(_token);
    }

    /**
     * @notice Create the HTS token with this contract as treasury
     * @dev Must send HBAR to cover token creation fee (~$1 USD)
     * @param name Token name
     * @param symbol Token symbol
     * @param memo Token memo
     */
    function createToken(
        string memory name,
        string memory symbol,
        string memory memo
    ) external payable onlyOwner {
        if (token != address(0)) revert TokenAlreadyCreated();

        // Build token keys array - supply key (bit 4) and pause key (bit 6)
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](2);

        // Supply key - allows this contract to mint
        keys[0] = IHederaTokenService.TokenKey({
            keyType: 16, // bit 4 = supplyKey
            key: IHederaTokenService.KeyValue({
                inheritAccountKey: false,
                contractId: address(this),
                ed25519: bytes(""),
                ECDSA_secp256k1: bytes(""),
                delegatableContractId: address(0)
            })
        });

        // Pause key - allows this contract to pause
        keys[1] = IHederaTokenService.TokenKey({
            keyType: 64, // bit 6 = pauseKey
            key: IHederaTokenService.KeyValue({
                inheritAccountKey: false,
                contractId: address(this),
                ed25519: bytes(""),
                ECDSA_secp256k1: bytes(""),
                delegatableContractId: address(0)
            })
        });

        // Build the token struct
        IHederaTokenService.HederaToken memory hederaToken = IHederaTokenService.HederaToken({
            name: name,
            symbol: symbol,
            treasury: address(this),
            memo: memo,
            tokenSupplyType: false, // INFINITE
            maxSupply: 0,
            freezeDefault: false,
            tokenKeys: keys,
            expiry: IHederaTokenService.Expiry({
                second: 0,
                autoRenewAccount: address(this),
                autoRenewPeriod: 7776000 // 90 days
            })
        });

        // Create the fungible token with 0 initial supply and 8 decimals
        (int256 responseCode, address tokenAddress) = createFungibleToken(
            hederaToken,
            0, // initialTotalSupply
            8  // decimals (HTS standard)
        );

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert HTSCreateTokenFailed(responseCode);
        }

        token = tokenAddress;
        emit TokenCreated(tokenAddress, name, symbol);
    }

    /**
     * @notice Add or remove a relayer
     * @param relayer Address to update
     * @param active True to add, false to remove
     */
    function setRelayer(address relayer, bool active) external onlyOwner {
        isRelayer[relayer] = active;
        emit RelayerUpdated(relayer, active);
    }

    /**
     * @notice Update rate limits
     * @param _maxPerTx New per-transaction limit
     * @param _dailyLimit New daily limit
     */
    function setRateLimits(uint64 _maxPerTx, uint64 _dailyLimit) external onlyOwner {
        maxPerTx = _maxPerTx;
        dailyLimit = _dailyLimit;
        emit RateLimitsUpdated(_maxPerTx, _dailyLimit);
    }

    /**
     * @notice Pause the bridge and the HTS token
     */
    function pauseBridge() external onlyOwner tokenConfigured {
        // Pause HTS token
        int256 response = pauseToken(token);
        if (response != HederaResponseCodes.SUCCESS) {
            revert HTSPauseFailed(response);
        }
        // Pause contract
        _pause();
    }

    /**
     * @notice Unpause the bridge and the HTS token
     */
    function unpauseBridge() external onlyOwner tokenConfigured {
        // Unpause HTS token
        int256 response = unpauseToken(token);
        if (response != HederaResponseCodes.SUCCESS) {
            revert HTSUnpauseFailed(response);
        }
        // Unpause contract
        _unpause();
    }

    /**
     * @notice Emergency pause (contract only, no HTS interaction)
     * @dev Use when HTS token operations might fail
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Emergency unpause (contract only, no HTS interaction)
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @notice Check if a deposit has been processed
     */
    function isDepositProcessed(bytes32 depositId) external view returns (bool) {
        return usedDepositId[depositId];
    }

    /**
     * @notice Get claimable deposit details
     */
    function getClaimableDeposit(bytes32 depositId)
        external
        view
        returns (address recipient, uint64 amount, bool claimed)
    {
        ClaimableDeposit storage deposit = claimable[depositId];
        return (deposit.recipient, deposit.amount, deposit.claimed);
    }

    /**
     * @notice Get remaining daily limit
     */
    function getRemainingDailyLimit() external view returns (uint64) {
        uint256 dayStart = _getDayStart(block.timestamp);
        if (dayStart > currentDayStart) {
            return dailyLimit;
        }
        return dailyLimit > dailyMinted ? dailyLimit - dailyMinted : 0;
    }

    // ============ UUPS Upgrade Authorization ============

    /**
     * @dev Authorize upgrade - only owner can upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
