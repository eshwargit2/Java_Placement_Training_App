const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const Question = require('../models/Question');

const upload = multer({ storage: multer.memoryStorage() });

// In-Memory Question Cache
let questionsMemoryCache = null;

function loadExcelQuestionsFallback() {
  if (questionsMemoryCache && questionsMemoryCache.length > 0) {
    return questionsMemoryCache;
  }

  const candidatePaths = [
    path.join(__dirname, '../../frontend/Java_Placement_41_Day_COMPLETE_MCQQ_ERROR_CODING (1).xlsx'),
    path.join(__dirname, '../../Java_Placement_41_Day_COMPLETE_MCQQ_ERROR_CODING (1).xlsx'),
    path.join(__dirname, '../../frontend/Java_Placement_41_Day_MASTER_WITH_CODING_EVALUATION (2).xlsx'),
    path.join(__dirname, '../../frontend/Java_Placement_41_Day_FINAL_CORRECTED.xlsx'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const workbook = xlsx.readFile(p);
        const sheetName = workbook.SheetNames.includes('Question Bank')
          ? 'Question Bank'
          : workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        if (rows && rows.length > 0) {
          questionsMemoryCache = rows.map((row, index) => {
            const rawDay = String(row['Day'] || row['day'] || '1').replace(/[^0-9]/g, '');
            const dayNum = parseInt(rawDay, 10) || 1;

            return {
              _id: `fallback_${dayNum}_${index + 1}`,
              id: `fallback_${dayNum}_${index + 1}`,
              Day: dayNum,
              day: dayNum,
              'Question Number': parseInt(row['Question Number'] || row['No'] || (index + 1), 10),
              questionNumber: parseInt(row['Question Number'] || row['No'] || (index + 1), 10),
              'Question Type': String(row['Question Type'] || row['Type'] || 'MCQ').trim().toUpperCase(),
              questionType: String(row['Question Type'] || row['Type'] || 'MCQ').trim().toUpperCase(),
              Question: String(row['Question'] || '').trim(),
              question: String(row['Question'] || '').trim(),
              'Option A': String(row['Option A'] || row['optionA'] || '').trim(),
              optionA: String(row['Option A'] || row['optionA'] || '').trim(),
              'Option B': String(row['Option B'] || row['optionB'] || '').trim(),
              optionB: String(row['Option B'] || row['optionB'] || '').trim(),
              'Option C': String(row['Option C'] || row['optionC'] || '').trim(),
              optionC: String(row['Option C'] || row['optionC'] || '').trim(),
              'Option D': String(row['Option D'] || row['optionD'] || '').trim(),
              optionD: String(row['Option D'] || row['optionD'] || '').trim(),
              'Correct Answer': String(row['Correct Answer'] || row['correctAnswer'] || '').trim(),
              correctAnswer: String(row['Correct Answer'] || row['correctAnswer'] || '').trim(),
              'Coding Requirement': String(row['Coding Requirement'] || row['Requirement'] || row['codingRequirement'] || '').trim(),
              codingRequirement: String(row['Coding Requirement'] || row['Requirement'] || row['codingRequirement'] || '').trim(),
              'Coding Evaluation': String(row['Coding Evaluation'] || row['Evaluation'] || row['codingEvaluation'] || '').trim(),
              codingEvaluation: String(row['Coding Evaluation'] || row['Evaluation'] || row['codingEvaluation'] || '').trim(),
              'Sample Input': String(row['Sample Input'] || row['sampleInput'] || '').trim(),
              sampleInput: String(row['Sample Input'] || row['sampleInput'] || '').trim(),
              'Sample Output': String(row['Sample Output'] || row['expectedOutput'] || '').trim(),
              expectedOutput: String(row['Sample Output'] || row['expectedOutput'] || '').trim(),
              'Source Date / Assessment': String(row['Source Date / Assessment'] || row['sourceAssessment'] || '').trim(),
              sourceAssessment: String(row['Source Date / Assessment'] || row['sourceAssessment'] || '').trim(),
            };
          });
          return questionsMemoryCache;
        }
      } catch (e) {
        console.error('Error loading fallback excel questions:', e);
      }
    }
  }
  return [];
}

// Pre-warm the cache immediately on startup
setTimeout(() => {
  loadExcelQuestionsFallback();
}, 0);

// GET /api/questions - Get questions (filter by day if provided)
router.get('/', async (req, res) => {
  const { day } = req.query;
  const dayNum = day ? parseInt(day, 10) : null;

  // 1. Fast In-Memory Check (< 2ms)
  const cachedAll = loadExcelQuestionsFallback();
  const cachedFiltered = dayNum ? cachedAll.filter((q) => q.day === dayNum) : cachedAll;

  // If we already have cached questions for this day, deliver immediately
  if (cachedFiltered && cachedFiltered.length > 0) {
    // Background sync from MongoDB if needed
    Question.find(dayNum ? { day: dayNum } : {}).sort({ day: 1, questionNumber: 1 }).then((dbQuestions) => {
      if (dbQuestions && dbQuestions.length > 0) {
        // Update cache silently
        const mapped = dbQuestions.map((q) => ({
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
        if (dayNum) {
          questionsMemoryCache = (questionsMemoryCache || []).filter(q => q.day !== dayNum).concat(mapped);
        } else {
          questionsMemoryCache = mapped;
        }
      }
    }).catch(() => {});

    return res.json({
      success: true,
      count: cachedFiltered.length,
      questions: cachedFiltered,
      source: 'instant_cache',
    });
  }

  // 2. Fallback to direct MongoDB query with 2s timeout
  try {
    const filter = dayNum ? { day: dayNum } : {};
    const questions = await Question.find(filter).sort({ day: 1, questionNumber: 1 }).maxTimeMS(2000);
    if (questions && questions.length > 0) {
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
        source: 'db',
      });
    }
  } catch (err) {
    console.warn('MongoDB direct fetch error:', err.message);
  }

  return res.json({
    success: true,
    count: cachedFiltered.length,
    questions: cachedFiltered,
    source: 'cache_fallback',
  });
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

router.loadExcelQuestionsFallback = loadExcelQuestionsFallback;
module.exports = router;

