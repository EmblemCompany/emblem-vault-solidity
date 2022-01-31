// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.4;
//import 'hardhat/console.sol';
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./VaultHandlerV8.sol";
import "./NFTStake.sol";

contract Factory is OwnableUpgradeable {
  event HandlerAdded(address indexed sender, address indexed receiver, address handler);
  event ERC20Added(address indexed sender, address indexed receiver, address erc20);
  event ClaimerAdded(address indexed sender, address indexed receiver, address claimer);
  event BalanceAdded(address indexed sender, address indexed receiver, address balancer);
  event EmblemAdded(address indexed sender, address indexed receiver, address emblem);
  event TradeV2Added(address indexed sender, address indexed receiver, address trader);
  event TradeV3Added(address indexed sender, address indexed receiver, address trader);
  address public immutable emblemImplementation;
  address public immutable erc1155Implementation;
  address public erc20Implementation;
  address public immutable storageImplementation;
  address public immutable stakeImplementation;
  address public immutable balanceStorageImplementation;
  address public claimedImplementation;
  address public balanceImplementation;

  constructor() {
    emblemImplementation = address(new EmblemVault());
    erc20Implementation = address(new ConfigurableERC20());
    erc1155Implementation = address(new ERC1155("base.url"));
    storageImplementation = address(new Storage());
    balanceStorageImplementation = address(new BalanceStorage());
    stakeImplementation = address(new NFTStake());
    __Ownable_init();
  }
  function genesisHandler(address _receiver, address _nftAddress, address _paymentAddress, address _recipientAddress, uint256 _price) external payable returns (address) {
    VaultHandlerV8 token = new VaultHandlerV8(_nftAddress, _paymentAddress, _recipientAddress, _price);
    
    token.transferOwnership(payable(_receiver));
    if (msg.value > 0) {
      (bool sent, ) = payable(_receiver).call{value: msg.value}("");
      require(sent, "1");
    }
    emit HandlerAdded(_msgSender(), _receiver, address(token));
    EmblemVault(emblemImplementation).transferOwnership(address(token));
    ERC1155(erc1155Implementation).transferOwnership(address(_receiver));
    return address(token);
  }
  function genesisERC20(address _receiver) external payable returns (address) {
    ConfigurableERC20 token = new ConfigurableERC20();
    token.transferOwnership(payable(_receiver));
    if (msg.value > 0) {
      (bool sent, ) = payable(_receiver).call{value: msg.value}("");
      require(sent, "1");
    }
    emit ERC20Added(_msgSender(), _receiver, address(token));
    erc20Implementation = address(token);
    return address(token);
  }
  function genesisTradeV2(address _receiver, address _paymentAddress, address _recipientAddress) external payable returns (address) {
    NFTrade_v2 token = new NFTrade_v2(_paymentAddress, _recipientAddress);
    
    token.transferOwnership(payable(_receiver));
    if (msg.value > 0) {
      (bool sent, ) = payable(_receiver).call{value: msg.value}("");
      require(sent, "1");
    }
    emit TradeV2Added(_msgSender(), _receiver, address(token));
    return address(token);
  }
  function genesisTradeV3(address _receiver, address _paymentAddress, address _recipientAddress) external payable returns (address) {
    NFTrade_v3 token = new NFTrade_v3(_paymentAddress, _recipientAddress);
    
    token.transferOwnership(payable(_receiver));
    if (msg.value > 0) {
      (bool sent, ) = payable(_receiver).call{value: msg.value}("");
      require(sent, "1");
    }
    emit TradeV3Added(_msgSender(), _receiver, address(token));
    return address(token);
  }

  function genesisClaimed(address _receiver) external payable returns (address) {
    Claimed token = new Claimed(storageImplementation);
    token.transferOwnership(payable(_receiver));
    claimedImplementation = address(token);    
    Storage storageContract = Storage(storageImplementation);
    storageContract.transferOwnership(_receiver);
    if (msg.value > 0) {
      (bool sent, ) = payable(msg.sender).call{value: msg.value}("");
      require(sent, "1");
    }
    emit ClaimerAdded(_msgSender(), _receiver, address(token));
    return address(token);
  }

  function genesisEmblem(address _receiver) external payable returns (address) {
    EmblemVault token = new EmblemVault();
    token.transferOwnership(payable(_receiver));
    if (msg.value > 0) {
      (bool sent, ) = payable(msg.sender).call{value: msg.value}("");
      require(sent, "1");
    }
    emit EmblemAdded(_msgSender(), _receiver, address(token));
    return address(token);
  }

  function genesisBalance(address _receiver) external payable returns (address) {
    Balance balance = new Balance(balanceStorageImplementation);
    balance.transferOwnership(payable(_receiver));
    balanceImplementation = address(balance);    
    Storage storageContract = Storage(balanceStorageImplementation);
    storageContract.transferOwnership(_receiver);
    if (msg.value > 0) {
      (bool sent, ) = payable(msg.sender).call{value: msg.value}("");
      require(sent, "1");
    }
    emit BalanceAdded(_msgSender(), _receiver, address(balance));
    return address(balance);
  }
}
