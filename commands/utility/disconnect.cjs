const Lobby = require("../../class/lobby.js")
const Helper = require("../../class/utility/helper.js")
const xmljs = require("xml-js");
const fs = require("pn/fs");

module.exports = {
  name: "disconnect",
  description: "Disconnects you from your current lobby/game!",
  execute: async (interaction, server) => { //server is centerpoint of data in the application
    server.clearPlayerFromOldGame(interaction)
    await interaction.reply({
      content: "Disconnected!",
      ephemeral: true
    })
	},
};