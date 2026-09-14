const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const User = require('../models/User');
const Question = require('../models/Question');
const { evaluateMCQ, evaluateJavaCode } = require('../utils/evaluator');

// POST /api/assessments/submit - Submit and grade an assessment, save to MongoDB
router.post('/submit', async (req, res) => {
  try {
    const {
      studentUsername,
      studentName,
      studentYear,
      day,
      answers, // Array of { questionId / index, question, questionType, studentAnswer }
    } = req.body;

    if (!studentUsername || !day) {
      return res.status(400).json({
        success: false,
        message: 'Student username and assessment day are required.',
      });
    }

    const dayNum = parseInt(day, 10) || 1;

    // Fetch official questions from MongoDB for this day
    const officialQuestions = await Question.find({ day: dayNum }).sort({ questionNumber: 1 });

    let score = 0;
    let total = 0;
    const answerSheet = [];

    // Map answers by question or index
    const studentAnswerMap = {};
    if (Array.isArray(answers)) {
      answers.forEach((ans, idx) => {
        if (ans.questionId) {
          studentAnswerMap[String(ans.questionId)] = ans.studentAnswer;
        }
        if (ans.question) {
          studentAnswerMap[String(ans.question).trim().toLowerCase()] = ans.studentAnswer;
        }
        studentAnswerMap[`idx_${idx}`] = ans.studentAnswer;
      });
    }

    if (officialQuestions.length > 0) {
      // Evaluate against official questions from MongoDB
      for (let i = 0; i < officialQuestions.length; i++) {
        const q = officialQuestions[i];
        const type = String(q.questionType || 'MCQ').trim().toUpperCase();
        
        let rawAnswer =
          studentAnswerMap[String(q._id)] ||
          studentAnswerMap[String(q.question).trim().toLowerCase()] ||
          studentAnswerMap[`idx_${i}`] ||
          'Not Answered';

        total += 1;

        if (type === 'MCQ' || type === 'ERROR' || type === 'ERROR CORRECTION') {
          const evalRes = evaluateMCQ(rawAnswer, q.correctAnswer);
          score += evalRes.score;
          answerSheet.push({
            question: q.question,
            questionType: type,
            optionA: q.optionA || '',
            optionB: q.optionB || '',
            optionC: q.optionC || '',
            optionD: q.optionD || '',
            studentAnswer: rawAnswer,
            correctAnswer: q.correctAnswer,
            score: evalRes.score,
            status: evalRes.status,
            evaluationNotes: evalRes.status === 'Correct' ? 'Answer matched' : 'Incorrect answer',
          });
        } else if (type === 'CODING') {
          const evalRes = evaluateJavaCode(rawAnswer, q);
          score += evalRes.score;
          answerSheet.push({
            question: q.question,
            questionType: 'CODING',
            optionA: '',
            optionB: '',
            optionC: '',
            optionD: '',
            studentAnswer: rawAnswer,
            correctAnswer: q.codingEvaluation || q.codingRequirement || 'Algorithmic Java Implementation',
            score: evalRes.score,
            status: evalRes.status,
            evaluationNotes: evalRes.notes,
          });
        } else {
          // Default evaluation
          const evalRes = evaluateMCQ(rawAnswer, q.correctAnswer);
          score += evalRes.score;
          answerSheet.push({
            question: q.question,
            questionType: type,
            optionA: q.optionA || '',
            optionB: q.optionB || '',
            optionC: q.optionC || '',
            optionD: q.optionD || '',
            studentAnswer: rawAnswer,
            correctAnswer: q.correctAnswer,
            score: evalRes.score,
            status: evalRes.status,
            evaluationNotes: '',
          });
        }
      }
    } else if (Array.isArray(answers) && answers.length > 0) {
      // Fallback: evaluate submitted items directly if no official questions in DB
      for (let i = 0; i < answers.length; i++) {
        const ans = answers[i];
        const type = String(ans.questionType || ans.type || 'MCQ').trim().toUpperCase();
        const rawAnswer = ans.studentAnswer || ans.answer || 'Not Answered';
        total += 1;

        if (type === 'CODING') {
          const evalRes = evaluateJavaCode(rawAnswer, {
            question: ans.question,
            codingRequirement: ans.requirement,
          });
          score += evalRes.score;
          answerSheet.push({
            question: ans.question || `Question ${i + 1}`,
            questionType: 'CODING',
            studentAnswer: rawAnswer,
            correctAnswer: ans.correctAnswer || 'Java Implementation',
            score: evalRes.score,
            status: evalRes.status,
            evaluationNotes: evalRes.notes,
          });
        } else {
          const evalRes = evaluateMCQ(rawAnswer, ans.correctAnswer);
          score += evalRes.score;
          answerSheet.push({
            question: ans.question || `Question ${i + 1}`,
            questionType: type,
            studentAnswer: rawAnswer,
            correctAnswer: ans.correctAnswer || '',
            score: evalRes.score,
            status: evalRes.status,
            evaluationNotes: '',
          });
        }
      }
    }

    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const passStatus = percentage >= 50 ? 'Passed' : 'Completed';

    // Find student user to ensure fresh profile
    const studentUser = await User.findOne({
      username: String(studentUsername).trim().toLowerCase(),
    });

    const regNum = req.body.registerNumber || (studentUser ? studentUser.registerNumber : '') || '';
    const dept = req.body.department || (studentUser ? studentUser.department : '') || '';

    const submission = await Submission.create({
      studentId: studentUser ? studentUser._id : null,
      studentName: studentName || (studentUser ? studentUser.name : 'Student'),
      studentUsername: String(studentUsername).trim().toLowerCase(),
      registerNumber: regNum,
      department: dept,
      studentYear: studentYear || (studentUser ? studentUser.year : 'Final Year'),
      day: dayNum,
      score,
      total,
      percentage,
      status: passStatus,
      answerSheet,
      submittedAt: new Date(),
    });

    // Auto-advance student's assignedDay to dayNum + 1 if student exists and currently on dayNum
    let nextAssignedDay = dayNum;
    if (studentUser) {
      if (studentUser.assignedDay <= dayNum && dayNum < 41) {
        nextAssignedDay = dayNum + 1;
        await User.findByIdAndUpdate(studentUser._id, {
          $set: { assignedDay: nextAssignedDay },
        });
        console.log(`Auto-advanced ${studentUser.username} to Day ${nextAssignedDay}`);
      } else {
        nextAssignedDay = studentUser.assignedDay;
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Assessment submitted and evaluated successfully.',
      submissionId: submission._id,
      newAssignedDay: nextAssignedDay,
      submission: {
        id: submission._id,
        _id: submission._id,
        day: submission.day,
        score: submission.score,
        total: submission.total,
        percentage: submission.percentage,
        status: submission.status,
        studentName: submission.studentName,
        studentUsername: submission.studentUsername,
        studentYear: submission.studentYear,
        submittedAt: submission.submittedAt,
        answerSheet: submission.answerSheet,
      },
    });
  } catch (error) {
    console.error('Assessment submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit assessment.',
      error: error.message,
    });
  }
});

