const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const db = require('../../database/db');
const { removeRole } = require('../../services/roleManager');

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
    const isAlreadyVerified = existing && existing.wallet_address;

    // Generate verification token
    const token = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + (TOKEN_EXPIRY_MINUTES * 60);

    // Store token in database
    db.createVerificationToken(discordId, token, expiresAt);

    // Create verification URL
    const verifyUrl = `${BASE_URL}/verify?token=${token}`;

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x836EF9)
      .setTitle('Monadverse NFT Verification')
      .setDescription(isAlreadyVerified
        ? `You're already verified with wallet \`${existing.wallet_address.slice(0, 6)}...${existing.wallet_address.slice(-4)}\``
        : 'Connect your wallet to verify your Monadverse NFT ownership and receive the holder role.')
      .addFields({
        name: 'Safe & Secure',
        value: 'You will only be asked to sign a message to prove wallet ownership. No transactions, no gas fees, no token approvals.'
      })
      .setFooter({ text: `Link expires in ${TOKEN_EXPIRY_MINUTES} minutes` })
      .setTimestamp();

    // Create buttons
    const row = new ActionRowBuilder();

    // Verify button
    row.addComponents(
      new ButtonBuilder()
        .setLabel(isAlreadyVerified ? 'Verify Different Wallet' : 'Verify Wallet')
        .setStyle(ButtonStyle.Link)
        .setURL(verifyUrl)
    );

    // Remove wallet button (only show if already verified)
    if (isAlreadyVerified) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('remove_wallet')
          .setLabel('Remove Wallet')
          .setStyle(ButtonStyle.Danger)
      );
    }

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  },

  // Handle button interactions
  async handleButton(interaction) {
    if (interaction.customId === 'remove_wallet') {
      const discordId = interaction.user.id;

      // Remove wallet from database
      db.removeWallet(discordId);

      // Remove Discord role
      await removeRole(discordId);

      // Update embed
      const embed = new EmbedBuilder()
        .setColor(0x836EF9)
        .setTitle('Wallet Removed')
        .setDescription('Your wallet has been disconnected and the holder role has been removed.\n\nUse `/verifymonadversenft` again to verify with a new wallet.')
        .setTimestamp();

      await interaction.update({
        embeds: [embed],
        components: []
      });
    }
  }
};
