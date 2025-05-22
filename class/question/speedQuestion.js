class SpeedQuestion {
  id = null
  setId = null
  questionText = ""
  correctAnswer = null

  constructor (id, setId, questionText, correctAnswer) {
    this.id = id
    this.setId = setId
    this.questionText = questionText
    this.correctAnswer = correctAnswer
  }
}

module.exports = {
  SpeedQuestion
}