// GET /api/assessments - Get all submissions (support filter by studentUsername / day)
router.get('/', async (req, res) => {
  try {
    const { studentUsername, day, status } = req.query;
    const filter = {};

    if (studentUsername) {
      filter.studentUsername = String(studentUsername).trim().toLowerCase();
    }
    if (day) {
      filter.day = parseInt(day, 10);
    }
    if (status) {
      filter.status = status;
    }

    const submissions = await Submission.find(filter).sort({ submittedAt: -1 });

    return res.json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error('Fetch submissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment reports.',
      error: error.message,
    });
  }
});

// GET /api/assessments/:id - Get single submission with full answer sheet
router.get('/:id', async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).lean();
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found.',
      });
    }

    // Enrich options if missing
    if (submission.answerSheet && submission.answerSheet.length > 0 && submission.day) {
      const officialQuestions = await Question.find({ day: submission.day }).lean();
      const qMap = {};
      officialQuestions.forEach(q => {
        if (q.question) qMap[q.question.trim().toLowerCase()] = q;
      });

      submission.answerSheet = submission.answerSheet.map(item => {
        const match = qMap[(item.question || '').trim().toLowerCase()];
        return {
          ...item,
          optionA: item.optionA || (match ? match.optionA : ''),
          optionB: item.optionB || (match ? match.optionB : ''),
          optionC: item.optionC || (match ? match.optionC : ''),
          optionD: item.optionD || (match ? match.optionD : ''),
        };
      });
    }

    return res.json({
      success: true,
      submission,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch submission details.',
      error: error.message,
    });
  }
});

// DELETE /api/assessments/:id - Delete a submission (Admin) and update student's assigned progress
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Submission.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found.',
      });
    }

    // Recalculate student's progress based on remaining submissions in MongoDB
    let newAssignedDay = 1;
    const studentUsername = deleted.studentUsername ? String(deleted.studentUsername).trim().toLowerCase() : '';
    if (studentUsername) {
      const remainingSubmissions = await Submission.find({
        studentUsername,
      });

      if (remainingSubmissions.length > 0) {
        const maxCompletedDay = remainingSubmissions.reduce((max, s) => Math.max(max, Number(s.day) || 1), 0);
        newAssignedDay = Math.min(Math.max(maxCompletedDay + 1, 1), 41);
      } else {
        newAssignedDay = 1;
      }

      await User.findOneAndUpdate(
        { username: studentUsername },
        { $set: { assignedDay: newAssignedDay } }
      );
      console.log(`Updated ${studentUsername} assigned day to Day ${newAssignedDay} after submission deletion.`);
    }

    return res.json({
      success: true,
      message: 'Submission deleted successfully and student progress updated.',
      deletedSubmissionId: deleted._id,
      studentUsername,
      newAssignedDay,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete submission.',
      error: error.message,
    });
  }
});

module.exports = router;
