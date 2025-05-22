const { Game } = require("./game")
const { Lobby } = require("./lobby")
const { Client } = require('pg');
const { ChoiceQuestion } = require("./question/choiceQuestion.js")
const { SpeedQuestion } = require("./question/speedQuestion.js")
const dotenv = require('dotenv');

class Server {
  openLobbies = new Map() //lobbyId -> Lobby 
  currentGames = new Map() // gameId16 -> Game() object
  choiceQuestionSets = new Map() // set_id -> all the questions
  speedQuestionSets = new Map()
  playerTracker = new Map() //player -> Game() or Lobby() object, overwrite on joining a game
  client = null
  
  constructor () {
    this.connectToDB()
    this.loadQuestions()
  }

  addLobby (lobby) {
    this.openLobbies.set(lobby.lobbyCode, lobby)
  }

  removeLobby (id) {
    this.openLobbies.set(id, null)
  }

  clearPlayerFromOldGame (interaction) {
    let playerGameLobby = this.playerTracker.get(interaction.user)
    if (playerGameLobby instanceof Lobby) {
      playerGameLobby.removePlayer(interaction)
    }
    if (playerGameLobby instanceof Game) {
      playerGameLobby.disablePlayer(interaction)
    }
  }

  attemptJoinLobby (id, player) { //id, interaction
    if (this.openLobbies.has(id)) { //success
      this.openLobbies.get(id).joinGame(player)
      console.log('user ' + player.user.username + " succesfully joined lobby " + id)
      return true
    }
    return false
  }

  connectToDB () {
    this.client = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });
    try {
      this.client.connect()
    } catch (err) {
      console.log(err)
    }
  }

  loadMaps () { //later
    
  }

  async loadQuestions () {
    let [speedQsData, choiceQsData] = await Promise.all([client.query('SELECT * FROM approximateQuestions'), client.query('SELECT * FROM exactQuestions')])
    let choiceQsets = new Map()
    let speedQsets = new Map()

    speedQsData.forEach(row => {
      if (row.status === 1) {
        if (!speedQsets.has(row.set_id)) {
          speedQsets.set(row.set_id, [])
        }
        let speedQ = new SpeedQuestion(row.id, row.set_id, row.question_text, row.correct)
        let placeToPush = speedQsets.get(row.set_id)
        placeToPush.push(speedQ)
        speedQsets.set(row.set_id, placeToPush)
      }
    });

    choiceQsData.forEach(row => {
      if (row.status === 1) {
        if (!choiceQsets.has(row.set_id)) {
          choiceQsets.set(row.set_id, [])
        }
        let choiceQ = new ChoiceQuestion(row.id, row.set_id, row.question_text, row.correct, row.option1, row.option2, row.option3)
        let placeToPush = choiceQsets.get(row.set_id)
        placeToPush.push(choiceQ)
        choiceQsets.set(row.set_id, placeToPush)
      }
    });
  }

  serveQuestionsToGame (desiredSets) { 

  }
}

module.exports = {
  Server
}