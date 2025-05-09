const xmljs = require("xml-js");
const fs = require("pn/fs");
const Helper = require("./utility/helper.js")
const svg2png = require("svg2png");
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, ModalBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

let colors = ["F0F0F0", "#3f47cc", "#ed1b24", "#26b050", "#fdf003", "#9dd7eb", "#ff01f5", "#7f7f7f", "#fec80e"]
let negativeColors = ["#000000", "#ffffff", "#ffffff", "#ffffff", "#000000", "#000000", "#ffffff", "#ffffff", "#000000"] //should be white or black to negate the background

class Game {
  players = null //interaction.user -> interaction
  playerColorIds = new Map() //interaction.user -> 1-8 
  playersById = new Map //1-8 -> interaction.user
  regionOwners = new Map() //regionId -> interaction.user
  regionNames = new Map() //id -> region name
  regionBorders = new Map() //id -> array of bordering regions
  regionScores = new Map() //id -> value (capitals are arbitrary 500)
  capitalLives = new Map() //region -> int
  mapBuffer = null //based off map
  dataBuffer = null //based off map
  pngMap = null
  gameState = "setup" //setup, conquer, battle, finish
  turnState = "1" //if at choice or speed question state of the round

  capitalTimer = 10
  conquestTimer = 15
  battleTimer = 15
  selectQTest = 15
  speedQTimer = 15
  questionSets = []
  maxBattleRound = 3 //each player this many times
  capitalScore = 500
  capitalExtraLives = 2
  capitalLiveScore = 150
  defenseValue = 50
  regionScoreSetup = "weighted" //weighted or randomize or flat

  currentIntent = new Map() //interaction.user -> region_id
  currentChoiceAnswers = new Map()
  currentSpeedAnswers = new Map() //region -> correctAnswer
  evalChoiceQuestions = new Map() //region_id -> {int.user -> answer}
  evalSpeedQuestions = new Map()
  playerWonQuestion = new Map() //inter.user -> bool  

  currentBattlePlayer = 1
  currentBattleRound = 1

