import { createRequire } from "module"; // Node.js built-in module
const require = createRequire(import.meta.url);
const xmljs = require("xml-js");
const fs = require("pn/fs");

let colors = ["F0F0F0", "#3f47cc", "#ed1b24", "#26b050", "#fdf003", "#9dd7eb", "#ff01f5", "#7f7f7f", "#fec80e"]

export default class Game {
  players = []
  regions = new Map() //id -> player
  mapBuffer = null //based off map
  dataBuffer = null //based off map

  constructor (mapName, players) {
    this.mapBuffer = xmljs.xml2js(fs.readFileSync(mapName + ".svg", "utf8"), { compact: true }) //this should actually already be loaded on server start and just be passed to the buffer
    this.dataBuffer = xmljs.xml2js(fs.readFileSync(mapName + ".xml", "utf8"), { compact: true })
    this.dataBuffer.map.region.forEach((region) => {
      this.regions.set(region.id._text, 0)
    })
  }

  visualize () {
    let visualBuffer = this.mapBuffer
    visualBuffer.svg.path.forEach((path) => {
      path._attributes.style = `fill: ${colors[this.regions.get(path._attributes.id)]}; stroke: rgb(0, 0, 255);`
    })
    const updatedBuffer = xmljs.js2xml(visualBuffer, { compact: true, spaces: 2 })
    fs.writeFileSync("visualized_game.svg", updatedBuffer, "utf8");
  }

  setOwner (regionId, playerId) {
    this.regions.set(String(regionId), playerId)
  }
}