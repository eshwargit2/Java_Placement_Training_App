# Student Placement Assessment Portal (Express.js + MongoDB)

A full-stack web application for 41-day Java placement training, question management, student progress tracking, live assessments, automated code evaluation, and performance analytics.

## Tech Stack
- **Backend**: Node.js, Express.js, Mongoose, Multer, XLSX
- **Database**: MongoDB (Local or MongoDB Atlas)
- **Frontend**: HTML5, Vanilla JavaScript, Modern CSS (Responsive Glassmorphism & Card System)

---

## Project Structure
```
student-placement-assessment-portal/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection manager
│   ├── models/
│   │   ├── User.js               # Students and Admins schema
│   │   ├── Question.js           # 41-day Curriculum questions
│   │   └── Submission.js         # Assessment results & answer sheets
│   ├── routes/
│   │   ├── auth.js               # Authentication endpoints
│   │   ├── students.js           # Student CRUD endpoints
│   │   ├── questions.js          # Question bank & Excel import
│   │   ├── assessments.js        # Assessment grading & submission
│   │   └── stats.js              # Admin KPI analytics
│   ├── utils/
│   │   ├── evaluator.js          # Java evaluation engine
│   │   └── seeder.js             # Initial database & Excel seeder
│   ├── .env                      # Environment config (MongoDB URI)
│   ├── package.json              # Backend dependencies
│   └── server.js                 # Express server entry point
└── frontend/
    ├── api.js                    # Frontend REST API client
    ├── index.html                # Login Page
    ├── script.js                 # Authentication logic
    ├── admin.html                # Admin Dashboard & Question Bank
    ├── students.html             # Student Management
    ├── student.html              # Student Dashboard & Day Progress
    ├── assessment.html           # Live Assessment & Code Editor
    ├── results.html              # Result Breakdown & Answer Sheet
    ├── reports.html              # Performance Reports & CSV Export
    ├── style.css                 # Unified stylesheet
    └── Java_Placement_41_Day_... # Question bank Excel dataset
```

---

## Connecting to MongoDB Atlas

Open [`backend/.env`](file:///d:/Eshu/placement%20Training/Training%20Practice%20App/Java%20Placement%20App/student-placement-assessment-portal/backend/.env) and paste your **MongoDB Atlas connection string**:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/placement_portal?retryWrites=true&w=majority
```

*(Replace `<username>`, `<password>`, and cluster address with your MongoDB Atlas details).*

---

## Running the Project

### 1. Install dependencies (one-time setup)
```bash
cd backend
npm install
```

### 2. Start the Express Server
```bash
npm start
```
*Or for automatic reload during development:*
```bash
npm run dev
```

### 3. Open in Browser
- **Portal Login:** [http://localhost:5000/index.html](http://localhost:5000/index.html)
- **Admin Dashboard:** [http://localhost:5000/admin.html](http://localhost:5000/admin.html)
- **Student Portal:** [http://localhost:5000/student.html](http://localhost:5000/student.html)

---

## Default Credentials
- **Admin:** `@Admin` / `Admin@555`
- **Students (200 accounts):** `student1` to `student200` / `1234`

---

## Features
1. **Full MongoDB Persistence**: All students, questions across 41 days, assessment answers, scores, and evaluation logs are stored in MongoDB collections.
2. **Auto-Seeding**: Automatically seeds admin, demo student, and parses the 41-day Excel question bank on first database initialization.
3. **Automated Java Evaluation**: Intelligent server-side rule engine analyzes MCQ, error correction, and Java algorithmic syntax for immediate grading.
4. **Curriculum Progression**: Automatically moves students to their next assigned training day upon successful assessment completion.
5. **Real-time Admin Analytics**: Live KPIs, student enrollment, submission records, and CSV export.
