const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// CORS configuration - Allow frontend to connect
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3002',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json());

// Basic health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: 'PvE Game Backend API is running!', 
        timestamp: new Date().toISOString(),
        network: process.env.REACT_APP_NETWORK_NAME || 'abstract-testnet'
    });
});

// Smart contract setup
const contractAddress = process.env.CONTRACT_ADDRESS;
const contractABI = [
    "function deposit() external payable",
    "function withdraw(uint256 amount) external",
    "function getWithdrawableBalance(address user) external view returns (uint256)",
    "function getUserStats(address user) external view returns (uint256 balance, bool canWithdrawAny, bool whitelisted)",
    "function canWithdraw(address user, uint256 amount) external view returns (bool)",
    "function whitelistEnabled() external view returns (bool)",
    "function updateUserBalance(address user, uint256 newBalance, string calldata reason) external",
    "function batchUpdateBalances(address[] calldata users, uint256[] calldata newBalances, string calldata reason) external",
    "function setWhitelistStatus(address user, bool status) external",
    "function toggleWhitelist(bool enabled) external",
    "function getContractBalance() external view returns (uint256)"
];

let provider, adminWallet, contract;

// Initialize blockchain connection
try {
    const rpcUrl = process.env.RPC_URL || process.env.ABSTRACT_TESTNET_RPC_URL;
    if (!rpcUrl) {
        console.warn('⚠️  WARNING: No RPC_URL found in environment variables');
        provider = null;
    } else {
        provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        console.log('✅ Connected to RPC:', rpcUrl);
    }

    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) {
        console.warn('⚠️  WARNING: No ADMIN_PRIVATE_KEY found in environment variables');
        adminWallet = null;
    } else {
        adminWallet = new ethers.Wallet(adminPrivateKey, provider);
        console.log('✅ Admin wallet loaded:', adminWallet.address);
    }

    if (!contractAddress) {
        console.warn('⚠️  WARNING: No CONTRACT_ADDRESS found in environment variables');
        console.warn('   Deploy a contract first with: npm run deploy:contracts:abstract-testnet');
        contract = null;
    } else {
        contract = new ethers.Contract(contractAddress, contractABI, adminWallet);
        console.log('✅ Contract connected:', contractAddress);
    }
} catch (error) {
    console.error('❌ Blockchain connection error:', error.message);
    provider = null;
    adminWallet = null;
    contract = null;
}

/**
 * Verify and confirm deposit (optional backend verification)
 * POST /api/verify-deposit
 * Body: { userAddress, transactionHash }
 */
app.post('/api/verify-deposit', async (req, res) => {
    try {
        if (!provider) {
            return res.status(500).json({ error: 'Blockchain connection not available' });
        }

        const { userAddress, transactionHash } = req.body;

        // Validate input
        if (!ethers.utils.isAddress(userAddress)) {
            return res.status(400).json({ error: 'Invalid user address' });
        }

        if (!transactionHash) {
            return res.status(400).json({ error: 'Transaction hash required' });
        }

        // Verify transaction on blockchain
        const txReceipt = await provider.getTransactionReceipt(transactionHash);
        
        if (!txReceipt) {
            return res.status(400).json({ error: 'Transaction not found' });
        }

        if (txReceipt.to.toLowerCase() !== contractAddress.toLowerCase()) {
            return res.status(400).json({ error: 'Transaction not sent to contract' });
        }

        if (txReceipt.status !== 1) {
            return res.status(400).json({ error: 'Transaction failed' });
        }

        // Get deposit event from logs
        const depositEvent = txReceipt.logs.find(log => {
            try {
                const parsedLog = contract.interface.parseLog(log);
                return parsedLog.name === 'Deposited' && 
                       parsedLog.args.user.toLowerCase() === userAddress.toLowerCase();
            } catch {
                return false;
            }
        });

        if (!depositEvent) {
            return res.status(400).json({ error: 'No deposit event found for this user' });
        }

        const parsedEvent = contract.interface.parseLog(depositEvent);
        const depositAmount = parsedEvent.args.amount;

        console.log(`✅ Deposit verified for ${userAddress}: ${ethers.utils.formatEther(depositAmount)} ETH`);

        res.json({
            success: true,
            message: 'Deposit verified successfully',
            data: {
                userAddress,
                depositAmount: depositAmount.toString(),
                depositAmountETH: ethers.utils.formatEther(depositAmount),
                transactionHash,
                blockNumber: txReceipt.blockNumber,
                gasUsed: txReceipt.gasUsed.toString()
            }
        });

    } catch (error) {
        console.error('Deposit verification error:', error);
        res.status(500).json({ 
            error: 'Failed to verify deposit',
            details: error.message 
        });
    }
});

