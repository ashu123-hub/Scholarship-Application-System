const express = require('express');
const router = express.Router();
const Scholarship = require('../models/Scholarship');

// GET /api/scholarships — List all active scholarships
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;

    let query = { is_active: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const scholarships = await Scholarship.find(query).sort({ deadline: 1 });

    res.json({ success: true, data: scholarships });
  } catch (error) {
    console.error('Error fetching scholarships:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scholarships' });
  }
});

// GET /api/scholarships/:id — Get single scholarship
router.get('/:id', async (req, res) => {
  try {
    const scholarship = await Scholarship.findById(req.params.id);

    if (scholarship) {
      res.json({ success: true, data: scholarship });
    } else {
      res.status(404).json({ success: false, message: 'Scholarship not found' });
    }
  } catch (error) {
    console.error('Error fetching scholarship:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scholarship' });
  }
});

// GET /api/scholarships/categories/list — Get unique categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Scholarship.distinct('category', { is_active: true });
    res.json({ success: true, data: categories.sort() });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

module.exports = router;
