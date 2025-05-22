const { Game } = require("./game")
const { Lobby } = require("./lobby")
const { Client } = require('pg');
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

  async loadQuestions () { //TODO
    let res1 = await client.query('SELECT * FROM approximateQuestions');
    let res2 = await client.query('SELECT * FROM speedQuestions');
  }

  serveQuestionsToGame (desiredSets) { 

  }
}

module.exports = {
  Server
}