/**
 * 
 * 
 * TODO: This should be encrypted jwt token, users should not be able to update their own balance
 * 
 * 
 * Update user balance (for wins/losses)
 * POST /api/update-balance
 * Body: { userAddress, newBalance, reason }
 */
app.post('/api/update-balance', async (req, res) => {
    try {
        if (!contract) {
            return res.status(500).json({ error: 'Contract not available' });
        }

        const { userAddress, newBalance, reason } = req.body;

        // Validate input
        if (!ethers.utils.isAddress(userAddress)) {
            return res.status(400).json({ error: 'Invalid user address' });
        }

        if (!newBalance || ethers.BigNumber.from(newBalance).lt(0)) {
            return res.status(400).json({ error: 'Invalid balance amount' });
        }

        const reasonText = reason || 'Balance adjustment';

        // Update contract balance
        const updateBalanceTx = await contract.updateUserBalance(userAddress, newBalance, reasonText);
        await updateBalanceTx.wait();

        console.log(`💰 Balance updated for ${userAddress}: ${ethers.utils.formatEther(newBalance)} ETH (${reasonText})`);

        res.json({
            success: true,
            message: 'Balance updated successfully',
            data: {
                userAddress,
                newBalance,
                newBalanceETH: ethers.utils.formatEther(newBalance),
                reason: reasonText,
                transactionHash: updateBalanceTx.hash
            }
        });

    } catch (error) {
        console.error('Balance update error:', error);
        res.status(500).json({ 
            error: 'Failed to update balance',
            details: error.message 
        });
    }
});

/**
 * 
 * 
 * TODO: This should be encrypted jwt token, users should not be able to update their own balance
 * 
 * 
 * Update user balance (for wins/losses)
 * POST /api/update-balance
 * Body: { userAddress, newBalance, reason }
 */
app.post('/api/user-lose-game', async (req, res) => {
    try {
        if (!contract) {
            return res.status(500).json({ error: 'Contract not available' });
        }

        const { userAddress, betAmount} = req.body;

        // Validate input
        if (!ethers.utils.isAddress(userAddress)) {
            return res.status(400).json({ error: 'Invalid user address' });
        }
        
        const userBalance = await contract.getWithdrawableBalance(userAddress);


        console.log('betAmount', betAmount);
        console.log('userBalance', userBalance);

        if (!betAmount || ethers.BigNumber.from(betAmount).lt(0)) {
            return res.status(400).json({ error: 'Invalid bet amount' });
        }

        // Convert betAmount to BigNumber if it's not already
        const betAmountBN = ethers.BigNumber.isBigNumber(betAmount) 
            ? betAmount 
            : ethers.BigNumber.from(betAmount);

        // Use BigNumber arithmetic
        const newBalance = userBalance.sub(betAmountBN);

        // Validate that balance doesn't go negative
        if (newBalance.lt(0)) {
            return res.status(400).json({ error: 'Insufficient balance for this bet' });
        }

        // Update contract balance
        const updateBalanceTx = await contract.updateUserBalance(userAddress, newBalance, 'Game lose');
        await updateBalanceTx.wait();

        console.log(`💰 Balance updated for ${userAddress}: ${ethers.utils.formatEther(newBalance)} ETH (Game lose)`);

        res.json({
            success: true,
            message: 'Balance updated successfully',
            data: {
                userAddress,
                newBalanceETH: ethers.utils.formatEther(newBalance),
                reason: 'Game lose',
                transactionHash: updateBalanceTx.hash
            }
        });

    } catch (error) {
        console.error('Balance update error:', error);
        res.status(500).json({ 
            error: 'Failed to update balance',
            details: error.message 
        });
    }
});

/**
 * 
 * 
 * TODO: This should be encrypted jwt token, users should not be able to update their own balance
 * 
 * 
 * Update user balance (for wins/losses)
 * POST /api/update-balance
 * Body: { userAddress, newBalance, reason }
 */
