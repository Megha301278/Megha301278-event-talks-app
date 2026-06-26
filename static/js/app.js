// App State
let releaseNotes = [];
let selectedNoteIds = new Set();
let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'newest';

// DOM Elements
const notesGrid = document.getElementById('notes-grid');
const refreshBtn = document.getElementById('btn-refresh');
const exportCsvBtn = document.getElementById('btn-export-csv');
const themeToggleBtn = document.getElementById('btn-theme-toggle');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const sortSelect = document.getElementById('sort-select');
const filterChipsContainer = document.getElementById('filter-chips');

// Stats Counters Elements
const countTotal = document.getElementById('count-total');
const countFeatures = document.getElementById('count-features');
const countChanges = document.getElementById('count-changes');
const countOther = document.getElementById('count-other');

// Floating Selection Bar Elements
const floatingBar = document.getElementById('floating-bar');
const floatingBarTitle = document.getElementById('floating-bar-title');
const floatingBarSubtitle = document.getElementById('floating-bar-subtitle');
const btnTweetMulti = document.getElementById('btn-tweet-multi');
const btnClearSelection = document.getElementById('btn-clear-selection');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  fetchReleaseNotes();
  setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
  refreshBtn.addEventListener('click', fetchReleaseNotes);
  exportCsvBtn.addEventListener('click', exportToCSV);
  themeToggleBtn.addEventListener('click', toggleTheme);
  
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase().trim();
    if (currentSearch.length > 0) {
      searchClear.style.display = 'flex';
    } else {
      searchClear.style.display = 'none';
    }
    renderNotes();
  });
  
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    searchClear.style.display = 'none';
    searchInput.focus();
    renderNotes();
  });
  
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderNotes();
  });
  
  btnClearSelection.addEventListener('click', clearSelection);
  
  btnTweetMulti.addEventListener('click', tweetSelectedNotes);
}

// Fetch Release Notes from API
async function fetchReleaseNotes() {
  showLoadingState();
  clearSelection();
  
  try {
    const response = await fetch('/api/release-notes');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    if (data.status === 'success') {
      releaseNotes = data.notes;
      updateStats();
      renderFilterChips();
      renderNotes();
    } else {
      throw new Error(data.message || 'Failed to fetch release notes.');
    }
  } catch (error) {
    console.error('Error fetching release notes:', error);
    renderErrorState(error.message);
  } finally {
    hideLoadingState();
  }
}

