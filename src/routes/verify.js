const express = require('express');
const db = require('../database/db');
const { checkNFTBalance, recoverAddress } = require('../services/nftChecker');
const { assignRole, removeRole } = require('../services/roleManager');

const router = express.Router();

/**
 * GET /api/check-token
 * Check if a verification token is valid
 */
router.get('/check-token', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const verification = db.getByToken(token);

  if (!verification) {
    return res.status(404).json({ error: 'Invalid or expired token' });
  }

  const now = Math.floor(Date.now() / 1000);
  if (verification.token_expires_at < now) {
    return res.status(410).json({ error: 'Token has expired. Please run /verifymonadversenft again in Discord.' });
  }

  // Check if already verified
  const isVerified = !!verification.wallet_address;
  const wallet = isVerified
    ? `${verification.wallet_address.slice(0, 6)}...${verification.wallet_address.slice(-4)}`
    : null;

  res.json({ valid: true, alreadyVerified: isVerified, wallet });
});

/**
 * POST /api/verify
 * Verify wallet signature and NFT ownership
 */
router.post('/verify', async (req, res) => {
  try {
    const { token, address, signature } = req.body;

    // Validate input
    if (!token || !address || !signature) {
      return res.status(400).json({ error: 'Missing required fields: token, address, signature' });
    }

    // Get verification record
    const verification = db.getByToken(token);
    if (!verification) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    // Check token expiry
    const now = Math.floor(Date.now() / 1000);
    if (verification.token_expires_at < now) {
      return res.status(410).json({ error: 'Token has expired. Please run /verifymonadversenft again in Discord.' });
    }

    // Verify signature
    const message = `Verify Monadverse NFT ownership for Discord\nToken: ${token}`;
    let recoveredAddress;
    try {
      recoveredAddress = recoverAddress(message, signature);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Check if recovered address matches claimed address
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(400).json({ error: 'Signature does not match the provided address' });
    }

    // Check NFT balance
    let balance;
    try {
      balance = await checkNFTBalance(address);
    } catch (error) {
      console.error('Error checking NFT balance:', error);
      return res.status(500).json({ error: 'Failed to check NFT balance. Please try again.' });
    }

    if (balance === 0) {
      return res.status(403).json({
        error: 'No Monadverse NFT found in this wallet',
        balance: 0
      });
    }

    // Update database with verified wallet
    db.verifyUser(verification.discord_id, address);

    // Assign Discord role
    const roleAssigned = await assignRole(verification.discord_id);

    if (!roleAssigned) {
      return res.status(500).json({
        error: 'Verified but failed to assign role. Please contact an admin.',
        verified: true
      });
    }

    res.json({
      success: true,
      message: 'Verification successful! You now have the Monadverse Holder role.',
      balance,
      wallet: address
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

/**
 * GET /api/status/:discordId
 * Check verification status for a Discord user (for debugging)
 */
router.get('/status/:discordId', (req, res) => {
  const { discordId } = req.params;
  const verification = db.getByDiscordId(discordId);

  if (!verification) {
    return res.json({ verified: false });
  }

  res.json({
    verified: !!verification.wallet_address,
    wallet: verification.wallet_address
      ? `${verification.wallet_address.slice(0, 6)}...${verification.wallet_address.slice(-4)}`
      : null,
    verifiedAt: verification.verified_at
  });
});

module.exports = router;
