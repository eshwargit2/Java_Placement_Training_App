const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Submission = require('../models/Submission');

// GET /api/students - List all students
router.get('/', async (req, res) => {
  try {
    const [students, submissionCounts] = await Promise.all([
      User.find({ role: 'student' }).lean(),
      Submission.aggregate([
        { $group: { _id: '$studentUsername', count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = {};
    submissionCounts.forEach((sc) => {
      if (sc._id) countMap[sc._id] = sc.count;
    });

    // Natural sort: student1, student2, ... student10, ... student200
    students.sort((a, b) => {
      const numA = parseInt((a.username || '').replace(/\D/g, ''), 10);
      const numB = parseInt((b.username || '').replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return (a.username || '').localeCompare(b.username || '');
    });

    const studentList = students.map((s) => ({
      id: s._id,
      _id: s._id,
      name: s.name,
      username: s.username,
      password: s.password,
      registerNumber: s.registerNumber || '',
      department: s.department || '',
      year: s.year || 'Final Year',
      assignedDay: s.assignedDay,
      profileCompleted: !!s.profileCompleted,
      testsTaken: countMap[s.username] || 0,
      createdAt: s.createdAt,
    }));

    return res.json({
      success: true,
      students: studentList,
    });
  } catch (error) {
    console.error('Fetch students error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch students.',
      error: error.message,
    });
  }
});

// POST /api/students/profile/update - Logged-in student profile update
router.post('/profile/update', async (req, res) => {
  try {
    const { username, name, registerNumber, department, year } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required.',
      });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const updateData = {
      profileCompleted: true,
    };

    if (name) updateData.name = String(name).trim();
    if (registerNumber) updateData.registerNumber = String(registerNumber).trim();
    if (department) updateData.department = String(department).trim();
    if (year) updateData.year = String(year).trim();

    const student = await User.findOneAndUpdate(
      { username: cleanUsername },
      { $set: updateData },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Student profile updated successfully in MongoDB!',
      student: {
        id: student._id,
        _id: student._id,
        name: student.name,
        username: student.username,
        role: student.role,
        registerNumber: student.registerNumber,
        department: student.department,
        year: student.year,
        assignedDay: student.assignedDay,
        profileCompleted: true,
      },
    });
  } catch (error) {
    console.error('Update student profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save student profile.',
      error: error.message,
    });
  }
});

// GET /api/students/:username - Get single student by username
router.get('/:username', async (req, res) => {
  try {
    const username = String(req.params.username).trim().toLowerCase();
    const student = await User.findOne({ username, role: 'student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    const submissions = await Submission.find({ studentUsername: username }).sort({ submittedAt: -1 });

    return res.json({
      success: true,
      student: {
        id: student._id,
        _id: student._id,
        name: student.name,
        username: student.username,
        registerNumber: student.registerNumber || '',
        department: student.department || '',
        year: student.year || 'Final Year',
        assignedDay: student.assignedDay,
        profileCompleted: !!student.profileCompleted,
      },
      submissions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching student details.',
      error: error.message,
    });
  }
});

// POST /api/students - Add new student (Admin)
router.post('/', async (req, res) => {
  try {
    const { name, username, password, registerNumber, department, year, assignedDay } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, username, and password are required.',
      });
    }

    const cleanUsername = String(username).trim().toLowerCase();

    // Check if username already exists
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this username already exists.',
      });
    }

    const dayNum = parseInt(assignedDay, 10) || 1;

    const newStudent = await User.create({
      name: String(name).trim(),
      username: cleanUsername,
      password: String(password).trim(),
      registerNumber: String(registerNumber || '').trim(),
      department: String(department || 'CSE').trim(),
      year: String(year || 'Final Year').trim(),
      assignedDay: Math.min(Math.max(dayNum, 1), 41),
      role: 'student',
      profileCompleted: !!(registerNumber && department),
    });

    return res.status(201).json({
      success: true,
      message: 'Student created successfully in MongoDB.',
      student: newStudent,
    });
  } catch (error) {
    console.error('Create student error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create student.',
      error: error.message,
    });
  }
});

