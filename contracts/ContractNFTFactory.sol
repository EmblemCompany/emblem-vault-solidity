// SPDX-License-Identifier: CLOSED - Pending Licensing Audit
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "./ContractNFT.sol";

interface IHasRegistration {
  function isRegistered(address _contract, uint256 _type) external returns (bool);
  function registerContract(address _contract, uint _type) external;
}

contract ContractNFTFactory is OwnableUpgradeable {

  address public handlerAddress;
  address public erc721Implementation;

  event ERC721Created(address indexed newThingAddress, address indexed libraryAddress);
  address[] public ERC721Clones;

  function initialize() public initializer {
    __Ownable_init();
    erc721Implementation = address(new ContractNFT());
    ContractNFT(erc721Implementation).initialize(_msgSender(), erc721Implementation, 0, "base.url");
  }

  function updateImplementation() public onlyOwner {
    erc721Implementation = address(new ContractNFT());
  }

  function getClones() public view returns (address[] memory) {
    return ERC721Clones;
  }

  function createClone(address _newOwner, uint256 _tokenId, string memory _uri) public onlyOwner returns (address clone) {
    address _clone = ClonesUpgradeable.clone(erc721Implementation);
    ContractNFT(_clone).initialize(_newOwner, erc721Implementation, _tokenId, _uri); // owned by this contract
    ContractNFT(_clone).transferOwnership(_newOwner);
    ERC721Clones.push(_clone);
    emit ERC721Created(_clone, erc721Implementation);
    return _clone;
  }

  function version() virtual public view returns (uint256 _version) {
    return 9;
  }
}