// Show skeleton loading cards
function showLoadingState() {
  refreshBtn.classList.add('loading');
  refreshBtn.disabled = true;
  
  notesGrid.innerHTML = Array(4).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="card-header">
        <div class="skeleton-line badge skeleton-shimmer"></div>
        <div class="skeleton-line skeleton-shimmer" style="width: 100px;"></div>
      </div>
      <div class="skeleton-line skeleton-shimmer"></div>
      <div class="skeleton-line skeleton-shimmer"></div>
      <div class="skeleton-line short skeleton-shimmer"></div>
      <div class="card-header" style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
        <div></div>
        <div class="skeleton-line skeleton-shimmer" style="width: 80px; height: 32px; border-radius: 8px;"></div>
      </div>
    </div>
  `).join('');
}

function hideLoadingState() {
  refreshBtn.classList.remove('loading');
  refreshBtn.disabled = false;
}

// Render Error UI
function renderErrorState(message) {
  notesGrid.innerHTML = `
    <div class="error-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h3>Oops! Something went wrong</h3>
      <p>${escapeHtml(message)}</p>
      <button class="btn-retry" onclick="fetchReleaseNotes()">Try Again</button>
    </div>
  `;
}

// Update Stats Dashboard
function updateStats() {
  const total = releaseNotes.length;
  const features = releaseNotes.filter(n => n.type.toLowerCase() === 'feature').length;
  const changes = releaseNotes.filter(n => n.type.toLowerCase() === 'change').length;
  const other = total - features - changes;
  
  animateCounter(countTotal, total);
  animateCounter(countFeatures, features);
  animateCounter(countChanges, changes);
  animateCounter(countOther, other);
}

// Counter animation helper
function animateCounter(element, target) {
  const duration = 800; // ms
  const start = parseInt(element.innerText) || 0;
  const range = target - start;
  let startTime = null;
  
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    element.innerText = Math.floor(start + range * progress);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.innerText = target;
    }
  }
  
  window.requestAnimationFrame(step);
}

// Render Category Filter Chips
function renderFilterChips() {
  // Calculate counts for each type
  const counts = { all: releaseNotes.length };
  
  releaseNotes.forEach(note => {
    const type = note.type.toLowerCase();
    counts[type] = (counts[type] || 0) + 1;
  });
  
  const types = ['all', 'feature', 'change', 'announcement', 'issue'];
  
  // If there are other unique types, collect them
  Object.keys(counts).forEach(k => {
    if (!types.includes(k) && k !== 'all') {
      types.push(k);
    }
  });

  filterChipsContainer.innerHTML = types.map(type => {
    const displayName = type.charAt(0).toUpperCase() + type.slice(1);
    const count = counts[type] || 0;
    const isActive = currentFilter === type;
    
    // Only show chip if it has items or is standard
    if (count === 0 && type !== 'all') return '';
    
    return `
      <button class="filter-chip ${isActive ? 'active' : ''}" data-filter="${type}">
        ${displayName}
        <span class="chip-count">${count}</span>
      </button>
    `;
  }).join('');

  // Add click handlers
  filterChipsContainer.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      filterChipsContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.getAttribute('data-filter');
      renderNotes();
    });
  });
}

// Render Notes to Grid
function renderNotes() {
  // 1. Filter
  let filtered = releaseNotes.filter(note => {
    // Type Filter
    if (currentFilter !== 'all' && note.type.toLowerCase() !== currentFilter) {
      return false;
    }
    
    // Search Query Filter
    if (currentSearch) {
      const typeMatch = note.type.toLowerCase().includes(currentSearch);
      const dateMatch = note.date_formatted.toLowerCase().includes(currentSearch);
      const contentMatch = note.content_text.toLowerCase().includes(currentSearch);
      return typeMatch || dateMatch || contentMatch;
    }
    
    return true;
  });
  
  // 2. Sort
  filtered.sort((a, b) => {
    if (currentSort === 'newest') {
      return b.date.localeCompare(a.date);
    } else {
      return a.date.localeCompare(b.date);
    }
  });
  
  // 3. Render
  if (filtered.length === 0) {
    notesGrid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h3>No matching updates found</h3>
        <p>Try refining your search terms or selecting a different filter category.</p>
      </div>
    `;
    return;
  }
  
  notesGrid.innerHTML = filtered.map(note => {
    const isSelected = selectedNoteIds.has(note.id);
    const typeClass = getBadgeClass(note.type);
    
    return `
      <div class="note-card ${isSelected ? 'selected' : ''}" data-id="${note.id}">
        <div class="card-header">
          <div class="card-meta">
            <span class="badge ${typeClass}">${escapeHtml(note.type)}</span>
            <span class="note-date">${escapeHtml(note.date_formatted)}</span>
          </div>
          <div class="selection-indicator">
            <svg viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
        </div>
        <div class="card-content">
          ${note.content_html}
        </div>
        <div class="card-actions" onclick="event.stopPropagation()">
          <button class="action-btn" data-tooltip="Copy Text" onclick="copyNoteText('${note.id}', this)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="action-btn" data-tooltip="Copy Link" onclick="copyNoteLink('${note.link}', this)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </button>
          <button class="action-btn action-btn-tweet" data-tooltip="Tweet Update" onclick="tweetSingleNote('${note.id}')">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Add click listener to cards for selection toggling
  notesGrid.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      toggleNoteSelection(id);
    });
  });
}

// Utility to determine badge class
function getBadgeClass(type) {
  const t = type.toLowerCase();
  if (t === 'feature') return 'badge-feature';
  if (t === 'change') return 'badge-change';
  if (t === 'announcement') return 'badge-announcement';
  if (t === 'issue') return 'badge-issue';
  return 'badge-general';
}

// Toggle selection state
function toggleNoteSelection(id) {
  if (selectedNoteIds.has(id)) {
    selectedNoteIds.delete(id);
  } else {
    selectedNoteIds.add(id);
  }
  
  // Re-render notes to reflect selection style
  renderNotes();
  updateFloatingBar();
}

// Clear Selection
function clearSelection() {
  selectedNoteIds.clear();
  renderNotes();
  updateFloatingBar();
}

// Update Floating Action Bar View
function updateFloatingBar() {
  const count = selectedNoteIds.size;
  if (count > 0) {
    floatingBarTitle.innerText = `${count} ${count === 1 ? 'update' : 'updates'} selected`;
    floatingBarSubtitle.innerText = 'Choose an action to share or clear selection';
    floatingBar.classList.add('active');
  } else {
    floatingBar.classList.remove('active');
  }
}

// Copy Note Text to Clipboard
async function copyNoteText(id, button) {
  const note = releaseNotes.find(n => n.id === id);
  if (!note) return;
  
  try {
    await navigator.clipboard.writeText(note.content_text);
    showTooltipFeedback(button, 'Copied!');
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    showTooltipFeedback(button, 'Failed to copy');
  }
}

// Copy Note Link to Clipboard
async function copyNoteLink(link, button) {
  try {
    await navigator.clipboard.writeText(link);
    showTooltipFeedback(button, 'Link Copied!');
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    showTooltipFeedback(button, 'Failed to copy');
  }
}

// Visual tooltip feedback
function showTooltipFeedback(button, text) {
  const originalTooltip = button.getAttribute('data-tooltip');
  button.setAttribute('data-tooltip', text);
  setTimeout(() => {
    button.setAttribute('data-tooltip', originalTooltip);
  }, 1500);
}

// Share Single Note via Twitter Intent
function tweetSingleNote(id) {
  const note = releaseNotes.find(n => n.id === id);
  if (!note) return;
  
  const text = note.content_text;
  const type = note.type;
  const url = note.link;
  
  // Format Twitter Intent
  const prefix = `[BigQuery ${type}] `;
  const hashtags = `\n\n#GoogleCloud #BigQuery`;
  
  // Limit to standard tweet length (280 chars total).
  // Compute safe space for text content.
  const extraLength = prefix.length + url.length + hashtags.length + 15; // 15 characters padding for spacing
  const maxTextLength = 280 - extraLength;
  
  let tweetBody = text;
  if (text.length > maxTextLength) {
    tweetBody = text.substring(0, maxTextLength - 3) + '...';
  }
  
  const shareText = `${prefix}${tweetBody}\n\nRead more: ${url}${hashtags}`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  
  window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

// Share Selected Notes via Twitter Intent
function tweetSelectedNotes() {
  if (selectedNoteIds.size === 0) return;
  
  const selectedNotes = releaseNotes.filter(n => selectedNoteIds.has(n.id));
  
  let shareText = '';
  const hashtags = `\n\n#GoogleCloud #BigQuery`;
  
  if (selectedNotes.length === 1) {
    tweetSingleNote(selectedNotes[0].id);
    return;
  }
  
  // Concatenate multiple updates summary
  const prefix = `Latest #BigQuery updates:`;
  let notesText = '';
  
  // Build items format: "- Feature: text"
  selectedNotes.forEach(note => {
    notesText += `\n• [${note.type}] ${note.content_text}`;
  });
  
  const generalUrl = selectedNotes[0].link; // Fallback to first update link
  
  // Handle 280 limit for multiple
  const extraLength = prefix.length + generalUrl.length + hashtags.length + 20;
  const maxNotesLength = 280 - extraLength;
  
  if (notesText.length > maxNotesLength) {
    notesText = notesText.substring(0, maxNotesLength - 3) + '...';
  }
  
  shareText = `${prefix}${notesText}\n\nMore info: ${generalUrl}${hashtags}`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  
  window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

// HTML Escaping Utility
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Export filtered release notes to CSV
function exportToCSV() {
  if (releaseNotes.length === 0) return;
  
  // Apply current active filters and sort settings to export exact user view
  let filtered = releaseNotes.filter(note => {
    if (currentFilter !== 'all' && note.type.toLowerCase() !== currentFilter) {
      return false;
    }
    if (currentSearch) {
      const typeMatch = note.type.toLowerCase().includes(currentSearch);
      const dateMatch = note.date_formatted.toLowerCase().includes(currentSearch);
      const contentMatch = note.content_text.toLowerCase().includes(currentSearch);
      return typeMatch || dateMatch || contentMatch;
    }
    return true;
  });
  
  filtered.sort((a, b) => {
    if (currentSort === 'newest') {
      return b.date.localeCompare(a.date);
    } else {
      return a.date.localeCompare(b.date);
    }
  });

  if (filtered.length === 0) {
    alert("No notes found to export with the current filter settings.");
    return;
  }
  
  const headers = ["Date", "Type", "Description", "Link"];
  const rows = filtered.map(note => [
    note.date_formatted,
    note.type,
    note.content_text,
    note.link
  ]);
  
  const csvContent = [
    headers.map(h => escapeCSVField(h)).join(","),
    ...rows.map(row => row.map(cell => escapeCSVField(cell)).join(","))
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  
  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute("download", `bigquery_release_notes_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Escape commas, double quotes, and newlines in CSV fields
function escapeCSVField(field) {
  if (field === null || field === undefined) {
    return '""';
  }
  let stringValue = String(field);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
    stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
  }
  return stringValue;
}

// Initialize Theme UI matching current body state
function initTheme() {
  const isLight = document.body.classList.contains('light-mode');
  updateThemeUI(isLight);
}

// Toggle page color scheme overrides and save state
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  updateThemeUI(isLight);
}

// Helper to switch SVGs and label descriptions
function updateThemeUI(isLight) {
  const moonIcons = document.querySelectorAll('.moon-icon');
  const sunIcons = document.querySelectorAll('.sun-icon');
  const themeText = document.getElementById('theme-text');
  
  if (isLight) {
    moonIcons.forEach(el => el.style.display = 'none');
    sunIcons.forEach(el => el.style.display = 'block');
    if (themeText) themeText.innerText = 'Dark Mode';
  } else {
    moonIcons.forEach(el => el.style.display = 'block');
    sunIcons.forEach(el => el.style.display = 'none');
    if (themeText) themeText.innerText = 'Light Mode';
  }
}
