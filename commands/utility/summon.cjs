const Lobby = require("../../class/lobby.js")
const xmljs = require("xml-js");
const fs = require("pn/fs");

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js'); // SlashCommandBuilder

module.exports = {
  name: "ping",
  description: "Replies with Pong!",
  execute: async (interaction, server) => { //server is centerpoint of data in the application
    const mainMenuRow = new ActionRowBuilder()
    mainMenuRow.addComponents(new ButtonBuilder().setCustomId("startgame").setLabel("Queue Up").setStyle(ButtonStyle.Primary));
    mainMenuRow.addComponents(new ButtonBuilder().setCustomId("hostlobby").setLabel("Host Lobby").setStyle(ButtonStyle.Primary));
    mainMenuRow.addComponents(new ButtonBuilder().setCustomId("joinlobby").setLabel("Join Lobby").setStyle(ButtonStyle.Primary));
    mainMenuRow.addComponents(new ButtonBuilder().setCustomId("langselect").setLabel("Change Language").setStyle(ButtonStyle.Primary));
		let memberResponse = await interaction.reply({
      content: "Main Menu",
      components: [mainMenuRow]
    });
    const collector = memberResponse.createMessageComponentCollector({
      time: 60000,
    });
    collector.on('collect', async (interaction) => {
      console.log(interaction.customId)
      if (interaction.customId === "startgame"){

      } else if (interaction.customId === "hostlobby") {
        lobbyCode = ""
        for (let i = 0; i < 16; i++) {
          lobbyCode += Math.floor(Math.random() * 10)
        }
        let lobbyVar = new Lobby.Lobby(interaction.author, lobbyCode, server)
      } else if (interaction.customId === "langselect") {
        
      }
    });
	},
};