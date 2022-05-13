// SPDX-License-Identifier: MIT

pragma experimental ABIEncoderV2;
pragma solidity ^0.8.4;
import "./IERC721.sol";
import "./IERC1155.sol";
import "./IERC165.sol";
import "./SafeMath.sol";
import "./BasicERC20.sol";
import "./ReentrancyGuard.sol";
import "./OwnableUpgradeable.sol";

contract NFTrade_v2 is OwnableUpgradeable, ReentrancyGuard {
    
    address resolver;
    bool public initialized;
    address public paymentAddress = address(this);
    address public recipientAddress;
    uint256 public makeOfferPrice = 0;
    uint256 public acceptOfferPrice = 0;
    uint public percentageFee = 0;
    bool public payToAcceptOffer = false;
    bool public payToMakeOffer = false;
    bool public canOfferERC20 = false;
    bool public takePercentageOfERC20 = false;
    bool public locked = false;
    bytes4 private constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 private constant _INTERFACE_ID_ERC20 = 0x74a1476f;
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;

    using SafeMath for uint;

    struct Offer {
        uint tokenId;
        address _from;
        address token;
        uint amount;
    }
    
    // event for EVM logging
    event OwnerSet(address indexed oldOwner, address indexed newOwner);
    
    mapping(address => mapping(uint => Offer[])) offers;
    mapping(address => mapping(uint => Offer[])) rejected;
    mapping(address => mapping(address => mapping(uint => Offer[]))) offered;
    mapping(address => mapping(uint => Offer[])) accepted;
    
    modifier notLocked() {
        require(!locked, "Contract is locked");
        _;
    }
    
    constructor(address _paymentAddress, address _recipientAddress) {
        init(_paymentAddress, _recipientAddress);
    }
    
    function init(address _paymentAddress, address _recipientAddress) public {
        __Ownable_init();
        initialized = true;
        paymentAddress = _paymentAddress;
        recipientAddress = _recipientAddress;
    }
    
    function getVersion() public pure returns (uint) {
        return 1;
    }
    
    event OfferAccepted(address token, uint256 _tokenId, address _forNft, uint256 _for, uint256 _amount);
    function acceptOffer(address token, uint _tokenId, uint index) public notLocked nonReentrant {
        Offer memory _offer = offers[token][_tokenId][index];
        IERC721 nftToken1 = IERC721(token);
        IERC721 nftToken2 = IERC721(_offer.token);

        require(!checkInterface(token, _INTERFACE_ID_ERC20), 'not allowed to make offers for erc20');

        if (checkInterface(token, _INTERFACE_ID_ERC1155)){
            require(nftToken1.balanceOf(msg.sender, _tokenId) > 0, 'Sender is not owner of NFT');
        } else {
            require(nftToken1.ownerOf(_tokenId) == msg.sender,'Sender is not owner of NFT');
        }

        require(nftToken1.isApprovedForAll(msg.sender, address(this)), 'Handler unable to transfer NFT');

        if (checkInterface(_offer.token, _INTERFACE_ID_ERC20)) {
            require(IERC20Token(_offer.token).balanceOf(_offer._from) >= _offer.amount, 'Not Enough Offer Balance');
            require(IERC20Token(_offer.token).allowance(_offer._from, address(this)) >= _offer.amount, 'Not Enough Offer Allowance');
        } else if (checkInterface(_offer.token, _INTERFACE_ID_ERC1155)){
            require(nftToken2.balanceOf(_offer._from, _offer.tokenId) > 0, 'NFT not owned by offerer');
            require(nftToken2.isApprovedForAll(_offer._from, address(this)), 'Handler unable to transfer offer NFT');
        } else {
            require(nftToken2.ownerOf(_offer.tokenId) == _offer._from, 'NFT not owned by offerer');
            require(nftToken2.isApprovedForAll(_offer._from, address(this)), 'Handler unable to transfer offer NFT');
        }        
        if (acceptOfferPrice > 0 && payToAcceptOffer) {
            IERC20Token paymentToken = IERC20Token(paymentAddress);
            require(paymentToken.allowance(msg.sender, address(this)) >= acceptOfferPrice, 'Handler unable take payment for offer');
            require(paymentToken.balanceOf(msg.sender) >= acceptOfferPrice, 'Insufficient Balance for payment');
            require(paymentToken.transferFrom(msg.sender, address(recipientAddress), acceptOfferPrice), 'Payment error');
        }
        
        if (checkInterface(_offer.token, _INTERFACE_ID_ERC20)) {
            if (takePercentageOfERC20 && percentageFee > 0) {
                uint fee = fromPercent(_offer.amount, percentageFee);
                uint value = _offer.amount.sub(fee);
                IERC20Token(_offer.token).transferFrom(_offer._from, address(recipientAddress), fee);
                IERC20Token(_offer.token).transferFrom(_offer._from, msg.sender, value);
            } else {
                IERC20Token(_offer.token).transferFrom(_offer._from, msg.sender, _offer.amount);
            }
        } else if (checkInterface(_offer.token, _INTERFACE_ID_ERC1155)){
            IERC1155(_offer.token).safeTransferFrom(_offer._from, msg.sender, _offer.tokenId, _offer.amount, "");
        } else {
            nftToken2.safeTransferFrom(_offer._from, msg.sender, _offer.tokenId);
        }

        if (checkInterface(token, _INTERFACE_ID_ERC20)) {
            // IERC20Token(token).transferFrom(msg.sender,  _offer._from, _offer.amount);
            revert('not allowed to make offers for erc20');
        } else if (checkInterface(token, _INTERFACE_ID_ERC1155)){
            IERC1155(token).safeTransferFrom(msg.sender, _offer._from, _tokenId, _offer.amount, "");
        } else {
            nftToken1.safeTransferFrom(msg.sender, _offer._from, _tokenId);
        }
        
        delete offers[token][_tokenId];
        delete offered[_offer.token][_offer._from][_offer.tokenId];
        accepted[token][_tokenId].push(_offer);
        emit OfferAccepted(_offer.token, _offer.tokenId, token, _tokenId, _offer.amount);
    }
    
    event OfferAdded(address token, uint256 _tokenId, address _forNft, uint256 _for, uint256 amount);
    function addOffer(address token, uint256 _tokenId, address _forNft, uint256 _for, uint256 amount) public notLocked nonReentrant {
        IERC721 nftToken1 = IERC721(token);
        IERC20Token paymentToken = IERC20Token(paymentAddress);

        // require(!checkInterface(_forNft, _INTERFACE_ID_ERC20), 'Not allowed to make offers for erc20');

        if (checkInterface(token, _INTERFACE_ID_ERC20) && canOfferERC20) {            
            require(IERC20Token(token).balanceOf(msg.sender) >= amount, 'Not Enough Balance');
            require(IERC20Token(token).allowance(msg.sender, address(this)) >= amount, 'Not Enough Allowance');
        } else if(checkInterface(token, _INTERFACE_ID_ERC20) && !canOfferERC20) {
            revert("Not allowed to make offers of erc20");
        } else if (checkInterface(token, _INTERFACE_ID_ERC1155)){
            require(nftToken1.balanceOf(msg.sender, _tokenId) > 0, 'NFT not owned by offerer');
            require(nftToken1.isApprovedForAll(msg.sender, address(this)), 'Handler unable to transfer NFT');
        } else {
            require(nftToken1.ownerOf(_tokenId) == msg.sender, 'Sender not owner of NFT');
            require(nftToken1.isApprovedForAll(msg.sender, address(this)), 'Handler unable to transfer NFT');
        }

        if (makeOfferPrice > 0 && payToMakeOffer) {
            require(paymentToken.allowance(msg.sender, address(this)) >= makeOfferPrice, 'Handler unable take payment for offer');
            require(paymentToken.balanceOf(msg.sender) >= makeOfferPrice, 'Insufficient Balance for payment');
            require(paymentToken.transferFrom(msg.sender, address(recipientAddress), makeOfferPrice), 'Payment error');
        }
        offers[_forNft][_for].push(Offer(_tokenId, msg.sender, token, amount));
        offered[token][msg.sender][_tokenId].push(Offer(_for, msg.sender, _forNft, amount));
        emit OfferAdded(token, _tokenId, _forNft, _for, amount);
    }
    
    function rejectOffer(address token, uint256 _tokenId, uint index) public notLocked {
        Offer memory _offer = offers[token][_tokenId][index];
        IERC721 nftToken = IERC721(token);

        require(nftToken.ownerOf(_tokenId) == msg.sender,'Sender is not owner of NFT');

        rejected[token][_tokenId].push(_offer);
        delete offers[token][_tokenId][index];
        delete offered[_offer.token][_offer._from][_offer.tokenId];
    }
    
    function withdrawOffer(address token, uint256 _tokenId, uint index) public notLocked {
        Offer memory _offer = offers[token][_tokenId][index];
        
        require(_offer._from == msg.sender, 'Not senders offer to withdraw');
        
        delete offers[token][_tokenId][index];
        delete offered[_offer.token][_offer._from][_offer.tokenId];
    }
    
    function togglePayToMakeOffer() public onlyOwner {
        payToMakeOffer = !payToMakeOffer;
    }
    function togglePayToAcceptOffer() public onlyOwner {
        payToAcceptOffer = !payToAcceptOffer;
    }
    
    function toggleLocked() public onlyOwner {
        locked = !locked;
    }

    function toggleCanOfferERC20() public onlyOwner {
        canOfferERC20 = !canOfferERC20;
    }

    function toggleTakePercentageOfERC20() public onlyOwner {
        takePercentageOfERC20 = !takePercentageOfERC20;
    }
    
    function getOffer(address token, uint256 _tokenId, uint index) public view returns (Offer memory) {
        return offers[token][_tokenId][index];
    }
    
    function getOffered(address token, uint256 _tokenId) public view returns (Offer[] memory) {
        return offered[token][msg.sender][_tokenId];
    }
    
    function getOfferCount(address token, uint256 _tokenId) public view returns (uint) {
        return offers[token][_tokenId].length;
    }
    
    function getAcceptedOffers(address token, uint256 _tokenId) public view returns (Offer[] memory) {
        return accepted[token][_tokenId];
    }
    
    function getRejectedOffers(address token, uint256 _tokenId) public view returns (Offer[] memory) {
        return rejected[token][_tokenId];
    }
    
    function changeOfferPrices(uint256 _makeOfferPrice, uint256 _acceptOfferPrice, uint _percentageFee) public onlyOwner {
        makeOfferPrice = _makeOfferPrice;
        acceptOfferPrice = _acceptOfferPrice;
        percentageFee = _percentageFee;
    }
    
    function changeRecipientAddress(address _recipientAddress) public onlyOwner {
       recipientAddress = _recipientAddress;
    }

    function checkInterface(address token, bytes4 _interface) public view returns (bool) {
        IERC165 nftToken = IERC165(token);
        bool supportsInterface = false;
        try  nftToken.supportsInterface(_interface) returns (bool _supports) {
            supportsInterface = _supports;
        } catch {
            if (_interface == 0x74a1476f) {
                supportsInterface = true;
            }
        }
        return supportsInterface;
    }

    function fromPercent(uint total, uint percent) public pure returns (uint) {
        return total.mul(percent).div(100);
    }

    function toPercent(uint amount, uint total) public pure returns (uint) {
        return amount.mul(100).div(total);
    }
}