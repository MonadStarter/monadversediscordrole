const { SlashCommandBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const db = require('../../database/db');

const BASE_URL = process.env.BASE_URL || 'https://monadverse-verification.onrender.com';
const TOKEN_EXPIRY_MINUTES = 15;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verifymonadversenft')
    .setDescription('Verify your Monadverse NFT ownership to get the holder role'),

  async execute(interaction) {
    const discordId = interaction.user.id;

    // Check if user is already verified
    const existing = db.getByDiscordId(discordId);
    if (existing && existing.wallet_address) {
      await interaction.reply({
        content: `You're already verified with wallet \`${existing.wallet_address.slice(0, 6)}...${existing.wallet_address.slice(-4)}\`\n\nWant to re-verify with a different wallet? Click the link below to update your verification.`,
        ephemeral: true
      });
    }

    // Generate verification token
    const token = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + (TOKEN_EXPIRY_MINUTES * 60);

    // Store token in database
    db.createVerificationToken(discordId, token, expiresAt);

    // Create verification URL
    const verifyUrl = `${BASE_URL}/verify?token=${token}`;

    await interaction.reply({
      content: `**Monadverse NFT Verification**\n\nClick the link below to verify your NFT ownership:\n${verifyUrl}\n\n⏰ This link expires in ${TOKEN_EXPIRY_MINUTES} minutes.\n\n*After connecting your wallet and signing the verification message, you'll receive the **Monadverse Holder** role if you own the NFT.*`,
      ephemeral: true
    });
  }
};
