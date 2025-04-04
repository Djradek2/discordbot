function generateId16 () {
  lobbyCode = ""
  for (let i = 0; i < 16; i++) {
    lobbyCode += Math.floor(Math.random() * 10)
  }
  return lobbyCode
}

module.exports = {
  generateId16
}