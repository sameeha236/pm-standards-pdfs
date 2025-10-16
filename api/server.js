// =====================
// Express Setup
// =====================
const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================
// Middleware
// =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/assets', express.static(__dirname));

const upload = multer({ dest: 'uploads/' });

// =====================
// Utility
// =====================
function generateDeepLink(standard, topic, page) {
  const standardId = standard.toLowerCase().replace(/\s+/g, '-').replace(/iso/, 'iso');
  const topicId = topic.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  return `#${standardId}-${topicId}-page-${page}`;
}

// =====================
// API ROUTES
// =====================

// ✅ 1. Get all standards (read CSV each request)
app.get('/api/standards', (req, res) => {
  const results = [];
  const csvPath = path.join(__dirname, '../standards.csv');
  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ error: 'standards.csv not found' });
  }

  let lastTopic = '';
  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (data) => {
      const rawTopic = (data.Topic || '').toString().trim();
      if (rawTopic) lastTopic = rawTopic;
      const topic = (rawTopic || lastTopic).trim();

      const standard = (data.Standards || '').toString().trim();
      const page = (data.Page || '').toString().trim();
      const excerpt = (data.Excerpt || '').toString();

      if (topic && standard && excerpt) {
        results.push({
          topic,
          standard,
          page,
          excerpt,
          deep_link: generateDeepLink(standard, topic, page),
          section_reference: page,
        });
      }
    })
    .on('end', () => res.json(results))
    .on('error', (err) => res.status(500).json({ error: err.message }));
});

// ✅ 2. Get all comparisons (read CSV each request)
app.get('/api/comparison', (req, res) => {
  const results = [];
  const csvPath = path.join(__dirname, '../comparisons.csv');
  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ error: 'comparisons.csv not found' });
  }

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => res.json(results))
    .on('error', (err) => res.status(500).json({ error: err.message }));
});

// ✅ 3. Get standards by topic
app.get('/api/comparison/:topic', (req, res) => {
  const topic = req.params.topic.trim().toLowerCase();
  const results = [];
  const csvPath = path.join(__dirname, '../standards.csv');
  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ error: 'standards.csv not found' });
  }

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (data) => {
      const currentTopic = (data.Topic || '').toString().trim().toLowerCase();
      if (currentTopic === topic) {
        results.push(data);
      }
    })
    .on('end', () => res.json(results))
    .on('error', (err) => res.status(500).json({ error: err.message }));
});

// ✅ 4. Upload CSV (optional, works locally)
app.post(
  '/api/upload',
  upload.fields([
    { name: 'standards', maxCount: 1 },
    { name: 'comparison', maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const standardsFile = req.files.standards?.[0];
      const comparisonFile = req.files.comparison?.[0];
      const messages = [];

      if (standardsFile) {
        fs.renameSync(standardsFile.path, path.join(__dirname, '../standards.csv'));
        messages.push('standards.csv updated');
      }

      if (comparisonFile) {
        fs.renameSync(comparisonFile.path, path.join(__dirname, '../comparisons.csv'));
        messages.push('comparisons.csv updated');
      }

      if (messages.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      res.json({ message: messages.join(', ') });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ✅ 5. Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// =====================
// Export for Vercel
// =====================
module.exports = app;
