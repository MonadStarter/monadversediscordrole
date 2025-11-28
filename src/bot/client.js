const { Client, GatewayIntentBits, Collection } = require('discord.js');
const verifyCommand = require('./commands/verifymonadversenft');
const roleManager = require('../services/roleManager');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Store commands in a collection
client.commands = new Collection();
client.commands.set(verifyCommand.data.name, verifyCommand);

// Handle ready event
client.once('ready', () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
  roleManager.setClient(client);
});

// Handle interaction (slash commands and buttons)
client.on('interactionCreate', async (interaction) => {
  // Handle button interactions
  if (interaction.isButton()) {
    try {
      // Route to the verify command's button handler
      if (interaction.customId === 'remove_wallet') {
        await verifyCommand.handleButton(interaction);
      }
    } catch (error) {
      console.error('Error handling button interaction:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Something went wrong. Please try again.', ephemeral: true });
      }
    }
    return;
  }

  // Handle slash commands
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);

    const errorMessage = 'There was an error executing this command. Please try again later.';

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

module.exports = client;
