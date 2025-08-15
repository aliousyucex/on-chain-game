const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const { ethers } = require('ethers');

class MerkleManager {
    constructor() {
        this.whitelistedUsers = new Map(); // address -> amount
        this.merkleTree = null;
        this.merkleRoot = null;
    }

    /**
     * Add user to whitelist after successful deposit verification
     * @param {string} userAddress - User's wallet address
     * @param {string} amount - Amount in wei (string to handle big numbers)
     */
    addToWhitelist(userAddress, amount) {
        if (!ethers.utils.isAddress(userAddress)) {
            throw new Error('Invalid address format');
        }

        if (!amount || amount === '0') {
            throw new Error('Invalid amount');
        }

        // Add user with their withdrawable amount
        this.whitelistedUsers.set(userAddress.toLowerCase(), amount);
        
        console.log(`✅ User ${userAddress} added to whitelist with amount: ${ethers.utils.formatEther(amount)} ETH`);
        
        // Regenerate Merkle tree
        this.generateMerkleTree();
        
        return {
            user: userAddress,
            amount: amount,
            merkleRoot: this.merkleRoot
        };
    }

    /**
     * Remove user from whitelist (blacklist)
     * @param {string} userAddress - User's wallet address
     */
    removeFromWhitelist(userAddress) {
        if (!ethers.utils.isAddress(userAddress)) {
            throw new Error('Invalid address format');
        }

        const wasRemoved = this.whitelistedUsers.delete(userAddress.toLowerCase());
        
        if (wasRemoved) {
            console.log(`❌ User ${userAddress} removed from whitelist (blacklisted)`);
            
            // Regenerate Merkle tree
            this.generateMerkleTree();
            
            return {
                user: userAddress,
                removed: true,
                merkleRoot: this.merkleRoot
            };
        }

        return { user: userAddress, removed: false };
    }

    /**
     * Generate Merkle tree from current whitelist
     */
    generateMerkleTree() {
        if (this.whitelistedUsers.size === 0) {
            this.merkleTree = null;
            this.merkleRoot = '0x0000000000000000000000000000000000000000000000000000000000000000';
            return;
        }

        // Create leaves: hash of (address, amount)
        const leaves = Array.from(this.whitelistedUsers.entries()).map(([address, amount]) => {
            return keccak256(
                ethers.utils.solidityPack(['address', 'uint256'], [address, amount])
            );
        });

        // Create Merkle tree
        this.merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        this.merkleRoot = this.merkleTree.getHexRoot();

        console.log(`🌳 Merkle tree regenerated. Root: ${this.merkleRoot}`);
        console.log(`📊 Total whitelisted users: ${this.whitelistedUsers.size}`);
    }

    /**
     * Get Merkle proof for a user
     * @param {string} userAddress - User's wallet address
     * @returns {object} Proof and verification data
     */
    getMerkleProof(userAddress) {
        if (!ethers.utils.isAddress(userAddress)) {
            throw new Error('Invalid address format');
        }

        const normalizedAddress = userAddress.toLowerCase();
        const amount = this.whitelistedUsers.get(normalizedAddress);

        if (!amount) {
            throw new Error('User not whitelisted');
        }

        if (!this.merkleTree) {
            throw new Error('Merkle tree not generated');
        }

        // Create leaf for this user
        const leaf = keccak256(
            ethers.utils.solidityPack(['address', 'uint256'], [normalizedAddress, amount])
        );

        // Get proof
        const proof = this.merkleTree.getHexProof(leaf);

        // Verify proof locally
        const isValid = this.merkleTree.verify(proof, leaf, this.merkleRoot);

        return {
            user: userAddress,
            amount: amount,
            proof: proof,
            merkleRoot: this.merkleRoot,
            leaf: '0x' + leaf.toString('hex'),
            isValid: isValid
        };
    }

    /**
     * Verify if user is whitelisted
     * @param {string} userAddress - User's wallet address
     * @returns {boolean} True if user is whitelisted
     */
    isWhitelisted(userAddress) {
        if (!ethers.utils.isAddress(userAddress)) {
            return false;
        }

        return this.whitelistedUsers.has(userAddress.toLowerCase());
    }

    /**
     * Get user's withdrawable amount
     * @param {string} userAddress - User's wallet address
     * @returns {string|null} Amount in wei or null if not whitelisted
     */
    getUserAmount(userAddress) {
        if (!ethers.utils.isAddress(userAddress)) {
            return null;
        }

        return this.whitelistedUsers.get(userAddress.toLowerCase()) || null;
    }

    /**
     * Get all whitelisted users
     * @returns {Array} Array of user data
     */
    getAllWhitelistedUsers() {
        return Array.from(this.whitelistedUsers.entries()).map(([address, amount]) => ({
            address,
            amount,
            amountETH: ethers.utils.formatEther(amount)
        }));
    }

    /**
     * Get current Merkle root
     * @returns {string} Current Merkle root
     */
    getCurrentMerkleRoot() {
        return this.merkleRoot;
    }

    /**
     * Get Merkle tree stats
     * @returns {object} Tree statistics
     */
    getStats() {
        return {
            totalUsers: this.whitelistedUsers.size,
            merkleRoot: this.merkleRoot,
            hasTree: this.merkleTree !== null
        };
    }

    /**
     * Batch operations - useful for initialization
     * @param {Array} users - Array of {address, amount} objects
     */
    batchAddToWhitelist(users) {
        let addedCount = 0;

        users.forEach(({ address, amount }) => {
            try {
                if (ethers.utils.isAddress(address) && amount && amount !== '0') {
                    this.whitelistedUsers.set(address.toLowerCase(), amount);
                    addedCount++;
                }
            } catch (error) {
                console.error(`Failed to add ${address}:`, error.message);
            }
        });

        if (addedCount > 0) {
            this.generateMerkleTree();
            console.log(`📦 Batch operation completed. Added ${addedCount} users.`);
        }

        return {
            added: addedCount,
            total: this.whitelistedUsers.size,
            merkleRoot: this.merkleRoot
        };
    }

    /**
     * Export whitelist for backup
     * @returns {object} Exportable whitelist data
     */
    exportWhitelist() {
        return {
            users: Object.fromEntries(this.whitelistedUsers),
            merkleRoot: this.merkleRoot,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Import whitelist from backup
     * @param {object} data - Whitelist data to import
     */
    importWhitelist(data) {
        if (!data.users) {
            throw new Error('Invalid whitelist data');
        }

        this.whitelistedUsers.clear();
        
        Object.entries(data.users).forEach(([address, amount]) => {
            if (ethers.utils.isAddress(address)) {
                this.whitelistedUsers.set(address.toLowerCase(), amount);
            }
        });

        this.generateMerkleTree();
        
        console.log(`📥 Whitelist imported. ${this.whitelistedUsers.size} users loaded.`);
        
        return this.getStats();
    }
}

module.exports = MerkleManager; 