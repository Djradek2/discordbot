const Lobby = require("../../class/lobby.js")
const Helper = require("../../class/utility/helper.js")
const xmljs = require("xml-js");
const fs = require("pn/fs");

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js'); // SlashCommandBuilder

module.exports = {
  name: "summon",
  description: "Summons the main menu of the bot!",
  execute: async (interaction, server) => { //server is centerpoint of data in the application
    const mainMenuRow = new ActionRowBuilder()
    mainMenuRow.addComponents(new ButtonBuilder().setCustomId("queueUp").setLabel("Queue Up").setStyle(ButtonStyle.Primary));
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
      if (interaction.customId === "queueUp"){

      } else if (interaction.customId === "hostlobby") {
        let lobbyVar = new Lobby.Lobby(interaction, Helper.generateId16(), server)
        const startGameRow = new ActionRowBuilder()
        startGameRow.addComponents(new ButtonBuilder().setCustomId("startgame").setLabel("Start game").setStyle(ButtonStyle.Primary));
        let memberResponse2 = await interaction.reply({
          content: "Created lobby with code: " + lobbyVar.lobbyCode,
          components: [startGameRow],
          ephemeral: true
        })
        const message = await memberResponse2.interaction.fetchReply(); // You need the message object
        const filter = i => i.customId === 'ephemeral_click' && i.user.id === memberResponse2.interaction.user.id;
        const lobbyCollector = message.createMessageComponentCollector({
          time: 60000,
        });
        lobbyCollector.on('collect', async (interaction) => {
          interaction.deferUpdate()
          lobbyVar.startGame()
        })
      } else if (interaction.customId === "joinlobby") {
        
      } else if (interaction.customId === "langselect") {
        
      }
    });
	},
};