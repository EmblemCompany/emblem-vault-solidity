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

contract NFTrade_v3 is OwnableUpgradeable, ReentrancyGuard {
    
    address resolver;
    bool public initialized;
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
    
    struct Config {
        address recipientAddress;
        address paymentAddress;
        uint256 makeOfferPrice;
        uint256 acceptOfferPrice;
        uint percentageFee;
        bool payToAcceptOffer;
        bool payToMakeOffer;
        bool canOfferERC20;
        bool takePercentageOfERC20;
        bool Active;
        bytes32 Parent;
        uint ParentPercentage;
    }
    
    // event for EVM logging
    mapping(uint256 => Config) configs;
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
        require(!initialized, 'Already initialized');
        initialized = true;
        configs[1337] = Config(_recipientAddress, _paymentAddress, 0, 0, 0, false, false, false, false, true, 0, 0);
    }
    
    function getVersion() public pure returns (uint) {
        return 1;
    }
    
    event OfferAccepted(address token, uint256 _tokenId, address _forNft, uint256 _for, uint256 _amount);
    function acceptOffer(address token, uint _tokenId, uint index, uint apikey) public notLocked nonReentrant {
        Config memory _config = configs[apikey];
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
        if (_config.acceptOfferPrice > 0 && _config.payToAcceptOffer) {
            IERC20Token paymentToken = IERC20Token(_config.paymentAddress);
            require(paymentToken.allowance(msg.sender, address(this)) >= _config.acceptOfferPrice, 'Handler unable take payment for offer');
            require(paymentToken.balanceOf(msg.sender) >= _config.acceptOfferPrice, 'Insufficient Balance for payment');
            require(paymentToken.transferFrom(msg.sender, address(_config.recipientAddress), _config.acceptOfferPrice), 'Payment error');
        }
        
        if (checkInterface(_offer.token, _INTERFACE_ID_ERC20)) {
            if (_config.takePercentageOfERC20 && _config.percentageFee > 0) {
                uint fee = fromPercent(_offer.amount, _config.percentageFee);
                uint value = _offer.amount.sub(fee);
                IERC20Token(_offer.token).transferFrom(_offer._from, address(_config.recipientAddress), fee);
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
    function addOffer(address token, uint256 _tokenId, address _forNft, uint256 _for, uint256 amount, uint256 apikey) public notLocked nonReentrant {
        Config memory _config = configs[apikey];
        IERC721 nftToken1 = IERC721(token);
        IERC20Token paymentToken = IERC20Token(_config.paymentAddress);

        // require(!checkInterface(_forNft, _INTERFACE_ID_ERC20), 'Not allowed to make offers for erc20');

        if (checkInterface(token, _INTERFACE_ID_ERC20) && _config.canOfferERC20) {
            require(IERC20Token(token).balanceOf(msg.sender) >= amount, 'Not Enough Balance');
            require(IERC20Token(token).allowance(msg.sender, address(this)) >= amount, 'Not Enough Allowance');
        } else if(checkInterface(token, _INTERFACE_ID_ERC20) && !_config.canOfferERC20) {
            revert("Not allowed to make offers of erc20");
        } else if (checkInterface(token, _INTERFACE_ID_ERC1155)){
            require(nftToken1.balanceOf(msg.sender, _tokenId) > 0, 'NFT not owned by offerer');
            require(nftToken1.isApprovedForAll(msg.sender, address(this)), 'Handler unable to transfer NFT');
        } else {
            require(nftToken1.ownerOf(_tokenId) == msg.sender, 'Sender not owner of NFT');
            require(nftToken1.isApprovedForAll(msg.sender, address(this)), 'Handler unable to transfer NFT');
        }

        if (_config.makeOfferPrice > 0 && _config.payToMakeOffer) {
            require(paymentToken.allowance(msg.sender, address(this)) >= _config.makeOfferPrice, 'Handler unable take payment for offer');
            require(paymentToken.balanceOf(msg.sender) >= _config.makeOfferPrice, 'Insufficient Balance for payment');
            require(paymentToken.transferFrom(msg.sender, address(_config.recipientAddress), _config.makeOfferPrice), 'Payment error');
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
    
    // function togglePayToMakeOffer() public onlyOwner {
    //     togglePayToMakeOffer(1337);
    // }
    
    function togglePayToMakeOffer(uint apikey) public onlyOwner {
        Config storage _config = configs[apikey];
        _config.payToMakeOffer = !_config.payToMakeOffer;
    }
    
    // function togglePayToAcceptOffer() public onlyOwner {
    //     togglePayToAcceptOffer(1337);
    // }
    
    function togglePayToAcceptOffer(uint apikey) public onlyOwner {
        Config storage _config = configs[apikey];
        _config.payToAcceptOffer = !_config.payToAcceptOffer;
    }
    
    function toggleLocked() public onlyOwner {
        locked = !locked;
    }

    // function toggleCanOfferERC20() public onlyOwner {
    //     toggleCanOfferERC20(1337);
    // }
    
    function toggleCanOfferERC20(uint256 apikey) public onlyOwner {
        Config storage _config = configs[apikey];
        _config.canOfferERC20 = !_config.canOfferERC20;
    }

    // function toggleTakePercentageOfERC20() public onlyOwner {
    //     toggleTakePercentageOfERC20(1337);
    // }
    
    function toggleTakePercentageOfERC20(uint apikey) public onlyOwner {
        Config storage _config = configs[apikey];
        _config.takePercentageOfERC20 = !_config.takePercentageOfERC20;
    }
    
    function getOffer(address token, uint256 _tokenId, uint index) public view returns (Offer memory) {
        return offers[token][_tokenId][index];
    }

    function getConfig(uint256 apikey) public view returns (Config memory) {
        return configs[apikey]; 
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
    
    // function changeOfferPrices(uint256 _makeOfferPrice, uint256 _acceptOfferPrice, uint _percentageFee) public onlyOwner {
    //     changeOfferPrices(_makeOfferPrice, _acceptOfferPrice, _percentageFee, 1337);
    // }
    function changeOfferPrices(uint256 _makeOfferPrice, uint256 _acceptOfferPrice, uint _percentageFee, uint apikey) public onlyOwner {
        Config storage _config = configs[apikey];
        _config.makeOfferPrice = _makeOfferPrice;
        _config.acceptOfferPrice = _acceptOfferPrice;
        _config.percentageFee = _percentageFee;
    }
    
    // function changeRecipientAddress(address _recipientAddress) public onlyOwner {
    //     changeRecipientAddress(_recipientAddress, 1337);
    // }
    
    function changeRecipientAddress(address _recipientAddress, uint apikey) public onlyOwner {
        Config storage _config = configs[apikey];
        _config.recipientAddress = _recipientAddress;
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