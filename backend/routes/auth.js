const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password, expectedRole } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username and password.',
      });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password).trim();
    const roleMode = expectedRole === 'admin' ? 'admin' : expectedRole === 'student' ? 'student' : null;

    // Check user in MongoDB
    const user = await User.findOne({ username: cleanUsername });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: roleMode === 'admin'
          ? 'Invalid admin username or password.'
          : roleMode === 'student'
            ? 'Invalid student username or password.'
            : 'Invalid Username or Password.',
      });
    }

    if (user.password !== cleanPassword) {
      return res.status(401).json({
        success: false,
        message: roleMode === 'admin'
          ? 'Invalid admin username or password.'
          : roleMode === 'student'
            ? 'Invalid student username or password.'
            : 'Invalid Username or Password.',
      });
    }

    // Enforce selected login mode (admin vs student)
    if (roleMode && user.role !== roleMode) {
      return res.status(403).json({
        success: false,
        message: roleMode === 'admin'
          ? 'Admin credentials required. This account is not an admin.'
          : 'Student credentials required. Switch to Admin mode for admin login.',
      });
    }

    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        registerNumber: user.registerNumber || '',
        department: user.department || '',
        year: user.year || 'Final Year',
        assignedDay: user.assignedDay,
        profileCompleted: !!user.profileCompleted,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.',
      error: error.message,
    });
  }
});

module.exports = router;
