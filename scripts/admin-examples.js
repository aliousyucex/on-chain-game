const { ethers } = require('ethers');
require('dotenv').config();

// Admin fonksiyonları örneği - Sadece backend'den çağrılabilir!

async function adminExamples() {
    console.log('🔧 Admin Contract Functions Examples\n');

    // Contract setup
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const contractABI = [
        "function updateUserBalance(address user, uint256 newBalance, string calldata reason) external",
        "function batchUpdateBalances(address[] calldata users, uint256[] calldata newBalances, string calldata reason) external",
        "function setWhitelistStatus(address user, bool status) external",
        "function toggleWhitelist(bool enabled) external",
        "function getWithdrawableBalance(address user) external view returns (uint256)",
        "function getUserStats(address user) external view returns (uint256 balance, bool canWithdrawAny, bool whitelisted)"
    ];

    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, adminWallet);

    try {
        // 1. Kullanıcı bakiyesini güncelle (oyun kazandıktan sonra)
        console.log('1. 💰 Updating user balance...');
        const userAddress = '0xYOUR_USER_ADDRESS';
        const newBalance = ethers.utils.parseEther("2.0"); // 2 ETH
        
        const updateTx = await contract.updateUserBalance(
            userAddress, 
            newBalance, 
            'Game win reward'
        );
        await updateTx.wait();
        console.log('✅ Balance updated:', updateTx.hash);

        // 2. Toplu bakiye güncellemesi (birden fazla kullanıcı)
        console.log('\n2. 📦 Batch balance update...');
        const users = [
            '0xUser1Address',
            '0xUser2Address'
        ];
        const balances = [
            ethers.utils.parseEther("1.5"), // User1: 1.5 ETH
            ethers.utils.parseEther("0.8")  // User2: 0.8 ETH
        ];
        
        const batchTx = await contract.batchUpdateBalances(
            users, 
            balances, 
            'Daily game rewards'
        );
        await batchTx.wait();
        console.log('✅ Batch update completed:', batchTx.hash);

        // 3. Kullanıcıyı whitelist'e ekle/çıkar
        console.log('\n3. 📋 Whitelist management...');
        const whitelistTx = await contract.setWhitelistStatus(userAddress, true);
        await whitelistTx.wait();
        console.log('✅ User whitelisted:', whitelistTx.hash);

        // 4. Whitelist sistemini aç/kapat
        console.log('\n4. 🔧 Toggle whitelist...');
        const toggleTx = await contract.toggleWhitelist(true); // true = enable
        await toggleTx.wait();
        console.log('✅ Whitelist enabled:', toggleTx.hash);

        // 5. Kullanıcı durumunu kontrol et
        console.log('\n5. 📊 Check user status...');
        const balance = await contract.getWithdrawableBalance(userAddress);
        const stats = await contract.getUserStats(userAddress);
        
        console.log('User Balance:', ethers.utils.formatEther(balance), 'ETH');
        console.log('Can Withdraw:', stats.canWithdrawAny);
        console.log('Is Whitelisted:', stats.whitelisted);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Kullanım: node scripts/admin-examples.js
if (require.main === module) {
    adminExamples().catch(console.error);
}

module.exports = { adminExamples }; 