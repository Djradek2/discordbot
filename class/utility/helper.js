function generateId16 () {
  lobbyCode = ""
  for (let i = 0; i < 16; i++) {
    lobbyCode += Math.floor(Math.random() * 10)
  }
  return lobbyCode
}

function shuffleArray (array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = {
  generateId16,
  shuffleArray
}