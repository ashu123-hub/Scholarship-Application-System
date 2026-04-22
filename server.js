require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const connectDB = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy — required for Render / Heroku / behind reverse proxy
if (isProduction) {
  app.set('trust proxy', 1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'scholarship-system-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: isProduction,         // HTTPS only in production
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Routes
const scholarshipRoutes = require('./src/routes/scholarships');
const applicationRoutes = require('./src/routes/applications');
const adminRoutes = require('./src/routes/admin');
const { router: authRoutes } = require('./src/routes/auth');

app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

// IP Project Postman Testing Routes (In-Memory array)
const ipLogger = require('./src/ip_api/middleware/logger');
const ipScholarshipRoutes = require('./src/ip_api/routes/scholarshipRoutes');
app.use('/scholarships', ipLogger, ipScholarshipRoutes);

// SPA fallback — serve HTML pages
app.get('/apply', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'apply.html'));
});

app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Initialize DB and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🎓 Scholarship Application System`);
    console.log(`   Server running at http://localhost:${PORT}`);
    console.log(`   Admin panel at http://localhost:${PORT}/admin`);
    console.log(`   Admin credentials: admin / ashu123\n`);
  });
}).catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});
