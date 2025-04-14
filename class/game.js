const xmljs = require("xml-js");
const fs = require("pn/fs");
const svg2png = require("svg2png");
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, ModalBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

let colors = ["F0F0F0", "#3f47cc", "#ed1b24", "#26b050", "#fdf003", "#9dd7eb", "#ff01f5", "#7f7f7f", "#fec80e"]

class Game {
  players = null //interaction.user -> interaction
  playerColorIds = new Map() //interaction.user -> 1-8 
  regionOwners = new Map() //regionId -> interaction.user
  regionNames = new Map() //id -> region name
  regionBorders = new Map() //id -> array of bordering regions
  regionScores = new Map() //id -> value (capitals are arbitrary 500)
  mapBuffer = null //based off map
  dataBuffer = null //based off map
  pngMap = null
  currentIntent = new Map //interaction.user -> region_id
  gameState = "setup" //setup, conquer, battle, finish

  capitalTimer = 10 //<t:1743937140:R>
  conquestTimer = 20
  selectQTest = 15
  speedQTimer = 15

  currentChoiceAnswers = new Map()
  currentSpeedAnswers = new Map() //region -> correctAnswer
  evalChoiceQuestions = new Map() //region_id -> {int.user -> answer}
  evalSpeedQuestions = new Map()
  playerWonQuestion = new Map() //int.user -> bool  

  currentConquerRound = 1
  maxConquerRound = 3
  currentBattleRound = 1
  maxBattleRound = 3 //players * wanted 
  
  bonusDefenseScore = new Map() //int.user -> score
  currentScores = new Map() //int.user -> score


  constructor (mapName, players) { //write iteslf to server
    this.players = players
    this.mapBuffer = xmljs.xml2js(fs.readFileSync("./maps/" + mapName + ".svg", "utf8"), { compact: true }) //this should actually already be loaded on server start and just be passed to the buffer
    this.dataBuffer = xmljs.xml2js(fs.readFileSync("./maps/" + mapName + ".xml", "utf8"), { compact: true })
    this.loadRegionData()
    this.startSetup()
  }

  loadRegionData () {
    this.dataBuffer.map.region.forEach((region) => {
      this.regionOwners.set(region.id._text, 0)
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
      if (this.regionOwners.get(path._attributes.id) !== 0) {
        path._attributes.style = `fill: ${colors[this.playerColorIds.get(this.regionOwners.get(path._attributes.id))]}; stroke: rgb(0, 0, 0);`
      } else {
        path._attributes.style = `fill: ${colors[0]}; stroke: rgb(0, 0, 0);`
      }
    })
    const updatedBuffer = xmljs.js2xml(visualBuffer, { compact: true, spaces: 2 })
    this.pngMap = await svg2png(updatedBuffer)
  }

  sendMapToPlayers () {
    this.players.forEach(client => {
      client.followUp({
        content: "Current map:",
        files: [{ attachment: this.pngMap }],
        ephemeral: true,
      })
    });
  }

  setOwner (regionId, playerId) {
    console.log(playerId.username + " became owner of " + regionId)
    this.regionOwners.set(String(regionId), playerId)
  }

  giveOutColorsIds () {
    let increment = 1
    this.players.forEach((interaction, player) => {
      this.playerColorIds.set(player, increment)
      increment++
    })
  }

