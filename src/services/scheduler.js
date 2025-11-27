const cron = require('node-cron');
const db = require('../database/db');
const { checkNFTBalance } = require('./nftChecker');
const { assignRole, removeRole } = require('./roleManager');

// Delay helper to avoid rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Re-verify all users and update their roles
 */
async function reVerifyAllUsers() {
  console.log('[Scheduler] Starting daily NFT verification...');

  const users = db.getAllVerifiedUsers();
  console.log(`[Scheduler] Found ${users.length} verified users to check`);

  let updated = 0;
  let removed = 0;
  let errors = 0;

  for (const user of users) {
    try {
      const balance = await checkNFTBalance(user.wallet_address);

      if (balance > 0) {
        // User still has NFT, ensure they have the role
        await assignRole(user.discord_id);
        updated++;
      } else {
        // User no longer has NFT, remove role and clear wallet
        await removeRole(user.discord_id);
        db.clearWallet(user.discord_id);
        removed++;
        console.log(`[Scheduler] Removed role from ${user.discord_id} - no longer holds NFT`);
      }

      // Small delay to avoid rate limits
      await delay(500);

    } catch (error) {
      console.error(`[Scheduler] Error checking user ${user.discord_id}:`, error.message);
      errors++;
    }
  }

  console.log(`[Scheduler] Daily verification complete. Updated: ${updated}, Removed: ${removed}, Errors: ${errors}`);
}

/**
 * Start the scheduled verification job
 * Runs every day at midnight UTC
 */
function startScheduler() {
  // Run at midnight UTC every day
  cron.schedule('0 0 * * *', async () => {
    await reVerifyAllUsers();
  }, {
    timezone: 'UTC'
  });

  console.log('[Scheduler] Daily verification job scheduled for midnight UTC');
}

module.exports = {
  startScheduler,
  reVerifyAllUsers // Exported for manual triggering if needed
};
