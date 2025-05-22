class ChoiceQuestion {
  id = null
  setId = null
  questionText = ""
  correctAnswer = ""
  answer1 = ""
  answer2 = ""
  answer3 = ""

  constructor (id, setId, questionText, correctAnswer, answer1, answer2, answer3) {
    this.id = id
    this.setId = setId
    this.questionText = questionText
    this.correctAnswer = correctAnswer
    this.answer1 = answer1
    this.answer2 = answer2
    this.answer3 = answer3
  }
}

module.exports = {
  ChoiceQuestion
}