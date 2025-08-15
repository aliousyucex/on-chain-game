const { ethers } = require('ethers');

async function createWallet() {
    console.log('🔐 Creating a new wallet...\n');
    
    // Create a random wallet
    const wallet = ethers.Wallet.createRandom();
    
    console.log('✅ Wallet created successfully!');
    console.log('==========================================');
    console.log('📍 Address:', wallet.address);
    console.log('🔑 Private Key:', wallet.privateKey);
    console.log('🌱 Mnemonic:', wallet.mnemonic.phrase);
    console.log('==========================================\n');
    
    console.log('⚠️  IMPORTANT SECURITY NOTES:');
    console.log('1. Save your private key in a secure location');
    console.log('2. Never share your private key with anyone');
    console.log('3. Add your private key to .env file as ADMIN_PRIVATE_KEY');
    console.log('4. Make sure .env is in your .gitignore file\n');
    
    console.log('📝 Next steps:');
    console.log('1. Copy the private key above');
    console.log('2. Add it to your .env file:');
    console.log(`   ADMIN_PRIVATE_KEY=${wallet.privateKey}`);
    console.log('3. Add Abstract Testnet to MetaMask and import this wallet');
    console.log('4. Get some test ETH from Abstract faucet\n');
    
    console.log('🌐 Abstract Testnet Info:');
    console.log('- Network Name: Abstract Testnet');
    console.log('- RPC URL: https://api.testnet.abs.xyz');
    console.log('- Chain ID: 11124');
    console.log('- Currency: ETH');
    console.log('- Explorer: https://sepolia.abscan.org/\n');
    
    return wallet;
}

// Run the script
if (require.main === module) {
    createWallet().catch(console.error);
}

module.exports = { createWallet }; 