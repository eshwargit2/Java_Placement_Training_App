const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Question = require('../models/Question');
const Submission = require('../models/Submission');

// GET /api/stats - High level portal metrics directly from MongoDB
router.get('/', async (req, res) => {
  try {
    const [totalQuestions, totalStudents, totalSubmissions, distinctDays] = await Promise.all([
      Question.countDocuments(),
      User.countDocuments({ role: 'student' }),
      Submission.countDocuments(),
      Question.distinct('day'),
    ]);

    // Average score aggregation
    const avgScoreAgg = await Submission.aggregate([
      {
        $group: {
          _id: null,
          avgPercentage: { $avg: '$percentage' },
          passedCount: {
            $sum: { $cond: [{ $gte: ['$percentage', 50] }, 1, 0] },
          },
        },
      },
    ]);

    const avgPercentage = avgScoreAgg.length > 0 ? Math.round(avgScoreAgg[0].avgPercentage) : 0;
    const passedCount = avgScoreAgg.length > 0 ? avgScoreAgg[0].passedCount : 0;

    return res.json({
      success: true,
      stats: {
        totalQuestions,
        totalDays: distinctDays.length || 41,
        totalStudents,
        totalSubmissions,
        avgPercentage,
        passedCount,
        passRate: totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Stats fetch error from MongoDB:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics from MongoDB.',
      error: error.message,
    });
  }
});

module.exports = router;