app.post('/api/user-win-game', async (req, res) => {
    try {
        if (!contract) {
            return res.status(500).json({ error: 'Contract not available' });
        }

        const { userAddress, betAmount} = req.body;

        // Validate input
        if (!ethers.utils.isAddress(userAddress)) {
            return res.status(400).json({ error: 'Invalid user address' });
        }
        
        const userBalance = await contract.getWithdrawableBalance(userAddress);

        if (!betAmount || ethers.BigNumber.from(betAmount).lt(0)) {
            return res.status(400).json({ error: 'Invalid bet amount' });
        }

        // Convert betAmount to BigNumber if it's not already
        const betAmountBN = ethers.BigNumber.isBigNumber(betAmount) 
            ? betAmount 
            : ethers.BigNumber.from(betAmount);

        // Use BigNumber arithmetic
        const newBalance = userBalance.add(betAmountBN);

        // Validate that balance doesn't go negative
        if (newBalance.lt(0)) {
            return res.status(400).json({ error: 'Insufficient balance for this bet' });
        }

        // Update contract balance
        const updateBalanceTx = await contract.updateUserBalance(userAddress, newBalance, 'Game Win');
        await updateBalanceTx.wait();

        console.log(`💰 Balance updated for ${userAddress}: ${ethers.utils.formatEther(newBalance)} ETH (Game Win)`);

        res.json({
            success: true,
            message: 'Balance updated successfully',
            data: {
                userAddress,
                newBalanceETH: ethers.utils.formatEther(newBalance),
                reason: 'Game Win',
                transactionHash: updateBalanceTx.hash
            }
        });

    } catch (error) {
        console.error('Balance update error:', error);
        res.status(500).json({ 
            error: 'Failed to update balance',
            details: error.message 
        });
    }
});

/**
 * Batch update user balances (gas efficient)
 * POST /api/batch-update-balances
 * Body: { updates: [{ userAddress, newBalance }], reason }
 */
app.post('/api/batch-update-balances', async (req, res) => {
    try {
        if (!contract) {
            return res.status(500).json({ error: 'Contract not available' });
        }

        const { updates, reason } = req.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: 'Updates array is required' });
        }

        if (updates.length > 100) {
            return res.status(400).json({ error: 'Too many updates (max 100)' });
        }

        const reasonText = reason || 'Batch balance update';
        const addresses = [];
        const balances = [];

        // Validate and prepare data
        for (const update of updates) {
            if (!ethers.utils.isAddress(update.userAddress)) {
                return res.status(400).json({ 
                    error: `Invalid address: ${update.userAddress}` 
                });
            }

            if (!update.newBalance || ethers.BigNumber.from(update.newBalance).lt(0)) {
                return res.status(400).json({ 
                    error: `Invalid balance for ${update.userAddress}` 
                });
            }

            addresses.push(update.userAddress);
            balances.push(update.newBalance);
        }

        // Batch update contract balances
        const batchUpdateTx = await contract.batchUpdateBalances(addresses, balances, reasonText);
        await batchUpdateTx.wait();

        console.log(`📦 Batch balance update completed: ${updates.length} users (${reasonText})`);

        res.json({
            success: true,
            message: `Batch balance update completed for ${updates.length} users`,
            data: {
                updatedCount: updates.length,
                reason: reasonText,
                transactionHash: batchUpdateTx.hash
            }
        });

    } catch (error) {
        console.error('Batch balance update error:', error);
        res.status(500).json({ 
            error: 'Failed to batch update balances',
            details: error.message 
        });
    }
});

/**
 * Get user status with detailed info
 * GET /api/user-status/:userAddress
 */
app.get('/api/user-status/:userAddress', async (req, res) => {
    try {
        if (!contract) {
            return res.status(500).json({ error: 'Contract not available' });
        }

        const { userAddress } = req.params;

        if (!ethers.utils.isAddress(userAddress)) {
            return res.status(400).json({ error: 'Invalid user address' });
        }

        const contractBalance = await contract.getWithdrawableBalance(userAddress);
        const userStats = await contract.getUserStats(userAddress);
        const canWithdrawAmount = await contract.canWithdraw(userAddress, contractBalance);

        res.json({
            success: true,
            data: {
                userAddress,
                balance: contractBalance.toString(),
                balanceETH: ethers.utils.formatEther(contractBalance),
                canWithdrawAny: userStats.canWithdrawAny,
                isWhitelisted: userStats.whitelisted,
                canWithdrawFull: canWithdrawAmount && contractBalance.gt(0)
            }
        });

    } catch (error) {
        console.error('User status error:', error);
        res.status(500).json({ 
            error: 'Failed to get user status',
            details: error.message 
        });
    }
});

