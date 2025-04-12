const xmljs = require("xml-js");
const fs = require("pn/fs");
const svg2png = require("svg2png");
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');

let colors = ["F0F0F0", "#3f47cc", "#ed1b24", "#26b050", "#fdf003", "#9dd7eb", "#ff01f5", "#7f7f7f", "#fec80e"]

class Game {
  players = null //interaction.user -> interaction
  listeners = new Map() //interaction.user -> 
  regions = new Map() //regionId -> interaction.user
  regionNames = new Map() //id -> region name
  regionBorders = new Map() //id -> array of bordering regions
  mapBuffer = null //based off map
  dataBuffer = null //based off map
  pngMap = null
  currentIntent = new Map //interaction.user -> region_id
  currentAnswers = new Map() //player_id -> answer
  gameState = "setup" //setup, conquer, battle, finish

  capitalTimer = 20 //<t:1743937140:R>
  conquestTimer = 20
  selectQTest = 15
  speedQTimer = 15

  constructor (mapName, players) { //write iteslf to server
    this.players = players
    this.mapBuffer = xmljs.xml2js(fs.readFileSync("./maps/" + mapName + ".svg", "utf8"), { compact: true }) //this should actually already be loaded on server start and just be passed to the buffer
    this.dataBuffer = xmljs.xml2js(fs.readFileSync("./maps/" + mapName + ".xml", "utf8"), { compact: true })
    this.loadRegionData()

    console.log(players)

    this.startSetup()
  }

  loadRegionData () {
    this.dataBuffer.map.region.forEach((region) => {
      this.regions.set(region.id._text, 0)
      this.regionNames.set(region.id._text, region.name._text)
      let borderingRegions = []
      if (region.borders.border.length > 1) {
        region.borders.border.forEach((border) => {
          borderingRegions.push(border._text)
        })
      } else {
        borderingRegions.push(region.borders.border._text)
      }
      this.regionBorders.set(region.id._text, region.borders)
    })
  }

  async updateVisualization () { //still needs to show capitals, and region numbers
    let visualBuffer = this.mapBuffer
    visualBuffer.svg.path.forEach((path) => {
      path._attributes.style = `fill: ${colors[this.regions.get(path._attributes.id)]}; stroke: rgb(0, 0, 0);`
    })
    const updatedBuffer = xmljs.js2xml(visualBuffer, { compact: true, spaces: 2 })
    this.pngMap = await svg2png(updatedBuffer)
  }

  sendMapToPlayers () {
    this.players.forEach(client => {
      client.reply({
        content: "Current map:",
        files: [{ attachment: this.pngMap }]
      })
    });
  }

  setOwner (regionId, playerId) {
    console.log(playerId.username + " became owner of " + regionId)
    this.regions.set(String(regionId), playerId)
  }

  async startSetup () {
    const selectionRow = new ActionRowBuilder()
    const selectTest = new StringSelectMenuBuilder().setCustomId('startLocation').setPlaceholder('Select capital location!').addOptions(this.getAllRegionsToSelect());
    selectionRow.addComponents(selectTest)
    await this.updateVisualization()
    this.players.forEach(async (interaction, user) => {
      let memberResponse = await interaction.followUp({ //add capitalTimer
        content: "Capital selection, seconds remaining: " + "<t:" + (Math.floor(Date.now() / 1000, 1000) + this.capitalTimer) + ":R>",
        components: [selectionRow],
        files: [{ attachment: this.pngMap }],
        ephemeral: true
      })
      const lobbyCollector = memberResponse.createMessageComponentCollector({
        time: 6000000,
      });
      lobbyCollector.on('collect', async (interaction2) => { //doesnt want deferUpdate for some reason
        interaction2.deferUpdate() //deferUpdate seems to not be used for editReply
        this.currentIntent.set(user, interaction2.values[0])
      })
      //this.listeners.set(user, lobbyCollector)
    })
    setTimeout(() => {
      this.capitalHandler()
    }, this.capitalTimer * 100)
  }

  capitalHandler () {
    if (this.currentIntent.length !== this.players.size) { //randomize players who dont have intent
      this.players.forEach((value, key) => {
        if (!this.currentIntent.get(key)) {
          this.currentIntent.set(key, Math.floor(Math.random() * this.regions.size))
        }
      })
    }

    let contested = new Map() //regionId -> [interaction.user]
    this.currentIntent.forEach((value, key) => { //regionId, interaction.user
      if (!contested.get(value)) {
        contested.set(value, [])
      }
      let contestingPlayers = contested.get(value)
      contestingPlayers.push(key)
      contested.set(value, contestingPlayers)
    })

    contested.forEach((contestants, regionId) => {
      if (contestants.length > 1) {

      } else {
        this.setOwner(regionId, contestants[0])
      }
    });
  }

  startRound () {

  }

  endRound () {
    //will update the player Interactions, which also means every message send needs error handling...
  }

  addAttackableRegionsToMenu () {

  }

  getAllRegionsToSelect () {
    let allRegions = []
    this.regionNames.forEach((name, id) => {
      allRegions.push(new StringSelectMenuOptionBuilder().setLabel(name).setDescription(id).setValue(id))
    })
    return allRegions
  }

  getConquerableRegionsToSelect () {
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