class Lobby {
  players = []
  lobbyCode = "" //16 numbers, do you think collisions will happen?
  mapName = ""
  server = null
  
  constructor (host, lobbyCode, server) {
    this.players[0] = host
    this.lobbyCode = lobbyCode
    this.server = server
    server.openLobbies.set(lobbyCode, this)
  }

  joinGame (player) {
    if(this.players.length < 8){
      this.players.push(player)
    }
  }

  startGame () {

  }
}

module.exports = {
  Lobby
}