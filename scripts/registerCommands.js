/**
 * Register Discord slash commands
 * Run this once: node scripts/registerCommands.js
 */

require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !GUILD_ID) {
  console.error('Missing required environment variables:');
  console.error('- DISCORD_TOKEN:', DISCORD_TOKEN ? 'Set' : 'Missing');
  console.error('- DISCORD_CLIENT_ID:', DISCORD_CLIENT_ID ? 'Set' : 'Missing');
  console.error('- GUILD_ID:', GUILD_ID ? 'Set' : 'Missing');
  process.exit(1);
}

// Define command directly to avoid loading database
const verifyCommand = new SlashCommandBuilder()
  .setName('verifymonadversenft')
  .setDescription('Verify your Monadverse NFT ownership to get the holder role');

const commands = [
  verifyCommand.toJSON()
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log('Started refreshing application (/) commands.');

    // Register commands for the specific guild (faster for testing)
    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('Successfully registered application commands!');
    console.log('Commands registered:');
    commands.forEach(cmd => {
      console.log(`  - /${cmd.name}: ${cmd.description}`);
    });

  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

registerCommands();
