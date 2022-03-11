//     ______          __    __                          
//    / ____/___ ___  / /_  / /__  ____ ___              
//   / __/ / __ `__ \/ __ \/ / _ \/ __ `__ \             
//  / /___/ / / / / / /_/ / /  __/ / / / / /             
// /_____/_/ /_/ /_/_.___/_/\___/_/ /_/ /_/              
// | |  / /___ ___  __/ / /_                             
// | | / / __ `/ / / / / __/                             
// | |/ / /_/ / /_/ / / /_                               
// |___/\__,_/\__,_/_/\__/                               
//     __  __                ____                   ____ 
//    / / / /___ _____  ____/ / /__  _____   _   __( __ )
//   / /_/ / __ `/ __ \/ __  / / _ \/ ___/  | | / / __  |
//  / __  / /_/ / / / / /_/ / /  __/ /      | |/ / /_/ / 
// /_/ /_/\__,_/_/ /_/\__,_/_/\___/_/       |___/\____/  

// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "./BasicERC20.sol";
import "./EmblemVault.sol";
import "./ConfigurableERC20.sol";
import "./ERC1155.sol";
import "./SafeMath.sol";
import "./IERC721.sol";
import "./Storage.sol";
import "./BalanceStorage.sol";
import "./Claimed.sol";
import "./Balance.sol";
import "./NFTrade_v2.sol";
import "./NFTrade_v3.sol";
import "./ReentrancyGuard.sol";
import "./Ownable.sol";
import "./HasCallbacks.sol";
import "./TokenStaking.sol";

