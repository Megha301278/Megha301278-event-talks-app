import os
import re
import xml.etree.ElementTree as ET
import requests
import hashlib
from bs4 import BeautifulSoup, Tag
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_entry_content(content_html, entry_date, entry_date_formatted, entry_link):
    """
    Parses the CDATA HTML content of an entry to extract individual release notes.
    Usually, notes are divided by <h3> tags indicating their type.
    """
    soup = BeautifulSoup(content_html, 'html.parser')
    items = []
    
    current_type = "General"
    current_elements = []
    
    for child in soup.contents:
        if isinstance(child, Tag):
            if child.name == 'h3':
                # If we have accumulated elements for the previous section, create a note item
                if current_elements:
                    items.append(create_release_item(
                        current_type, current_elements, entry_date, entry_date_formatted, entry_link
                    ))
                    current_elements = []
                current_type = child.get_text().strip()
            else:
                current_elements.append(child)
        elif isinstance(child, str) and child.strip():
            current_elements.append(child)
            
    # Add the final accumulated section
    if current_elements or current_type != "General":
        items.append(create_release_item(
            current_type, current_elements, entry_date, entry_date_formatted, entry_link
        ))
        
    return items

def create_release_item(note_type, elements, entry_date, entry_date_formatted, entry_link):
    """
    Creates a dictionary representing a single, specific release note.
    """
    html_parts = []
    text_parts = []
    
    for el in elements:
        if isinstance(el, Tag):
            # Ensure all links in the content open in a new tab
            for a in el.find_all('a'):
                a['target'] = '_blank'
                a['rel'] = 'noopener noreferrer'
            html_parts.append(str(el))
            text_parts.append(el.get_text().strip())
        else:
            html_parts.append(el)
            text_parts.append(el.strip())
            
    content_html = "".join(html_parts).strip()
    # Create a clean plain text version for tweets
    content_text = " ".join([t for t in text_parts if t]).strip()
    content_text = re.sub(r'\s+', ' ', content_text)
    
    # Create a stable ID using hashlib based on date, type, and content snippet
    hash_input = f"{entry_link}_{note_type}_{content_text[:60]}"
    item_id = hashlib.md5(hash_input.encode('utf-8')).hexdigest()
    
    return {
        "id": item_id,
        "date": entry_date,
        "date_formatted": entry_date_formatted,
        "type": note_type,
        "content_html": content_html,
        "content_text": content_text,
        "link": entry_link
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        # Fetch the live XML feed
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = root.findall('atom:entry', ns)
        all_items = []
        
        for entry in entries:
            title = entry.find('atom:title', ns).text  # e.g., "June 25, 2026"
            updated = entry.find('atom:updated', ns).text  # e.g., "2026-06-25T00:00:00-07:00"
            
            # Format standard ISO date (YYYY-MM-DD)
            date_match = re.match(r'^\d{4}-\d{2}-\d{2}', updated)
            date_str = date_match.group(0) if date_match else title
            
            # Extract main Link
            link_el = entry.find('atom:link', ns)
            link = link_el.attrib.get('href') if link_el is not None else ""
            
            # Extract Content HTML and split into individual release items
            content_el = entry.find('atom:content', ns)
            if content_el is not None:
                content_html = content_el.text or ""
                items = parse_entry_content(content_html, date_str, title, link)
                all_items.extend(items)
                
        return jsonify({
            "status": "success",
            "count": len(all_items),
            "notes": all_items
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch release notes feed: {str(e)}"
        }), 502
    except ET.ParseError as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to parse release notes XML: {str(e)}"
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"An unexpected error occurred: {str(e)}"
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
