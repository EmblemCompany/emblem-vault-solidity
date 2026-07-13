// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./MintVaultQuoteFactory.sol";
import "./ReentrancyGuardUpgradable.sol";
import "./SafeMath.sol";

/**
 * @title UpgradableReceiptMarket
 * @dev Contract for handling minting operations with pricing and discount options.
 *      Incorporates reentrancy protection and upgradability features.
 */
contract UpgradableReceiptMarket is MintVaultQuoteFactory, ReentrancyGuardUpgradable {
    using SafeMath for uint256;

    // Structure to define a receipt.
    struct Receipt {
        address buyer;
        uint256 price;
        uint256 timestamp;
        uint256 nonce;
    }

    // Event to be emitted when a receipt is purchased
    event ReceiptPurchased(
        address indexed buyer,
        uint256 price,
        uint256 timestamp
    );

    // Mapping of recipients to their receipts
    mapping(address => mapping(bytes32 => Receipt)) public receipts;

    // Mapping to track authorized recipients
    mapping(address => bool) public recipients;

    // Mapping to keep track of nonces for each user
    mapping(address => uint256) public nonce;

    /**
     * @dev Initializes the contract, setting up ownership and default Uniswap pair.
     */
    function initialize() public override initializer {
        __Ownable_init();
        pair = IUniswapV2Pair(0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc);
    }

    /**
     * @dev Adds a recipient to the list of authorized recipients. Only callable by the contract owner.
     * @param _recipient Address to be added as a recipient.
     */
    function addRecipient(address _recipient) external onlyOwner {
        recipients[_recipient] = true;
    }

    /**
     * @dev Removes a recipient from the list of authorized recipients. Only callable by the contract owner.
     * @param _recipient Address to be removed as a recipient.
     */
    function removeRecipient(address _recipient) external onlyOwner {
        require(recipients[_recipient], "Recipient does not exist");
        delete recipients[_recipient];
    }

    /**
    * @dev Buys a receipt with a specific USD price, calculates the ETH equivalent, applies discounts, 
    *      and transfers ETH to the recipient. Emits a ReceiptPurchased event upon successful purchase.
    * @param _recipient Address of the recipient for the receipt.
    * @param _usdPrice USD price of the receipt.
    * @return id The unique identifier of the purchased receipt.
    * @return updatedNonce The updated nonce for the buyer after the purchase.
    */
    function buyReceipt(address _recipient, uint256 _usdPrice) public payable nonReentrant returns (bytes32, uint256) {
        require(isRecipient(_recipient), "Recipient not authorized");
        uint256 priceInEth = getUsdPriceInEth(_usdPrice);

        // Apply discounts if any
        uint256 highestDiscount = 0;
        for (uint i = 0; i < discountTokens.length; i++) {
            if (IERC20(discountTokens[i].token).balanceOf(_msgSender()) >= discountTokens[i].amount && discountTokens[i].discount > highestDiscount) {
                highestDiscount = discountTokens[i].discount;
            }
        }
        uint256 discountedPriceInEth = priceInEth * (100 - highestDiscount) / 100;

        // Ensure the sent value is within the acceptable range after discount
        uint256 acceptableRange = discountedPriceInEth.mul(2).div(100); // 2% of totalPrice
        require(
            msg.value >= discountedPriceInEth.sub(acceptableRange) && msg.value <= discountedPriceInEth.add(acceptableRange),
            "The sent amount is outside the acceptable range"
        );

        payable(_recipient).transfer(discountedPriceInEth);

        nonce[_msgSender()]++;
        bytes32 id = keccak256(abi.encodePacked(_msgSender(), nonce[_msgSender()]));
        receipts[_recipient][id] = Receipt({
            buyer: _msgSender(),
            price: discountedPriceInEth,
            timestamp: block.timestamp,
            nonce: nonce[_msgSender()]
        });

        emit ReceiptPurchased(_recipient, discountedPriceInEth, block.timestamp);
        return (id, nonce[_msgSender()]);
    }


    /**
     * @dev External view function to quote the price of a receipt in ETH based on its USD price.
     * @param receiptId Unique identifier of the receipt.
     * @param receiptNonce Nonce associated with the receipt.
     * @param buyer Address of the buyer.
     * @param _usdPrice USD price to be converted into ETH.
     * @return The price of the receipt in ETH.
     */
    function quoteReceiptExternalPrice(bytes32 receiptId, uint256 receiptNonce, address buyer, uint256 _usdPrice) external view returns (uint256) {
        uint256 priceInEth = getUsdPriceInEth(_usdPrice);
        return getQuoteFromReceipt(receiptId, receiptNonce, buyer,priceInEth);
    }

    /**
    * @dev Internal view function to get the total price for a receipt based on the receipt ID, nonce, buyer address, 
    *      and an additional price in ETH. Validates the receipt and returns the sum of the stored price and the additional price.
    * @param receiptId Unique identifier of the receipt.
    * @param receiptNonce Nonce associated with the receipt.
    * @param buyer Address of the buyer.
    * @param priceInEth Additional price in ETH to be added to the stored price, if more than zero.
    * @return The total price of the receipt after adding the additional price (if applicable).
    */
    function getQuoteFromReceipt(bytes32 receiptId, uint256 receiptNonce, address buyer, uint256 priceInEth) internal view returns (uint256) {
        Receipt memory storedReceiptData = receipts[buyer][receiptId];        

        // Calculate the id using hash(buyer + receiptNonce) and validate the receipt
        bytes32 calculatedId = keccak256(abi.encodePacked(buyer, receiptNonce));
        require(receiptId == calculatedId, "Invalid receipt");
        require(buyer == storedReceiptData.buyer, "Buyer does not match the stored receipt");

        // Initialize total price with the stored price
        uint256 totalPrice = storedReceiptData.price;

        // If additional priceInEth is provided and is more than zero, add it to the total price
        if (priceInEth > 0) {
            totalPrice = totalPrice.add(priceInEth);
        }

        return totalPrice;
    }


    /**
     * @dev Internal view function to check if an address is an authorized recipient.
     * @param _address Address to be checked.
     * @return True if the address is an authorized recipient, false otherwise.
     */
    function isRecipient(address _address) internal view returns (bool) {
        return recipients[_address];
    }

}