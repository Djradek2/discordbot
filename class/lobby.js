const game = require('./game.js')
const Helper = require("./utility/helper.js")

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
    //create game and write it to server and remove the lobby
    this.server.currentGames.set(Helper.generateId16(), new game.Game("test", this.players))
    this.closeLobby()
  }

  closeLobby () {
    this.server.removeLobby(lobbyCode)
  }
}

module.exports = {
  Lobby
}