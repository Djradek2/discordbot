const xmljs = require("xml-js");
const fs = require("pn/fs");
const svg2png = require("svg2png");
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');

let colors = ["F0F0F0", "#3f47cc", "#ed1b24", "#26b050", "#fdf003", "#9dd7eb", "#ff01f5", "#7f7f7f", "#fec80e"]

class Game {
  players = []
  regions = new Map() //id -> player
  mapBuffer = null //based off map
  dataBuffer = null //based off map
  pngMap = null
  currentAnswers = new Map //player_id -> answer

  constructor (mapName, players) { //write iteslf to server
    this.players = players
    this.mapBuffer = xmljs.xml2js(fs.readFileSync(mapName + ".svg", "utf8"), { compact: true }) //this should actually already be loaded on server start and just be passed to the buffer
    this.dataBuffer = xmljs.xml2js(fs.readFileSync(mapName + ".xml", "utf8"), { compact: true })
    this.dataBuffer.map.region.forEach((region) => {
      this.regions.set(region.id._text, 0)
    })
    this.startSetup()
  }

  async updateVisualization () { //still needs to show capitals, and region numbers
    let visualBuffer = this.mapBuffer
    visualBuffer.svg.path.forEach((path) => {
      path._attributes.style = `fill: ${colors[this.regions.get(path._attributes.id)]}; stroke: rgb(0, 0, 0);`
    })
    const updatedBuffer = xmljs.js2xml(visualBuffer, { compact: true, spaces: 2 })
    this.pngMap = await svg2png(updatedBuffer)
    //fs.writeFileSync("visualized_game.svg", updatedBuffer, "utf8");
  }

  sendMapToPlayers () {
    players.forEach(client => {
      client.reply({
        content: "Current map:",
        files: [{ attachment: this.pngMap }]
      })
    });
  }

  setOwner (regionId, playerId) {
    this.regions.set(String(regionId), playerId)
  }

  async startSetup () {
    const selectionRow = new ActionRowBuilder()
    const selectTest = new StringSelectMenuBuilder().setCustomId('startLocation').setPlaceholder('Select your capital!').addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Bulbasaur')
        .setDescription('The dual-type Grass/Poison Seed Pokémon.')
        .setValue('bulbasaur'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Charmander')
        .setDescription('The Fire-type Lizard Pokémon.')
        .setValue('charmander'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Squirtle')
        .setDescription('The Water-type Tiny Turtle Pokémon.')
        .setValue('squirtle'),
    );
    selectionRow.addComponents(selectTest)
    await this.updateVisualization()
    this.players[0].editReply({
      content: "Current map:",
      components: [selectionRow],
      files: [{ attachment: this.pngMap }]
    })
    //this.players[0].followUp({})
    //send Map
    //select capitals
  }

  startRound () {

  }

  getAllRegions () {
    //for capital selection
  }

  getConquerableRegions () {
    //first border, if none then anywhere
  }

  serveChoiceQuestion () {

  }

  serveSpeedQuestion () {

  }

  setAnswer (player, answer) {

  }

  checkAnswers () {

  }

  clearAnswers () {
    //just foreach over the answer holder
  }
}

module.exports = {
  Game
}