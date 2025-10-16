const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Serve local PDF assets from the project root under /assets
app.use('/assets', express.static(__dirname));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Initialize SQLite database
const db = new sqlite3.Database('standards.db');

// Ensure schema matches expected; drop and recreate
db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS standards`);
  db.run(`DROP TABLE IF EXISTS comparisons`);
  db.run(`CREATE TABLE IF NOT EXISTS standards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    standard TEXT NOT NULL,
    page TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    deep_link TEXT NOT NULL,
    section_reference TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comparisons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    similarities TEXT NOT NULL,
    differences TEXT,
    unique_pmbok TEXT,
    unique_prince2 TEXT,
    unique_iso21500 TEXT,
    unique_iso21502 TEXT
  )`);
});

// Load initial data from CSV files (always refresh from CSV on startup)
function loadInitialData() {
  const fs = require('fs');
  const csv = require('csv-parser');
  
  // Load standards data: clear and reload
  const standardsData = [];
  if (fs.existsSync('standards.csv')) {
    let lastTopic = '';
    fs.createReadStream('standards.csv')
      .pipe(csv())
      .on('data', (data) => {
        // Forward-fill blank Topic cells (common with merged cells in spreadsheets)
        const rawTopic = (data.Topic || '').toString().trim();
        if (rawTopic) lastTopic = rawTopic;
        const topic = (rawTopic || lastTopic).trim();

        const standard = (data.Standards || '').toString().trim();
        const page = (data.Page === undefined || data.Page === null) ? '' : String(data.Page).trim();
        const excerpt = (data.Excerpt || '').toString();

        // Require standard and excerpt; topic can be forward-filled; page optional but recommended
        if (topic && standard && excerpt) {
          standardsData.push({
            topic,
            standard,
            page,
            excerpt,
            deep_link: generateDeepLink(standard, topic, page),
            section_reference: page
          });
        }
      })
      .on('end', () => {
        db.serialize(() => {
          db.run('DELETE FROM standards');
          const stmt = db.prepare("INSERT INTO standards (topic, standard, page, excerpt, deep_link, section_reference) VALUES (?, ?, ?, ?, ?, ?)");
          standardsData.forEach(item => {
            stmt.run(item.topic, item.standard, item.page, item.excerpt, item.deep_link, item.section_reference);
          });
          stmt.finalize();
          console.log(`Loaded ${standardsData.length} standards records`);
        });
      });
  } else {
    console.warn('standards.csv not found at project root');
  }

  // Load comparisons data: clear and reload
  const aggregatedComparison = {
    similarities: '',
    differences: '',
    unique_pmbok: '',
    unique_prince2: '',
    unique_iso21500: '',
    unique_iso21502: ''
  };
  
  if (fs.existsSync('comparisons.csv')) {
    fs.createReadStream('comparisons.csv')
      .pipe(csv())
      .on('data', (data) => {
        // Aggregate content from all rows
        if (data.Similarities && data.Similarities.trim()) {
          aggregatedComparison.similarities += (aggregatedComparison.similarities ? '\n\n' : '') + data.Similarities.trim();
        }
        if (data.Differences && data.Differences.trim()) {
          aggregatedComparison.differences += (aggregatedComparison.differences ? '\n\n' : '') + data.Differences.trim();
        }
        if (data['Unique PMBOK 7'] && data['Unique PMBOK 7'].trim()) {
          aggregatedComparison.unique_pmbok += (aggregatedComparison.unique_pmbok ? '\n\n' : '') + data['Unique PMBOK 7'].trim();
        }
        if (data['Unique PRINCE2'] && data['Unique PRINCE2'].trim()) {
          aggregatedComparison.unique_prince2 += (aggregatedComparison.unique_prince2 ? '\n\n' : '') + data['Unique PRINCE2'].trim();
        }
        if (data['Unique ISO 21500'] && data['Unique ISO 21500'].trim()) {
          aggregatedComparison.unique_iso21500 += (aggregatedComparison.unique_iso21500 ? '\n\n' : '') + data['Unique ISO 21500'].trim();
        }
        if (data['Unique ISO 21502'] && data['Unique ISO 21502'].trim()) {
          aggregatedComparison.unique_iso21502 += (aggregatedComparison.unique_iso21502 ? '\n\n' : '') + data['Unique ISO 21502'].trim();
        }
      })
      .on('end', () => {
        db.serialize(() => {
          db.run('DELETE FROM comparisons');
          const stmt = db.prepare("INSERT INTO comparisons (similarities, differences, unique_pmbok, unique_prince2, unique_iso21500, unique_iso21502) VALUES (?, ?, ?, ?, ?, ?)");
          stmt.run(aggregatedComparison.similarities, aggregatedComparison.differences, aggregatedComparison.unique_pmbok, aggregatedComparison.unique_prince2, aggregatedComparison.unique_iso21500, aggregatedComparison.unique_iso21502);
          stmt.finalize();
          console.log(`Loaded aggregated comparison data`);
        });
      });
  } else {
    console.warn('comparisons.csv not found at project root');
  }
}

function generateDeepLink(standard, topic, page) {
  const standardId = standard.toLowerCase().replace(/\s+/g, '-').replace(/iso/, 'iso');
  const topicId = topic.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  return `#${standardId}-${topicId}-page-${page}`;
}

