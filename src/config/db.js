const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Scholarship = require('../models/Scholarship');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/scholarhub');
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    
    await seedDatabase();
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

async function seedDatabase() {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const passwordHash = bcrypt.hashSync('ashu123', 10);
      await Admin.create({
        username: 'admin',
        password_hash: passwordHash,
        full_name: 'System Administrator'
      });
      console.log('👤 Seeded admin user (admin / ashu123)');
    }

    const scholarshipCount = await Scholarship.countDocuments();
    if (scholarshipCount === 0) {
      const scholarships = [
        {
          name: 'National Merit Scholarship',
          description: 'Awarded to students demonstrating exceptional academic achievement and leadership qualities.',
          amount: 50000,
          income_limit: 250000,
          category: 'Merit-Based',
          deadline: '2026-06-30',
          eligibility: 'Must have GPA above 8.0, enrolled in an accredited institution, Indian citizen',
          required_docs: 'Income Certificate, Mark Sheets, Aadhar Card, Bank Passbook'
        },
        {
          name: 'Women in STEM Grant',
          description: 'Empowering women pursuing degrees in Science, Technology, Engineering, and Mathematics.',
          amount: 75000,
          income_limit: 500000,
          category: 'Category-Based',
          deadline: '2026-07-15',
          eligibility: 'Female students enrolled in STEM programs, minimum GPA 7.5',
          required_docs: 'Income Certificate, College ID, Mark Sheets, Aadhar Card'
        },
        {
          name: 'Rural Development Scholarship',
          description: 'Supporting students from rural areas to pursue higher education.',
          amount: 40000,
          income_limit: 150000,
          category: 'Need-Based',
          deadline: '2026-05-31',
          eligibility: 'Must reside in a rural area, enrolled in any undergraduate program',
          required_docs: 'Income Certificate, Domicile Certificate, Mark Sheets, Aadhar Card, BPL Card'
        },
        {
          name: 'Engineering Excellence Award',
          description: 'Recognizing outstanding engineering students who demonstrate innovation and technical skills.',
          amount: 100000,
          income_limit: 800000,
          category: 'Merit-Based',
          deadline: '2026-08-15',
          eligibility: 'Engineering students with GPA above 8.5, must have completed at least 2 semesters',
          required_docs: 'Income Certificate, Mark Sheets, Project Portfolio, Aadhar Card'
        },
        {
          name: 'First Generation Learner Grant',
          description: 'A special grant for students who are the first in their family to pursue higher education.',
          amount: 35000,
          income_limit: 200000,
          category: 'Need-Based',
          deadline: '2026-06-15',
          eligibility: 'First person in family to attend college, any undergraduate program',
          required_docs: 'Income Certificate, Family Declaration, Mark Sheets, Aadhar Card'
        },
        {
          name: 'Research Innovation Fellowship',
          description: 'Supporting postgraduate students engaged in cutting-edge research.',
          amount: 150000,
          income_limit: 1000000,
          category: 'Research',
          deadline: '2026-09-01',
          eligibility: 'Postgraduate or PhD students with an active research project, faculty recommendation required',
          required_docs: 'Income Certificate, Research Proposal, Faculty Recommendation, Mark Sheets, Aadhar Card'
        }
      ];
      await Scholarship.insertMany(scholarships);
      console.log('📚 Seeded 6 scholarships');
    }
  } catch (error) {
    console.error('Seeding error:', error);
  }
}

module.exports = connectDB;
