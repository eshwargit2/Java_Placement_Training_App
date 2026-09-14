const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const User = require('../models/User');
const Question = require('../models/Question');

async function seedDatabase() {
  try {
    // 1. Enforce Admin user credentials: @Admin / Admin@555 and remove old 'admin' account
    await User.deleteMany({ username: 'admin' });
    await User.updateOne(
      { username: '@admin' },
      {
        $set: {
          name: 'Administrator',
          username: '@admin',
          password: 'Admin@555',
          role: 'admin',
          year: 'Staff',
          assignedDay: 1,
        },
      },
      { upsert: true }
    );
    console.log('Verified Admin credentials: @Admin / Admin@555 in MongoDB');

    // 2. Seed Student accounts (student1 to student200) if not exists
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

    if (studentsToInsert.length > 0) {
      await User.insertMany(studentsToInsert);
      console.log(`Seeded ${studentsToInsert.length} student accounts into MongoDB (student1 to student200, password: 1234).`);
    } else {
      console.log(`All 200 student accounts (student1 to student200) are verified in MongoDB.`);
    }

    // 3. Seed Question Bank from Excel if Question collection is empty
    const questionCount = await Question.countDocuments();
    if (questionCount === 0) {
      console.log('No questions found in MongoDB. Checking for Excel Question Bank to auto-import...');
      
      const candidatePaths = [
        path.join(__dirname, '../../frontend/Java_Placement_41_Day_COMPLETE_MCQQ_ERROR_CODING (1).xlsx'),
        path.join(__dirname, '../../Java_Placement_41_Day_COMPLETE_MCQQ_ERROR_CODING (1).xlsx'),
        path.join(__dirname, '../../frontend/Java_Placement_41_Day_MASTER_WITH_CODING_EVALUATION (2).xlsx'),
        path.join(__dirname, '../../frontend/Java_Placement_41_Day_FINAL_CORRECTED.xlsx'),
      ];

      let excelPath = null;
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          excelPath = p;
          break;
        }
      }

      if (excelPath) {
        console.log(`Auto-seeding questions from: ${excelPath}`);
        const workbook = xlsx.readFile(excelPath);
        const sheetName = workbook.SheetNames.includes('Question Bank')
          ? 'Question Bank'
          : workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        if (rows && rows.length > 0) {
          const formattedQuestions = rows.map((row, index) => {
            const rawDay = String(row['Day'] || row['day'] || '1').replace(/[^0-9]/g, '');
            const dayNum = parseInt(rawDay, 10) || 1;

            return {
              day: dayNum,
              questionNumber: parseInt(row['Question Number'] || row['No'] || (index + 1), 10),
              questionType: String(row['Question Type'] || row['Type'] || 'MCQ').trim().toUpperCase(),
              question: String(row['Question'] || row['Question Title'] || '').trim(),
              optionA: String(row['Option A'] || row['A'] || '').trim(),
              optionB: String(row['Option B'] || row['B'] || '').trim(),
              optionC: String(row['Option C'] || row['C'] || '').trim(),
              optionD: String(row['Option D'] || row['D'] || '').trim(),
              correctAnswer: String(row['Correct Answer'] || row['Answer'] || '').trim(),
              codingRequirement: String(row['Coding Requirement'] || row['Requirement'] || '').trim(),
              codingEvaluation: String(row['Coding Evaluation'] || row['Full Mark Criteria'] || '').trim(),
              sampleInput: String(row['Sample Input'] || row['Input'] || '').trim(),
              expectedOutput: String(row['Sample Output'] || row['Expected Output'] || row['Output'] || '').trim(),
              sourceAssessment: String(row['Source Date / Assessment'] || row['Assessment'] || 'Java Placement Assessment').trim(),
            };
          }).filter(q => q.question);

          if (formattedQuestions.length > 0) {
            await Question.insertMany(formattedQuestions);
            console.log(`Successfully imported ${formattedQuestions.length} questions into MongoDB across ${new Set(formattedQuestions.map(q => q.day)).size} days!`);
          }
        }
      } else {
        console.log('No local Excel file found for auto-seeding. You can upload via Admin Dashboard.');
      }
    } else {
      console.log(`MongoDB contains ${questionCount} questions ready for assessments.`);
    }
  } catch (error) {
    console.error('Database seeding warning:', error.message);
  }
}

module.exports = { seedDatabase };
