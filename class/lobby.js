const game = require('./game.js')
const Helper = require("./utility/helper.js")

class Lobby {
  players = new Map() //interaction.user -> interaction
  lobbyCode = "" //16 numbers, do you think collisions will happen?
  mapName = ""
  server = null
  
  constructor (host, lobbyCode, server) {
    this.players.set(host.user, host)
    this.lobbyCode = lobbyCode
    this.server = server
    server.addLobby(this)
  }

  joinGame (interaction) {
    if(this.players.size < 8){
      this.players.set(interaction.user, interaction)
      this.server.clearPlayerFromOldGame(interaction)
      this.server.playerTracker.set(interaction.user, this)
    }
  }

  removePlayer (interaction) {
    this.players.delete(interaction.user)
  }

  startGame () {
    let gameInstance = new game.Game("cz", this.players, this.lobbyCode) // "cz" = map
    this.server.currentGames.set(Helper.generateId16(), gameInstance)
    this.players.forEach((interaction, player) => {
      this.server.clearPlayerFromOldGame(interaction)
      this.server.playerTracker.set(player, gameInstance)
    });
    this.closeLobby()
  }

  closeLobby () {
    this.server.removeLobby(lobbyCode)
  }
}

module.exports = {
  Lobby
}