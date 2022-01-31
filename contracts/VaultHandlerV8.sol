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

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "./BasicERC20.sol";
import "./EmblemVault.sol";
import "./ConfigurableERC20.sol";
import "./ERC1155.sol";
import "./Context.sol";
import "./SafeMath.sol";
import "./Ownable.sol";
import "./IERC721.sol";
import "./Storage.sol";
import "./BalanceStorage.sol";
import "./Claimed.sol";
import "./Balance.sol";
import "./NFTrade_v2.sol";
import "./NFTrade_v3.sol";
import "./ReentrancyGuard.sol";
import "./Ownable.sol";

contract VaultHandlerV8 is Ownable, Context, ReentrancyGuard {
    
    using SafeMath for uint256;
    string public metadataBaseUri;
    bool public initialized;
    address public nftAddress;
    address public recipientAddress;
    address public paymentAddress;
    uint256 public price;

    bytes4 private constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 private constant _INTERFACE_ID_ERC20 = 0x74a1476f;
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
    
    bool public shouldBurn = false;
    
    struct PreTransfer {
        string payload;
        bytes32 preImage;
        address _from;
    }
    struct ContractDetails {
        uint _type;
        bool curated;
    }
    
    mapping(address => mapping(uint => PreTransfer)) preTransfers;
    mapping(address => mapping(uint => mapping(uint => PreTransfer))) preTransfersByIndex;
    mapping(address => mapping(uint => uint)) preTransferCounts;
    
    mapping(address => bool) public witnesses;
    mapping(uint256 => bool) usedNonces;

    mapping(address => ContractDetails) public vaultContracts;
    uint256 public vaultContractCount;

    modifier isRegisteredVaultContract(address _vaultContract) {
        require(vaultContracts[_vaultContract]._type > 0, "Vault contract is not registered");
        _;
    }
    
    /**
     * @dev Return owner address 
     * @return address of owner
     */
    function getOwner() external view returns (address) {
        return owner;
    }
    
    constructor(address _nftAddress, address _paymentAddress, address _recipientAddress, uint256 _price) {
        addWitness(owner);
        metadataBaseUri = "https://api.emblemvault.io/s:evmetadata/meta/";
        nftAddress = _nftAddress;
        paymentAddress = _paymentAddress;
        recipientAddress = _recipientAddress;
        initialized = true;
        uint decimals = BasicERC20(paymentAddress).decimals();
        price = _price.mul(10) ** decimals;
        vaultContractCount = 0;
    }
    
    function buyWithSignature(address _nftAddress, address _to, uint256 _tokenId, string calldata _payload, uint256 _nonce, bytes calldata _signature) public payable nonReentrant {
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

    function buyWithSignedPrice(address _nftAddress, address _payment, uint _price, address _to, uint256 _tokenId, string calldata _payload, uint256 _nonce, bytes calldata _signature) public payable nonReentrant {
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

    function addVaultContract(address vaultContract, uint _type, bool curated) public onlyOwner {
        require(_msgSender() == owner, 'Only owner can add vault contracts');
        vaultContractCount++;
        vaultContracts[vaultContract] = ContractDetails(_type, curated);
    }

    function removeVaultContract(address vaultContract) public onlyOwner isRegisteredVaultContract(vaultContract) {
        require(vaultContractCount > 0, 'No vault contracts to remove');
        delete vaultContracts[vaultContract];
        vaultContractCount--;
    }

    function moveVault(address _from, address _to, uint256 tokenId, uint256 newTokenId) external nonReentrant isRegisteredVaultContract(_from) isRegisteredVaultContract(_to)  {
        require(_from != _to, 'Cannot move vault to same address');
        if (checkInterface(_from, _INTERFACE_ID_ERC1155)) {
            require(tokenId != newTokenId, 'from: TokenIds must be different for ERC1155');            
            require(IERC1155(_from).balanceOf(_msgSender(), tokenId) > 0, 'from: Not owner of vault');
            // burn _from

        } else {
            require(IERC721(_from).ownerOf(tokenId) == _msgSender(), 'from: Not owner of vault');
            IERC721(_from).burn(tokenId);
            tryERC721BalanceCheck(_from, tokenId);
        }
        if (checkInterface(_to, _INTERFACE_ID_ERC1155)) {
            require(tokenId != newTokenId, 'to: TokenIds must be different for ERC1155');            
            IERC1155(_to).mint(_msgSender(), newTokenId, 1);
        } else {
            // mint _to
        }
    }

    function tryERC721BalanceCheck(address _from, uint256 tokenId) public returns(uint256 returnedAmount){
        (bool success, bytes memory returnData) =
            address(_from).call( // This creates a low level call to the token
                abi.encodePacked( // This encodes the function to call and the parameters to pass to that function
                    IERC721(_from).ownerOf.selector, // This is the function identifier of the function we want to call
                    abi.encode(tokenId) // This encodes the parameter we want to pass to the function
                )
            );
        if (success) { 
            revert('Not burnt');                
        } else { 
            (returnedAmount) = abi.decode(returnData, (uint256));
        }
    }
    
    function toggleShouldBurn() public onlyOwner {
        shouldBurn = !shouldBurn;
    }
    
    /* Transfer with code */
    function addWitness(address _witness) public onlyOwner {
        witnesses[_witness] = true;
    }

    function removeWitness(address _witness) public onlyOwner {
        witnesses[_witness] = false;
    }

    function transferToStaking(address _nftAddress, address _to, uint256 tokenId, uint256 value) external nonReentrant {
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
    
    function transferWithCode(address _nftAddress, uint256 _tokenId, string calldata code, address _to, uint256 _nonce,  bytes calldata signature) public payable nonReentrant {
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
    
    function addPreTransfer(address _nftAddress, uint256 _tokenId, bytes32 preImage) public nonReentrant {
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
    
    function deletePreTransfer(address _nftAddress, uint256 _tokenId) public nonReentrant {
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
    
    function changeMetadataBaseUri(string calldata _uri) public onlyOwner {
        metadataBaseUri = _uri;
    }
    
    function transferPaymentOwnership(address newOwner) external onlyOwner {
        Ownable paymentToken = Ownable(paymentAddress);
        paymentToken.transferOwnership(newOwner);
    }
    
    function transferNftOwnership(address _nftAddress, address newOwner) external onlyOwner {
        Ownable nftToken = Ownable(_nftAddress);
        nftToken.transferOwnership(newOwner);
    }
    
    function mint(address _nftAddress, address _to, uint256 _tokenId, string calldata _uri, string calldata _payload) external onlyOwner {
        IERC721 nftToken = IERC721(_nftAddress);
        nftToken.mint(_to, _tokenId, _uri, _payload);
    }
    
    function changeName(address _nftAddress, string calldata name, string calldata symbol) external onlyOwner {
        IERC721 nftToken = IERC721(_nftAddress);
        nftToken.changeName(name, symbol);
    }
    
    function updateTokenUri(address _nftAddress, uint256 _tokenId,string memory _uri) external onlyOwner {
        IERC721 nftToken = IERC721(_nftAddress);
        nftToken.updateTokenUri(_tokenId, _uri);
    }
    
    function getPaymentDecimals() public view returns (uint8){
        BasicERC20 token = BasicERC20(paymentAddress);
        return token.decimals();
    }
    
    function changePayment(address payment) public onlyOwner {
       paymentAddress = payment;
    }

    function changeRecipient(address _recipient) public onlyOwner {
       recipientAddress = _recipient;
    }
    
    function changeNft(address token) public onlyOwner {
        nftAddress = token;
    }
    
    function changePrice(uint256 _price) public onlyOwner {
        uint decimals = BasicERC20(paymentAddress).decimals();
        price = _price.mul(10 ** decimals);
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