  async startSetup () {
    this.giveOutColorsIds()
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
        time: this.capitalTimer * 1000,
      });
      lobbyCollector.on('collect', async (interaction2) => { //doesnt want deferUpdate for some reason
        interaction2.deferUpdate() //deferUpdate seems to not be used for editReply
        this.players.set(interaction2.user, interaction2)
        this.currentIntent.set(user, interaction2.values[0])
      })
    })
    setTimeout(() => {
      this.capitalHandler()
    }, this.capitalTimer * 1000)
  }

  async startConquerTurn () {

  }
 
  handleSetupLosers () {
    this.playerWonQuestion.forEach((won, player) => {
      if(!won) {
        let openRegions = []
        this.regionOwners.forEach((owner, region) => {
          if (owner === 0) {
            openRegions.push(region)
          }
        })
        this.setOwner(openRegions[Math.floor(Math.random() * openRegions.length)], player)
      }
    })
  }

  async capitalHandler () {
    if (this.currentIntent.length !== this.players.size) { //randomize players who dont have intent
      this.players.forEach((value, key) => {
        if (!this.currentIntent.get(key)) {
          this.currentIntent.set(key, Math.floor(Math.random() * this.regionOwners.size))
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
        this.serveSpeedQuestion(contestants, regionId)
      } else {
        this.playerWonQuestion.set(contestants[0], true)
        this.setOwner(regionId, contestants[0])
      }
    });
    setTimeout(() => {
      this.evaluateAnswers()
    }, this.capitalTimer * 1000)
  }

  evaluateAnswers () {
    this.evalSpeedQuestions.forEach((answers, region) => {
      let playerCloseness = [] //array of maps
      let closestPlayer = null
      let closestDistance = null
      let closestTimestamp = null
      let correctAnswer = this.currentSpeedAnswers.get(region)
      answers.forEach((answer, player) => { //answer is [answer, timestamp]
        let playerAnswer = new Map().set(player, ([Math.abs(correctAnswer - answer[0]), answer[1]]))
        playerCloseness.push(playerAnswer)
      })
      playerCloseness.forEach((innerArray) => {
        innerArray.forEach((distance, player) => {
          if (closestPlayer === null) {
            closestPlayer = player
            closestDistance = distance[0]
            closestTimestamp = distance[1]
            this.playerWonQuestion.set(player, true)
          } else if (distance[0] < closestDistance || (distance[0] <= closestDistance && distance[1] < closestTimestamp)) {
            this.playerWonQuestion.set(closestPlayer, false)
            closestPlayer = player
            closestDistance = distance[0]
            closestTimestamp = distance[1]
            this.playerWonQuestion.set(player, true)
          } else {
            this.playerWonQuestion.set(player, false)
          }
        })
      })
      this.setOwner(region, closestPlayer) //problem with capitals
    })
    this.endRound()
    //this.evalChoiceQuestions.forEach((answers, region) => {}
  }

  startRound () {

  }

  async endRound () {
    if (this.gameState === "setup") {
      this.handleSetupLosers()
      await this.updateVisualization()
      this.sendMapToPlayers() //not necessary
      this.gameState = "conquer"
      this.cleanTemporaryVariables()
      this.startConquerTurn()
    }
    //will update the player Interactions, which also means every message send needs error handling...
    //clean all the temporary game stuff
    //start the next round based off the round settings
  }

  cleanTemporaryVariables() {

  }

  addConquerableRegionsToMenu () {
    let playerConquerableRegions = this.getConquerableRegionsOfPlayers()
    let playerConquerRows = new Map()
    
    playerConquerableRegions.forEach((regions, player) => {
      let selectionRow = new ActionRowBuilder()
      let selectConquer = new StringSelectMenuBuilder().setCustomId('conquerLocation').setPlaceholder('Select region to conquer!')
      regions.forEach((region) => {
        selectConquer.addOptions(StringSelectMenuOptionBuilder().setLabel(this.regionNames.get(region)).setDescription(region).setValue(region))
      })
      selectionRow.addComponents(selectConquer)
      playerConquerRows.set(player, selectionRow)
    })
    return playerConquerRows
  }

  getConquerableRegionsOfPlayers () {
    let conquerableRegions = new Map()
    this.regionOwners.forEach((owner, region) => {
      if (!conquerableRegions.has(owner)) {
        conquerableRegions.set(owner, new Set())
      }
      let borderIds = this.borderingRegions.get(region)
      let borderSet = conquerableRegions.get(owner)
      borderIds.forEach((borderingId) => {
        if (this.regionOwners.get(borderingId) === 0) {
          borderSet.add(borderingId)
        }
      })
      if (borderSet.size === 0) {
        borderSet = this.getUnownedRegions()
      }
      conquerableRegions.set(owner, borderSet)
    })
    return conquerableRegions
  }

  getUnownedRegions () {
    let unownedRegions = new Set()
    this.regionOwners.forEach((owner, region) => {
      if (owner === 0) {
        unownedRegions.add(region)
      }
    })
    return unownedRegions
  }

  addAttackableRegionsToMenu () { //players without a region cannot attack capitals

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

  async serveSpeedQuestion (players, region) { //this will only save the player answers (and their time of entry) and setup the correct 
    //get the actual question here
    this.currentSpeedAnswers.set(region, 10) //put in the proper answer

    const questionModal = new ModalBuilder().setCustomId('speedQuestion').setTitle('QUESTION TEXT HERE')
    const questionRow = new ActionRowBuilder()
    questionRow.addComponents(new TextInputBuilder().setCustomId("questionAnswer").setLabel("answer").setStyle(TextInputStyle.Short)); //should only accept numbers
    questionModal.addComponents(questionRow)

    players.forEach(async (contestant) => {
      let interaction = this.players.get(contestant)
      const startAnswerRow = new ActionRowBuilder()
      startAnswerRow.addComponents(new ButtonBuilder().setCustomId("questionAnswer").setLabel("Answer question").setStyle(ButtonStyle.Primary));
      let memberResponse = await interaction.followUp({
        content: "Q: QUESTION TEXT HERE",
        components: [startAnswerRow],
        ephemeral: true
      })
      let lobbyCollector = memberResponse.createMessageComponentCollector({
        time: this.capitalTimer * 1000,
      });

      lobbyCollector.on('collect', async (interaction2) => { //this never stops collecting with editReply...
        await interaction2.showModal(questionModal)
        let modalCollector = await interaction2.awaitModalSubmit({
          time: this.capitalTimer * 1000,
          filter: i => i.user.id === interaction2.user.id,
        })
        if (modalCollector) {
          if (modalCollector.fields.fields.get('questionAnswer').value) {
            modalCollector.deferReply({ ephemeral: true })
            if (!this.evalSpeedQuestions.has(region)) {
              this.evalSpeedQuestions.set(region, new Map())
            }
            let answerMap = this.evalSpeedQuestions.get(region)
            let answerToSet = modalCollector.fields.fields.get('questionAnswer').value.replace(/\D/g, '')
            if (answerToSet.length === 0) {
              answerToSet = 0
            }
            answerMap.set(interaction2.user, [answerToSet, modalCollector.createdTimestamp])
            this.evalSpeedQuestions.set(region, answerMap)
          }
        }
      })
    })
  }

  calculateScore () {

  }

  getPlacements () {

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