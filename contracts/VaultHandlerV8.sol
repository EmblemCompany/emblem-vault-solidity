/**
 *Submitted for verification at Etherscan.io on 2021-07-14
*/

// ___________      ___.   .__                                          
// \_   _____/ _____\_ |__ |  |   ____   _____                          
//  |    __)_ /     \| __ \|  | _/ __ \ /     \                         
//  |        \  Y Y  \ \_\ \  |_\  ___/|  Y Y  \                        
// /_______  /__|_|  /___  /____/\___  >__|_|  /                        
//         \/      \/    \/          \/      \/                         
//     ____   ____            .__   __                                  
//     \   \ /   /____   __ __|  |_/  |_                                
//      \   Y   /\__  \ |  |  \  |\   __\                               
//       \     /  / __ \|  |  /  |_|  |                                 
//       \___/  (____  /____/|____/__|                                 
//                   \/                                                
//   ___ ___                    .___.__                          _________
//  /   |   \_____    ____    __| _/|  |   ___________  ___  __ |  ____  /
// /    ~    \__  \  /    \  / __ | |  | _/ __ \_  __ \ \  \/   /    / /
// \    Y    // __ \|   |  \/ /_/ | |  |_\  ___/|  | \/  \    /    / /
//  \___|_  /(____  /___|  /\____ | |____/\___  >__|      \_/    /_/
//       \/      \/     \/      \/           \/                     

  
// File: browser/ReentrancyGuard.sol

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;
import "./EmblemVault.sol";
import "./ConfigurableERC20.sol";
import "./Context.sol";
import "./SafeMath.sol";
import "./Ownable.sol";
import "./IERC721.sol";
import "./Storage.sol";
import "./BalanceStorage.sol";
import "./Claimed.sol";
import "./Balance.sol";

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor ()  {
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and make it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }
}
// File: browser/IERC20Token.sol

