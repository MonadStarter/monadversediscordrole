const { ethers } = require('ethers');

const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)'
];

const RPC_URL = process.env.RPC_URL || 'https://monad-mainnet.drpc.org';
const NFT_CONTRACT = process.env.NFT_CONTRACT || '0x458e467F911b3b99F24Ec8b5A85e68745c83155e';

let provider = null;
let contract = null;

function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return provider;
}

function getContract() {
  if (!contract) {
    contract = new ethers.Contract(NFT_CONTRACT, ERC721_ABI, getProvider());
  }
  return contract;
}

/**
 * Check NFT balance for a wallet address
 * @param {string} walletAddress - The wallet address to check
 * @returns {Promise<number>} - Number of NFTs owned
 */
async function checkNFTBalance(walletAddress) {
  try {
    const nftContract = getContract();
    const balance = await nftContract.balanceOf(walletAddress);
    return Number(balance);
  } catch (error) {
    console.error(`Error checking NFT balance for ${walletAddress}:`, error.message);
    throw error;
  }
}

/**
 * Verify a signed message and recover the signer address
 * @param {string} message - The original message that was signed
 * @param {string} signature - The signature
 * @returns {string} - The recovered address
 */
function recoverAddress(message, signature) {
  try {
    return ethers.verifyMessage(message, signature);
  } catch (error) {
    console.error('Error recovering address from signature:', error.message);
    throw new Error('Invalid signature');
  }
}

module.exports = {
  checkNFTBalance,
  recoverAddress
};
