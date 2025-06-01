const xmljs = require("xml-js");
const fs = require("pn/fs");
const { shuffleArray } = require("./utility/helper.js")
const svg2png = require("svg2png");
const { ChoiceQuestion } = require("./question/choiceQuestion.js")
const { SpeedQuestion } = require("./question/speedQuestion.js")
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, ModalBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

let colors = ["F0F0F0", "#3f47cc", "#ed1b24", "#26b050", "#fdf003", "#9dd7eb", "#ff01f5", "#7f7f7f", "#fec80e"]
let negativeColors = ["#000000", "#F0F0F0", "#F0F0F0", "#F0F0F0", "#000000", "#000000", "#F0F0F0", "#F0F0F0", "#000000"] //should be white or black to negate the background

class Game {
  gameId = ""
  server = null
  players = null //interaction.user -> interaction
  playerDisabled = new Map() //interaction.user -> boolean
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
  gameInfo = [] //strings that get sent in a single message whenever something happens
  gameState = "setup" //setup, conquer, battle, finish
  turnState = "1" //if at choice or speed question state of the round

  capitalTimer = 15
  conquestTimer = 15
  battleTimer = 15
  choiceQTimer = 20
  speedQTimer = 20
  questionSets = []
  usedChoiceQ = []
  usedSpeedQ = []
  maxBattleRound = 4 //each player this many times
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

  sendableChoiceQ = new ChoiceQuestion()
  choiceAnswerShuffled = [] //array of strings
  choiceCorrectAnswer = null //int 0-3
  sendableSpeedQ = new SpeedQuestion()

  currentBattlePlayer = 1
  currentBattleRound = 1
  lastInteraction = 0

  bonusDefenseScores = new Map() //inter.user -> score
  playerScores = new Map() //inter.user -> score