// pragma solidity ^0.8.4;
interface IERC20Token {
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function totalSupply() external view returns (uint256);
    function balanceOf(address who) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// File: browser/VaultHandler_v4.sol

pragma experimental ABIEncoderV2;
// pragma solidity ^0.8.4;

interface BasicERC20 {
    function burn(uint256 value) external;
    function mint(address account, uint256 amount) external;
    function decimals() external view returns (uint8);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function totalSupply() external view returns (uint256);
    function balanceOf(address who) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}


contract VaultHandlerV8 is Context {
    
    using SafeMath for uint256;
    address payable private owner;
    string public metadataBaseUri;
    bool public initialized;
    address public nftAddress;
    address public recipientAddress;
    address public paymentAddress;
    uint256 public price;
    bool public shouldBurn = false;
    
   struct PreTransfer {
        string payload;
        bytes32 preImage;
        address _from;
    }
    
    mapping(address => mapping(uint => PreTransfer)) preTransfers;
    mapping(address => mapping(uint => mapping(uint => PreTransfer))) preTransfersByIndex;
    mapping(address => mapping(uint => uint)) preTransferCounts;
    
    mapping(address => bool) public witnesses;
    mapping(uint256 => bool) usedNonces;
    
    // event for EVM logging
    event OwnerSet(address indexed oldOwner, address indexed newOwner);
    
    // modifier to check if caller is owner
    modifier isOwner() {
        // If the first argument of 'require' evaluates to 'false', execution terminates and all
        // changes to the state and to Ether balances are reverted.
        // This used to consume all gas in old EVM versions, but not anymore.
        // It is often a good idea to use 'require' to check if functions are called correctly.
        // As a second argument, you can also provide an explanation about what went wrong.
        require(msg.sender == owner, "Caller is not owner");
        _;
    }
    
    /**
     * @dev Change owner
     * @param newOwner address of new owner
     */
    function transferOwnership(address payable newOwner) public isOwner {
        emit OwnerSet(owner, newOwner);
        owner = newOwner;
    }
    
    /**
     * @dev Return owner address 
     * @return address of owner
     */
    function getOwner() external view returns (address) {
        return owner;
    }
    
    constructor(address _nftAddress, address _paymentAddress, address _recipientAddress, uint256 _price) {
        owner = _msgSender(); // 'msg.sender' is sender of current call, contract deployer for a constructor
        emit OwnerSet(address(0), owner);
        addWitness(owner);
        metadataBaseUri = "https://api.emblemvault.io/s:evmetadata/meta/";
        nftAddress = _nftAddress;
        paymentAddress = _paymentAddress;
        recipientAddress = _recipientAddress;
        initialized = true;
        uint decimals = BasicERC20(paymentAddress).decimals();
        price = _price.mul(10) ** decimals;
    }
    
    function buyWithSignature(address _nftAddress, address _to, uint256 _tokenId, string calldata _payload, uint256 _nonce, bytes calldata _signature) public payable {
        IERC20Token paymentToken = IERC20Token(paymentAddress);
        IERC721 nftToken = IERC721(_nftAddress);
        if (shouldBurn && price > 0) {
            require(paymentToken.transferFrom(msg.sender, address(this), price), 'Transfer ERROR'); // Payment sent to recipient
            BasicERC20(paymentAddress).burn(price);
        } else if(price > 0) {
            require(paymentToken.transferFrom(msg.sender, address(recipientAddress), price), 'Transfer ERROR'); // Payment sent to recipient
        }
        
        address signer = getAddressFromSignatureMint(_nftAddress, _to, _tokenId, _nonce, _payload, _signature);
        require(witnesses[signer], 'Not Witnessed');
        usedNonces[_nonce] = true;
        string memory _uri = concat(metadataBaseUri, uintToStr(_tokenId));
        nftToken.mint(_to, _tokenId, _uri, _payload);
    }

    function buyWithSignedPrice(address _nftAddress, address _payment, uint _price, address _to, uint256 _tokenId, string calldata _payload, uint256 _nonce, bytes calldata _signature) public payable {
        IERC20Token paymentToken = IERC20Token(_payment);
        IERC721 nftToken = IERC721(_nftAddress);
        if (shouldBurn) {
            require(paymentToken.transferFrom(msg.sender, address(this), _price), 'Transfer ERROR'); // Payment sent to recipient
            BasicERC20(_payment).burn(_price);
        } else {
            require(paymentToken.transferFrom(msg.sender, address(recipientAddress), _price), 'Transfer ERROR'); // Payment sent to recipient
        }
        // pass in price
        address signer = getAddressFromSignature(_nftAddress, _payment, _price, _to, _tokenId, _nonce, _payload, _signature);
        require(witnesses[signer], 'Not Witnessed');
        usedNonces[_nonce] = true;
        string memory _uri = concat(metadataBaseUri, uintToStr(_tokenId));
        nftToken.mint(_to, _tokenId, _uri, _payload);
    }
    
    function toggleShouldBurn() public isOwner {
        shouldBurn = !shouldBurn;
    }
    
    /* Transfer with code */
    function addWitness(address _witness) public isOwner {
        witnesses[_witness] = true;
    }

    function removeWitness(address _witness) public isOwner {
        witnesses[_witness] = false;
    }

    function transferToStaking(address _nftAddress, address _to, uint256 tokenId, uint256 value) external {
        IERC721 nftToken = IERC721(_nftAddress);
        nftToken.safeTransferFrom(_msgSender(), _to, tokenId, abi.encode(_nftAddress, value));
    }

    function getAddressFromSignatureHash(bytes32 _hash, bytes calldata signature) public pure returns (address) {
        address addressFromSig = recoverSigner(_hash, signature);
        return addressFromSig;
    }

    function getAddressFromSignature(address _nftAddress, address _payment, uint _price, address _to, uint256 _tokenId, uint256 _nonce, string calldata _payload, bytes calldata signature) public view returns (address) {
        require(!usedNonces[_nonce], 'Nonce already used');
        bytes32 _hash = keccak256(abi.encodePacked(_nftAddress, _payment, _price, _to, _tokenId, _nonce, _payload));
        return getAddressFromSignatureHash(_hash, signature);
    }

    function getAddressFromSignature(address _to, uint256 _tokenId, uint256 _nonce, bytes calldata signature) public view returns (address) {
        require(!usedNonces[_nonce], 'Nonce already used');
        bytes32 _hash = keccak256(abi.encodePacked(_to, _tokenId, _nonce));
        return getAddressFromSignatureHash(_hash, signature);
    }

    function getAddressFromSignatureMint(address _nftAddress, address _to, uint256 _tokenId, uint256 _nonce, string calldata payload, bytes calldata signature) public view returns (address) {
        require(!usedNonces[_nonce]);
        bytes32 _hash = keccak256(abi.encodePacked(_nftAddress, _to, _tokenId, _nonce, payload));
        return getAddressFromSignatureHash(_hash, signature);
    }

    function isWitnessed(bytes32 _hash, bytes calldata signature) public view returns (bool) {
        address addressFromSig = recoverSigner(_hash, signature);
        return witnesses[addressFromSig];
    }
    
    function transferWithCode(address _nftAddress, uint256 _tokenId, string calldata code, address _to, uint256 _nonce,  bytes calldata signature) public payable {
        require(witnesses[getAddressFromSignature(_to, _tokenId, _nonce, signature)], 'Not Witnessed');
        IERC721 nftToken = IERC721(_nftAddress);
        PreTransfer memory preTransfer = preTransfers[_nftAddress][_tokenId];
        require(preTransfer.preImage == sha256(abi.encodePacked(code)), 'Code does not match'); // Payload should match
        nftToken.transferFrom(preTransfer._from, _to,  _tokenId);
        delete preTransfers[_nftAddress][_tokenId];
        delete preTransfersByIndex[_nftAddress][_tokenId][preTransferCounts[_nftAddress][_tokenId]];
        preTransferCounts[_nftAddress][_tokenId] = preTransferCounts[_nftAddress][_tokenId].sub(1);
        usedNonces[_nonce] = true;
    }
    
    function addPreTransfer(address _nftAddress, uint256 _tokenId, bytes32 preImage) public {
        require(!_duplicatePretransfer(_nftAddress, _tokenId), 'Duplicate PreTransfer');
        preTransferCounts[_nftAddress][_tokenId] = preTransferCounts[_nftAddress][_tokenId].add(1);
        preTransfers[_nftAddress][_tokenId] = PreTransfer("payload", preImage, msg.sender);
        preTransfersByIndex[_nftAddress][_tokenId][preTransferCounts[_nftAddress][_tokenId]] = preTransfers[_nftAddress][_tokenId];
    }
    
    function _duplicatePretransfer(address _nftAddress, uint256 _tokenId) internal view returns (bool) {
        string memory data = preTransfers[_nftAddress][_tokenId].payload;
        bytes32 NULL = keccak256(bytes(''));
        return keccak256(bytes(data)) != NULL;
    }
    
    function deletePreTransfer(address _nftAddress, uint256 _tokenId) public {
        require(preTransfers[_nftAddress][_tokenId]._from == msg.sender, 'PreTransfer does not belong to sender');
        delete preTransfersByIndex[_nftAddress][_tokenId][preTransferCounts[_nftAddress][_tokenId]];
        preTransferCounts[_nftAddress][_tokenId] = preTransferCounts[_nftAddress][_tokenId].sub(1);
        delete preTransfers[_nftAddress][_tokenId];
    }
    
    function getPreTransfer(address _nftAddress, uint256 _tokenId) public view returns (PreTransfer memory) {
        return preTransfers[_nftAddress][_tokenId];
    }
    
    function checkPreTransferImage(string memory image, bytes32 preImage) public pure returns (bytes32, bytes32, bool) {
        bytes32 calculated = sha256(abi.encodePacked(image));
        bytes32 preBytes = preImage;
        return (calculated, preBytes, calculated == preBytes);
    }
    
    function getPreTransferCount(address _nftAddress, uint256 _tokenId) public view returns (uint length) {
        return preTransferCounts[_nftAddress][_tokenId];
    }
    
    function getPreTransferByIndex(address _nftAddress, uint256 _tokenId, uint index) public view returns (PreTransfer memory) {
        return preTransfersByIndex[_nftAddress][_tokenId][index];
    }
    
    function changeMetadataBaseUri(string calldata _uri) public isOwner {
        metadataBaseUri = _uri;
    }
    
    function transferPaymentOwnership(address newOwner) external isOwner {
        Ownable paymentToken = Ownable(paymentAddress);
        paymentToken.transferOwnership(newOwner);
    }
    
    function transferNftOwnership(address _nftAddress, address newOwner) external isOwner {
        Ownable nftToken = Ownable(_nftAddress);
        nftToken.transferOwnership(newOwner);
    }
    
    function mint(address _nftAddress, address _to, uint256 _tokenId, string calldata _uri, string calldata _payload) external isOwner {
        IERC721 nftToken = IERC721(_nftAddress);
        nftToken.mint(_to, _tokenId, _uri, _payload);
    }
    
    function changeName(address _nftAddress, string calldata name, string calldata symbol) external isOwner {
        IERC721 nftToken = IERC721(_nftAddress);
        nftToken.changeName(name, symbol);
    }
    
    function updateTokenUri(address _nftAddress, uint256 _tokenId,string memory _uri) external isOwner {
        IERC721 nftToken = IERC721(_nftAddress);
        nftToken.updateTokenUri(_tokenId, _uri);
    }
    
    function getPaymentDecimals() public view returns (uint8){
        BasicERC20 token = BasicERC20(paymentAddress);
        return token.decimals();
    }
    
    function changePayment(address payment) public isOwner {
       paymentAddress = payment;
    }

    function changeRecipient(address _recipient) public isOwner {
       recipientAddress = _recipient;
    }
    
    function changeNft(address token) public isOwner {
        nftAddress = token;
    }
    
    function changePrice(uint256 _price) public isOwner {
        uint decimals = BasicERC20(paymentAddress).decimals();
        price = _price * 10 ** decimals;
    }

    function toBytes(address a) public pure returns (bytes memory b){
        assembly {
            let m := mload(0x40)
            a := and(a, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
            mstore(add(m, 20), xor(0x140000000000000000000000000000000000000000, a))
            mstore(0x40, add(m, 52))
            b := m
        }
    }
    
    function concat(string memory a, string memory b) internal pure returns (string memory) {
        return string(abi.encodePacked(a, b));
    }

    function recoverSigner(bytes32 hash, bytes memory sig) public pure returns (address) {
        require(sig.length == 65, "Require correct length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        // Divide the signature in r, s and v variables
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Signature version not match");

        return recoverSigner2(hash, v, r, s);
    }
    function recoverSigner2(bytes32 h, uint8 v, bytes32 r, bytes32 s) internal pure returns (address) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, h));
        address addr = ecrecover(prefixedHash, v, r, s);

        return addr;
    }
    function uintToStr(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }    
    function stringToBytes32(string memory source) internal pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }
    
        assembly {
            result := mload(add(source, 32))
        }
    }
    function bytes32ToStr(bytes32 _bytes32) internal pure returns (string memory) {      
        bytes memory bytesArray = new bytes(32);
        for (uint256 i; i < 32; i++) {
            bytesArray[i] = _bytes32[i];
            }
        return string(bytesArray);
    }
    function asciiToInteger(bytes32 x) public pure returns (uint256) {
        uint256 y;
        for (uint256 i = 0; i < 32; i++) {
            uint256 c = (uint256(x) >> (i * 8)) & 0xff;
            if (48 <= c && c <= 57)
                y += (c - 48) * 10 ** i;
            else
                break;
        }
        return y;
    }
    function toString(address account) public pure returns(string memory) {
        return toString(abi.encodePacked(account));
    }    
    function toString(uint256 value) public pure returns(string memory) {
        return toString(abi.encodePacked(value));
    }    
    function toString(bytes32 value) public pure returns(string memory) {
        return toString(abi.encodePacked(value));
    }    
    function toString(bytes memory data) public pure returns(string memory) {
        bytes memory alphabet = "0123456789abcdef";
    
        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint i = 0; i < data.length; i++) {
            str[2+i*2] = alphabet[uint(uint8(data[i] >> 4))];
            str[3+i*2] = alphabet[uint(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }
}