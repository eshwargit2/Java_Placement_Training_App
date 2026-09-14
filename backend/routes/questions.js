const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Question = require('../models/Question');

const upload = multer({ storage: multer.memoryStorage() });

// GET /api/questions - Get questions (filter by day if provided)
router.get('/', async (req, res) => {
  try {
    const { day } = req.query;
    const filter = {};
    if (day) {
      filter.day = parseInt(day, 10);
    }

    const questions = await Question.find(filter).sort({ day: 1, questionNumber: 1 });

    // Format to match both camelCase and legacy Excel keys for maximum compatibility
    const formatted = questions.map((q) => ({
      _id: q._id,
      id: q._id,
      Day: q.day,
      day: q.day,
      'Question Number': q.questionNumber,
      questionNumber: q.questionNumber,
      'Question Type': q.questionType,
      questionType: q.questionType,
      Question: q.question,
      question: q.question,
      'Option A': q.optionA,
      optionA: q.optionA,
      'Option B': q.optionB,
      optionB: q.optionB,
      'Option C': q.optionC,
      optionC: q.optionC,
      'Option D': q.optionD,
      optionD: q.optionD,
      'Correct Answer': q.correctAnswer,
      correctAnswer: q.correctAnswer,
      'Coding Requirement': q.codingRequirement,
      codingRequirement: q.codingRequirement,
      'Coding Evaluation': q.codingEvaluation,
      codingEvaluation: q.codingEvaluation,
      'Sample Input': q.sampleInput,
      sampleInput: q.sampleInput,
      'Sample Output': q.expectedOutput,
      expectedOutput: q.expectedOutput,
      'Source Date / Assessment': q.sourceAssessment,
      sourceAssessment: q.sourceAssessment,
    }));

    return res.json({
      success: true,
      count: formatted.length,
      questions: formatted,
    });
  } catch (error) {
    console.error('Fetch questions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch questions.',
      error: error.message,
    });
  }
});

// GET /api/questions/days - List all available days and summary
router.get('/days', async (req, res) => {
  try {
    const dayAggregation = await Question.aggregate([
      {
        $group: {
          _id: '$day',
          count: { $sum: 1 },
          topic: { $first: '$sourceAssessment' },
          mcqCount: {
            $sum: { $cond: [{ $eq: ['$questionType', 'MCQ'] }, 1, 0] },
          },
          errorCount: {
            $sum: {
              $cond: [
                {
                  $in: ['$questionType', ['ERROR', 'ERROR CORRECTION']],
                },
                1,
                0,
              ],
            },
          },
          codingCount: {
            $sum: { $cond: [{ $eq: ['$questionType', 'CODING'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const days = dayAggregation.map((d) => ({
      day: d._id,
      count: d.count,
      topic: d.topic || `Day ${d._id} Assessment`,
      mcqCount: d.mcqCount,
      errorCount: d.errorCount,
      codingCount: d.codingCount,
    }));

    const totalQuestions = days.reduce((sum, d) => sum + d.count, 0);

    return res.json({
      success: true,
      totalDays: days.length,
      totalQuestions,
      days,
    });
  } catch (error) {
    console.error('Fetch question days error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch question days summary.',
      error: error.message,
    });
  }
});

// POST /api/questions/import - Import questions via Excel File or JSON array into MongoDB
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    let rows = [];

    // Case 1: Uploaded Excel file
    if (req.file) {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames.includes('Question Bank')
        ? 'Question Bank'
        : workbook.SheetNames[0];
      rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    }
    // Case 2: JSON body
    else if (req.body.questions && Array.isArray(req.body.questions)) {
      rows = req.body.questions;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file or provide a questions array.',
      });
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No questions found to import.',
      });
    }

    const formattedQuestions = rows
      .map((row, index) => {
        const rawDay = String(row['Day'] || row['day'] || '1').replace(/[^0-9]/g, '');
        const dayNum = parseInt(rawDay, 10) || 1;

        return {
          day: dayNum,
          questionNumber: parseInt(row['Question Number'] || row['questionNumber'] || (index + 1), 10),
          questionType: String(row['Question Type'] || row['questionType'] || 'MCQ').trim().toUpperCase(),
          question: String(row['Question'] || row['question'] || '').trim(),
          optionA: String(row['Option A'] || row['optionA'] || row['A'] || '').trim(),
          optionB: String(row['Option B'] || row['optionB'] || row['B'] || '').trim(),
          optionC: String(row['Option C'] || row['optionC'] || row['C'] || '').trim(),
          optionD: String(row['Option D'] || row['optionD'] || row['D'] || '').trim(),
          correctAnswer: String(row['Correct Answer'] || row['correctAnswer'] || row['Answer'] || '').trim(),
          codingRequirement: String(row['Coding Requirement'] || row['codingRequirement'] || '').trim(),
          codingEvaluation: String(row['Coding Evaluation'] || row['codingEvaluation'] || '').trim(),
          sampleInput: String(row['Sample Input'] || row['sampleInput'] || '').trim(),
          expectedOutput: String(row['Sample Output'] || row['expectedOutput'] || '').trim(),
          sourceAssessment: String(row['Source Date / Assessment'] || row['sourceAssessment'] || 'Java Placement Assessment').trim(),
        };
      })
      .filter((q) => q.question);

    if (formattedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not parse any valid questions from the data.',
      });
    }

    // Optional: clear existing or replace
    const replaceAll = req.query.replace === 'true' || req.body.replace === true;
    if (replaceAll) {
      await Question.deleteMany({});
    }

    await Question.insertMany(formattedQuestions);

    const distinctDays = [...new Set(formattedQuestions.map((q) => q.day))];

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${formattedQuestions.length} questions across ${distinctDays.length} days into MongoDB.`,
      importedCount: formattedQuestions.length,
      daysCount: distinctDays.length,
    });
  } catch (error) {
    console.error('Import questions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to import questions to MongoDB.',
      error: error.message,
    });
  }
});

// DELETE /api/questions - Clear all questions or specific day
router.delete('/', async (req, res) => {
  try {
    const { day } = req.query;
    const filter = {};
    if (day) {
      filter.day = parseInt(day, 10);
    }

    const result = await Question.deleteMany(filter);
    const msg = day
      ? `Deleted ${result.deletedCount} questions for Day ${day} from MongoDB.`
      : `Deleted all ${result.deletedCount} questions from MongoDB.`;

    return res.json({
      success: true,
      message: msg,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete questions from MongoDB.',
      error: error.message,
    });
  }
});

module.exports = router;
