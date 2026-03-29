const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'scholarship.db');

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS scholarships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      income_limit REAL NOT NULL,
      category TEXT NOT NULL,
      deadline TEXT NOT NULL,
      eligibility TEXT NOT NULL,
      required_docs TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_id TEXT UNIQUE NOT NULL,
      scholarship_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      dob TEXT NOT NULL,
      gender TEXT NOT NULL,
      address TEXT,
      institution TEXT NOT NULL,
      course TEXT NOT NULL,
      year_of_study INTEGER NOT NULL,
      gpa REAL,
      annual_income REAL NOT NULL,
      income_proof_path TEXT,
      status TEXT DEFAULT 'pending',
      admin_remarks TEXT,
      verified_by TEXT,
      verified_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (scholarship_id) REFERENCES scholarships(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Seed data if tables are empty
  const scholarshipCount = db.exec("SELECT COUNT(*) as count FROM scholarships");
  if (scholarshipCount[0].values[0][0] === 0) {
    seedScholarships();
  }

  const adminCount = db.exec("SELECT COUNT(*) as count FROM admins");
  if (adminCount[0].values[0][0] === 0) {
    seedAdmin();
  }

  saveDatabase();
  console.log('✅ Database initialized successfully');
  return db;
}

function seedScholarships() {
  const scholarships = [
    {
      name: 'National Merit Scholarship',
      description: 'Awarded to students demonstrating exceptional academic achievement and leadership qualities. This prestigious scholarship supports undergraduate students across all disciplines who maintain outstanding academic records.',
      amount: 50000,
      income_limit: 250000,
      category: 'Merit-Based',
      deadline: '2026-06-30',
      eligibility: 'Must have GPA above 8.0, enrolled in an accredited institution, Indian citizen',
      required_docs: 'Income Certificate, Mark Sheets, Aadhar Card, Bank Passbook'
    },
    {
      name: 'Women in STEM Grant',
      description: 'Empowering women pursuing degrees in Science, Technology, Engineering, and Mathematics. This grant aims to bridge the gender gap in STEM fields by providing financial assistance to deserving female students.',
      amount: 75000,
      income_limit: 500000,
      category: 'Category-Based',
      deadline: '2026-07-15',
      eligibility: 'Female students enrolled in STEM programs, minimum GPA 7.5',
      required_docs: 'Income Certificate, College ID, Mark Sheets, Aadhar Card'
    },
    {
      name: 'Rural Development Scholarship',
      description: 'Supporting students from rural areas to pursue higher education. This scholarship is designed to uplift students from villages and small towns who show academic promise but face financial constraints.',
      amount: 40000,
      income_limit: 150000,
      category: 'Need-Based',
      deadline: '2026-05-31',
      eligibility: 'Must reside in a rural area, enrolled in any undergraduate program',
      required_docs: 'Income Certificate, Domicile Certificate, Mark Sheets, Aadhar Card, BPL Card'
    },
    {
      name: 'Engineering Excellence Award',
      description: 'Recognizing outstanding engineering students who demonstrate innovation and technical skills. Open to all branches of engineering with a focus on practical application of knowledge.',
      amount: 100000,
      income_limit: 800000,
      category: 'Merit-Based',
      deadline: '2026-08-15',
      eligibility: 'Engineering students with GPA above 8.5, must have completed at least 2 semesters',
      required_docs: 'Income Certificate, Mark Sheets, Project Portfolio, Aadhar Card'
    },
    {
      name: 'First Generation Learner Grant',
      description: 'A special grant for students who are the first in their family to pursue higher education. This program recognizes the courage and determination of first-generation college students.',
      amount: 35000,
      income_limit: 200000,
      category: 'Need-Based',
      deadline: '2026-06-15',
      eligibility: 'First person in family to attend college, any undergraduate program',
      required_docs: 'Income Certificate, Family Declaration, Mark Sheets, Aadhar Card'
    },
    {
      name: 'Research Innovation Fellowship',
      description: 'Supporting postgraduate students engaged in cutting-edge research. This fellowship provides financial backing for students whose research has the potential to create significant societal impact.',
      amount: 150000,
      income_limit: 1000000,
      category: 'Research',
      deadline: '2026-09-01',
      eligibility: 'Postgraduate or PhD students with an active research project, faculty recommendation required',
      required_docs: 'Income Certificate, Research Proposal, Faculty Recommendation, Mark Sheets, Aadhar Card'
    }
  ];

  const stmt = db.prepare(
    `INSERT INTO scholarships (name, description, amount, income_limit, category, deadline, eligibility, required_docs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  scholarships.forEach(s => {
    stmt.run([s.name, s.description, s.amount, s.income_limit, s.category, s.deadline, s.eligibility, s.required_docs]);
  });

  stmt.free();
  console.log('📚 Seeded 6 scholarships');
}

function seedAdmin() {
  const passwordHash = bcrypt.hashSync('ashu123', 10);
  db.run(
    `INSERT INTO admins (username, password_hash, full_name) VALUES (?, ?, ?)`,
    ['admin', passwordHash, 'System Administrator']
  );
  console.log('👤 Seeded admin user (admin / ashu123)');
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function getDb() {
  return db;
}

module.exports = { initDatabase, getDb, saveDatabase };
