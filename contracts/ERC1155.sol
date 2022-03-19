pragma solidity 0.8.4;
import "@openzeppelin/contracts/utils/Strings.sol";
import "./SafeMath.sol";
import "./IERC1155.sol";
import "./ERC165.sol";
import "./IHandlerCallback.sol";
import "./IsSerialized.sol";
import "./BytesLib.sol";

contract ERC1155 is ERC165, IERC1155MetadataURI, IsSerialized {
    using SafeMath for uint256;

    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);

    mapping (uint256 => mapping(address => uint256)) private _balances;
    mapping (address => mapping(address => bool)) private _operatorApprovals;

    bool initialized;
    string private _uri;
    
    constructor () {
        init();
    }

    function init() public {
        __Ownable_init();
        _registerInterface(0xd9b67a26); //_INTERFACE_ID_ERC1155
        _registerInterface(0x0e89341c); //_INTERFACE_ID_ERC1155_METADATA_URI
        initializeERC165();
        _uri = "https://api.emblemvault.io/s:evmetadata/meta/";
        serialized = true;
        overloadSerial = true;
        initialized = true;
    }

    function mint(address _to, uint256 _tokenId, uint256 _amount) public onlyOwner {
        bytes memory empty = abi.encodePacked(uint256(0));
        mintWithSerial(_to, _tokenId, _amount, empty);
    }

    function mintWithSerial(address _to, uint256 _tokenId, uint256 _amount, bytes memory serialNumber) public onlyOwner {
        _mint(_to, _tokenId, _amount, serialNumber);
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes[] memory serialNumbers) public onlyOwner {
        _mintBatch(to, ids, amounts, serialNumbers);
    }

    function burn(address _from, uint256 _tokenId, uint256 _amount) public {
        require(_from == _msgSender() || isApprovedForAll(_from, _msgSender()), 'Not Approved to burn');
        _burn(_from, _tokenId, _amount);
    }

    function burnBatch(address account, uint256[] memory ids, uint256[] memory amounts) public {
        require(account == _msgSender() || isApprovedForAll(account, _msgSender()), 'Not Approved to burn');
        _burnBatch(account, ids, amounts);
    }

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }
    
    function uri(uint256 _tokenId) external view override returns (string memory) {
        return string(abi.encodePacked(_uri, Strings.toString(_tokenId)));
    }
    
    function balanceOf(address account, uint256 id) public view returns (uint256) {
        require(account != address(0), "ERC1155: balance query for the zero address");
        return _balances[id][account];
    }
    
    function balanceOfBatch(address[] memory accounts, uint256[] memory ids) public view returns (uint256[] memory) {
        require(accounts.length == ids.length, "ERC1155: accounts and ids length mismatch");

        uint256[] memory batchBalances = new uint256[](accounts.length);

        for (uint256 i = 0; i < accounts.length; ++i) {
            require(accounts[i] != address(0), "ERC1155: batch balance query for the zero address");
            batchBalances[i] = _balances[ids[i]][accounts[i]];
        }

        return batchBalances;
    }
    
    function setApprovalForAll(address operator, bool approved) public virtual {
        require(_msgSender() != operator, "ERC1155: setting approval status for self");

        _operatorApprovals[_msgSender()][operator] = approved;
        emit ApprovalForAll(_msgSender(), operator, approved);
    }
    
    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }
    
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) public virtual {
        bool canBypass = canBypassForTokenId(id);
        require(to != address(0), "ERC1155: transfer to the zero address");
        require(from == _msgSender() || isApprovedForAll(from, _msgSender()) || canBypass, "ERC1155: caller is not owner nor approved nor bypasser");

        address operator = _msgSender();

        _beforeTokenTransfer(operator, from, to, _asSingletonArray(id), _asSingletonArray(amount), data);

        _balances[id][from] = _balances[id][from].sub(amount, "ERC1155: insufficient balance for transfer");
        _balances[id][to] = _balances[id][to].add(amount);

        if (isSerialized()) {
            for (uint i = 0; i < amount; i++) {            
                uint256 serialNumber = getFirstSerialByOwner(from, id);
                if (serialNumber != 0 ) {
                    transferSerial(serialNumber, from, to);
                }
            }
        }

        emit TransferSingle(operator, from, to, id, amount);

        _doSafeTransferAcceptanceCheck(operator, from, to, id, amount, data);
        if (registeredOfType[3].length > 0 && registeredOfType[3][0] != address(0)) {
            for (uint i = 0; i < amount; i++) {
                IHandlerCallback(registeredOfType[3][0]).executeCallbacks(from, to, id, IHandlerCallback.CallbackType.TRANSFER);
            }
        }
    }
    
    function safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public virtual {
        require(ids.length == amounts.length, "ERC1155: ids and amounts length mismatch");
        require(to != address(0), "ERC1155: transfer to the zero address");
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: transfer caller is not owner nor approved"
        );

        address operator = _msgSender();

        _beforeTokenTransfer(operator, from, to, ids, amounts, data);

        for (uint256 i = 0; i < ids.length; ++i) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            safeTransferFrom(from, to, id, amount, data);
        }

        emit TransferBatch(operator, from, to, ids, amounts);

        _doSafeBatchTransferAcceptanceCheck(operator, from, to, ids, amounts, data);
    }

    function _setURI(string memory newuri) internal virtual {
        _uri = newuri;
    }

    function _mint(address account, uint256 id, uint256 amount, bytes memory serialNumber) internal virtual {
        require(account != address(0), "ERC1155: mint to the zero address");
        address operator = _msgSender();
        _beforeTokenTransfer(operator, address(0), account, _asSingletonArray(id), _asSingletonArray(amount), "");

        _balances[id][account] = _balances[id][account].add(amount);
        if (isSerialized()) {
            for (uint i = 0; i < amount; i++) {
                if (overloadSerial){
                    require(BytesLib.toUint256(serialNumber, 0) != 0, "Must provide serial number");
                    uint256 _serialNumber = amount > 1?  decodeUintArray(abi.encodePacked(serialNumber))[i]: decodeSingle(abi.encodePacked(serialNumber));
                    mintSerial(_serialNumber, account, id);
                } else {
                    mintSerial(id, account);
                }
            }            
        }
        if (registeredOfType[3].length > 0 && registeredOfType[3][0] == _msgSender()) {
            for (uint i = 0; i < amount; i++) {
                IHandlerCallback(_msgSender()).executeCallbacks(address(0), account, id, IHandlerCallback.CallbackType.MINT);
            }
        }
        emit TransferSingle(operator, address(0), account, id, amount);

        _doSafeTransferAcceptanceCheck(operator, address(0), account, id, amount, "");
    }

    function _mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes[] memory serialNumbers) internal virtual {
        require(to != address(0), "ERC1155: mint to the zero address");
        require(ids.length == amounts.length, "ERC1155: ids and amounts length mismatch");

        address operator = _msgSender();

        _beforeTokenTransfer(operator, address(0), to, ids, amounts, "");

        for (uint i = 0; i < ids.length; i++) {
            bytes memory _serialNumber = amounts[i] > 1? abi.encode(decodeUintArray(serialNumbers[i])) : serialNumbers[i];
            _mint(to, ids[i], amounts[i], _serialNumber);
        }

        emit TransferBatch(operator, address(0), to, ids, amounts);

        _doSafeBatchTransferAcceptanceCheck(operator, address(0), to, ids, amounts, "");
    }

    function _burn(address account, uint256 id, uint256 amount) internal virtual {
        require(account != address(0), "ERC1155: burn from the zero address");

        address operator = _msgSender();

        _beforeTokenTransfer(operator, account, address(0), _asSingletonArray(id), _asSingletonArray(amount), "");

        _balances[id][account] = _balances[id][account].sub(
            amount,
            "ERC1155: burn amount exceeds balance"
        );

        if (isSerialized()) {
            uint256 serialNumber = getFirstSerialByOwner(account, id);
            if (serialNumber != 0 ) {
                transferSerial(serialNumber, account, address(0));
            }
        }
        if (registeredOfType[3].length > 0 && registeredOfType[3][0] != address(0)) {
            IHandlerCallback(registeredOfType[3][0]).executeCallbacks(account, address(0), id, IHandlerCallback.CallbackType.BURN);
        }

        emit TransferSingle(operator, account, address(0), id, amount);
    }

    function _burnBatch(address account, uint256[] memory ids, uint256[] memory amounts) internal virtual {
        require(account != address(0), "ERC1155: burn from the zero address");
        require(ids.length == amounts.length, "ERC1155: ids and amounts length mismatch");

        address operator = _msgSender();

        _beforeTokenTransfer(operator, account, address(0), ids, amounts, "");

        for (uint i = 0; i < ids.length; i++) {
            _burn(account, ids[i], amounts[i]);
        }

        emit TransferBatch(operator, account, address(0), ids, amounts);
    }
    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) internal virtual { }
    function _doSafeTransferAcceptanceCheck(address operator, address from, address to, uint256 id, uint256 amount, bytes memory data) private {
        if (isContract(to)) {
            try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, data) returns (bytes4 response) {
                if (response != IERC1155Receiver(to).onERC1155Received.selector) {
                    revert("ERC1155: ERC1155Receiver rejected tokens");
                }
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert("ERC1155: transfer to non ERC1155Receiver implementer");
            }
        }
    }
    function isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    function _doSafeBatchTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    )
        private
    {
        if (isContract(to)) {
            try IERC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, amounts, data) returns (bytes4 response) {
                if (response != IERC1155Receiver(to).onERC1155BatchReceived.selector) {
                    revert("ERC1155: ERC1155Receiver rejected tokens");
                }
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert("ERC1155: transfer to non ERC1155Receiver implementer");
            }
        }
    }

    function _asSingletonArray(uint256 element) private pure returns (uint256[] memory) {
        uint256[] memory array = new uint256[](1);
        array[0] = element;

        return array;
    }
}