/**
 * Whitelist management - Set user whitelist status
 * POST /api/admin/whitelist-user
 * Body: { userAddress, whitelisted }
 */
app.post('/api/admin/whitelist-user', async (req, res) => {
    try {
        if (!contract) {
            return res.status(500).json({ error: 'Contract not available' });
        }

        const { userAddress, whitelisted } = req.body;

        if (!ethers.utils.isAddress(userAddress)) {
            return res.status(400).json({ error: 'Invalid user address' });
        }

        if (typeof whitelisted !== 'boolean') {
            return res.status(400).json({ error: 'Whitelisted must be boolean' });
        }

        const tx = await contract.setWhitelistStatus(userAddress, whitelisted);
        await tx.wait();

        console.log(`${whitelisted ? '✅' : '❌'} User ${userAddress} whitelist status: ${whitelisted}`);

        res.json({
            success: true,
            message: `User ${whitelisted ? 'whitelisted' : 'removed from whitelist'}`,
            data: {
                userAddress,
                whitelisted,
                transactionHash: tx.hash
            }
        });

    } catch (error) {
        console.error('Whitelist error:', error);
        res.status(500).json({ 
            error: 'Failed to update whitelist',
            details: error.message 
        });
    }
});

/**
 * Toggle whitelist requirement
 * POST /api/admin/toggle-whitelist
 * Body: { enabled }
 */
app.post('/api/admin/toggle-whitelist', async (req, res) => {
    try {
        if (!contract) {
            return res.status(500).json({ error: 'Contract not available' });
        }

        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'Enabled must be boolean' });
        }

        const tx = await contract.toggleWhitelist(enabled);
        await tx.wait();

        console.log(`🔧 Whitelist requirement ${enabled ? 'enabled' : 'disabled'}`);

        res.json({
            success: true,
            message: `Whitelist requirement ${enabled ? 'enabled' : 'disabled'}`,
            data: {
                whitelistEnabled: enabled,
                transactionHash: tx.hash
            }
        });

    } catch (error) {
        console.error('Toggle whitelist error:', error);
        res.status(500).json({ 
            error: 'Failed to toggle whitelist',
            details: error.message 
        });
    }
});

/**
 * Get contract statistics
 * GET /api/contract-stats
 */
app.get('/api/contract-stats', async (req, res) => {
    try {
        if (!contract) {
            return res.json({
                success: true,
                data: {
                    contractBalance: '0',
                    contractBalanceETH: '0',
                    whitelistEnabled: false,
                    contractAddress: contractAddress || null,
                    connected: false,
                    message: 'Contract not connected - check environment variables'
                }
            });
        }

        const contractBalance = await contract.getContractBalance();
        const whitelistEnabled = await contract.whitelistEnabled();

        res.json({
            success: true,
            data: {
                contractBalance: contractBalance.toString(),
                contractBalanceETH: ethers.utils.formatEther(contractBalance),
                whitelistEnabled,
                contractAddress,
                connected: true
            }
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ 
            error: 'Failed to get contract stats',
            details: error.message 
        });
    }
});

/**
 * Health check
 * GET /api/health
 */
app.get('/api/health', async (req, res) => {
    try {
        let blockNumber = null;
        let contractBalance = '0';

        if (provider) {
            try {
                blockNumber = await provider.getBlockNumber();
            } catch (error) {
                console.warn('Could not get block number:', error.message);
            }
        }

        if (contract) {
            try {
                const balance = await contract.getContractBalance();
                contractBalance = balance.toString();
            } catch (error) {
                console.warn('Could not get contract balance:', error.message);
            }
        }

        res.json({
            success: true,
            data: {
                status: 'healthy',
                blockNumber,
                contractBalance,
                contractBalanceETH: ethers.utils.formatEther(contractBalance),
                timestamp: new Date().toISOString(),
                environment: {
                    hasRpcUrl: !!process.env.RPC_URL || !!process.env.ABSTRACT_TESTNET_RPC_URL,
                    hasPrivateKey: !!process.env.ADMIN_PRIVATE_KEY,
                    hasContractAddress: !!process.env.CONTRACT_ADDRESS,
                    connected: !!contract
                }
            }
        });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: 'Service unhealthy',
            details: error.message 
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 CORS enabled for: http://localhost:3000`);
    console.log(`🔗 Contract: ${contractAddress || 'Not configured'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    
    if (!contractAddress) {
        console.log(`⚠️  To deploy contract: npm run deploy:contracts:abstract-testnet`);
    }
});

module.exports = app;