  constructor (mapName, players, gameId, server, questionSets) { //write self to server
    this.gameId = gameId
    this.server = server
    this.players = players
    this.questionSets = questionSets
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
      distribute = shuffleArray(distribute)
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
    visualBuffer.svg.path.forEach((path) => { //colors regions based off owner
      if (this.regionOwners.get(path._attributes.id) !== 0) {
        path._attributes.style = `fill: ${colors[this.playerColorIds.get(this.regionOwners.get(path._attributes.id))]}; stroke: rgb(0, 0, 0);`
      } else {
        path._attributes.style = `fill: ${colors[0]}; stroke: rgb(0, 0, 0);`
      }
    })
    let playerIterator = 1;
    visualBuffer.svg.text.forEach((textfield) => { //shows region points and updates the scoreboard
      if (textfield._attributes.region != null) { //region points
        if (this.capitalLives.has(textfield._attributes.region)) {
          textfield._text = textfield._attributes.region + "-" + (parseInt(this.capitalScore) + parseInt(this.capitalLives.get(textfield._attributes.region) * this.capitalLiveScore))
        } else {
          textfield._text = textfield._attributes.region + "-" + this.regionScores.get(textfield._attributes.region)
        }
        if (this.regionOwners.get(textfield._attributes.region) !== 0) { //region points text color based off owner
          let textColor = negativeColors[this.playerColorIds.get(this.regionOwners.get(textfield._attributes.region))]
          textfield._attributes.style = `fill: ${textColor}; stroke: ${textColor}; font-family: Arial, sans-serif; font-size: 28px; white-space: pre;`
        }
      } else { //scoreboard
        if (this.playersById.get(playerIterator)) {
          textfield._text = this.playersById.get(playerIterator).globalName.substring(0, 11) + " - " + this.playerScores.get(this.playersById.get(playerIterator)) // player username (up to 11 letters) and "- score"
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
    this.players.forEach(interaction => {
      if (this.playerDisabled.get(interaction.user) !== true) {
        try {
          interaction.followUp({
            content: "Current map:",
            files: [{ attachment: this.pngMap }],
            ephemeral: true,
          }).catch(console.error)
        } catch (error) {
          this.handleFollowUpError(interaction, error)
        }
      }
    });
  }

  handleFollowUpError (interaction, error) {
    if (error.code === 50027) {
      this.disablePlayer(interaction)
    }
  }

  setOwner (regionId, playerId) {
    console.log(playerId.username + " became owner of " + regionId)
    this.gameInfo.push(playerId.globalName + " became owner of " + regionId)
    this.regionOwners.set(String(regionId), playerId)
  }

  giveOutIds () {
    let increment = 1
    this.players.forEach((interaction, player) => {
      this.playerColorIds.set(player, increment)
      this.playersById.set(increment, player)
      this.playerDisabled.set(player, false)
      this.currentIntent.set(player, null)
      increment++
    })
  }

  async startSetup () {
    this.giveOutIds()
    this.setupRegionScores()
    this.getNewChoiceQuestion()
    this.getNewSpeedQuestion()
    this.lastInteraction = Date.now() / 1000
    const selectionRow = new ActionRowBuilder()
    const selectTest = new StringSelectMenuBuilder().setCustomId('startLocation').setPlaceholder('Select capital location!').addOptions(this.getAllRegionsToSelect());
    selectionRow.addComponents(selectTest)
    await this.updateVisualization()
    this.players.forEach(async (interaction, user) => {
      if (this.playerDisabled.get(user) !== true) {
        try {
          let memberResponse = await interaction.followUp({ //add capitalTimer
            content: "Capital selection, seconds remaining: " + "<t:" + (Math.floor(Date.now() / 1000, 1000) + this.capitalTimer) + ":R>",
            components: [selectionRow],
            files: [{ attachment: this.pngMap }],
            ephemeral: true
          }).catch(console.error)
          if (memberResponse != undefined) {
            const lobbyCollector = memberResponse.createMessageComponentCollector({
              time: this.capitalTimer * 1000,
            });
            try {
              lobbyCollector.on('collect', async (interaction2) => { //doesnt want deferUpdate for some reason
                interaction2.deferUpdate() //deferUpdate seems to not be used for editReply
                this.lastInteraction = Date.now() / 1000
                this.players.set(interaction2.user, interaction2)
                this.currentIntent.set(user, interaction2.values[0])
              })
            } catch (e) {
              console.log("Capital target collector failed!")
            }
          }
        } catch (error) {
          this.handleFollowUpError(interaction, error)
        }
      }
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
      if (this.playerDisabled.get(user) !== true) {
        try {
          let memberResponse = await interaction.followUp({ //add capitalTimer
            content: "Select region to conquer, seconds remaining: " + "<t:" + (Math.floor(Date.now() / 1000, 1000) + this.conquestTimer) + ":R>",
            components: [rowsToSend.get(user)],
            files: [{ attachment: this.pngMap }],
            ephemeral: true
          }).catch(console.error)
          if (memberResponse != undefined) {
            const lobbyCollector = memberResponse.createMessageComponentCollector({
              time: this.conquestTimer * 1000,
            });
            try {
              lobbyCollector.on('collect', async (interaction2) => { //doesnt want deferUpdate for some reason
                interaction2.deferUpdate() //deferUpdate seems to not be used for editReply
                this.lastInteraction = Date.now() / 1000
                this.players.set(interaction2.user, interaction2)
                this.currentIntent.set(user, interaction2.values[0])
              })
            } catch (e) {
              console.log("Conquer target collector failed!")
            } 
          }
        } catch (error) {
          this.handleFollowUpError(interaction, error)
        }
      }
    })
    setTimeout(() => {
      this.conquerHandler()
    }, this.conquestTimer * 1000)
  }

  conquerHandler () {
    this.distributeInfo() //player targets
    let targettedRegions = new Map()
    let someoneHasIntent = false //just for gameInfo to add a readability gap
    this.currentIntent.forEach((region, player) => {
      someoneHasIntent = true
      if (region !== null) {
        if (!targettedRegions.has(region)) { //first player targetting given region
          targettedRegions.set(region, [player])
        } else { //another player targetting the same region
          let targettingPlayers = targettedRegions.get(region)
          targettingPlayers.push(player)
          targettedRegions.set(region, targettingPlayers)
        }
        this.gameInfo.push(player.globalName + " is targetting region " + region)
      } else {
        this.gameInfo.push(player.globalName + " passed their turn")
      }
    })
    if (someoneHasIntent) { // essentialy someone should always have intent anyway
      this.gameInfo.push("")
    }
    if (targettedRegions.size > 0) {
      this.logChoiceQuestion()
      targettedRegions.forEach((players, region) => {
        this.serveChoiceQuestion(players, region)
      })
      setTimeout(() => {
        this.evaluateAnswers()
      }, this.choiceQTimer * 1000)
    } else {
      this.evaluateAnswers()
    }
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
    if (this.playerDisabled.get(user) !== true) {
      try {
        let memberResponse = await interaction.followUp({ //add capitalTimer
          content: "Select region to attack, seconds remaining: " + "<t:" + (Math.floor(Date.now() / 1000, 1000) + this.battleTimer) + ":R>",
          components: [rowsToSend.get(user)],
          files: [{ attachment: this.pngMap }],
          ephemeral: true
        }).catch(console.error)
        if (memberResponse != undefined) {
          const lobbyCollector = memberResponse.createMessageComponentCollector({
            time: this.battleTimer * 1000,
          });
          try {
            lobbyCollector.on('collect', async (interaction2) => { //doesnt want deferUpdate for some reason
              interaction2.deferUpdate() //deferUpdate seems to not be used for editReply
              this.lastInteraction = Date.now() / 1000
              this.players.set(interaction2.user, interaction2)
              this.currentIntent.set(user, interaction2.values[0])
            })
          } catch (e) {
            console.log("Battle target collector failed!")
          }
        }
      } catch (error) {
        this.handleFollowUpError(interaction, error)
      }
    }

    setTimeout(() => {
      this.battleHandler()
    }, this.battleTimer * 1000)
  }

  battleHandler () {
    let targettedRegions = new Map() //player -> region
    this.currentIntent.forEach((region, player) => {
      if (region !== null) {
        if (!targettedRegions.has(region)) {
          targettedRegions.set(region, [player])
        } else { //this should never happen in battle rounds anyway
          console.log("WARNING: this should never run")
          let targettingPlayers = targettedRegions.get(region)
          targettingPlayers.push(player)
          targettedRegions.set(region, targettingPlayers)
        }
        this.gameInfo.push(player.globalName + " is targetting region " + region)
      } else {
        this.gameInfo.push(player.globalName + " passed their turn")
      }
    })
    this.gameInfo.push("")
    if (targettedRegions.size > 0) {
      this.logChoiceQuestion()
      targettedRegions.forEach((players, region) => {
        if (this.gameState === "battle") { //what is this? its in battleHandler
          players.push(this.regionOwners.get(region))
        }
        this.serveChoiceQuestion(players, region)
      })
      setTimeout(() => {
        this.evaluateAnswers()
      }, this.choiceQTimer * 1000)
    } else {
      this.evaluateAnswers()
    }
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
        this.capitalLives.set(openRegions[randomRegion], this.capitalExtraLives)
      }
    })
  }

  async capitalHandler () {
    this.players.forEach((interaction, player) => {  //randomize players who dont have intent
      if (this.currentIntent.get(player) === null) {
        this.currentIntent.set(player, Math.ceil(Math.random() * this.regionOwners.size).toString())
      }
    })

    let contested = new Map() //regionId -> [interaction.user]
    this.currentIntent.forEach((regionId, player) => { //regionId, interaction.user
      if (!contested.get(regionId)) {
        contested.set(regionId, [])
      }
      let contestingPlayers = contested.get(regionId)
      contestingPlayers.push(player)
      contested.set(regionId, contestingPlayers)
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
      this.logSpeedQuestion()
      setTimeout(() => {
        this.evaluateAnswers(true)
      }, this.speedQTimer * 1000)
    } else {
      this.endRound()
    }
  }

  async evaluateAnswers (handlingCapitals = false) {
    let capitalFightInProgress = false
    if(this.evalSpeedQuestions.size > 0) {
      this.gameInfo.push("Correct answer: " + this.sendableSpeedQ.correctAnswer)
    }
    this.evalSpeedQuestions.forEach((answers, region) => {
      let playerCloseness = [] //array of maps
      let closestPlayer = null
      let closestDistance = null
      let closestTimestamp = null
      let correctAnswer = this.currentSpeedAnswers.get(region)
      answers.forEach((answer, player) => { //answer is [answer, timestamp]
        let playerAnswer = new Map().set(player, ([Math.abs(correctAnswer - answer[0]), answer[1]])) //[player => [distance, timestamp]]
        playerCloseness.push(playerAnswer)
      })
      playerCloseness.forEach((innerArray) => {
        innerArray.forEach((distance, player) => {
          if (closestPlayer === null) { //first player to answer
            closestPlayer = player
            closestDistance = distance[0]
            closestTimestamp = distance[1]
            this.playerWonQuestion.set(player, true)
          } else if (distance[0] < closestDistance || (distance[0] <= closestDistance && distance[1] < closestTimestamp)) { //if better than previous best
            this.playerWonQuestion.set(closestPlayer, false)
            closestPlayer = player
            closestDistance = distance[0]
            closestTimestamp = distance[1]
            this.playerWonQuestion.set(player, true)
          } else { //if worse than previous best
            this.playerWonQuestion.set(player, false)
          }
        })
      })
      this.playerWonQuestion.forEach((answerStatus, player) => {
        let symbol = answerStatus ? "✅" : "❌"
        this.gameInfo.push(player.globalName + " -> " + answers.get(player)[0] + " (" + (-(correctAnswer - answers.get(player)[0])) + ") " + symbol) //... it should only be guy one right?
      })
      this.gameInfo.push("")
      if (this.regionOwners.get(region) !== closestPlayer) {
        if (!this.capitalLives.has(region) || this.capitalLives.get(region) === 0) {
          this.setOwner(region, closestPlayer)
          if (handlingCapitals) {
            this.capitalLives.set(region, this.capitalExtraLives)
          }
        } else {
          let lives = this.capitalLives.get(region)
          lives--
          this.capitalLives.set(region, lives)
          capitalFightInProgress = true
          this.clearAnswers()
          this.getNewChoiceQuestion()
          this.getNewSpeedQuestion()
          this.battleHandler()
        }
      } else {
        this.incrementBonusScore(closestPlayer)
      }
    })

    let contestedWinners = new Map()  
    if(this.evalChoiceQuestions.size > 0) {
      this.gameInfo.push("Correct answer: " + this.sendableChoiceQ.correctAnswer)
    }
    this.evalChoiceQuestions.forEach((answers, region) => {
      let correctAnswer = this.currentChoiceAnswers.get(region)
      let playersCorrectAnswer = []
      answers.forEach((answer, player) => {
        if (answer === correctAnswer) {
          playersCorrectAnswer.push(player)
          this.gameInfo.push(player.globalName + " -> " + this.choiceAnswerShuffled[answer] + " ✅")
        } else {
          this.gameInfo.push(player.globalName + " -> " + this.choiceAnswerShuffled[answer] + " ❌")
        }
      })
      if(this.gameState === "battle") {
        this.gameInfo.push("")
      }
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
            this.clearAnswers()
            this.getNewChoiceQuestion()
            this.getNewSpeedQuestion()
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
        this.logSpeedQuestion()
        contestedWinners.forEach((players, region) => {
          this.serveSpeedQuestion(players, region)
        })
        setTimeout(() => {
          this.evaluateAnswers()
        }, this.speedQTimer * 1000)
      }
    }
    if (this.gameState === "battle" && !capitalFightInProgress) {
      if (contestedWinners.size === 0) {
        this.endRound()
      } else {
        this.clearAnswers()
        if (contestedWinners.size > 0) {
          this.logSpeedQuestion()
        }
        contestedWinners.forEach((players, region) => {
          this.serveSpeedQuestion(players, region)
        })
        setTimeout(() => {
          this.evaluateAnswers()
        }, this.speedQTimer * 1000)
      }
    }
  }

  async endRound () {
    this.distributeInfo()
    this.getNewChoiceQuestion()
    this.getNewSpeedQuestion()
    if (this.gameState === "battle") {
      if (this.shouldGameContinue()) {
        this.switchBattlePlayer()
        if (this.currentBattleRound > this.maxBattleRound) {
          this.finalizeGame()
          return
        }
        await this.updateVisualization()
        this.sendMapToPlayers()
        this.cleanTemporaryVariables()
        this.startBattleTurn()
      } else {
        this.endGame()
      }
    }
    if (this.gameState === "conquer") {
      if (this.shouldGameContinue()) {
        await this.updateVisualization()
        if (this.getUnownedRegions().size > 0) {
          // this.gameState = "battle" //temporary testing thingy
          // this.cleanTemporaryVariables() //temporary testing thingy
          // this.startBattleTurn() //temporary testing thingy
          this.cleanTemporaryVariables()
          this.startConquerTurn()
        } else {
          this.gameState = "battle"
          this.cleanTemporaryVariables()
          this.startBattleTurn()
        }
      } else {
        this.endGame()
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
    this.currentIntent = new Map() //should be every player -> null instead
    if (this.gameState !== "battle") {
      this.players.forEach((interaction, player) => {
        this.currentIntent.set(player, null) 
      })
    } else {
      let player = this.playersById.get(this.currentBattlePlayer)
      this.currentIntent.set(player, null) 
    }
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

  async serveChoiceQuestion (players, region, rollQuestion = false) { //players is []
    this.distributeInfo()
    if (rollQuestion) { //used in capital battles
      this.getNewChoiceQuestion()
    }
    let questionText = this.sendableChoiceQ.questionText
    let answer1 = this.choiceAnswerShuffled[0]
    let answer2 = this.choiceAnswerShuffled[1]
    let answer3 = this.choiceAnswerShuffled[2]
    let answer4 = this.choiceAnswerShuffled[3]
    this.currentChoiceAnswers.set(region, this.choiceCorrectAnswer.toString()) //0-3

    const answerRow = new ActionRowBuilder()
    answerRow.addComponents(new ButtonBuilder().setCustomId("0").setLabel(answer1).setStyle(ButtonStyle.Primary))
    answerRow.addComponents(new ButtonBuilder().setCustomId("1").setLabel(answer2).setStyle(ButtonStyle.Primary))
    answerRow.addComponents(new ButtonBuilder().setCustomId("2").setLabel(answer3).setStyle(ButtonStyle.Primary))
    answerRow.addComponents(new ButtonBuilder().setCustomId("3").setLabel(answer4).setStyle(ButtonStyle.Primary))

    players.forEach(async (contestant) => {
      let interaction = this.players.get(contestant)
      if (this.playerDisabled.get(interaction.user) !== true) {
        try {
          let memberResponse = await interaction.followUp({
            content: questionText + " seconds remaining: " + "<t:" + (Math.floor(Date.now() / 1000, 1000) + this.choiceQTimer) + ":R>",
            components: [answerRow],
            ephemeral: true
          }).catch(console.error)
          if (memberResponse != undefined) {
            const collector = memberResponse.createMessageComponentCollector({
              time: this.choiceQTimer * 1000,
            });
            try {
              collector.on('collect', async (interaction2) => {
                interaction2.deferUpdate()
                this.lastInteraction = Date.now() / 1000
                if (!this.evalChoiceQuestions.has(region)) {
                  this.evalChoiceQuestions.set(region, new Map())
                }
                let answerMap = this.evalChoiceQuestions.get(region)
                answerMap.set(interaction2.user, interaction2.customId)
                this.evalChoiceQuestions.set(region, answerMap)
              });
            } catch (e) {
              console.log("Choice question collector failed!")
            }
          }
        } catch (error) {
          this.handleFollowUpError(interaction, error)
        }
      }
    })
  }

  async serveSpeedQuestion (players, region, rollQuestion = false) {
    this.distributeInfo()
    if (rollQuestion) {
      this.getNewSpeedQuestion()
    }
    let questionText = this.sendableSpeedQ.questionText
    this.currentSpeedAnswers.set(region, this.sendableSpeedQ.correctAnswer)

    const questionModal = new ModalBuilder().setCustomId('speedQuestion').setTitle(questionText.slice(0, 45))
    const questionRow = new ActionRowBuilder()
    questionRow.addComponents(new TextInputBuilder().setCustomId("questionAnswer").setLabel("answer").setStyle(TextInputStyle.Short)); //should only accept numbers
    questionModal.addComponents(questionRow)

    let blankAnswers = new Map()
    players.forEach((player) => {
      blankAnswers.set(player, [0, Math.floor(Date.now() / 1000, 1000) + this.speedQTimer + 30]) 
    })
    this.evalSpeedQuestions.set(region, blankAnswers)

    players.forEach(async (contestant) => {
      let interaction = this.players.get(contestant)
      if (this.playerDisabled.get(interaction.user) !== true) {
        const startAnswerRow = new ActionRowBuilder()
        startAnswerRow.addComponents(new ButtonBuilder().setCustomId("questionAnswer").setLabel("Answer question").setStyle(ButtonStyle.Primary));
        try {
          let memberResponse = await interaction.followUp({
            content: questionText + " seconds remaining: " + "<t:" + (Math.floor(Date.now() / 1000, 1000) + this.speedQTimer) + ":R>",
            components: [startAnswerRow],
            ephemeral: true
          }).catch(console.error)
          if (memberResponse != undefined) {
            let lobbyCollector = memberResponse.createMessageComponentCollector({
              time: this.speedQTimer * 1000,
            });
            try {
              lobbyCollector.on('collect', async (interaction2) => { //this never stops collecting with editReply...
                await interaction2.showModal(questionModal)
                this.lastInteraction = Date.now() / 1000
                let modalCollector = await interaction2.awaitModalSubmit({
                  time: this.speedQTimer * 1000,
                  filter: i => i.user.id === interaction2.user.id,
                }).catch(console.error)
                if (modalCollector) {
                  if (modalCollector.fields.fields.get('questionAnswer').value) {
                    modalCollector.deferReply({ ephemeral: true })
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
            } catch (e) {
              console.log("Speed question collector failed!")
            }
          }
        } catch (error) {
          this.handleFollowUpError(interaction, error)
        }
      }
    })
  }

  getNewChoiceQuestion () { //called on conquer turn start and battle questions
    this.sendableChoiceQ = this.server.serveQuestionToGame(false, this.questionSets, this.usedChoiceQ)
    this.usedChoiceQ.push(this.sendableChoiceQ.id)

    this.choiceAnswerShuffled = shuffleArray([this.sendableChoiceQ.correctAnswer, this.sendableChoiceQ.answer1, this.sendableChoiceQ.answer2, this.sendableChoiceQ.answer3]) 
    this.choiceCorrectAnswer = this.choiceAnswerShuffled.indexOf(this.sendableChoiceQ.correctAnswer)
  }

  getNewSpeedQuestion () { //called on conquer turn start and battle questions
    this.sendableSpeedQ = this.server.serveQuestionToGame(true, this.questionSets, this.usedSpeedQ)
    this.usedSpeedQ.push(this.sendableSpeedQ.id)
  }

  logChoiceQuestion () {
    this.gameInfo.push(this.sendableChoiceQ.questionText)
    this.gameInfo.push("a) " + this.choiceAnswerShuffled[0])
    this.gameInfo.push("b) " + this.choiceAnswerShuffled[1])
    this.gameInfo.push("c) " + this.choiceAnswerShuffled[2])
    this.gameInfo.push("d) " + this.choiceAnswerShuffled[3])
  }

  logSpeedQuestion () {
    this.gameInfo.push(this.sendableSpeedQ.questionText)
  }

  incrementBonusScore (player) {
    if (!this.bonusDefenseScores.has(player)) {
      this.bonusDefenseScores.set(player, 0)
    }
    let currentValue = this.bonusDefenseScores.get(player)
    currentValue += this.defenseValue
    this.bonusDefenseScores.set(player, currentValue)
  }

  calculateScores () {
    let currentScore = new Map()
    this.playersById.forEach((player) => {
      currentScore.set(player, 0)
    })
    this.regionOwners.forEach((owner, region) => { 
      if (owner !== 0 && owner !== undefined) {
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
      let scoreOfOwner = currentScore.get(player)
      scoreOfOwner += value
      currentScore.set(player, scoreOfOwner)
    })
    this.playerScores = currentScore
  }

  distributeInfo () { //will send out this.gameInfo to all nondisabled players and clear it  
    //notable info: someone leaves, every intent, passed turns, question given to current contestants, results of everyone answering, change of territory
    let messageToSend = ""
    this.gameInfo.forEach((entry) => {
      messageToSend += entry + "\n"
    })
    if (messageToSend !== "") {
      this.players.forEach((interaction, player) => {
        if (this.playerDisabled.get(player) !== true) {
          try {
            interaction.followUp({
              content: messageToSend,
              ephemeral: true
            }).catch(console.error)
          } catch (error) {
            this.handleFollowUpError(interaction, error)
          }
        }
      })
    }
    this.gameInfo = []
  } 

  disablePlayer (interaction) {
    this.playerDisabled.set(interaction.user, true)
  }

  async sendFinalPlacements () {
    let playerOrder = new Map([...this.playerScores.entries()].sort((a, b) => b[1] - a[1])); //sorted descendingly
    let placementMessage = ""
    let placement = 1
    playerOrder.forEach((score, player) => {
      if (placement === 1) {
        placementMessage += "🏆"
      }
      if (placement === 2) {
        placementMessage += "🥈"
      }
      if (placement === 3) {
        placementMessage += "🥉"
      }
      placementMessage += player.globalName + " - " + score + "\n"
      placement++
    })
    await this.updateVisualization()
    this.players.forEach((interaction, player) => {
      if (this.playerDisabled.get(player) !== true) {
        try {
          interaction.followUp({
            content: placementMessage,
            files: [{ attachment: this.pngMap }],
            ephemeral: true
          }).catch(console.error)
        } catch (error) {
          this.handleFollowUpError(interaction, error)
        }
      }
    })
  }

  shouldGameContinue () { //call in battle & conquer rounds
    let anyPlayerRemaining = false
    this.playerDisabled.forEach((disabled) => {
      if (disabled === false) {
        anyPlayerRemaining = true
      }
    })
    if (this.lastInteraction < ((Date.now() / 1000) - 180)) { //if noone interacted for 3 mins
      return false
    }
    return anyPlayerRemaining
  }

  endGame () {
    this.server.currentGames.delete(this.gameId)
  }

  async finalizeGame () {
    this.calculateScores()
    //TODO: tiebreaker question
    await this.sendFinalPlacements()
    //TODO: record results to db
    this.endGame()
  }
}

module.exports = {
  Game
}