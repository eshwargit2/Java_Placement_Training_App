/**
 * Java Assessment Evaluation Engine
 * Handles MCQ, Error Correction, and Java Coding assessment grading with Output Test Case Evaluation
 */

const COMPILER_API_URL = 'https://appsail-50045987380.development.catalystappsail.in/api/compile';

function normalizeText(val) {
  if (!val) return '';
  return String(val).trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeOutput(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

/**
 * Compare actual compiler output with expected test case output
 * Allows trailing whitespace variations, token-level matching, and prompt prefix tolerance
 */
function compareOutputs(actualRaw, expectedRaw) {
  const actual = normalizeOutput(actualRaw);
  const expected = normalizeOutput(expectedRaw);

  if (!expected && !actual) return true;
  if (actual === expected) return true;

  // Case-insensitive exact match
  if (actual.toLowerCase() === expected.toLowerCase()) return true;

  // Split tokens by any whitespace (handles space formatting e.g. "1 2 3" vs "1  2  3")
  const actualTokens = actual.split(/\s+/).filter(Boolean);
  const expectedTokens = expected.split(/\s+/).filter(Boolean);

  if (actualTokens.length === expectedTokens.length && actualTokens.length > 0) {
    if (actualTokens.every((tok, i) => tok.toLowerCase() === expectedTokens[i].toLowerCase())) {
      return true;
    }
  }

  // Handle multiline line-by-line match
  const actualLines = actual.split('\n').map((l) => l.trim()).filter(Boolean);
  const expectedLines = expected.split('\n').map((l) => l.trim()).filter(Boolean);
  if (actualLines.length === expectedLines.length && actualLines.length > 0) {
    if (actualLines.every((l, i) => l.toLowerCase() === expectedLines[i].toLowerCase())) {
      return true;
    }
  }

  // Check if expected output is a suffix/tail of actual output (e.g. if student printed "Enter N: Positive")
  if (expectedTokens.length > 0 && actualTokens.length >= expectedTokens.length) {
    const tail = actualTokens.slice(-expectedTokens.length);
    if (tail.every((tok, i) => tok.toLowerCase() === expectedTokens[i].toLowerCase())) {
      return true;
    }
  }

  return false;
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

async function compileJavaCode(code, input = '') {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(COMPILER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        input: typeof input === 'string' ? input : '',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return await response.json();
  } catch (err) {
    return {
      success: false,
      output: err.name === 'AbortError' ? 'Compilation timed out after 12 seconds.' : (err.message || 'Compiler service error'),
    };
  }
}

/**
 * Evaluates Java code against test cases (sampleInput & expectedOutput)
 * Output match earns 1 mark; mismatch or compilation error earns 0 marks
 */
async function evaluateJavaCode(code, questionObj = {}, clientCodingMeta = null) {
  const rawCode = (code || '').trim();
  const sampleInput = String(questionObj.sampleInput || '').trim();
  const expectedOutput = String(questionObj.expectedOutput || questionObj.correctAnswer || '').trim();

  if (!rawCode || rawCode.toLowerCase() === 'not answered' || rawCode === '// Write your Java solution here...') {
    return {
      score: 0,
      status: 'Wrong',
      testCasePassed: false,
      sampleInput,
      expectedOutput,
      actualOutput: '',
      notes: 'No code submitted (0 Mark awarded).',
    };
  }

  // 1. Fast verification if student already ran and validated test case in browser
  if (clientCodingMeta && typeof clientCodingMeta.actualOutput === 'string' && clientCodingMeta.actualOutput) {
    const clientActual = clientCodingMeta.actualOutput;
    const clientPassed = compareOutputs(clientActual, expectedOutput);
    if (clientPassed) {
      return {
        score: 1,
        status: 'Correct',
        testCasePassed: true,
        sampleInput,
        expectedOutput,
        actualOutput: clientActual,
        notes: `Test Case Passed (+1 Mark). Output matched expected test case.\nExpected: "${expectedOutput}"\nActual: "${clientActual.trim()}"`,
      };
    }
  }

  // 2. Execute code on compiler sandbox with sampleInput
  const compileResult = await compileJavaCode(rawCode, sampleInput);
  const actualOutput = compileResult.output || '';
  const success = compileResult.success === true;

  if (!success) {
    return {
      score: 0,
      status: 'Wrong',
      testCasePassed: false,
      sampleInput,
      expectedOutput,
      actualOutput,
      notes: `Compilation / Runtime Error (0 Mark):\n${actualOutput.substring(0, 300)}`,
    };
  }

  // 3. Compare Output against Expected Test Case Output
  const isMatch = compareOutputs(actualOutput, expectedOutput);

  if (isMatch) {
    return {
      score: 1,
      status: 'Correct',
      testCasePassed: true,
      sampleInput,
      expectedOutput,
      actualOutput,
      notes: `Test Case Passed (+1 Mark). Output matched expected test case.\nExpected: "${expectedOutput}"\nActual: "${actualOutput.trim()}"`,
    };
  } else {
    return {
      score: 0,
      status: 'Wrong',
      testCasePassed: false,
      sampleInput,
      expectedOutput,
      actualOutput,
      notes: `Test Case Failed (0 Mark). Output mismatch.\nExpected: "${expectedOutput}"\nActual: "${actualOutput.trim()}"`,
    };
  }
}

module.exports = {
  evaluateMCQ,
  evaluateJavaCode,
  compareOutputs,
  normalizeOutput,
};

