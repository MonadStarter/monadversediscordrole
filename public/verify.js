// Get DOM elements
const connectBtn = document.getElementById('connect-btn');
const statusText = document.getElementById('status-text');
const walletInfo = document.getElementById('wallet-info');
const walletAddress = document.getElementById('wallet-address');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// State
let connectedAddress = null;

// Helper functions
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
  successMessage.classList.add('hidden');
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.classList.remove('hidden');
  errorMessage.classList.add('hidden');
}

function hideMessages() {
  errorMessage.classList.add('hidden');
  successMessage.classList.add('hidden');
}

function setLoading(loading) {
  if (loading) {
    connectBtn.disabled = true;
    connectBtn.textContent = 'Verifying...';
  } else {
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect Wallet';
  }
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
      showError(data.error || 'Invalid token');
      connectBtn.disabled = true;
      return false;
    }

    return true;
  } catch (error) {
    showError('Failed to verify token. Please try again.');
    connectBtn.disabled = true;
    return false;
  }
}

// Connect wallet and verify
async function connectAndVerify() {
  hideMessages();

  // Check if MetaMask is installed
  if (typeof window.ethereum === 'undefined') {
    showError('MetaMask is not installed. Please install MetaMask to continue.');
    return;
  }

  setLoading(true);
  statusText.textContent = 'Connecting wallet...';

  try {
    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    connectedAddress = accounts[0];
    walletAddress.textContent = `Connected: ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`;
    walletInfo.classList.remove('hidden');

    statusText.textContent = 'Please sign the verification message...';

    // Create message to sign
    const message = `Verify Monadverse NFT ownership for Discord\nToken: ${token}`;

    // Request signature
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, connectedAddress]
    });

    statusText.textContent = 'Verifying NFT ownership...';

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
    statusText.textContent = 'Verification complete!';
    showSuccess(`${data.message} You own ${data.balance} Monadverse NFT(s).`);
    connectBtn.textContent = 'Verified!';
    connectBtn.disabled = true;

  } catch (error) {
    console.error('Verification error:', error);

    if (error.code === 4001) {
      // User rejected the request
      showError('You rejected the request. Please try again.');
      statusText.textContent = 'Connect your wallet to verify Monadverse NFT ownership';
    } else {
      showError(error.message || 'An error occurred during verification');
      statusText.textContent = 'Verification failed. Please try again.';
    }

    setLoading(false);
  }
}

// Initialize
async function init() {
  const isValid = await checkToken();

  if (isValid) {
    connectBtn.addEventListener('click', connectAndVerify);
  }
}

// Run on page load
init();
