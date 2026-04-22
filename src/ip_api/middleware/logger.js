// ─────────────────────────────────────────────────────────────────────────────
// Custom Logging Middleware
// Logs: Method | URL | Date & Time | Status Code
// Format: [2026-02-24] POST /scholarships/apply 201
// ─────────────────────────────────────────────────────────────────────────────

const logger = (req, res, next) => {
  const startTime = Date.now();

  // Capture the original res.json to intercept status code after response
  const originalSend = res.json.bind(res);

  res.json = (body) => {
    const endTime   = Date.now();
    const duration  = endTime - startTime;
    const now       = new Date();

    const dateStr   = now.toISOString().split('T')[0];  // YYYY-MM-DD
    const timeStr   = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // Log format: [2026-02-24 15:30:00] POST /scholarships/apply 201 (45ms)
    console.log(`[${dateStr} ${timeStr}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);

    return originalSend(body);
  };

  next();
};

module.exports = logger;