// PUT /api/students/:id - Update student details or assigned day
router.put('/:id', async (req, res) => {
  try {
    const { name, password, registerNumber, department, year, assignedDay } = req.body;
    const updateData = {};

    if (name) updateData.name = String(name).trim();
    if (password) updateData.password = String(password).trim();
    if (registerNumber !== undefined) updateData.registerNumber = String(registerNumber).trim();
    if (department !== undefined) updateData.department = String(department).trim();
    if (year) updateData.year = String(year).trim();
    if (assignedDay !== undefined) {
      const dayNum = parseInt(assignedDay, 10);
      if (!isNaN(dayNum)) {
        updateData.assignedDay = Math.min(Math.max(dayNum, 1), 41);
      }
    }

    const updatedStudent = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Student updated successfully in MongoDB.',
      student: updatedStudent,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update student.',
      error: error.message,
    });
  }
});

// DELETE /api/students/:id - Delete or Reset & Regenerate student account
router.delete('/:id', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    const username = student.username;

    // 1. Delete all submission history for this student
    await Submission.deleteMany({ studentUsername: username });

    // 2. Check if username is in sequence student1 to student200
    const match = username.match(/^student(\d+)$/i);
    let regenerated = false;
    let freshStudent = null;

    if (match) {
      const num = parseInt(match[1], 10);
      const paddedNum = String(num).padStart(3, '0');
      freshStudent = await User.findByIdAndUpdate(
        student._id,
        {
          $set: {
            name: `Student ${num}`,
            username: `student${num}`,
            password: '1234',
            role: 'student',
            registerNumber: `REG${paddedNum}`,
            department: 'CSE',
            year: 'Final Year',
            assignedDay: 1,
            profileCompleted: false,
          },
        },
        { new: true }
      );
      regenerated = true;
    } else {
      await User.findByIdAndDelete(student._id);
    }

    return res.json({
      success: true,
      regenerated,
      message: regenerated
        ? `Student account "${username}" has been cleared and regenerated as a fresh new account (password: 1234).`
        : `Student "${username}" deleted successfully from MongoDB.`,
      student: freshStudent,
    });
  } catch (error) {
    console.error('Delete student error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete/reset student.',
      error: error.message,
    });
  }
});

// POST /api/students/regenerate-all - Restore / Regenerate any missing student1 to student200 accounts
router.post('/regenerate-all', async (req, res) => {
  try {
    const expectedStudents = [];
    for (let i = 1; i <= 200; i++) {
      expectedStudents.push(`student${i}`);
    }

    const existingStudents = await User.find({
      username: { $in: expectedStudents },
    }).select('username');
    const existingSet = new Set(existingStudents.map((s) => s.username));

    const studentsToInsert = [];
    for (let i = 1; i <= 200; i++) {
      const uname = `student${i}`;
      if (!existingSet.has(uname)) {
        const paddedNum = String(i).padStart(3, '0');
        studentsToInsert.push({
          name: `Student ${i}`,
          username: uname,
          password: '1234',
          role: 'student',
          registerNumber: `REG${paddedNum}`,
          department: 'CSE',
          year: 'Final Year',
          assignedDay: 1,
          profileCompleted: false,
        });
      }
    }

    let insertedCount = 0;
    if (studentsToInsert.length > 0) {
      await User.insertMany(studentsToInsert);
      insertedCount = studentsToInsert.length;
    }

    return res.json({
      success: true,
      message: insertedCount > 0
        ? `Successfully regenerated and restored ${insertedCount} missing student accounts in MongoDB (student1 to student200).`
        : 'All 200 student accounts (student1 to student200) are already active and present in MongoDB.',
      restoredCount: insertedCount,
      totalCount: 200,
    });
  } catch (error) {
    console.error('Regenerate all students error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to regenerate student accounts.',
      error: error.message,
    });
  }
});

module.exports = router;
