const Database = require('better-sqlite3');
const path = require('path');

// Use /data directory on Render (persistent disk), fallback to local for development
const dbPath = process.env.NODE_ENV === 'production'
  ? '/data/verifications.db'
  : path.join(__dirname, '../../verifications.db');

const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT UNIQUE NOT NULL,
    wallet_address TEXT,
    verification_token TEXT,
    token_expires_at INTEGER,
    verified_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

// Create index for faster token lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_verification_token ON verifications(verification_token)
`);

// Prepared statements for better performance
const statements = {
  createOrUpdateToken: db.prepare(`
    INSERT INTO verifications (discord_id, verification_token, token_expires_at)
    VALUES (?, ?, ?)
    ON CONFLICT(discord_id) DO UPDATE SET
      verification_token = excluded.verification_token,
      token_expires_at = excluded.token_expires_at
  `),

  getByToken: db.prepare(`
    SELECT * FROM verifications WHERE verification_token = ?
  `),

  getByDiscordId: db.prepare(`
    SELECT * FROM verifications WHERE discord_id = ?
  `),

  verifyUser: db.prepare(`
    UPDATE verifications
    SET wallet_address = ?, verified_at = ?, verification_token = NULL, token_expires_at = NULL
    WHERE discord_id = ?
  `),

  getAllVerified: db.prepare(`
    SELECT * FROM verifications WHERE wallet_address IS NOT NULL
  `),

  clearWallet: db.prepare(`
    UPDATE verifications SET wallet_address = NULL, verified_at = NULL WHERE discord_id = ?
  `)
};

module.exports = {
  // Create or update verification token for a user
  createVerificationToken(discordId, token, expiresAt) {
    return statements.createOrUpdateToken.run(discordId, token, expiresAt);
  },

  // Get verification record by token
  getByToken(token) {
    return statements.getByToken.get(token);
  },

  // Get verification record by Discord ID
  getByDiscordId(discordId) {
    return statements.getByDiscordId.get(discordId);
  },

  // Mark user as verified with wallet address
  verifyUser(discordId, walletAddress) {
    const now = Math.floor(Date.now() / 1000);
    return statements.verifyUser.run(walletAddress, now, discordId);
  },

  // Get all verified users (for scheduled re-verification)
  getAllVerifiedUsers() {
    return statements.getAllVerified.all();
  },

  // Clear wallet (when NFT is transferred)
  clearWallet(discordId) {
    return statements.clearWallet.run(discordId);
  }
};
