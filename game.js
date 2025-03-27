class Game {
  @property players = []
  @property regions = new Map() //id -> player
  @property mapBuffer = null //based off map
  @property dataBuffer = null //based off map

  constructor (mapName, players) {

  }

  visualize () {
    this.regions.forEach((key, value) => {
      
    });
  }
}