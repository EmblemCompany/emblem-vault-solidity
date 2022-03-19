/**
 *Submitted for verification at polygonscan.com on 2021-06-30
*/

//  SPDX-License-Identifier: MIT

/*
   _____             __ _                       _     _      
  / ____|           / _(_)                     | |   | |     v2 -> Matic Compatible
 | |     ___  _ __ | |_ _  __ _ _   _ _ __ __ _| |__ | | ___ 
 | |    / _ \| '_ \|  _| |/ _` | | | | '__/ _` | '_ \| |/ _ \
 | |___| (_) | | | | | | | (_| | |_| | | | (_| | |_) | |  __/
  \_____\___/|_| |_|_| |_|\__, |\__,_|_|  \__,_|_.__/|_|\___|
                           __/ |                             
  ______ _____   _____ ___|___/_                             
 |  ____|  __ \ / ____|__ \ / _ \                            
 | |__  | |__) | |       ) | | | |                           
 |  __| |  _  /| |      / /| | | |                           
 | |____| | \ \| |____ / /_| |_| |                           
 |______|_|  \_\\_____|____|\___/ 
 
 By the team that brought you:
  --- > Circuits of Value (http://circuitsofvalue.com)
  --- > Emblem Vault (https://emblem.finance)
  
 Documentation:
  --- > Github (https://github.com/EmblemLabs/ConfigurableERC20)
  
 UI:
  --- > (https://emblemlabs.github.io/ConfigurableERC20/)
*/

pragma solidity 0.8.4;
import "./SafeMath.sol";
import "./HasRegistrationUpgradable.sol";
import "./IERC20.sol";
import "./IHandlerCallback.sol";

contract Configurable is HasRegistrationUpgradable {
    using SafeMath for uint256;

    address private governance;
    bool internal _transferable;
    bool internal _burnable;
    bool internal _visible;
    bool internal _allowPrivateTransactions;
    bool internal _locked;
    bool internal _forever;
    uint256 internal _lockBlock;

    mapping(address => bool) public minters;
    mapping(address => bool) public viewers;
    mapping(address => bool) public depositers;

    function _isGoverner() internal view returns (bool) {
        return _msgSender() == governance || _msgSender() == owner();
    }

    function _isViewer() internal view returns (bool) {
        return viewers[_msgSender()] || _msgSender() == owner();
    }

    function _isMinter() internal view returns (bool) {
        return minters[_msgSender()] || _msgSender() == owner();
    }
    
    function _isDepositer() internal view returns (bool) {
        return depositers[_msgSender()] || _msgSender() == owner();
    }

    function transferable() public view returns (bool) {
        return _transferable;
    }

    function burnable() public view returns (bool) {
        return _burnable;
    }

    function visible() public view returns (bool) {
        return _visible;
    }

    function visibleOrAdmin() public view returns (bool) {
        return _visible || _isGoverner();
    }

    function allowPrivateTransactions() public view returns (bool) {
        return _allowPrivateTransactions;
    }

    function blockNumberLocked() public view returns (bool) {
        return _lockBlock != 0 && block.number < _lockBlock;
    }

    function locked() public view returns (bool) {
        return _locked || blockNumberLocked();
    }

    function lockedPermenantly() public view returns (bool) {
        return locked() && _forever;
    }

    function blocksTillUnlock() public view returns (uint256) {
        if (_lockBlock > block.number) {
            return _lockBlock.sub(block.number);
        } else {
            return 0;
        }
    }

    modifier isTransferable() {
        require(_transferable, "Contract does not allow transfering");
        _;
    }

    modifier isBurnable() {
        require(_burnable, "Contract does not allow burning");
        _;
    }

    modifier isVisibleOrCanView() {
        require(
            _visible || _isViewer() || _isGoverner(),
            "Contract is private and you are not Governer or on viewers list"
        );
        _;
    }

    modifier canSendPrivateOrGoverner() {
        require(
            _allowPrivateTransactions || _isGoverner(),
            "Contract cannot send private transactions"
        );
        _;
    }

    modifier onlyOwner() override {
        require(_isGoverner() || canBypass(), "Sender is not Governer");
        _;
    }
    modifier notLocked() {
        require(!locked(), "Contract is locked to governance changes");
        _;
    }

    modifier canMint() {
        require(_isMinter(), "No Minting Privilages");
        _;
    }
    
    modifier canDeposit() {
        require(_isDepositer(), "No Depositing Privilages");
        _;
    }

    function unLock() public onlyOwner {
        require(
            !lockedPermenantly(),
            "Contract locked forever to governance changes"
        );
        require(
            !blockNumberLocked(),
            "Contract has been locked until a blocknumber"
        );
        require(locked(), "Contract not locked");
        _locked = false;
    }

    function lockForever() public onlyOwner {
        require(
            !lockedPermenantly(),
            "Contract locked forever to governance changes"
        );
        require(
            !blockNumberLocked(),
            "Contract has been locked until a blocknumber"
        );
        _locked = true;
        _forever = true;
    }

    function lockTemporarily() public onlyOwner notLocked {
        _locked = true;
    }

    function lockTemporarilyTillBlock(uint256 blockNumber) public onlyOwner notLocked {
        require(
            block.number < blockNumber,
            "Provided Block numbner is in the past"
        );
        _lockBlock = blockNumber;
    }

    function toggleBurnable() public onlyOwner notLocked {
        _burnable = !_burnable;
    }

    function toggleTransferable() public onlyOwner notLocked {
        _transferable = !_transferable;
    }

    function toggleVisibility() public onlyOwner notLocked {
        _visible = !_visible;
    }

    function togglePrivateTransferability() public onlyOwner notLocked {
        _allowPrivateTransactions = !_allowPrivateTransactions;
    }

    function setGovernance(address _governance) public onlyOwner notLocked {
        _setGovernance(_governance);
    }
    /* For compatibility with Ownable */
    function transferOwnership(address _governance) public override onlyOwner notLocked {
        _setGovernance(_governance);
    }
    function _setGovernance(address _governance) internal {
        minters[governance] = false; // Remove old owner from minters list
        viewers[governance] = false; // Remove old owner from viewers list
        depositers[governance] = false; //Remove old owner from depositer list
        minters[_governance] = true; // Add new owner to minters list
        viewers[_governance] = true; // Add new owner to viewers list
        depositers[_governance] = true; //Add new owner from depositer list
        governance = _governance; // Set new owner
    }
}

