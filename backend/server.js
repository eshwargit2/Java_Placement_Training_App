const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const { seedDatabase } = require('./utils/seeder');

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const questionRoutes = require('./routes/questions');
const assessmentRoutes = require('./routes/assessments');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    service: 'Student Placement Assessment Portal API',
  });
});

// Fallback to index.html for root or SPA navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Connect to MongoDB and start server
async function startServer() {
  const isConnected = await connectDB();
  if (isConnected) {
    await seedDatabase();
  }

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Student Placement Assessment Portal Server Running `);
    console.log(` Local URL: http://localhost:${PORT}`);
    console.log(` Admin Portal: http://localhost:${PORT}/admin.html`);
    console.log(` Student Portal: http://localhost:${PORT}/student.html`);
    console.log(`====================================================`);
  });
}

startServer();
