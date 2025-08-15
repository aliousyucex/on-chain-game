// Frontend'den kullanıcı fonksiyonları örnekleri
// Bu kod frontend'de (React component'te) kullanılır

const userExamples = {
    
    // 1. 💰 Para Yatırma (Deposit)
    async deposit(contract, amount) {
        try {
            console.log(`💰 Depositing ${amount} ETH...`);
            
            const depositValue = ethers.utils.parseEther(amount.toString());
            
            // Gas tahmini
            const gasEstimate = await contract.estimateGas.deposit({ 
                value: depositValue 
            });
            
            // Transaction gönder
            const tx = await contract.deposit({
                value: depositValue,
                gasLimit: gasEstimate.mul(120).div(100) // %20 buffer
            });
            
            console.log('Transaction sent:', tx.hash);
            
            // Onay bekle
            const receipt = await tx.wait();
            console.log('✅ Deposit successful!');
            console.log('Block:', receipt.blockNumber);
            console.log('Gas used:', receipt.gasUsed.toString());
            
            return tx;
            
        } catch (error) {
            console.error('❌ Deposit failed:', error.message);
            throw error;
        }
    },

    // 2. 💸 Para Çekme (Withdraw)
    async withdraw(contract, amount) {
        try {
            console.log(`💸 Withdrawing ${amount} ETH...`);
            
            const withdrawValue = ethers.utils.parseEther(amount.toString());
            
            // Kullanıcının yeterli bakiyesi var mı kontrol et
            const userBalance = await contract.getWithdrawableBalance(
                await contract.signer.getAddress()
            );
            
            if (userBalance.lt(withdrawValue)) {
                throw new Error('Insufficient balance');
            }
            
            // Gas tahmini
            const gasEstimate = await contract.estimateGas.withdraw(withdrawValue);
            
            // Transaction gönder
            const tx = await contract.withdraw(withdrawValue, {
                gasLimit: gasEstimate.mul(120).div(100)
            });
            
            console.log('Transaction sent:', tx.hash);
            
            // Onay bekle
            const receipt = await tx.wait();
            console.log('✅ Withdrawal successful!');
            
            return tx;
            
        } catch (error) {
            console.error('❌ Withdrawal failed:', error.message);
            throw error;
        }
    },

    // 3. 👀 Bakiye Kontrolü (View Function)
    async checkBalance(contract, userAddress) {
        try {
            console.log('👀 Checking balance for:', userAddress);
            
            // Bakiye al
            const balance = await contract.getWithdrawableBalance(userAddress);
            const ethBalance = ethers.utils.formatEther(balance);
            
            // Kullanıcı istatistikleri
            const stats = await contract.getUserStats(userAddress);
            
            // Withdraw edilebilir mi kontrol et
            const canWithdraw1ETH = await contract.canWithdraw(
                userAddress, 
                ethers.utils.parseEther("1.0")
            );
            
            console.log('📊 User Stats:');
            console.log('- Balance:', ethBalance, 'ETH');
            console.log('- Can withdraw any:', stats.canWithdrawAny);
            console.log('- Is whitelisted:', stats.whitelisted);
            console.log('- Can withdraw 1 ETH:', canWithdraw1ETH);
            
            return {
                balance: ethBalance,
                canWithdrawAny: stats.canWithdrawAny,
                isWhitelisted: stats.whitelisted
            };
            
        } catch (error) {
            console.error('❌ Balance check failed:', error.message);
            throw error;
        }
    },

    // 4. 🎮 Oyun Kazanma Sonrası (Game Win Logic)
    async handleGameWin(contract, userAddress, multiplier = 2) {
        try {
            console.log('🎮 Processing game win...');
            
            // Mevcut bakiyeyi al
            const currentBalance = await contract.getWithdrawableBalance(userAddress);
            const currentETH = parseFloat(ethers.utils.formatEther(currentBalance));
            
            console.log('Current balance:', currentETH, 'ETH');
            
            // ❌ YANLIŞ: Kullanıcı updateUserBalance çağıramaz!
            // const updateTx = await contract.updateUserBalance(account, newBalance, 'Game win');
            
            // ✅ DOĞRU: Backend API'sine istek gönder
            const response = await fetch('http://localhost:3001/api/update-balance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userAddress: userAddress,
                    newBalance: ethers.utils.parseEther((currentETH * multiplier).toString()),
                    reason: `Game win - ${multiplier}x multiplier`
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Game win processed!');
                console.log('New balance:', result.data.newBalanceETH, 'ETH');
                return result;
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('❌ Game win processing failed:', error.message);
            throw error;
        }
    }
};

// React component'te kullanım örneği:
const WithdrawComponentExample = () => {
    const [contract, setContract] = useState(null);
    
    const executeDeposit = async () => {
        if (!contract) return;
        
        try {
            await userExamples.deposit(contract, 1.0); // 1 ETH deposit
            // UI'yi güncelle
        } catch (error) {
            alert('Deposit failed: ' + error.message);
        }
    };
    
    const executeWithdraw = async () => {
        if (!contract) return;
        
        try {
            await userExamples.withdraw(contract, 0.5); // 0.5 ETH withdraw
            // UI'yi güncelle
        } catch (error) {
            alert('Withdraw failed: ' + error.message);
        }
    };
    
    const handleGameWin = async () => {
        if (!contract) return;
        
        try {
            const userAddress = await contract.signer.getAddress();
            await userExamples.handleGameWin(contract, userAddress, 2); // 2x multiplier
            // UI'yi güncelle
        } catch (error) {
            alert('Game win processing failed: ' + error.message);
        }
    };
    
    // ... component render
};

module.exports = { userExamples }; 