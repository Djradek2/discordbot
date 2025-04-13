const Lobby = require("../../class/lobby.js")
const Helper = require("../../class/utility/helper.js")
const xmljs = require("xml-js");
const fs = require("pn/fs");

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle, ModalBuilder } = require('discord.js'); // SlashCommandBuilder

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
      components: [mainMenuRow],
      ephemeral: true
    });
    const collector = memberResponse.createMessageComponentCollector({
      time: 60000,
    });
    collector.on('collect', async (interaction2) => {
      if (interaction2.customId === "queueUp"){

      } else if (interaction2.customId === "hostlobby") {
        interaction2.deferUpdate()
        let lobbyVar = new Lobby.Lobby(interaction, Helper.generateId16(), server)
        const startGameRow = new ActionRowBuilder()
        startGameRow.addComponents(new ButtonBuilder().setCustomId("startgame").setLabel("Start game").setStyle(ButtonStyle.Primary));
        let memberResponse2 = await interaction.followUp({
          content: "Created lobby with code: " + lobbyVar.lobbyCode,
          components: [startGameRow],
          ephemeral: true
        })
        let lobbyCollector = memberResponse2.createMessageComponentCollector({
          time: 6000000,
        });
        lobbyCollector.on('collect', async (interaction3) => { //this never stops collecting with editReply...
          interaction3.deferUpdate()
          lobbyVar.startGame()
        })
      } else if (interaction2.customId === "joinlobby") {
        //interaction2.deferUpdate()
        
        const joinModal = new ModalBuilder().setCustomId('lobbyModal').setTitle('Enter Lobby Code')
        const joinLobbyRow = new ActionRowBuilder()
        joinLobbyRow.addComponents(new TextInputBuilder().setCustomId("lobbycode").setLabel("lobby id").setStyle(TextInputStyle.Short));
        joinModal.addComponents(joinLobbyRow)

        await interaction2.showModal(joinModal)
        let modalCollector = await interaction2.awaitModalSubmit({
          time: 6000000,
          filter: i => i.user.id === interaction2.user.id,
        })
        if (modalCollector) {
          if (modalCollector.fields.fields.get('lobbycode').value) {
            server.attemptJoinLobby(modalCollector.fields.fields.get('lobbycode').value, interaction2)
          }
        }
        // let memberResponse2 = await interaction.followUp({
        //   content: "Enter lobby code",
        //   ephemeral: true
        // })
        // let lobbyCollector = memberResponse2.createMessageComponentCollector({
        //   time: 6000000,
        // });
        // lobbyCollector.on('collect', async (interaction3) => { //never stops collecting if using editReply instead of followUp
        //   interaction3.deferUpdate()
        //   console.log("lobby join attempt")
        // })
      } else if (interaction2.customId === "langselect") {
        
      }
    });
	},
};