  bonusDefenseScores = new Map() //inter.user -> score
  playerScores = new Map() //inter.user -> score


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
      this.regionBorders.set(region.id._text, borderingRegions)
    })
  }

  setupRegionScores () {
    if (this.regionScoreSetup === "weighted") {
      let distribute = []
      for (let i = 0; i < this.regionOwners.size; i++) {
        let y = i
        if (y >= 4) {
          y = y % 4
        }
        distribute.push(100 + (y * 100))
      }
      distribute = Helper.shuffleArray(distribute)
      let i = 0
      this.regionOwners.forEach((owner, region) => {
        this.regionScores.set(region, distribute[i])
        i++
      })
    } else if (this.regionScoreSetup === "randomize") {
      this.regionOwners.forEach((owner, region) => {
        this.regionScores.set(region, Math.ceil(Math.random() * 4) * 100)
      })
    } else if (this.regionScoreSetup === "flat") {
      this.regionOwners.forEach((owner, region) => {
        this.regionScores.set(region, 200)
      })
    }
  }

  async updateVisualization () { //still needs to show region numbers
    this.calculateScores()
    let visualBuffer = structuredClone(this.mapBuffer)
    visualBuffer.svg.path.forEach((path) => {
      if (this.regionOwners.get(path._attributes.id) !== 0) {
        path._attributes.style = `fill: ${colors[this.playerColorIds.get(this.regionOwners.get(path._attributes.id))]}; stroke: rgb(0, 0, 0);`
      } else {
        path._attributes.style = `fill: ${colors[0]}; stroke: rgb(0, 0, 0);`
      }
    })
    let playerIterator = 1;
    visualBuffer.svg.text.forEach((textfield) => {
      if (textfield._attributes.region != null) {
        if (this.capitalLives.has(textfield._attributes.region)) {
          textfield._text = textfield._attributes.region + "-" + (parseInt(this.capitalScore) + parseInt(this.capitalLives.get(textfield._attributes.region) * this.capitalLiveScore))
        } else {
          textfield._text = textfield._attributes.region + "-" + this.regionScores.get(textfield._attributes.region)
        }
      } else {
        if (this.playersById.get(playerIterator)) {
          textfield._text = this.playersById.get(playerIterator).username.substring(0, 11) + " - " + this.playerScores.get(this.playersById.get(playerIterator)) // player username (up to 11 letters) and "- score"
        }
        playerIterator++
      }
    })
    visualBuffer.svg.g.forEach((group) => {
      if (this.capitalLives.get(group._attributes.name) === 1) {
        group.g[1] = ""
      } else if (this.capitalLives.get(group._attributes.name) === 0 || this.capitalLives.get(group._attributes.name) === undefined) {
        group.g = []
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

  giveOutIds () {
    let increment = 1
    this.players.forEach((interaction, player) => {
      this.playerColorIds.set(player, increment)
      this.playersById.set(increment, player)
      increment++
    })
  }

  async startSetup () {
    this.giveOutIds()
    this.setupRegionScores()
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
    //get a universal choice question, when both correct on contested region get a speed question

    let rowsToSend = this.addConquerableRegionsToMenu()
    await this.updateVisualization()
    this.players.forEach(async (interaction, user) => {
      let memberResponse = await interaction.followUp({ //add capitalTimer
        content: "Select region to conquer, seconds remaining: " + "<t:" + (Math.floor(Date.now() / 1000, 1000) + this.conquestTimer) + ":R>",
        components: [rowsToSend.get(user)],
        files: [{ attachment: this.pngMap }],
        ephemeral: true
      })
      const lobbyCollector = memberResponse.createMessageComponentCollector({
        time: this.conquestTimer * 1000,
      });
      lobbyCollector.on('collect', async (interaction2) => { //doesnt want deferUpdate for some reason
        interaction2.deferUpdate() //deferUpdate seems to not be used for editReply
        this.players.set(interaction2.user, interaction2)
        this.currentIntent.set(user, interaction2.values[0])
      })
    })
    setTimeout(() => {
      this.conquerHandler()
    }, this.conquestTimer * 1000)
  }

  conquerHandler () {
    let targettedRegions = new Map()
    this.currentIntent.forEach((region, player) => {
      if (!targettedRegions.has(region)) {
        targettedRegions.set(region, [player])
      } else {
        let targettingPlayers = targettedRegions.get(region)
        targettingPlayers.push(player)
        targettedRegions.set(region, targettingPlayers)
      }
    })
    targettedRegions.forEach((players, region) => {
      this.serveChoiceQuestion(players, region)
    })
    setTimeout(() => {
      this.evaluateAnswers()
    }, this.conquestTimer * 1000)
  }

  switchBattlePlayer () {
    if (this.currentBattlePlayer < this.players.size) {
      this.currentBattlePlayer++
    } else {
      this.currentBattlePlayer = 1
      this.currentBattleRound++
    }
  }
 
  async startBattleTurn () { //from player 1 - 8, player amount x battle rounds
    let user = this.playersById.get(this.currentBattlePlayer)
    let interaction = this.players.get(user)
    let rowsToSend = this.addAttackableRegionsToMenu()
    await this.updateVisualization()
    let memberResponse = await interaction.followUp({ //add capitalTimer
      content: "Select region to attack, seconds remaining: " + "<t:" + (Math.floor(Date.now() / 1000, 1000) + this.battleTimer) + ":R>",
      components: [rowsToSend.get(user)],
      files: [{ attachment: this.pngMap }],
      ephemeral: true
    })
    const lobbyCollector = memberResponse.createMessageComponentCollector({
      time: this.battleTimer * 1000,
    });
    lobbyCollector.on('collect', async (interaction2) => { //doesnt want deferUpdate for some reason
      interaction2.deferUpdate() //deferUpdate seems to not be used for editReply
      this.players.set(interaction2.user, interaction2)
      this.currentIntent.set(user, interaction2.values[0])
    })
    setTimeout(() => {
      this.battleHandler()
    }, this.battleTimer * 1000)
  }

  battleHandler () {
    let targettedRegions = new Map() //player -> region
    this.currentIntent.forEach((region, player) => {
      if (!targettedRegions.has(region)) {
        targettedRegions.set(region, [player])
      } else {
        let targettingPlayers = targettedRegions.get(region)
        targettingPlayers.push(player)
        targettedRegions.set(region, targettingPlayers)
      }
    })
    targettedRegions.forEach((players, region) => {
      if (this.gameState === "battle") {
        players.push(this.regionOwners.get(region))
      }
      this.serveChoiceQuestion(players, region)
    })
    setTimeout(() => {
      this.evaluateAnswers()
    }, this.conquestTimer * 1000)
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
        let randomRegion = Math.floor(Math.random() * openRegions.length)
        this.setOwner(openRegions[randomRegion], player)
        this.capitalLives.set(randomRegion, this.capitalExtraLives)
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

    let contestedBool = false
    contested.forEach((contestants, regionId) => {
      if (contestants.length > 1) {
        contestedBool = true
        this.serveSpeedQuestion(contestants, regionId)
      } else {
        this.playerWonQuestion.set(contestants[0], true)
        this.setOwner(regionId, contestants[0])
        this.capitalLives.set(regionId, this.capitalExtraLives)
      }
    });
    if (contestedBool) {
      setTimeout(() => {
        this.evaluateAnswers()
      }, this.capitalTimer * 1000)
    } else {
      this.endRound()
    }
  }

  async evaluateAnswers () {
    let capitalFightInProgress = false
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
      if (this.regionOwners.get(region) !== closestPlayer) {
        if (!this.capitalLives.has(region) || this.capitalLives.get(region) === 0) {
          this.setOwner(region, closestPlayer)
        } else {
          let lives = this.capitalLives.get(region)
          lives--
          this.capitalLives.set(region, lives)
          capitalFightInProgress = true
          this.battleHandler()
        }
      } else {
        this.incrementBonusScore(closestPlayer)
      }
    })

    let contestedWinners = new Map()  
    this.evalChoiceQuestions.forEach((answers, region) => {
      let playersCorrectAnswer = []
      answers.forEach((answer, player) => {
        if (answer === this.currentChoiceAnswers.get(region)) {
          playersCorrectAnswer.push(player)
        }
      })
      if (playersCorrectAnswer.length > 1) {
        contestedWinners.set(region, playersCorrectAnswer) //this will go to a speed question
      } else if (playersCorrectAnswer.length === 1) { //if only one has it correctly
        if (this.regionOwners.get(region) !== playersCorrectAnswer[0]) { //and its not the owner
          if (!this.capitalLives.has(region) || this.capitalLives.get(region) === 0) { // if isnt a capital (normal territory owned by anyone, including neutral)
            this.setOwner(region, playersCorrectAnswer[0])
          } else { //if it's a capital (implied battle phase, but not every battle phase)
            let lives = this.capitalLives.get(region)
            lives--
            this.capitalLives.set(region, lives)
            capitalFightInProgress = true
            this.battleHandler()
          }
        } else {
          this.incrementBonusScore(playersCorrectAnswer[0])
        }
      }
    })

    if (this.gameState === "setup") {
      this.endRound() //this cant be here except for setup phase
    }
    if (this.gameState === "conquer") {
      //if there are contested winners send speed question, otherwise end round
      if (contestedWinners.size === 0) {
        this.endRound()
      } else {
        this.clearAnswers()
        contestedWinners.forEach((players, region) => {
          this.serveSpeedQuestion(players, region)
        })
        setTimeout(() => {
          this.evaluateAnswers()
        }, this.conquestTimer * 1000)
      }
    }
    if (this.gameState === "battle" && !capitalFightInProgress) {
      if (contestedWinners.size === 0) {
        this.endRound()
      } else {
        this.clearAnswers()
        contestedWinners.forEach((players, region) => {
          this.serveSpeedQuestion(players, region)
        })
        setTimeout(() => {
          this.evaluateAnswers()
        }, this.conquestTimer * 1000)
      }
    }
  }

  async endRound () {
    if (this.gameState === "battle") {
      this.switchBattlePlayer()
      await this.updateVisualization()
      this.sendMapToPlayers()
      this.cleanTemporaryVariables()
      this.startBattleTurn()
    }
    if (this.gameState === "conquer") {
      await this.updateVisualization()
      this.cleanTemporaryVariables()
      if (this.getUnownedRegions().size > 0) {
        this.gameState = "battle" //temporary testing thingy
        this.startBattleTurn() //temporary testing thingy
        //this.startConquerTurn()
      } else {
        this.gameState = "battle"
        this.startBattleTurn()
      }
    }
    if (this.gameState === "setup") {
      this.handleSetupLosers()
      await this.updateVisualization()
      this.cleanTemporaryVariables()
      this.startConquerTurn()
      this.gameState = "conquer"
    }
    //will update the player Interactions, which also means every message send needs error handling...
    //start the next round based off the round settings
  }

  cleanTemporaryVariables () {
    this.currentIntent = new Map()
    this.playerWonQuestion = new Map()
    this.clearAnswers()
  }

  clearAnswers () { //if doing both choice and speed questions
    this.currentChoiceAnswers = new Map()
    this.currentSpeedAnswers = new Map()
    this.evalChoiceQuestions = new Map()
    this.evalSpeedQuestions = new Map()
  }

  addConquerableRegionsToMenu () {
    let playerConquerableRegions = this.getConquerableRegionsOfPlayers()
    let playerConquerRows = new Map()
    
    playerConquerableRegions.forEach((regions, player) => {
      let selectionRow = new ActionRowBuilder()
      let selectConquer = new StringSelectMenuBuilder().setCustomId('conquerLocation').setPlaceholder('Select region to conquer!')
      regions.forEach((region) => {
        selectConquer.addOptions(new StringSelectMenuOptionBuilder().setLabel(this.regionNames.get(region)).setDescription(region).setValue(region))
      })
      selectionRow.addComponents(selectConquer)
      playerConquerRows.set(player, selectionRow)
    })
    return playerConquerRows
  }

  getConquerableRegionsOfPlayers () {
    let conquerableRegions = new Map()
    this.regionOwners.forEach((owner, region) => {
      if (owner !== 0) {
        if (!conquerableRegions.has(owner)) {
          conquerableRegions.set(owner, new Set())
        }
        let borderSet = conquerableRegions.get(owner)
        let borderIds = this.regionBorders.get(region)
        borderIds.forEach((borderingId) => {
          if (this.regionOwners.get(borderingId) === 0) {
            borderSet.add(borderingId)
          }
        })
        conquerableRegions.set(owner, borderSet)
      }
    })
    conquerableRegions.forEach((borderingIds, player) => {
      if (borderingIds.size === 0) {
        conquerableRegions.set(player, this.getUnownedRegions())
      }
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

  getNonCapitalRegions () {
    let noncapitalRegions = new Set()
    this.regionOwners.forEach((owner, region) => {
      if (!this.capitalLives.has(region)) {
        noncapitalRegions.add(region)
      }
    })
    return noncapitalRegions
  }

  addAttackableRegionsToMenu () { //players without a region cannot attack capitals
    let playerAttackableRegions = this.getAttackableRegionsOfPlayers()
    let playerAttackRows = new Map()
    
    playerAttackableRegions.forEach((regions, player) => {
      let selectionRow = new ActionRowBuilder()
      let selectAttack = new StringSelectMenuBuilder().setCustomId('conquerLocation').setPlaceholder('Select region to conquer!')
      regions.forEach((region) => {
        selectAttack.addOptions(new StringSelectMenuOptionBuilder().setLabel(this.regionNames.get(region)).setDescription(region).setValue(region))
      })
      selectionRow.addComponents(selectAttack)
      playerAttackRows.set(player, selectionRow)
    })
    return playerAttackRows
  }

  getAttackableRegionsOfPlayers () {
    let attackableRegions = new Map()
    this.playersById.forEach((player) => {
      attackableRegions.set(player, new Set())
    })
    this.regionOwners.forEach((owner, region) => {
      if (owner !== 0) {
        let borderSet = attackableRegions.get(owner)
        let borderIds = this.regionBorders.get(region)
        borderIds.forEach((borderingId) => {
          if (this.regionOwners.get(borderingId) !== owner) {
            borderSet.add(borderingId)
          }
        })
        attackableRegions.set(owner, borderSet)
      }
    })
    attackableRegions.forEach((borderingIds, player) => {
      if (borderingIds.size === 0) {
        attackableRegions.set(player, this.getNonCapitalRegions())
      }
    })
    return attackableRegions
  }

  getAllRegionsToSelect () {
    let allRegions = []
    this.regionNames.forEach((name, id) => {
      allRegions.push(new StringSelectMenuOptionBuilder().setLabel(name).setDescription(id).setValue(id))
    })
    return allRegions
  }

  async serveChoiceQuestion (players, region) { //players is []
    this.currentChoiceAnswers.set(region, "answer2")

    const answerRow = new ActionRowBuilder()
    answerRow.addComponents(new ButtonBuilder().setCustomId("answer1").setLabel("Answer 1").setStyle(ButtonStyle.Primary))
    answerRow.addComponents(new ButtonBuilder().setCustomId("answer2").setLabel("Answer 2").setStyle(ButtonStyle.Primary))
    answerRow.addComponents(new ButtonBuilder().setCustomId("answer3").setLabel("Answer 3").setStyle(ButtonStyle.Primary))
    answerRow.addComponents(new ButtonBuilder().setCustomId("answer4").setLabel("Answer 4").setStyle(ButtonStyle.Primary))

    players.forEach(async (contestant) => {
      let interaction = this.players.get(contestant)

      let memberResponse = await interaction.followUp({
        content: "Which answer do you like?",
        components: [answerRow],
        ephemeral: true
      });

      const collector = memberResponse.createMessageComponentCollector({
        time: this.conquestTimer * 1000,
      });

      collector.on('collect', async (interaction2) => {
        interaction2.deferUpdate()
        if (!this.evalChoiceQuestions.has(region)) {
          this.evalChoiceQuestions.set(region, new Map())
        }
        let answerMap = this.evalChoiceQuestions.get(region)
        answerMap.set(interaction2.user, interaction2.customId)
        this.evalChoiceQuestions.set(region, answerMap)
      });
    })
  }

  async serveSpeedQuestion (players, region) {
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

  incrementBonusScore (player) {
    if (!this.bonusDefenseScores.has(player)) {
      this.bonusDefenseScores.set(player, 0)
    }
    let currentValue = this.bonusDefenseScores
    currentValue += this.defenseValue
    this.bonusDefenseScores.set(player, currentValue)
  }

  calculateScores () {
    let currentScore = new Map()
    this.playersById.forEach((player) => {
      currentScore.set(player, 0)
    })
    this.regionOwners.forEach((owner, region) => { 
      if (owner !== 0) {
        let scoreOfOwner = currentScore.get(owner)
        if (this.capitalLives.has(region)) {
          scoreOfOwner += this.capitalScore
          scoreOfOwner += this.capitalLives.get(region) * this.capitalLiveScore
        } else {
          scoreOfOwner += this.regionScores.get(region)
        }
        currentScore.set(owner, scoreOfOwner)
      }
    })
    this.bonusDefenseScores.forEach((value, player) => {
      let scoreOfOwner = currentScore.get(owner)
      scoreOfOwner += value
      currentScore.set(player, scoreOfOwner)
    })
    this.playerScores = currentScore
  }

  getPlacements () {
    this.calculateScores()
  }
}

module.exports = {
  Game
}