pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./ERC165.sol";

interface IERC721 {
    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function setApprovalForAll(address operator, bool _approved) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
}

interface ERC721Metadata{
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 _tokenId) external view returns (string memory);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract ContractNFT is OwnableUpgradeable, ERC165 {

    uint256 internal tokenId;
    string internal uri;
    string internal tokenName;
    string internal tokenSymbol;
    address[] public ERC721Clones;
    address public implementation;
    address public parent;

    event Transfer(address indexed _from, address indexed _to, uint256 indexed _tokenId);
    event ERC721Created(address indexed newThingAddress, address indexed libraryAddress);

    function version() virtual public view returns (uint256 _version) {
        return 2;
    }
    function tokenURI(uint256 _tokenId) public view returns (string memory){
        return concatenate(uri, _tokenId);
    }

    function name() public view returns (string memory _name)  {
        return tokenName;
    }
    function symbol() public view returns (string memory _symbol)  {
        return tokenSymbol;
    }

    function initialize(address newOwner, address _implementation, uint256 _tokenId, string memory _uri) public initializer {
        __Ownable_init();
        parent = _msgSender();
        tokenId = _tokenId;
        uri = _uri;
        implementation = _implementation;
        _registerInterface(0x80ac58cd); // ERC721
        _registerInterface(0x5b5e139f); // ERC721Metadata
        _registerInterface(0x780e9d63); // ERC721Enumerable
        initializeERC165();
        emit Transfer(address(0), newOwner, _tokenId);
        tokenName = "ContractNFT";
        tokenSymbol = "NFT";

    }

    function getClones() public view returns (address[] memory) {
        return ERC721Clones;
    }

    function transferFrom(address from, address to, uint256 _tokenId) public payable {
        require(from == owner(), "Not Owner");
        transferOwnership(to);
        emit Transfer(from, to, _tokenId);
    }
    function ownerOf(uint256 _tokenId) public view returns (address) {
        return _tokenId == tokenId ? owner(): address(0);
    }
    function safeTransferFrom(address from, address to, uint256 _tokenId) public payable {
        require(from == owner(), "Not Owner");
        transferOwnership(to);
        emit Transfer(from, to, _tokenId);
    }
    function safeTransferFrom(address from, address to, uint256 _tokenId, bytes calldata) public payable {
        require(from == owner(), "Not Owner");
        transferOwnership(to);
        emit Transfer(from, to, _tokenId);
    }
    function isApprovedForAll(address, address) public pure returns (bool) {
        return false;
    }
    function getApproved(uint256) public view returns (address) {
        return owner();
    }
    function setApprovalForAll(address _operator, bool _approved) public {

    }
    function approve(address _approved, uint256 _tokenId) public payable {

    }
    function createClone(address _newOwner, uint256 _tokenId, string memory _uri) public onlyOwner returns (address clone){
        address _clone = ClonesUpgradeable.clone(implementation);
        ContractNFT(_clone).initialize(_newOwner, implementation, _tokenId, _uri); // owned by this contract
        ContractNFT(_clone).transferOwnership(_newOwner);
        ERC721Clones.push(_clone);
        emit ERC721Created(_clone, address(this));
        return _clone;
    }
    function concatenate(string memory a, uint256 b) public pure returns (string memory){
        return string(abi.encodePacked(a, b));
    } 

}