const { Game } = require("./game")
const { Lobby } = require("./lobby")

class Server {
  openLobbies = new Map() //lobbyId -> Lobby 
  currentGames = new Map() // gameId16 -> Game() object
  choiceQuestionSets = new Map() // set_id -> all the questions
  speedQuestionSets = new Map()
  playerTracker = new Map() //player -> Game() or Lobby() object, overwrite on joining a game
  
  constructor () {}

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
      console.log('user ' + player.user.username + " sucessfully joined lobby " + id)
    }
  }

  loadServerQuestions () {

  }

  loadMaps () {
    
  }

  serveQuestionsToGame (desiredSets) { 

  }
}

module.exports = {
  Server
}