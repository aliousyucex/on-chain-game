# 🚀 PvE On-Chain Game - Abstract Chain Edition

A streamlined blockchain-based game system with direct deposits and withdrawals on **Abstract Chain**. No complex Merkle proofs or multi-step confirmations - just simple, single-transaction operations with low gas fees!

## ✨ Features

- **Single Transaction Deposits**: Users deposit directly to the smart contract
- **Direct Withdrawals**: No Merkle proof required - instant withdrawals
- **Abstract Chain Integration**: Low gas fees and fast confirmations
- **Optional Whitelist**: Can be enabled/disabled by admin
- **Gas Efficient**: Optimized for minimal gas usage on Layer 2
- **Modern UI**: Clean React interface with MetaMask integration
- **Admin Panel**: Backend API for balance management

## 🌐 Abstract Chain Information

**Abstract Testnet:**
- Chain ID: `11124`
- RPC URL: `https://api.testnet.abs.xyz`
- Explorer: https://sepolia.abscan.org/
- Currency: ETH
- Websocket: `wss://api.testnet.abs.xyz/ws`

**Abstract Mainnet:**
- Chain ID: `2741`
- RPC URL: `https://api.mainnet.abs.xyz`
- Explorer: https://abscan.org/
- Currency: ETH
- Websocket: `wss://api.mainnet.abs.xyz/ws`

## 🏗️ Project Structure

```
pve-on-chain-game/
├── contracts/                 # Smart contracts
│   └── WithdrawContract.sol  # Main contract (simplified)
├── backend/                  # Node.js API server
│   ├── api.js               # Express API (no Merkle manager)
│   └── package.json
├── frontend/                 # React web app
│   ├── src/
│   │   ├── WithdrawComponent.jsx
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── scripts/                  # Deployment scripts
│   └── deploy.js
├── hardhat.config.js        # Hardhat configuration (Abstract networks)
├── package.json             # Root package.json
└── env.example              # Environment template
```

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd pve-on-chain-game

# Install all dependencies
npm run install:all
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit .env with your values
nano .env
```

**Required Environment Variables:**
```env
# Abstract Chain
ABSTRACT_TESTNET_RPC_URL=https://api.testnet.abs.xyz
ADMIN_PRIVATE_KEY=0xYOUR_ADMIN_PRIVATE_KEY_HERE

# Backend
PORT=3001
NODE_ENV=development

# Frontend
REACT_APP_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_NETWORK_NAME=abstract-testnet
REACT_APP_CHAIN_ID=11124
```

### 3. Deploy Smart Contract

```bash
# Compile contracts
npm run build:contracts

# Deploy to Abstract Testnet
npm run deploy:contracts:abstract-testnet

# Or deploy to Abstract Mainnet
npm run deploy:contracts:abstract-mainnet
```

### 4. Start Development

```bash
# Start all services (contracts + backend + frontend)
npm run dev

# Or start individually:
npm run dev:backend    # Backend on :3001
npm run dev:frontend   # Frontend on :3000
npm run dev:contracts  # Local blockchain on :8545
```

## 📝 API Endpoints

### User Operations
- `GET /api/user-status/:address` - Get user balance and status
- `POST /api/verify-deposit` - Verify deposit transaction (optional)

### Admin Operations
- `POST /api/update-balance` - Update user balance
- `POST /api/batch-update-balances` - Batch balance updates
- `POST /api/admin/whitelist-user` - Manage whitelist
- `POST /api/admin/toggle-whitelist` - Enable/disable whitelist

### System
- `GET /api/contract-stats` - Get contract information
- `GET /api/health` - Health check

## 🔧 Smart Contract Functions

### User Functions
```solidity
function deposit() external payable                    // Direct deposit
function withdraw(uint256 amount) external            // Direct withdrawal
function getWithdrawableBalance(address user) view    // Check balance
```

### Admin Functions
```solidity
function updateUserBalance(address user, uint256 balance, string reason)
function batchUpdateBalances(address[] users, uint256[] balances, string reason)
function setWhitelistStatus(address user, bool status)
function toggleWhitelist(bool enabled)
```

## 💻 Usage Examples

### Frontend (React)
```javascript
// Connect wallet and deposit
const executeDeposit = async () => {
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
    const tx = await contract.deposit({ value: ethers.utils.parseEther("1.0") });
    await tx.wait();
};

