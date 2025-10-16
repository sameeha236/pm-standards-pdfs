// Global Application JavaScript
class PMStandardsApp {
  constructor() {
    this.searchIndex = new Map();
    this.currentData = {
      standards: [],
      comparisons: []
    };
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.buildSearchIndex();
  }

  async loadData() {
    try {
      const [standardsResponse, comparisonsResponse] = await Promise.all([
        fetch('/api/standards'),
        fetch('/api/comparison')
      ]);

      this.currentData.standards = await standardsResponse.json();
      this.currentData.comparisons = await comparisonsResponse.json();
    } catch (error) {
      console.error('Error loading data:', error);
      this.showNotification('Error loading data. Please refresh the page.', 'error');
    }
  }

  buildSearchIndex() {
    this.searchIndex.clear();
    
    this.currentData.standards.forEach(standard => {
      const searchableText = [
        standard.standard,
        standard.topic,
        standard.excerpt
      ].join(' ').toLowerCase();

      const words = searchableText.split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) {
          if (!this.searchIndex.has(word)) {
            this.searchIndex.set(word, []);
          }
          this.searchIndex.get(word).push(standard);
        }
      });
    });
  }

  setupEventListeners() {
    // Global search functionality
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.performSearch(e.target.value);
        }, 300);
      });
    }

    // Navigation dropdowns
    this.setupNavigationDropdowns();

    // Deep link handling
    this.handleDeepLinks();
  }

  setupNavigationDropdowns() {
    const dropdownTriggers = document.querySelectorAll('.nav-item');
    dropdownTriggers.forEach(trigger => {
      trigger.addEventListener('mouseenter', () => {
        const dropdown = trigger.querySelector('.dropdown');
        if (dropdown) {
          dropdown.style.opacity = '1';
          dropdown.style.visibility = 'visible';
          dropdown.style.transform = 'translateY(0)';
        }
      });

      trigger.addEventListener('mouseleave', () => {
        const dropdown = trigger.querySelector('.dropdown');
        if (dropdown) {
          dropdown.style.opacity = '0';
          dropdown.style.visibility = 'hidden';
          dropdown.style.transform = 'translateY(-10px)';
        }
      });

      // Enable click toggle for touch/mobile and accessibility
      const link = trigger.querySelector('.nav-link');
      const dropdown = trigger.querySelector('.dropdown');
      if (link && dropdown) {
        link.addEventListener('click', (e) => {
          // If this item has a dropdown, toggle it instead of immediate navigation
          if (dropdown) {
            e.preventDefault();
            const visible = dropdown.style.visibility === 'visible';
            dropdown.style.opacity = visible ? '0' : '1';
            dropdown.style.visibility = visible ? 'hidden' : 'visible';
            dropdown.style.transform = visible ? 'translateY(-10px)' : 'translateY(0)';
          }
        });
      }
    });
  }

  performSearch(query) {
    if (!query || query.length < 2) {
      this.hideSearchResults();
      return;
    }

    const results = this.searchStandards(query);
    this.displaySearchResults(results, query);
  }

  searchStandards(query) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const results = new Map();

    queryWords.forEach(word => {
      if (word.length > 2) {
        this.searchIndex.forEach((standards, indexWord) => {
          if (indexWord.includes(word)) {
            standards.forEach(standard => {
              if (!results.has(standard.id)) {
                results.set(standard.id, {
                  ...standard,
                  relevanceScore: 0
                });
              }
              results.get(standard.id).relevanceScore += 1;
            });
          }
        });
      }
    });

    return Array.from(results.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);
  }

  displaySearchResults(results, query) {
    const searchContainer = document.querySelector('.global-search');
    if (!searchContainer) return;

    let resultsContainer = searchContainer.querySelector('.search-results');
    if (!resultsContainer) {
      resultsContainer = document.createElement('div');
      resultsContainer.className = 'search-results';
      searchContainer.appendChild(resultsContainer);
    }

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="search-result-item">No results found</div>';
      resultsContainer.style.display = 'block';
      return;
    }

    resultsContainer.innerHTML = results.map(result => `
      <div class="search-result-item" onclick="app.navigateToStandard('${result.deep_link}')">
        <div class="search-result-title">${this.highlightText(result.standard, query)}</div>
        <div class="search-result-topic">${this.highlightText(result.topic, query)} - ${this.highlightText(result.subtopic, query)}</div>
        <div class="search-result-content">${this.highlightText(result.content.substring(0, 100), query)}...</div>
      </div>
    `).join('');

    resultsContainer.style.display = 'block';
  }

  hideSearchResults() {
    const resultsContainer = document.querySelector('.search-results');
    if (resultsContainer) {
      resultsContainer.style.display = 'none';
    }
  }

  highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  navigateToStandard(deepLink) {
    this.hideSearchResults();
    
    // Check if it's an external URL
    if (deepLink.startsWith('http://') || deepLink.startsWith('https://')) {
      // Open external link in new tab
      window.open(deepLink, '_blank');
      return;
    }
    
    // If we're on the repository page, scroll to the section
    if (window.location.pathname.includes('repository.html')) {
      const element = document.querySelector(deepLink);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        element.classList.add('highlighted');
        setTimeout(() => element.classList.remove('highlighted'), 3000);
      }
    } else {
      // Navigate to repository page with deep link
      window.location.href = `repository.html${deepLink}`;
    }
  }

  handleDeepLinks() {
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          element.classList.add('highlighted');
          setTimeout(() => element.classList.remove('highlighted'), 3000);
        }
      }, 500);
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#e53e3e' : type === 'success' ? '#38a169' : '#3182ce'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 4px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Repository specific functionality
  setupRepository() {
    const standardGroups = document.querySelectorAll('.standard-group');
    standardGroups.forEach(group => {
      const title = group.querySelector('.standard-title');
      const topicList = group.querySelector('.topic-list');
      
      if (title && topicList) {
        title.addEventListener('click', () => {
          topicList.style.display = topicList.style.display === 'none' ? 'block' : 'none';
        });
      }
    });

    const topicItems = document.querySelectorAll('.topic-item');
    topicItems.forEach(item => {
      item.addEventListener('click', () => {
        const topic = item.textContent.trim();
        this.loadSectionContent(topic);
      });
    });
  }

  async loadSectionContent(topic) {
    const sections = this.currentData.standards.filter(s => s.topic === topic);
    const contentPanel = document.querySelector('.content-panel');
    if (!contentPanel) return;

    const getBookLink = (standard, page) => {
      const bookUrls = {
        'PMBOK 7': '/assets/PMBOK.pdf',
        'PRINCE2': '/assets/PRINCE2.pdf',
        'ISO 21500': '/assets/ISO 21500-2021.pdf',
        'ISO 21502': '/assets/ISO 21502-2020.pdf'
      };
      const bookTitles = {
        'PMBOK 7': 'PMBOK Guide 7th Edition',
        'PRINCE2': 'PRINCE2 7th Edition',
        'ISO 21500': 'ISO 21500:2021',
        'ISO 21502': 'ISO 21502:2020'
      };
      const url = bookUrls[standard];
      const title = bookTitles[standard];
      return url && title ? `pdf-viewer.html?file=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&page=${page}` : '#';
    };

    contentPanel.innerHTML = sections.map(section => `
      <div class="section-content" id="${section.deep_link.substring(1)}">
        <div class="section-header">
          <div class="section-title">${section.standard} - ${topic}</div>
          <div class="section-reference">Page ${section.page}</div>
        </div>
        <div class="section-text">${section.excerpt}</div>
        <div class="section-actions">
          <a href="${getBookLink(section.standard, section.page)}" class="btn btn-primary" target="_blank">📖 Open in Book (Page ${section.page})</a>
          <a href="${section.deep_link}" class="btn btn-link">🔗 Deep Link</a>
        </div>
      </div>
    `).join('');

    const firstSection = contentPanel.querySelector('.section-content');
    if (firstSection) firstSection.classList.add('active');
  }

  // Comparison specific functionality
  async setupComparison() {
    const topicSelect = document.getElementById('topic-select');
    if (topicSelect) {
      topicSelect.addEventListener('change', async (e) => {
        if (e.target.value) this.loadComparison(e.target.value);
      });

      // Load topics from API
      try {
        const response = await fetch('/api/topics');
        const topics = await response.json();
        
        topicSelect.innerHTML = '<option value="">Select a topic to compare</option>' +
          topics.map(topic => `<option value="${topic}">${topic}</option>`).join('');

        // Deep link support: comparison.html#topic=...
        const hash = new URLSearchParams(window.location.hash.replace('#',''));
        const fromHash = hash.get('topic');
        if (fromHash) {
          const resolved = this.resolveTopic(fromHash, topics);
          if (resolved) {
            topicSelect.value = resolved;
            this.loadComparison(resolved);
          }
        }
      } catch (error) {
        console.error('Error loading topics:', error);
        this.showNotification('Error loading topics', 'error');
      }
    }

    // Setup comparison tabs
    this.setupComparisonTabs();
  }

  // Fuzzy topic resolver (handles prefixes like "10. Risk & Uncertainty Management")
  resolveTopic(keyword, topicsList) {
    if (!keyword) return '';
    const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const key = norm(keyword);
    const list = topicsList || [...new Set(this.currentData.standards.map(s => s.topic))];
    // Exact match first
    const exact = list.find(t => norm(t) === key);
    if (exact) return exact;
    // Contains match on any word
    return list.find(t => norm(t).includes(key)) || '';
  }

  setupComparisonTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        
        // Update active tab button
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update active tab content
        tabContents.forEach(content => {
          content.classList.remove('active');
          if (content.dataset.tab === targetTab) {
            content.classList.add('active');
          }
        });
      });
    });
  }

  async loadComparison(topic) {
    if (!topic) return;
    
    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    const comparisonGrid = document.querySelector('.comparison-grid');
    
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    
    try {
      // Fetch comparison data for the specific topic
      const response = await fetch(`/api/comparison/${encodeURIComponent(topic)}`);
      const topicData = await response.json();
      
      // Update comparison stats
      this.updateComparisonStats(topic, topicData);
      
      // Get book link function
      const getBookLink = (standard, page) => {
        const bookUrls = {
          'PMBOK 7': '/assets/PMBOK.pdf',
          'PRINCE2': '/assets/PRINCE2.pdf',
          'ISO 21500': '/assets/ISO 21500-2021.pdf',
          'ISO 21502': '/assets/ISO 21502-2020.pdf'
        };
        const bookTitles = {
          'PMBOK 7': 'PMBOK Guide 7th Edition',
          'PRINCE2': 'PRINCE2 7th Edition',
          'ISO 21500': 'ISO 21500:2021',
          'ISO 21502': 'ISO 21502:2020'
        };
        const url = bookUrls[standard];
        const title = bookTitles[standard];
        return url && title ? `pdf-viewer.html?file=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&page=${page}` : '#';
      };

      // Group data by standard
      const byStandard = (name) => topicData.filter(s => s.standard === name);

      // Create enhanced comparison cards
      const makeCard = (standardName, badge, icon) => {
        const items = byStandard(standardName);
        
        if (items.length === 0) {
          return `
            <div class="comparison-card" data-standard="${standardName}">
              <div class="standard-header">
                <div class="standard-name">${standardName}</div>
                <div class="standard-badge">${badge}</div>
              </div>
              <div class="comparison-content">
                <div class="no-data-message">
                  <div class="placeholder-icon">${icon}</div>
                  <p>No content available for this topic in ${standardName}</p>
                </div>
              </div>
            </div>
          `;
        }

        const content = items.map(item => `
          <div class="excerpt-text">${item.excerpt}</div>
          ${item.page && item.page !== '-' ? `
            <div class="comparison-meta">
              <strong>Reference:</strong> Page ${item.page}
            </div>
            <a href="${getBookLink(item.standard, item.page)}" 
               target="_blank" 
               class="page-link"
               title="Open ${standardName} to page ${item.page}">
              View Page ${item.page}
            </a>
          ` : ''}
        `).join('');

        return `
          <div class="comparison-card" data-standard="${standardName}">
            <div class="standard-header">
              <div class="standard-name">${standardName}</div>
              <div class="standard-badge">${badge}</div>
            </div>
            <div class="comparison-content">
              ${content}
            </div>
          </div>
        `;
      };

      // Generate the comparison grid
      if (comparisonGrid) {
        comparisonGrid.innerHTML = [
          makeCard('PMBOK 7', 'Guide', '📚'),
          makeCard('PRINCE2', 'Method', '🏗️'),
          makeCard('ISO 21500', 'Standard', '🌐'),
          makeCard('ISO 21502', 'Practice', '⚙️')
        ].join('');
      }

      // Update the comparison tabs with enhanced content
      this.updateComparisonTabs(topic, topicData);
      
    } catch (error) {
      console.error('Error loading comparison:', error);
      this.showNotification('Error loading comparison data', 'error');
      
      if (comparisonGrid) {
        comparisonGrid.innerHTML = `
          <div class="comparison-card">
            <div class="comparison-content">
              <div class="no-data-message">
                <p>Error loading comparison data. Please try again.</p>
              </div>
            </div>
          </div>
        `;
      }
    } finally {
      // Hide loading indicator
      if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
  }

  updateComparisonStats(topic, data) {
    // Check if we have a stats container
    let statsContainer = document.querySelector('.comparison-stats');
    
    if (!statsContainer) {
      // Create stats container if it doesn't exist
      const gridContainer = document.querySelector('.comparison-grid');
      if (gridContainer) {
        statsContainer = document.createElement('div');
        statsContainer.className = 'comparison-stats';
        gridContainer.parentNode.insertBefore(statsContainer, gridContainer);
      }
    }

    if (statsContainer) {
      const standardsWithData = new Set(data.map(item => item.standard)).size;
      const totalExcerpts = data.length;
      const pagesReferenced = data.filter(item => item.page && item.page !== '-').length;

      statsContainer.innerHTML = `
        <div class="stat-item">
          <span class="stat-number">${standardsWithData}</span>
          <span class="stat-label">Standards</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${totalExcerpts}</span>
          <span class="stat-label">Excerpts</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${pagesReferenced}</span>
          <span class="stat-label">Page References</span>
        </div>
      `;
    }
  }

  updateComparisonTabs(topic, data) {
    // For now, we'll use placeholder content for the tabs
    // In a real implementation, you'd want to analyze the data to find similarities/differences
    
    const similaritiesContent = document.querySelector('[data-tab="similarities"]');
    const differencesContent = document.querySelector('[data-tab="differences"]');
    const uniqueContent = document.querySelector('[data-tab="unique"]');

    if (similaritiesContent) {
      similaritiesContent.innerHTML = `
        <h3>Similarities in ${topic}</h3>
        <div class="comparison-text">
          <p>All standards recognize the importance of ${topic.toLowerCase()} in project management, though they approach it with different levels of detail and emphasis.</p>
        </div>
      `;
    }

    if (differencesContent) {
      differencesContent.innerHTML = `
        <h3>Differences in ${topic}</h3>
        <div class="comparison-text">
          <p>The standards differ in their approach to ${topic.toLowerCase()}, with varying levels of prescription and methodology.</p>
        </div>
      `;
    }

    if (uniqueContent) {
      const standards = ['PMBOK 7', 'PRINCE2', 'ISO 21500', 'ISO 21502'];
      const uniqueSections = standards.map(standard => {
        const standardData = data.filter(item => item.standard === standard);
        const content = standardData.length > 0 
          ? `Unique perspective: ${standardData[0].excerpt.substring(0, 150)}...`
          : `No specific content for ${topic} in this standard.`;
        
        return `
          <div class="unique-section">
            <h4>${standard}</h4>
            <div class="comparison-text">${content}</div>
          </div>
        `;
      }).join('');

      uniqueContent.innerHTML = `
        <h3>Unique Aspects of ${topic}</h3>
        <div class="unique-points">${uniqueSections}</div>
      `;
    }
  }

  // Dashboard specific functionality
  setupDashboard() {
    this.loadDashboardStats();
    this.createDashboardChart();
  }

  loadDashboardStats() {
    const stats = {
      totalStandards: this.currentData.standards.length,
      totalTopics: new Set(this.currentData.standards.map(s => s.topic)).size,
      totalComparisons: this.currentData.comparisons.length,
      standardsByFramework: this.getStandardsByFramework()
    };

    // Update stat cards
    document.querySelectorAll('.stat-number').forEach((element, index) => {
      const values = [stats.totalStandards, stats.totalTopics, stats.totalComparisons];
      if (values[index]) {
        element.textContent = values[index];
      }
    });
  }

  getStandardsByFramework() {
    const frameworks = {};
    this.currentData.standards.forEach(standard => {
      frameworks[standard.standard] = (frameworks[standard.standard] || 0) + 1;
    });
    return frameworks;
  }

  createDashboardChart() {
    const frameworks = this.getStandardsByFramework();
    const chartContainer = document.querySelector('.chart-container');
    
    if (!chartContainer) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '300');
    svg.setAttribute('viewBox', '0 0 400 300');

    const data = Object.entries(frameworks);
    const maxValue = Math.max(...data.map(([_, value]) => value));
    const barWidth = 300 / data.length;
    const barHeight = 200;

    data.forEach(([framework, value], index) => {
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const height = (value / maxValue) * barHeight;
      const x = index * barWidth + 50;
      const y = 250 - height;

      bar.setAttribute('x', x);
      bar.setAttribute('y', y);
      bar.setAttribute('width', barWidth - 10);
      bar.setAttribute('height', height);
      bar.setAttribute('fill', '#2d7a7a');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x + barWidth/2 - 10);
      text.setAttribute('y', 270);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#2d3748');
      text.textContent = framework;

      const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      valueText.setAttribute('x', x + barWidth/2 - 10);
      valueText.setAttribute('y', y - 5);
      valueText.setAttribute('text-anchor', 'middle');
      valueText.setAttribute('font-size', '10');
      valueText.setAttribute('fill', '#2d3748');
      valueText.textContent = value;

      svg.appendChild(bar);
      svg.appendChild(text);
      svg.appendChild(valueText);
    });

    chartContainer.innerHTML = '';
    chartContainer.appendChild(svg);
  }

  // File upload functionality
  setupFileUpload() {
    const fileInput = document.getElementById('file-upload');
    const uploadArea = document.querySelector('.file-upload');

    if (uploadArea) {
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
      });

      uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
      });

      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        this.handleFileUpload(files);
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFileUpload(e.target.files);
      });
    }
  }

  async handleFileUpload(files) {
    if (files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach(file => {
      if (file.name.includes('standards')) {
        formData.append('standards', file);
      } else if (file.name.includes('comparison')) {
        formData.append('comparison', file);
      }
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      this.showNotification(result.message || 'Files uploaded successfully', 'success');
      
      // Reload data
      await this.loadData();
      this.buildSearchIndex();
    } catch (error) {
      console.error('Upload error:', error);
      this.showNotification('Error uploading files', 'error');
    }
  }

  // Export functionality
  async exportData(type) {
    try {
      const response = await fetch(`/api/export?type=${type}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      this.showNotification('Error exporting data', 'error');
    }
  }
}

// Initialize the application
const app = new PMStandardsApp();

// Page-specific initialization
document.addEventListener('DOMContentLoaded', async () => {
  const currentPage = window.location.pathname.split('/').pop();
  
  switch (currentPage) {
    case 'repository.html':
      app.setupRepository();
      break;
    case 'comparison.html':
      await app.setupComparison();
      break;
    case 'dashboard.html':
      app.setupDashboard();
      break;
    case 'admin.html':
      app.setupFileUpload();
      break;
  }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .highlighted {
    background-color: #d4af37 !important;
    transition: background-color 0.3s ease;
  }
`;
document.head.appendChild(style);

