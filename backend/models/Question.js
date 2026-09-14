const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: true,
      index: true,
    },
    questionNumber: {
      type: Number,
      default: 1,
    },
    questionType: {
      type: String,
      required: true,
      trim: true,
      uppercase: true, // MCQ, ERROR, CODING
    },
    question: {
      type: String,
      required: true,
    },
    optionA: {
      type: String,
      default: '',
    },
    optionB: {
      type: String,
      default: '',
    },
    optionC: {
      type: String,
      default: '',
    },
    optionD: {
      type: String,
      default: '',
    },
    correctAnswer: {
      type: String,
      default: '',
    },
    codingRequirement: {
      type: String,
      default: '',
    },
    codingEvaluation: {
      type: String,
      default: '',
    },
    sampleInput: {
      type: String,
      default: '',
    },
    expectedOutput: {
      type: String,
      default: '',
    },
    sourceAssessment: {
      type: String,
      default: 'Java Placement Assessment',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', QuestionSchema);
