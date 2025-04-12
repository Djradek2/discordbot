class Server {
  openLobbies = new Map() //lobbyId -> Lobby 
  currentGames = new Map()
  choiceQuestionSets = new Map() // set_id -> all the questions
  speedQuestionSets = new Map()
  
  constructor () {}

  addLobby (lobby) {
    this.openLobbies.set(lobby.lobbycode, lobby)
  }

  removeLobby (id) {
    this.openLobbies.set(id, null)
  }

  attemptJoinLobby (id, player) {
    if (this.openLobbies.has(id)) {
      this.openLobbies.get(id).joinGame(player)
    }
  }

  loadServerQuestions () {

  }

  loadMaps () {
    
  }
}

module.exports = {
  Server
}