// Withdraw funds
const executeWithdraw = async () => {
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
    const tx = await contract.withdraw(ethers.utils.parseEther("0.5"));
    await tx.wait();
};
```

### Backend (Admin)
```javascript
// Update user balance
fetch('/api/update-balance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        userAddress: '0x...',
        newBalance: '1000000000000000000', // 1 ETH in wei
        reason: 'Game win'
    })
});
```

## 🛠️ Development

### Running Tests
```bash
npm test                    # Run all tests
npm run test:contracts     # Smart contract tests
npm run test:backend       # Backend API tests
```

### Building
```bash
npm run build              # Build all
npm run build:frontend     # Build React app
npm run build:contracts    # Compile contracts
```

### Linting
```bash
npm run lint               # Lint all
npm run lint:backend       # Lint backend
npm run lint:frontend      # Lint frontend
```

## 🚀 Deployment

### Abstract Testnet Deployment
```bash
# 1. Set environment variables
export ABSTRACT_TESTNET_RPC_URL="https://api.testnet.abs.xyz"
export ADMIN_PRIVATE_KEY="0xYOUR_PRIVATE_KEY"

# 2. Deploy contract
npm run deploy:contracts:abstract-testnet

# 3. Update .env with contract address
echo "CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS" >> .env

# 4. Start backend
npm run start:backend
```

### Abstract Mainnet Deployment
```bash
# Deploy to mainnet (be careful!)
npm run deploy:contracts:abstract-mainnet

# Build and serve frontend
npm run build:frontend
npm run start:frontend
```

## 📊 Key Differences from Traditional Systems

| Feature | Traditional ETH | Abstract Chain |
|---------|-----------------|-----------------|
| **Gas Fees** | High (~$5-50) | Very Low (~$0.01-0.10) ✅ |
| **Confirmations** | 15-60 seconds | 1-3 seconds ✅ |
| **Deposits** | Multi-step confirmation | Single transaction ✅ |
| **Withdrawals** | Merkle proof required | Direct withdrawal ✅ |
| **User Experience** | Complex | Simple ✅ |
| **Transaction Costs** | Expensive | Affordable ✅ |

## 🔒 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Access Control**: Admin-only functions
- **Input Validation**: Comprehensive validation
- **CEI Pattern**: Checks-Effects-Interactions pattern
- **Optional Whitelist**: Additional access control layer
- **Abstract Chain Security**: Built on proven Layer 2 technology

## 🌟 Abstract Chain Benefits

- **Low Gas Fees**: ~1000x cheaper than Ethereum mainnet
- **Fast Confirmations**: Transactions confirm in seconds
- **Ethereum Compatibility**: Use existing Ethereum tools
- **Scalable**: High throughput for gaming applications
- **Secure**: Built on battle-tested infrastructure

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/yourusername/pve-on-chain-game/issues) page
2. Make sure all environment variables are set correctly
3. Verify your RPC URL and private key for Abstract Chain
4. Check that MetaMask is connected to Abstract Chain
5. Ensure you have Abstract Chain added to your MetaMask networks

### Adding Abstract Chain to MetaMask

**Abstract Testnet:**
- Network Name: Abstract Testnet
- New RPC URL: https://api.testnet.abs.xyz
- Chain ID: 11124
- Currency Symbol: ETH
- Block Explorer: https://sepolia.abscan.org/

**Abstract Mainnet:**
- Network Name: Abstract
- New RPC URL: https://api.mainnet.abs.xyz
- Chain ID: 2741
- Currency Symbol: ETH
- Block Explorer: https://abscan.org/

## 🎯 Roadmap

- [ ] Add unit tests for all components
- [ ] Implement database persistence
- [ ] Add monitoring and alerts
- [ ] Create admin dashboard
- [ ] Add more game mechanics
- [ ] Mobile app development
- [ ] Multi-token support
- [ ] Cross-chain bridges

---

Built with ❤️ using Solidity, Node.js, React, and **Abstract Chain**