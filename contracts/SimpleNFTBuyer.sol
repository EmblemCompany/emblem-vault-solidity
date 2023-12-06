// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract SimpleNFTBuyer is Initializable, OwnableUpgradeable {

    event BoughtNFT(address indexed buyer, address indexed nftAddress, uint256 tokenId);

    function initialize() initializer public {
        __Ownable_init();
    }

    function buy(address nftAddress, uint256 tokenId) payable public {
        IERC721 nftContract = IERC721(nftAddress);

        // Transfer the token to the buyer
        // If transferFrom is payable and accepts Ether, you can send Ether like this
        (bool success, ) = address(nftContract).call{value: msg.value} (
            abi.encodeWithSignature("transferFrom(address,address,uint256)", address(this), _msgSender(), tokenId)
        );
        require(success, "Transfer failed.");

        // Emit the BoughtNFT event
        // emit BoughtNFT(_msgSender(), nftAddress, tokenId);
    }
}

