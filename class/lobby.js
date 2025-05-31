const game = require('./game.js')
const Helper = require("./utility/helper.js")

class Lobby {
  players = new Map() //interaction.user -> interaction
  lobbyCode = "" //16 numbers, do you think collisions will happen?
  mapName = ""
  desiredSets = [1, 2, 3]
  server = null
  
  constructor (host, lobbyCode, server) {
    this.players.set(host.user, host)
    this.lobbyCode = lobbyCode
    this.server = server
    this.server.playerTracker.set(host.user, this)
    server.addLobby(this)
  }

  joinGame (interaction) {
    if(this.players.size < 8){
      this.server.clearPlayerFromOldGame(interaction)
      this.players.set(interaction.user, interaction)
      this.server.playerTracker.set(interaction.user, this)
    }
  }

  removePlayer (interaction) {
    this.players.delete(interaction.user)
  }

  startGame () {
    if (this.players.size > 0){
      let gameInstance = new game.Game("cz", this.players, this.lobbyCode, this.server, this.desiredSets) // "cz" = map
      this.server.currentGames.set(Helper.generateId16(), gameInstance)
      this.players.forEach((interaction, player) => {
        this.server.playerTracker.set(player, gameInstance)
      });
    }
    this.closeLobby()
  }

  closeLobby () {
    this.server.removeLobby(lobbyCode)
  }
}

module.exports = {
  Lobby
}