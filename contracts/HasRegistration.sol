// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;
import "./IsBypassable.sol";

contract HasRegistration is IsBypassable {

    mapping(address => uint256) public registeredContracts; // 0 EMPTY, 1 ERC1155, 2 ERC721, 3 HANDLER, 4 ERC20, 5 BALANCE, 6 CLAIM, 7 UNKNOWN, 8 FACTORY, 9 STAKING, 10 BYPASS
    mapping(uint256 => address[]) public registeredOfType;
    
    uint256 public contractCount;

    modifier isRegisteredContract(address _contract) {
        require(registeredContracts[_contract] > 0, "Contract is not registered");
        _;
    }

    modifier isRegisteredContractOrOwner(address _contract) {
        require(registeredContracts[_contract] > 0 || owner() == _msgSender(), "Contract is not registered nor Owner");
        _;
    }

    function registerContract(address _contract, uint _type) public isRegisteredContractOrOwner(_msgSender()) {
        contractCount++;
        registeredContracts[_contract] = _type;
        registeredOfType[_type].push(_contract);
    }

    function unregisterContract(address _contract, uint256 index) public onlyOwner isRegisteredContract(_contract) {
        require(contractCount > 0, 'No vault contracts to remove');
        address[] storage arr = registeredOfType[registeredContracts[_contract]];
        arr[index] = arr[arr.length - 1];
        arr.pop();
        delete registeredContracts[_contract];
        contractCount--;
    }

    function isRegistered(address _contract, uint256 _type) public view returns (bool) {
        return registeredContracts[_contract] == _type;
    }

    function getAllRegisteredContractsOfType(uint256 _type) public view returns (address[] memory) {
        return registeredOfType[_type];
    }
}