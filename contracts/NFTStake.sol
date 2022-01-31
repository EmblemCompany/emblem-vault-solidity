pragma solidity 0.8.4;
import "./IERC721.sol";
import "./Ownable.sol";
import "./Context.sol";
import "./SafeMath.sol";
import "./ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract NFTStake is Ownable, Context, IERC721Receiver, ReentrancyGuard {

    using SafeMath for uint256;

    mapping(address => mapping(address=> uint256[])) stakedByUser;
    mapping(address => mapping(uint256 => uint256)) tokenValue;
    mapping(address => mapping(uint256 => uint256)) tokenBlockStaked; 

    bool initialized = false;

    event Staked(address indexed operator, address indexed staker, uint256 tokenId, address nftContract, uint256 value);
    event UnStaked(address indexed staker, uint256 tokenId, address nftContract, uint256 block);

    modifier initializedOnly {
        if (initialized) {
            _;
        } else {
            revert("Not initialized");
        }
    }

    function init() public {
        require(!initialized, "Already initialized");
        // nftContract = _nftContract;
        initialized = true;
    }
    
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) initializedOnly public override nonReentrant returns (bytes4) {
        (address nftContract, uint256 value) = abi.decode(data, (address, uint256));
        tokenBlockStaked[nftContract][tokenId] = block.number;
        stakedByUser[from][nftContract].push(tokenId);
        tokenValue[nftContract][tokenId] = value;
        emit Staked(operator, from, tokenId, nftContract, value);
        return this.onERC721Received.selector;
    }

    function unStake(address nftContract, uint256 tokenId) public nonReentrant {
        require(isStaked(nftContract, _msgSender(), tokenId), 'Not staked by sender');
        for (uint i = 0; i < stakedByUser[_msgSender()][nftContract].length; i++){
            if (stakedByUser[_msgSender()][nftContract][i] == tokenId) {
                stakedByUser[_msgSender()][nftContract][i] = stakedByUser[_msgSender()][nftContract][stakedByUser[_msgSender()][nftContract].length-1];
                stakedByUser[_msgSender()][nftContract].pop();
                break;
            }
        }
        tokenValue[nftContract][tokenId] = 0;
        tokenBlockStaked[nftContract][tokenId] = 0;
        IERC721(nftContract).safeTransferFrom(address(this), _msgSender(), tokenId);
        emit UnStaked(_msgSender(), tokenId, nftContract, block.number);
    }

    function qtyStaked(address nftContract, address staker) public view returns (uint256) {
        return stakedByUser[staker][nftContract].length;
    }

    function isStaked(address nftContract, address staker, uint256 tokenId) public view returns (bool) {
        for (uint i = 0; i < stakedByUser[staker][nftContract].length; i++) {
            if (stakedByUser[staker][nftContract][i] == tokenId) {
                return true;
            }
        }
        return false;
    }

    function getStaked(address nftContract, address staker) public view returns (uint256[] memory) {  
        uint256[] memory stakedTokens = stakedByUser[staker][nftContract];    
        return stakedTokens;
    }

    function bytesToAddress(bytes memory bys) private pure returns (address addr) {
        assembly {
            addr := mload(add(bys, 32))
        } 
    }

    function getNftValue(address nftContract, uint256 tokenId) public view returns (uint256) {
        return tokenValue[nftContract][tokenId];
    }

    function getTotalNftValue(address nftContract, address staker) public view returns (uint256) {
        uint256 totalValue = 0;
        for (uint i = 0; i < stakedByUser[staker][nftContract].length; i++) {
            totalValue = totalValue.add(tokenValue[nftContract][stakedByUser[staker][nftContract][i]]);
        }
        return totalValue;
    }

    function getBlockNumberNftStakedAt(address nftContract, uint256 tokenId) public view returns (uint256){
        return tokenBlockStaked[nftContract][tokenId];
    }

    function blocksSinceStaked(address nftContract, uint256 tokenId) public view returns (uint256){
        uint256 stakedBlock = tokenBlockStaked[nftContract][tokenId];
        return block.number.sub(stakedBlock);
    }
}