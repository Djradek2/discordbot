const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js'); // SlashCommandBuilder

module.exports = {
  name: "ping",
  description: "Replies with Pong!",
  execute: async (interaction) => {
    const mainMenuRow = new ActionRowBuilder()
    mainMenuRow.addComponents(new ButtonBuilder().setCustomId("start").setLabel("Queue Up").setStyle(ButtonStyle.Primary));
    mainMenuRow.addComponents(new ButtonBuilder().setCustomId("host").setLabel("Host Lobby").setStyle(ButtonStyle.Primary));
    mainMenuRow.addComponents(new ButtonBuilder().setCustomId("lang").setLabel("Change Language").setStyle(ButtonStyle.Primary));
		await interaction.reply({
      content: "Main Menu",
      components: [mainMenuRow]
    });
	},
};