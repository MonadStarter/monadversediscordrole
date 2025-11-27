require('dotenv').config();

const express = require('express');
const path = require('path');
const discordClient = require('./bot/client');
const verifyRoutes = require('./routes/verify');
const { startScheduler } = require('./services/scheduler');

const PORT = process.env.PORT || 3000;

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api', verifyRoutes);

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    discord: discordClient.isReady() ? 'connected' : 'disconnected'
  });
});

// Serve verification page for /verify route
app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Login Discord bot
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
  console.error('ERROR: DISCORD_TOKEN is not set in environment variables');
  process.exit(1);
}

discordClient.login(DISCORD_TOKEN)
  .then(() => {
    console.log('Discord bot login initiated...');
    // Start the scheduler after bot is ready
    startScheduler();
  })
  .catch((error) => {
    console.error('Failed to login to Discord:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  discordClient.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  discordClient.destroy();
  process.exit(0);
});
