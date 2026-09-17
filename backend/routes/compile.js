const express = require('express');
const router = express.Router();

const COMPILER_API_URL = 'https://appsail-50045987380.development.catalystappsail.in/api/compile';

/**
 * POST /api/compile
 * Compiles and executes Java code using Catalyst AppSail Online Compiler
 * Payload: { code: string, input?: string }
 * Response: { output: string, success: boolean }
 */
router.post('/', async (req, res) => {
  try {
    const { code, input } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        output: 'Error: No Java source code provided for compilation.',
      });
    }

    const payload = {
      code: code,
      input: typeof input === 'string' ? input : '',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(COMPILER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Compiler Proxy Error]:', error.message || error);
    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        output: 'Compilation timed out after 15 seconds. Please ensure your code does not contain infinite loops.',
      });
    }
    return res.status(502).json({
      success: false,
      output: `Compiler Service Error: ${error.message || 'Failed to connect to online Java compiler backend.'}`,
    });
  }
});

module.exports = router;