// API Routes

// Get all standards
app.get('/api/standards', (req, res) => {
  db.all("SELECT * FROM standards", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get all comparisons
app.get('/api/comparison', (req, res) => {
  db.all("SELECT * FROM comparisons", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get unique topics for dropdown
app.get('/api/topics', (req, res) => {
  db.all("SELECT DISTINCT topic FROM standards ORDER BY topic", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => row.topic));
  });
});

// Get comparison data for a specific topic
app.get('/api/comparison/:topic', (req, res) => {
  const topic = req.params.topic;
  db.all("SELECT * FROM standards WHERE topic = ? ORDER BY standard", [topic], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Search standards
app.get('/api/search', (req, res) => {
  const query = req.query.q;
  if (!query) {
    res.json([]);
    return;
  }

  const searchQuery = `
    SELECT * FROM standards 
    WHERE content LIKE ? OR topic LIKE ? OR subtopic LIKE ? OR standard LIKE ?
  `;
  const searchTerm = `%${query}%`;

  db.all(searchQuery, [searchTerm, searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Upload CSV files
app.post('/api/upload', upload.fields([
  { name: 'standards', maxCount: 1 },
  { name: 'comparison', maxCount: 1 }
]), (req, res) => {
  try {
    const standardsFile = req.files.standards?.[0];
    const comparisonFile = req.files.comparison?.[0];

    if (standardsFile) {
      const results = [];
      fs.createReadStream(standardsFile.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          // Clear existing data and insert new data
          db.run("DELETE FROM standards", (err) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            
            const stmt = db.prepare("INSERT INTO standards (standard, topic, subtopic, section_reference, deep_link, content) VALUES (?, ?, ?, ?, ?, ?)");
            results.forEach(row => {
              stmt.run(row.standard, row.topic, row.subtopic, row.section_reference, row.deep_link, row.content);
            });
            stmt.finalize();
            
            fs.unlinkSync(standardsFile.path);
            res.json({ message: 'Standards data uploaded successfully', count: results.length });
          });
        });
    }

    if (comparisonFile) {
      const results = [];
      fs.createReadStream(comparisonFile.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          db.run("DELETE FROM comparisons", (err) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            
            const stmt = db.prepare("INSERT INTO comparisons (topic, pmbok, prince2, iso21500, iso21502, similarities, differences, unique_points, reference_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            results.forEach(row => {
              stmt.run(row.topic, row.pmbok, row.prince2, row.iso21500, row.iso21502, row.similarities, row.differences, row.unique_points, row.reference_ids);
            });
            stmt.finalize();
            
            fs.unlinkSync(comparisonFile.path);
            res.json({ message: 'Comparison data uploaded successfully', count: results.length });
          });
        });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export data as CSV
app.get('/api/export', (req, res) => {
  const exportType = req.query.type || 'standards';
  
  if (exportType === 'standards') {
    db.all("SELECT * FROM standards", (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const csvWriter = createCsvWriter({
        path: 'export/standards.csv',
        header: [
          { id: 'id', title: 'id' },
          { id: 'standard', title: 'standard' },
          { id: 'topic', title: 'topic' },
          { id: 'subtopic', title: 'subtopic' },
          { id: 'section_reference', title: 'section_reference' },
          { id: 'deep_link', title: 'deep_link' },
          { id: 'content', title: 'content' }
        ]
      });
      
      csvWriter.writeRecords(rows).then(() => {
        res.download('export/standards.csv');
      });
    });
  } else if (exportType === 'comparison') {
    db.all("SELECT * FROM comparisons", (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const csvWriter = createCsvWriter({
        path: 'export/comparison.csv',
        header: [
          { id: 'id', title: 'id' },
          { id: 'topic', title: 'topic' },
          { id: 'pmbok', title: 'pmbok' },
          { id: 'prince2', title: 'prince2' },
          { id: 'iso21500', title: 'iso21500' },
          { id: 'iso21502', title: 'iso21502' },
          { id: 'similarities', title: 'similarities' },
          { id: 'differences', title: 'differences' },
          { id: 'unique_points', title: 'unique_points' },
          { id: 'reference_ids', title: 'reference_ids' }
        ]
      });
      
      csvWriter.writeRecords(rows).then(() => {
        res.download('export/comparison.csv');
      });
    });
  }
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize data and start server
loadInitialData();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

