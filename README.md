# PM Standards Hub

A comprehensive Project Management Standards Repository & Comparison tool that consolidates PMBOK 7, PRINCE2, ISO 21500, and ISO 21502 standards.

## Features

- **Standards Repository**: Browse and search through comprehensive project management standards
- **Side-by-Side Comparison**: Compare standards across different frameworks for specific topics
- **Scenario Recommender**: Get tailored recommendations based on project characteristics
- **Insights Dashboard**: View analytics and insights about overlaps, differences, and unique aspects
- **Deep Linking**: Direct links to specific sections within standards
- **CSV Import/Export**: Upload and export standards data
- **Global Search**: Search across all standards with keyword highlighting

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: SQLite for data storage
- **Frontend**: Pure HTML, CSS, and JavaScript
- **File Handling**: CSV parsing and generation
- **No external frameworks**: Built with vanilla JavaScript for maximum compatibility

## Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
PMGuideSync/
├── server.js              # Node.js server with REST API
├── package.json           # Dependencies and scripts
├── public/                # Frontend files
│   ├── index.html         # Home page
│   ├── repository.html    # Standards repository
│   ├── comparison.html    # Standards comparison
│   ├── dashboard.html     # Insights dashboard
│   ├── scenarios.html    # Scenario recommender
│   ├── admin.html         # Admin panel
│   ├── css/
│   │   └── style.css      # Professional styling
│   └── js/
│       └── app.js         # Global application logic
├── export/                # CSV export directory
├── uploads/               # File upload directory
└── standards.db           # SQLite database (created automatically)
```

## API Endpoints

- `GET /api/standards` - Get all standards data
- `GET /api/comparison` - Get all comparison data
- `GET /api/search?q=...` - Search standards
- `POST /api/upload` - Upload CSV files
- `GET /api/export?type=...` - Export data as CSV

## CSV Schema

### standards.csv
```
id,standard,topic,subtopic,section_reference,deep_link,content
```

### comparison.csv
```
topic,pmbok,prince2,iso21500,iso21502,similarities,differences,unique_points,reference_ids
```

## Usage

### Home Page
- Landing page with app overview
- Quick access to all features
- Global search functionality

### Standards Repository
- Browse standards by framework (PMBOK 7, PRINCE2, ISO 21500, ISO 21502)
- Navigate by topic and subtopic
- Deep linking to specific sections
- Bookmarking functionality

### Comparison Engine
- Select a topic to compare across frameworks
- Side-by-side view of standards
- Tabs for similarities, differences, and unique points
- Direct links to repository sections

### Scenario Recommender
- Input project characteristics (size, complexity, risk level)
- Get tailored framework recommendations
- Example scenarios for quick testing
- Focus area selection

### Insights Dashboard
- Analytics on standards coverage
- Framework overlap analysis
- Topic distribution charts
- Export capabilities

### Admin Panel
- Upload CSV files to update data
- Export current dataset
- Data validation and integrity checks
- System information and statistics

## Styling

The application uses a professional color scheme:
- **Primary**: Navy (#1a365d) and Teal (#2d7a7a)
- **Accent**: Gold (#d4af37)
- **Background**: Light Gray (#f7fafc)
- **Text**: Dark Gray (#2d3748)

## Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile devices

## Browser Compatibility

Supports all modern browsers:
- Chrome
- Firefox
- Safari
- Edge

## Development

To modify or extend the application:

1. **Backend**: Edit `server.js` for API changes
2. **Frontend**: Edit HTML files in `public/`
3. **Styling**: Modify `public/css/style.css`
4. **JavaScript**: Update `public/js/app.js`

## Data Management

The application includes comprehensive data management features:
- CSV import with validation
- Data export in multiple formats
- Duplicate detection
- Reference validation
- Backup and restore capabilities

## Security

- File upload validation
- SQL injection prevention
- XSS protection
- Input sanitization

## Performance

- In-memory search indexing
- Efficient database queries
- Optimized file handling
- Responsive UI updates

## License

MIT License - See LICENSE file for details

## Support

For issues or questions, please check the documentation or contact the development team.


