const mongoose = require('mongoose');

const AnswerSheetItemSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      default: 'MCQ',
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
    studentAnswer: {
      type: String,
      default: '',
    },
    correctAnswer: {
      type: String,
      default: '',
    },
    score: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Correct', 'Wrong', 'Partial', 'Pending'],
      default: 'Wrong',
    },
    evaluationNotes: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const SubmissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    studentUsername: {
      type: String,
      required: true,
      trim: true,
    },
    registerNumber: {
      type: String,
      default: '',
      trim: true,
    },
    department: {
      type: String,
      default: '',
      trim: true,
    },
    studentYear: {
      type: String,
      default: 'Final Year',
    },
    day: {
      type: Number,
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    percentage: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Passed', 'Failed', 'Completed'],
      default: 'Completed',
    },
    answerSheet: [AnswerSheetItemSchema],
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Submission', SubmissionSchema);
