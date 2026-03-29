const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET /api/scholarships — List all active scholarships
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { category, search } = req.query;

    let query = 'SELECT * FROM scholarships WHERE is_active = 1';
    const params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY deadline ASC';

    const stmt = db.prepare(query);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const scholarships = [];
    while (stmt.step()) {
      scholarships.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({ success: true, data: scholarships });
  } catch (error) {
    console.error('Error fetching scholarships:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scholarships' });
  }
});

// GET /api/scholarships/:id — Get single scholarship
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM scholarships WHERE id = ?');
    stmt.bind([parseInt(req.params.id)]);

    if (stmt.step()) {
      const scholarship = stmt.getAsObject();
      stmt.free();
      res.json({ success: true, data: scholarship });
    } else {
      stmt.free();
      res.status(404).json({ success: false, message: 'Scholarship not found' });
    }
  } catch (error) {
    console.error('Error fetching scholarship:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scholarship' });
  }
});

// GET /api/scholarships/categories/list — Get unique categories
router.get('/categories/list', (req, res) => {
  try {
    const db = getDb();
    const results = db.exec('SELECT DISTINCT category FROM scholarships WHERE is_active = 1 ORDER BY category');
    const categories = results.length > 0 ? results[0].values.map(v => v[0]) : [];
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

module.exports = router;
