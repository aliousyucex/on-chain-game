// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract WithdrawContract is Ownable, ReentrancyGuard {
    
    // User balances - tracks their actual withdrawable amounts
    mapping(address => uint256) public userBalances;
    
    // Optional: Track if user is allowed to deposit/withdraw (for admin control)
    mapping(address => bool) public isWhitelisted;
    bool public whitelistEnabled = false; // Can be toggled by admin
    
    // Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event BalanceUpdated(address indexed user, uint256 newBalance, string reason);
    event UserWhitelisted(address indexed user, bool status);
    event WhitelistToggled(bool enabled);
    
    // Modifiers
    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        require(_addr != address(this), "Cannot be contract address");
        _;
    }
    
    modifier onlyWhitelistedIfEnabled() {
        if (whitelistEnabled) {
            require(isWhitelisted[msg.sender], "User not whitelisted");
        }
        _;
    }
    
    constructor() {}
    
    /**
     * @dev Deposit function - users send money to contract
     * Single transaction, no confirmation needed
     */
    function deposit() external payable onlyWhitelistedIfEnabled {
        require(msg.value > 0, "Must send some ETH");
        
        userBalances[msg.sender] += msg.value;
        
        emit Deposited(msg.sender, msg.value);
        emit BalanceUpdated(msg.sender, userBalances[msg.sender], "Deposit");
    }
    
    /**
     * @dev Withdraw function - simplified without merkle proof
     * @param amount Amount to withdraw (can be partial)
     */
    function withdraw(uint256 amount) 
        external 
        nonReentrant 
        validAddress(msg.sender)
        onlyWhitelistedIfEnabled
    {
        require(amount > 0, "Amount must be greater than 0");
        require(userBalances[msg.sender] >= amount, "Insufficient user balance");
        require(address(this).balance >= amount, "Contract insufficient balance");
        
        // Update user balance before transfer (CEI pattern)
        userBalances[msg.sender] -= amount;
        
        // Transfer funds
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
        emit BalanceUpdated(msg.sender, userBalances[msg.sender], "Withdrawal");
    }
    
    /**
     * @dev Update user balance (only admin) - for wins/losses/adjustments
     */
    function updateUserBalance(
        address user, 
        uint256 newBalance, 
        string calldata reason
    ) external onlyOwner validAddress(user) {
        userBalances[user] = newBalance;
        emit BalanceUpdated(user, newBalance, reason);
    }
    
    /**
     * @dev Batch update user balances (gas efficient)
     */
    function batchUpdateBalances(
        address[] calldata users,
        uint256[] calldata newBalances,
        string calldata reason
    ) external onlyOwner {
        require(users.length == newBalances.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid address in batch");
            userBalances[users[i]] = newBalances[i];
            emit BalanceUpdated(users[i], newBalances[i], reason);
        }
    }
    
    /**
     * @dev Whitelist management (optional feature)
     */
    function setWhitelistStatus(address user, bool status) external onlyOwner validAddress(user) {
        isWhitelisted[user] = status;
        emit UserWhitelisted(user, status);
    }
    
    function toggleWhitelist(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
        emit WhitelistToggled(enabled);
    }
    
    function batchWhitelist(address[] calldata users, bool status) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid address in batch");
            isWhitelisted[users[i]] = status;
            emit UserWhitelisted(users[i], status);
        }
    }
    
    /**
     * @dev Get user's current withdrawable balance
     */
    function getWithdrawableBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }
    
    /**
     * @dev Check if user can withdraw specific amount
     */
    function canWithdraw(address user, uint256 amount) external view returns (bool) {
        if (whitelistEnabled && !isWhitelisted[user]) return false;
        return userBalances[user] >= amount && amount > 0;
    }
    
    /**
     * @dev Get user statistics
     */
    function getUserStats(address user) external view returns (
        uint256 balance,
        bool canWithdrawAny,
        bool whitelisted
    ) {
        balance = userBalances[user];
        canWithdrawAny = balance > 0 && (!whitelistEnabled || isWhitelisted[user]);
        whitelisted = isWhitelisted[user];
    }
    
    /**
     * @dev Emergency withdrawal for contract owner
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // Fallback functions
    receive() external payable {
        // deposit();
    }
    
    fallback() external payable {
        revert("Fallback function not supported");
    }
} 