class Server {
  openLobbies = new Map() //lobbyId -> Lobby 
  currentGames = new Map()
  choiceQuestionSets = new Map() // set_id -> all the questions
  speedQuestionSets = new Map()
  
  constructor () {}

  addLobby (lobby) {
    this.openLobbies.set(lobby.lobbyCode, lobby)
  }

  removeLobby (id) {
    this.openLobbies.set(id, null)
  }

  attemptJoinLobby (id, player) {
    if (this.openLobbies.has(id)) {
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