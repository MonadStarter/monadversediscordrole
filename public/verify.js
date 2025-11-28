// Monad Testnet Configuration
const MONAD_CHAIN = {
  chainId: 10143,
  chainIdHex: '0x279f',
  name: 'Monad Testnet',
  rpcUrl: 'https://testnet-rpc.monad.xyz',
  blockExplorer: 'https://testnet.monadexplorer.com',
  currency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18
  }
};

// Get DOM elements
const connectBtn = document.getElementById('connect-btn');
const btnText = document.getElementById('btn-text');
const btnLoader = document.getElementById('btn-loader');
const statusText = document.getElementById('status-text');
const walletInfo = document.getElementById('wallet-info');
const walletAddress = document.getElementById('wallet-address');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const reverifyBtn = document.getElementById('reverify-btn');

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// State
let connectedAddress = null;
let isAlreadyVerified = false;

// Helper functions
function showError(message) {
  const span = errorMessage.querySelector('span');
  span.textContent = message;
  errorMessage.classList.remove('hidden');
  successMessage.classList.add('hidden');
}

function showSuccess(message) {
  const span = successMessage.querySelector('span');
  span.textContent = message;
  successMessage.classList.remove('hidden');
  errorMessage.classList.add('hidden');
}

function hideMessages() {
  errorMessage.classList.add('hidden');
  successMessage.classList.add('hidden');
}

function setLoading(loading, text = 'Connect Wallet') {
  if (loading) {
    connectBtn.disabled = true;
    btnText.textContent = text;
    btnLoader.classList.remove('hidden');
  } else {
    connectBtn.disabled = false;
    btnText.textContent = text;
    btnLoader.classList.add('hidden');
  }
}

// Show already verified state
function showAlreadyVerified(wallet) {
  isAlreadyVerified = true;
  statusText.textContent = `You're already verified with wallet ${wallet}`;
  connectBtn.classList.add('hidden');
  reverifyBtn.classList.remove('hidden');
}

// Reset to connect state
function resetToConnect() {
  isAlreadyVerified = false;
  hideMessages();
  statusText.textContent = '';
  walletInfo.classList.add('hidden');
  connectBtn.classList.remove('hidden');
  reverifyBtn.classList.add('hidden');
  setLoading(false, 'Connect Wallet');
}

// Check if token is valid on page load
async function checkToken() {
  if (!token) {
    showError('No verification token found. Please use /verifymonadversenft in Discord to get a verification link.');
    connectBtn.disabled = true;
    return false;
  }

  try {
    const response = await fetch(`/api/check-token?token=${token}`);
    const data = await response.json();

    if (!response.ok) {
      showError(data.error || 'Invalid or expired token. Please request a new verification link from Discord.');
      connectBtn.disabled = true;
      return false;
    }

    // Check if already verified
    if (data.alreadyVerified && data.wallet) {
      showAlreadyVerified(data.wallet);
    }

    return true;
  } catch (error) {
    showError('Unable to verify your session. Please check your connection and try again.');
    connectBtn.disabled = true;
    return false;
  }
}

// Check if wallet is available
function getProvider() {
  if (typeof window.ethereum !== 'undefined') {
    return window.ethereum;
  }
  return null;
}

// Switch to Monad network
async function switchToMonad(provider) {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MONAD_CHAIN.chainIdHex }]
    });
  } catch (switchError) {
    // Chain not added, add it
    if (switchError.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: MONAD_CHAIN.chainIdHex,
          chainName: MONAD_CHAIN.name,
          nativeCurrency: MONAD_CHAIN.currency,
          rpcUrls: [MONAD_CHAIN.rpcUrl],
          blockExplorerUrls: [MONAD_CHAIN.blockExplorer]
        }]
      });
    } else {
      throw switchError;
    }
  }
}

// Complete verification after wallet connection
async function completeVerification(provider, address) {
  connectedAddress = address;
  walletAddress.textContent = `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`;
  walletInfo.classList.remove('hidden');

  // Sign message
  setLoading(true, 'Waiting for Signature');
  statusText.textContent = 'Please sign the message in your wallet.';

  try {
    // Create message to sign
    const message = `Verify Monadverse NFT ownership for Discord\nToken: ${token}`;

    // Request signature
    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, connectedAddress]
    });

    // Verify NFT
    setLoading(true, 'Verifying NFT');
    statusText.textContent = 'Checking NFT ownership...';

    // Send to backend for verification
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        address: connectedAddress,
        signature
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Verification failed');
    }

    // Success!
    statusText.textContent = '';
    showSuccess(`Verified! You own ${data.balance} Monadverse NFT(s). Your holder role has been assigned.`);
    setLoading(false, 'Verified');
    connectBtn.disabled = true;

  } catch (error) {
    console.error('Verification error:', error);

    if (error.code === 4001 || error.message?.includes('rejected')) {
      showError('Signature declined. Please try again.');
      statusText.textContent = '';
    } else if (error.message?.includes('No Monadverse NFT')) {
      showError('No Monadverse NFT found in this wallet.');
      statusText.textContent = '';
    } else {
      showError(error.message || 'Verification failed. Please try again.');
      statusText.textContent = '';
    }

    walletInfo.classList.add('hidden');
    setLoading(false, 'Connect Wallet');
  }
}

// Connect wallet
async function connectWallet() {
  hideMessages();

  const provider = getProvider();

  if (!provider) {
    showError('No wallet detected. Please install MetaMask or another Web3 wallet.');
    return;
  }

  setLoading(true, 'Connecting');
  statusText.textContent = 'Connecting to wallet...';

  try {
    // Request account access
    const accounts = await provider.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const address = accounts[0];

    // Switch to Monad network
    statusText.textContent = 'Switching to Monad network...';
    await switchToMonad(provider);

    // Continue with verification
    await completeVerification(provider, address);

  } catch (error) {
    console.error('Connection error:', error);

    if (error.code === 4001) {
      showError('Connection rejected. Please try again.');
    } else if (error.message?.includes('No accounts')) {
      showError('No wallet account found. Please unlock your wallet.');
    } else {
      showError(error.message || 'Could not connect wallet. Please try again.');
    }

    statusText.textContent = '';
    setLoading(false, 'Connect Wallet');
  }
}

// Initialize
async function init() {
  const isValid = await checkToken();
  if (!isValid) return;

  // Check if wallet is available
  if (!getProvider()) {
    statusText.textContent = 'Please install MetaMask or another Web3 wallet.';
  }

  connectBtn.addEventListener('click', connectWallet);
  reverifyBtn.addEventListener('click', () => {
    resetToConnect();
    connectWallet();
  });

  // Listen for account changes
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        walletInfo.classList.add('hidden');
        setLoading(false, 'Connect Wallet');
        statusText.textContent = '';
      }
    });
  }
}

// Run on page load
init();
