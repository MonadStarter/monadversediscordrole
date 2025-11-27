const GUILD_ID = process.env.GUILD_ID || '1260293177181736981';
const ROLE_ID = process.env.ROLE_ID || '1443635702238544046';

let discordClient = null;

/**
 * Set the Discord client reference
 * @param {Client} client - Discord.js client instance
 */
function setClient(client) {
  discordClient = client;
}

/**
 * Get the guild and member
 * @param {string} discordId - Discord user ID
 * @returns {Promise<{guild: Guild, member: GuildMember}>}
 */
async function getGuildAndMember(discordId) {
  if (!discordClient) {
    throw new Error('Discord client not initialized');
  }

  const guild = await discordClient.guilds.fetch(GUILD_ID);
  if (!guild) {
    throw new Error('Guild not found');
  }

  const member = await guild.members.fetch(discordId).catch(() => null);
  if (!member) {
    throw new Error('Member not found in guild');
  }

  return { guild, member };
}

/**
 * Assign the NFT holder role to a user
 * @param {string} discordId - Discord user ID
 * @returns {Promise<boolean>} - Success status
 */
async function assignRole(discordId) {
  try {
    const { member } = await getGuildAndMember(discordId);

    if (member.roles.cache.has(ROLE_ID)) {
      console.log(`User ${discordId} already has the role`);
      return true;
    }

    await member.roles.add(ROLE_ID);
    console.log(`Assigned role to user ${discordId}`);
    return true;
  } catch (error) {
    console.error(`Error assigning role to ${discordId}:`, error.message);
    return false;
  }
}

/**
 * Remove the NFT holder role from a user
 * @param {string} discordId - Discord user ID
 * @returns {Promise<boolean>} - Success status
 */
async function removeRole(discordId) {
  try {
    const { member } = await getGuildAndMember(discordId);

    if (!member.roles.cache.has(ROLE_ID)) {
      console.log(`User ${discordId} doesn't have the role`);
      return true;
    }

    await member.roles.remove(ROLE_ID);
    console.log(`Removed role from user ${discordId}`);
    return true;
  } catch (error) {
    console.error(`Error removing role from ${discordId}:`, error.message);
    return false;
  }
}

/**
 * Check if a user has the NFT holder role
 * @param {string} discordId - Discord user ID
 * @returns {Promise<boolean>}
 */
async function hasRole(discordId) {
  try {
    const { member } = await getGuildAndMember(discordId);
    return member.roles.cache.has(ROLE_ID);
  } catch (error) {
    return false;
  }
}

module.exports = {
  setClient,
  assignRole,
  removeRole,
  hasRole
};
