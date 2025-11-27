const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Use /data directory on Render (persistent disk), fallback to local for development
const dbPath = process.env.NODE_ENV === 'production'
  ? '/data/verifications.db'
  : path.join(__dirname, '../../verifications.db');

let db = null;

// Initialize database
async function initDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Initialize schema
  db.run(`
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

  // Create index
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_verification_token ON verifications(verification_token)
  `);

  // Save to file
  saveDb();

  return db;
}

// Save database to file
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(dbPath, buffer);
}

// Helper to get first row
function getOne(stmt) {
  const results = stmt.getAsObject();
  stmt.free();
  return Object.keys(results).length > 0 ? results : null;
}

// Helper to get all rows
function getAll(sql) {
  const results = [];
  const stmt = db.prepare(sql);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

module.exports = {
  initDb,

  // Create or update verification token for a user
  createVerificationToken(discordId, token, expiresAt) {
    db.run(`
      INSERT INTO verifications (discord_id, verification_token, token_expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET
        verification_token = excluded.verification_token,
        token_expires_at = excluded.token_expires_at
    `, [discordId, token, expiresAt]);
    saveDb();
  },

  // Get verification record by token
  getByToken(token) {
    const stmt = db.prepare('SELECT * FROM verifications WHERE verification_token = ?');
    stmt.bind([token]);
    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  },

  // Get verification record by Discord ID
  getByDiscordId(discordId) {
    const stmt = db.prepare('SELECT * FROM verifications WHERE discord_id = ?');
    stmt.bind([discordId]);
    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  },

  // Mark user as verified with wallet address
  verifyUser(discordId, walletAddress) {
    const now = Math.floor(Date.now() / 1000);
    db.run(`
      UPDATE verifications
      SET wallet_address = ?, verified_at = ?, verification_token = NULL, token_expires_at = NULL
      WHERE discord_id = ?
    `, [walletAddress, now, discordId]);
    saveDb();
  },

  // Get all verified users (for scheduled re-verification)
  getAllVerifiedUsers() {
    return getAll('SELECT * FROM verifications WHERE wallet_address IS NOT NULL');
  },

  // Clear wallet (when NFT is transferred)
  clearWallet(discordId) {
    db.run('UPDATE verifications SET wallet_address = NULL, verified_at = NULL WHERE discord_id = ?', [discordId]);
    saveDb();
  }
};
