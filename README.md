# BigQuery Release Notes Hub & Tracker

A modern, responsive web application built with Python Flask and vanilla HTML, CSS, and JavaScript that fetches, parses, and formats BigQuery Release notes from the official Google Cloud RSS/Atom feed. 

It provides an intuitive dashboard for developers to track features, changes, announcements, and issues, with built-in selection and sharing tools to easily tweet specific updates.

---

## Features

- **Live RSS Fetching**: Dynamically retrieves the latest release notes from the Google Cloud feed.
- **Granular Parsing**: Splices daily entries into individual, granular update cards (e.g. separates multiple features or changes logged on the same day).
- **Responsive Theme**: Premium, modern dark-mode interface styled with vanilla CSS and responsive grids.
- **Advanced Filters & Search**:
  - Live fuzzy text searching across categories, dates, and contents.
  - Interactive filter chips indicating counts for each category (Features, Changes, Announcements, Issues).
  - Sorting support (Newest first / Oldest first).
- **Update Selection & Tweeting**:
  - Click any card to select it.
  - Generates auto-formatted, length-limited Twitter/X intents for single or multiple selected notes.
  - Direct links to copying note text or note URLs to the clipboard.
- **Micro-Animations**: Features spinner rotations, spring-action bottom drawers, hover glows, and skeleton shimmer layouts during loads.

---

## Setup & Running Locally

Ensure you have Python 3.8+ installed on your system.

### 1. Clone or Open the directory
```bash
cd /Users/megha/Desktop/LEARNING/AI/agy-cli-projects/bq-release-notes
```

### 2. Set up the Virtual Environment & Install Dependencies
```bash
# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 3. Run the Application
```bash
python app.py
```

The application will start on `http://127.0.0.1:5000` (or the configured `PORT` environment variable). Open this URL in your web browser.
