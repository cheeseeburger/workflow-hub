const fetch = require('node-fetch');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Sends extracted text (or filename as a fallback signal) to the FastAPI
// classifier service and returns { category, confidence, anomaly, anomaly_reason }
async function classifyDocument(text, filename) {
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, filename })
    });
    if (!resp.ok) throw new Error(`ML service responded ${resp.status}`);
    return await resp.json();
  } catch (err) {
    // Fail open: don't block the workflow if the ML service is down,
    // just mark it unclassified so a human can triage it.
    console.error('ML classify call failed:', err.message);
    return { category: 'Unclassified', confidence: 0, anomaly: false, anomaly_reason: null };
  }
}

module.exports = { classifyDocument };
