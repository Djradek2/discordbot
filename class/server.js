class Server {
  openLobbies = new Map() //lobbyId -> Lobby 
  currentGames = new Map()
  choiceQuestionSets = new Map() // set_id -> all the questions
  speedQuestionSets = new Map()
  
  constructor () {}

  removeLobby (id) {
    this.openLobbies.set(id, null)
  }
}

module.exports = {
  Server
}