contract VaultHandlerV8 is ReentrancyGuard, HasCallbacks, ERC165 {
    
    using SafeMath for uint256;
    string public metadataBaseUri = "https://api.emblemvault.io/s:evmetadata/meta/";
    address public recipientAddress;

    bytes4 private constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 private constant _INTERFACE_ID_ERC20 = 0x74a1476f;
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
    bool public shouldBurn = false;
    
    mapping(address => bool) public witnesses;
    mapping(uint256 => bool) usedNonces;
    
    constructor() {
        addWitness(owner);
        recipientAddress = _msgSender();
    }
    
    /**
     * @dev Return owner address 
     * @return address of owner
     */
    function getOwner() external view returns (address) {
        return owner;
    }

    function claim(address _nftAddress, uint256 tokenId) public nonReentrant isRegisteredContract(_nftAddress) {
        Claimed claimer = Claimed(registeredOfType[6][0]);
        bytes32[] memory proof;
        
        if (checkInterface(_nftAddress, _INTERFACE_ID_ERC1155)) {
            IIsSerialized serialized = IIsSerialized(_nftAddress);
            uint256 serialNumber = serialized.getFirstSerialByOwner(_msgSender(), tokenId);
            require(serialized.getTokenIdForSerialNumber(serialNumber) == tokenId, "Invalid tokenId serialnumber combination");
            require(serialized.getOwnerOfSerial(serialNumber) == _msgSender(), "Not owner of serial number");
            require(!claimer.isClaimed(_nftAddress, serialNumber, proof), "Already Claimed");
            IERC1155(_nftAddress).burn(_msgSender(), tokenId, 1);
            claimer.claim(_nftAddress, serialNumber, _msgSender());
        } else {            
            require(!claimer.isClaimed(_nftAddress, tokenId, proof), "Already Claimed");
            IERC721 token = IERC721(_nftAddress);
            require(token.ownerOf(tokenId) == _msgSender(), "Not Token Owner");
            token.burn(tokenId);
            claimer.claim(_nftAddress, tokenId, _msgSender());
        }
        executeCallbacksInternal(_nftAddress, _msgSender(), address(0), tokenId, IHandlerCallback.CallbackType.CLAIM);
    }

    function buyWithSignedPrice(address _nftAddress, address _payment, uint _price, address _to, uint256 _tokenId, string calldata _payload, uint256 _nonce, bytes calldata _signature) public nonReentrant {
        IERC20Token paymentToken = IERC20Token(_payment);
        if (shouldBurn) {
            require(paymentToken.transferFrom(msg.sender, address(this), _price), 'Transfer ERROR'); // Payment sent to recipient
            BasicERC20(_payment).burn(_price);
        } else {
            require(paymentToken.transferFrom(msg.sender, address(recipientAddress), _price), 'Transfer ERROR'); // Payment sent to recipient
        }
        address signer = getAddressFromSignature(_nftAddress, _payment, _price, _to, _tokenId, _nonce, _payload, _signature);
        require(witnesses[signer], 'Not Witnessed');
        usedNonces[_nonce] = true;
        string memory _uri = concat(metadataBaseUri, uintToStr(_tokenId));
        if (checkInterface(_nftAddress, _INTERFACE_ID_ERC1155)) {
            IERC1155(_nftAddress).mint(_to, _tokenId, 1);
        } else {
            IERC721(_nftAddress).mint(_to, _tokenId, _uri, _payload);
        }
    }

    function mint(address _nftAddress, address _to, uint256 _tokenId, string calldata _uri, string calldata _payload, uint256 amount) external onlyOwner {
        if (checkInterface(_nftAddress, _INTERFACE_ID_ERC1155)) {
            IERC1155(_nftAddress).mint(_to, _tokenId, amount);
        } else {
            IERC721(_nftAddress).mint(_to, _tokenId, _uri, _payload);
        }        
    }

    function moveVault(address _from, address _to, uint256 tokenId, uint256 newTokenId, uint256 nonce, bytes calldata signature) external nonReentrant isRegisteredContract(_from) isRegisteredContract(_to)  {
        require(_from != _to, 'Cannot move vault to same address');
        address signer = getAddressFromSignatureMove(_from, _to, tokenId, newTokenId, nonce, signature);
        require(witnesses[signer], 'Not Witnessed');
        usedNonces[nonce] = true;
        if (checkInterface(_from, _INTERFACE_ID_ERC1155)) {
            require(tokenId != newTokenId, 'from: TokenIds must be different for ERC1155');
            uint256 currentBalance = IERC1155(_from).balanceOf(_msgSender(), tokenId);
            require(currentBalance > 0, 'from: Not owner of vault');
            IERC1155(_from).burn(_msgSender(), tokenId, 1);
            uint256 newBalance = IERC1155(_from).balanceOf(_msgSender(), tokenId);
            require(newBalance == currentBalance.sub(1), 'from: Not Burnt');
        } else {
            require(IERC721(_from).ownerOf(tokenId) == _msgSender(), 'from: Not owner of vault');
            IERC721(_from).burn(tokenId);
            tryERC721BalanceCheck(_from, tokenId, 'Not Burnt');
        }
        if (checkInterface(_to, _INTERFACE_ID_ERC1155)) {
            require(tokenId != newTokenId, 'to: TokenIds must be different for ERC1155');            
            IERC1155(_to).mint(_msgSender(), newTokenId, 1);
        } else {
            tryERC721BalanceCheck(_to, newTokenId, 'NFT Already Exists');
            string memory _uri = concat(metadataBaseUri, uintToStr(newTokenId));
            IERC721(_to).mint(_msgSender(), newTokenId, _uri, "");
        }
    }

    function tryERC721BalanceCheck(address _from, uint256 tokenId, string memory reason) public returns(uint256 returnedAmount){
        (bool success, bytes memory returnData) =
            address(_from).call( // This creates a low level call to the token
                abi.encodePacked( // This encodes the function to call and the parameters to pass to that function
                    IERC721(_from).ownerOf.selector, // This is the function identifier of the function we want to call
                    abi.encode(tokenId) // This encodes the parameter we want to pass to the function
                )
            );
        if (success) { 
            revert(reason);                
        } else { 
            (returnedAmount) = abi.decode(returnData, (uint256));
        }
    }    
    
    function toggleShouldBurn() public onlyOwner {
        shouldBurn = !shouldBurn;
    }
    
    function addWitness(address _witness) public onlyOwner {
        witnesses[_witness] = true;
    }

    function removeWitness(address _witness) public onlyOwner {
        witnesses[_witness] = false;
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

    function getAddressFromSignatureMove(address _from, address _to, uint256 tokenId, uint256 newTokenId, uint256 _nonce, bytes calldata signature) public view returns (address) {
        require(!usedNonces[_nonce]);
        bytes32 _hash = keccak256(abi.encodePacked(_from, _to, tokenId, newTokenId, _nonce));
        return getAddressFromSignatureHash(_hash, signature);
    }

    function isWitnessed(bytes32 _hash, bytes calldata signature) public view returns (bool) {
        address addressFromSig = recoverSigner(_hash, signature);
        return witnesses[addressFromSig];
    }
    
    function changeMetadataBaseUri(string calldata _uri) public onlyOwner {
        metadataBaseUri = _uri;
    }

    function transferNftOwnership(address _nftAddress, address newOwner) external onlyOwner {
        Ownable nftToken = Ownable(_nftAddress);
        nftToken.transferOwnership(newOwner);
    }
    
    function changeName(address _nftAddress, string calldata name, string calldata symbol) external onlyOwner {
        IERC721 nftToken = IERC721(_nftAddress);
        nftToken.changeName(name, symbol);
    }
    
    function updateTokenUri(address _nftAddress, uint256 _tokenId,string memory _uri) external onlyOwner {
        IERC721 nftToken = IERC721(_nftAddress);
        nftToken.updateTokenUri(_tokenId, _uri);
    }

    function changeRecipient(address _recipient) public onlyOwner {
       recipientAddress = _recipient;
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