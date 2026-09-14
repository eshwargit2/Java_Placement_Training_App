/**
 * Java Assessment Evaluation Engine
 * Handles MCQ, Error Correction, and Java Coding assessment grading
 */

function normalizeText(val) {
  if (!val) return '';
  return String(val).trim().toLowerCase().replace(/\s+/g, ' ');
}

function evaluateMCQ(studentAnswer, correctAnswer) {
  const normStudent = normalizeText(studentAnswer);
  const normCorrect = normalizeText(correctAnswer);

  if (!normStudent || normStudent === 'not answered') {
    return { isCorrect: false, score: 0, status: 'Wrong' };
  }

  // Exact match
  if (normStudent === normCorrect) {
    return { isCorrect: true, score: 1, status: 'Correct' };
  }

  // Check prefix matches e.g. "A. Option Text" vs "A" or "Option Text"
  const studentLetterMatch = normStudent.match(/^([a-d])[\.\)]?\s*(.*)$/);
  const correctLetterMatch = normCorrect.match(/^([a-d])[\.\)]?\s*(.*)$/);

  if (studentLetterMatch && correctLetterMatch) {
    if (studentLetterMatch[1] === correctLetterMatch[1]) {
      return { isCorrect: true, score: 1, status: 'Correct' };
    }
  }

  if (studentLetterMatch && studentLetterMatch[1] === normCorrect) {
    return { isCorrect: true, score: 1, status: 'Correct' };
  }

  if (correctLetterMatch && normStudent === correctLetterMatch[1]) {
    return { isCorrect: true, score: 1, status: 'Correct' };
  }

  return { isCorrect: false, score: 0, status: 'Wrong' };
}

function evaluateJavaCode(code, questionObj) {
  if (!code || !code.trim() || code.trim().toLowerCase() === 'not answered') {
    return {
      status: 'Wrong',
      score: 0,
      notes: 'No code provided (0 mark).',
    };
  }

  // Any entered input/text gets 1 mark
  return {
    status: 'Correct',
    score: 1,
    notes: 'Code submitted successfully (1 mark awarded).',
  };
}

module.exports = {
  evaluateMCQ,
  evaluateJavaCode,
};