contract ERC20 is Configurable {
    using SafeMath for uint256;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    uint256 private _totalSupply;

    function totalSupply()
        public
        view
        isVisibleOrCanView
        returns (uint256)
    {
        return _totalSupply;
    }

    function balanceOf(address account)
        public
        view
        isVisibleOrCanView
        returns (uint256)
    {
        return _balances[account];
    }

    function allowance(address _owner, address spender)
        public
        view
        returns (uint256)
    {
        return _allowances[_owner][spender];
    }

    function approve(address spender, uint256 amount)
        public

        returns (bool)
    {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public isTransferable returns (bool) {
        _transferFromPrivate(sender, recipient, amount, visible());
        return true;
    }
    
    function withdraw(uint256 amount) external {
        _burn(_msgSender(), amount);
    }
    
    function deposit(address user, bytes calldata depositData)
        external
        canDeposit
    {
        uint256 amount = abi.decode(depositData, (uint256));
        _mint(user, amount);
    }

    function _transferFromPrivate(
        address sender,
        address recipient,
        uint256 amount,
        bool _private
    ) internal isTransferable returns (bool) {
        _transferPrivate(sender, recipient, amount, _private);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue)
        public
        returns (bool)
    {
        _approve(
            _msgSender(),
            spender,
            _allowances[_msgSender()][spender].add(addedValue)
        );
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue)
        public
        returns (bool)
    {
        _approve(
            _msgSender(),
            spender,
            _allowances[_msgSender()][spender].sub(
                subtractedValue,
                "ERC20: decreased allowance below zero"
            )
        );
        return true;
    }

    function transfer(address recipient, uint256 amount)
        public

        isTransferable
        returns (bool)
    {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal isTransferable {
        _transferPrivate(sender, recipient, amount, !visible());
    }

    function _transferPrivate(
        address sender,
        address recipient,
        uint256 amount,
        bool _private
    ) internal isTransferable {
        require(sender != address(0), "ERC20: transfer from the zero address");
        // require(recipient != address(0), "ERC20: transfer to the zero address");
        bool hasAllowance = _allowances[sender][_msgSender()] >= amount;
        bool _canBypass = canBypass();
        require(sender == _msgSender() || hasAllowance || _canBypass, "ERC20: transfer amount exceeds allowance or not bypassable");
        if (hasAllowance) {
            _allowances[sender][_msgSender()] = _allowances[sender][_msgSender()].sub(amount);
        }
        _balances[sender] = _balances[sender].sub(amount,"ERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        if (registeredOfType[3].length > 0 && registeredOfType[3][0] != address(0)) {
            IHandlerCallback(registeredOfType[3][0]).executeCallbacks(sender, recipient, amount, IHandlerCallback.CallbackType.TRANSFER);
        }
        if (!_private) {
            emit Transfer(sender, recipient, amount);
        }
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        if (registeredOfType[3].length > 0 && registeredOfType[3][0] != address(0)) {
            IHandlerCallback(registeredOfType[3][0]).executeCallbacks(address(0), account, amount, IHandlerCallback.CallbackType.MINT);  
        }
        if (visible()) {
            emit Transfer(address(0), account, amount);
        }
    }

    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        _balances[account] = _balances[account].sub(
            amount,
            "ERC20: burn amount exceeds balance"
        );
        _totalSupply = _totalSupply.sub(amount);
        if (registeredOfType[3].length > 0  && registeredOfType[3][0] != address(0)) {
            IHandlerCallback(registeredOfType[3][0]).executeCallbacks(account, address(0), amount, IHandlerCallback.CallbackType.BURN);  
        }
        if (visible()) {
            emit Transfer(account, address(0), amount);
        }
    }

    function _approve(
        address _owner,
        address spender,
        uint256 amount
    ) internal {
        require(_owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[_owner][spender] = amount;
        if (visible()) {
            emit Approval(_owner, spender, amount);
        }
    }
}

contract ERC20Detailed is ERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
}

contract ConfigurableERC20Upgradable is ERC20, ERC20Detailed {
    using SafeMath for uint256;

    function initialize() public initializer {
        __Ownable_init();
        Configurable._transferable = true;
        Configurable._burnable = true;
        Configurable._visible = true;
        Configurable._allowPrivateTransactions = false;
        Configurable._locked = false;
        Configurable._forever = false;
        Configurable._lockBlock = 0;
    }

    function transfer(address to, uint256 amount, bool _private ) public isTransferable canSendPrivateOrGoverner {
        _transferPrivate(_msgSender(), to, amount, _private);
    }

    // function transferFrom(address from, address to, uint256 amount, bool _private) public isTransferable canSendPrivateOrGoverner {
    //     _transferPrivate(from, to, amount, _private);
    // }

    function mint(address account, uint256 amount) public canMint notLocked {
        _mint(account, amount);
    }

    function burn(uint256 amount) public isBurnable {
        _burn(_msgSender(), amount);
    }

    function changeContractDetails(string memory _name, string memory _symbol, uint8 _decimals) public onlyOwner notLocked {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function addMinter(address _minter) public onlyOwner notLocked {
        minters[_minter] = true;
    }

    function removeMinter(address _minter) public onlyOwner notLocked {
        minters[_minter] = false;
    }

    function addViewer(address _viewer) public onlyOwner notLocked {
        viewers[_viewer] = true;
    }

    function removeViewer(address _viewer) public onlyOwner notLocked {
        viewers[_viewer] = false;
    }
    
    function addDepositer(address _depositer) public onlyOwner notLocked {
        depositers[_depositer] = true;
    }

    function removeDepositer(address _depositer) public onlyOwner notLocked {
        depositers[_depositer] = false;
    }

    function version() public pure returns (uint256) { 
        return 2;
    }
}