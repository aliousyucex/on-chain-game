const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function updateEnvFile(contractAddress) {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', 'env.example');
  
  try {
    let envContent = '';
    
    // Read existing .env or create from template
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    } else if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf8');
      console.log('📄 Created .env from env.example template');
    }
    
    // Update CONTRACT_ADDRESS
    if (envContent.includes('CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/,
        `CONTRACT_ADDRESS=${contractAddress}`
      );
    } else {
      envContent += `\nCONTRACT_ADDRESS=${contractAddress}\n`;
    }
    
    // Update REACT_APP_CONTRACT_ADDRESS
    if (envContent.includes('REACT_APP_CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(
        /REACT_APP_CONTRACT_ADDRESS=.*/,
        `REACT_APP_CONTRACT_ADDRESS=${contractAddress}`
      );
    } else {
      envContent += `REACT_APP_CONTRACT_ADDRESS=${contractAddress}\n`;
    }
    
    // Write updated content
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file with contract address');
    
  } catch (error) {
    console.log('⚠️  Could not automatically update .env file:', error.message);
    console.log('📝 Please manually update your .env file with:');
    console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
    console.log(`   REACT_APP_CONTRACT_ADDRESS=${contractAddress}`);
  }
}

async function main() {
  console.log("🚀 Starting deployment to Abstract Chain...\n");

  // Get the ContractFactory and Signers
  const [deployer] = await hre.ethers.getSigners();

  console.log("📝 Deploying contracts with the account:", deployer.address);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
  
  if (balance.eq(0)) {
    console.log("\n❌ ERROR: Account has no ETH!");
    console.log("🎯 You need to add some test ETH to your wallet");
    console.log("💧 For Abstract Testnet, you can get test ETH from:");
    console.log("   - Bridge from Sepolia ETH");  
    console.log("   - Use Abstract faucet if available");
    console.log("   - Ask in Abstract Discord for testnet tokens\n");
    process.exit(1);
  }

  // Deploy the WithdrawContract
  const WithdrawContract = await hre.ethers.getContractFactory("WithdrawContract");
  
  console.log("⏳ Deploying WithdrawContract...");
  const withdrawContract = await WithdrawContract.deploy();

  console.log("⏳ Waiting for deployment transaction...");
  await withdrawContract.deployed();

  console.log("✅ WithdrawContract deployed to:", withdrawContract.address);
  console.log("🔗 Transaction hash:", withdrawContract.deployTransaction.hash);

  // Wait for a few confirmations
  console.log("⏳ Waiting for confirmations...");
  await withdrawContract.deployTransaction.wait(3);

  console.log("🎉 Deployment completed!\n");
  
  console.log("📋 CONTRACT DETAILS:");
  console.log("=".repeat(50));
  console.log("Contract Address:", withdrawContract.address);
  console.log("Deployer Address:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  console.log("=".repeat(50));

  // Get some initial contract info
  const contractBalance = await withdrawContract.getContractBalance();
  const whitelistEnabled = await withdrawContract.whitelistEnabled();
  
  console.log("\n📊 INITIAL CONTRACT STATE:");
  console.log("Contract Balance:", hre.ethers.utils.formatEther(contractBalance), "ETH");
  console.log("Whitelist Enabled:", whitelistEnabled);

  // Auto-update .env file
  console.log("\n🔧 UPDATING CONFIGURATION FILES...");
  await updateEnvFile(withdrawContract.address);

  console.log("\n🎯 NEXT STEPS:");
  console.log("1. ✅ Contract deployed successfully");
  console.log("2. ✅ .env file updated automatically");
  console.log("3. 🔄 Restart your backend if it's running:");
  console.log("   npm run dev:backend");
  console.log("4. 🌐 Make sure your frontend has the new contract address");
  console.log("5. 🦊 Add this contract to MetaMask if needed");
  
  if (hre.network.name.includes("testnet")) {
    console.log("\n💧 TO GET TEST ETH:");
    console.log("- Send ETH to your wallet:", deployer.address);
    console.log("- For Abstract Testnet, bridge from Sepolia or use faucets");
  }

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n🔍 VERIFICATION:");
    console.log("To verify the contract on block explorer, run:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${withdrawContract.address}`);
    
    console.log("\n🌐 VIEW ON EXPLORER:");
    if (hre.network.name === "abstract-testnet") {
      console.log(`https://sepolia.abscan.org/address/${withdrawContract.address}`);
    } else if (hre.network.name === "abstract-mainnet") {
      console.log(`https://abscan.org/address/${withdrawContract.address}`);
    }
  }

  return withdrawContract.address;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((contractAddress) => {
    console.log(`\n🎯 DEPLOYMENT SUCCESSFUL!`);
    console.log(`📍 Contract Address: ${contractAddress}`);
    console.log(`✨ Your PvE game is ready on Abstract Chain!`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error(error);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 SOLUTION: Add test ETH to your wallet");
      console.log("1. Get your wallet address from the error above");
      console.log("2. Bridge ETH from Sepolia or use Abstract faucet");
      console.log("3. Try deployment again");
    }
    
    process.exit(1);
  }); 