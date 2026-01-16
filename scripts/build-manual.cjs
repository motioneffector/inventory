const { marked } = require('marked');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================

const SRC_DIR = './manual/src';
const MANUAL_DIR = './manual';
const TEMPLATE_PATH = './scripts/manual-template.html';
const CSS_SOURCE = './scripts/manual.css';

// Read library name from package.json
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const LIBRARY_NAME = pkg.name.split('/')[1]; // e.g., "cards" from "@motioneffector/cards"

console.log(`Building manual for: @motioneffector/${LIBRARY_NAME}`);

// ============================================
// TEMPLATE LOADING
// ============================================

let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

// Replace library name placeholder in template
template = template.replace(/%%LIBRARY_NAME%%/g, LIBRARY_NAME);

// ============================================
// SIDEBAR PROCESSING
// ============================================

const sidebarMd = fs.readFileSync(path.join(SRC_DIR, '_Sidebar.md'), 'utf-8');
const sidebarHtml = transformLinks(marked.parse(sidebarMd));

// ============================================
// PAGE PROCESSING
// ============================================

const files = fs.readdirSync(SRC_DIR).filter(f =>
  f.endsWith('.md') && f !== '_Sidebar.md'
);

// Create output directory
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// Process each markdown file
for (const file of files) {
  const content = fs.readFileSync(path.join(SRC_DIR, file), 'utf-8');

  // Extract title from first heading or filename
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch
    ? titleMatch[1].replace(/`/g, '')
    : file.replace('.md', '').replace(/-/g, ' ');

  // Convert markdown to HTML
  let html = marked.parse(content);

  // Transform wiki-style links to HTML links
  html = transformLinks(html);

  // Apply template using unique delimiters
  const output = template
    .replace(/%%PAGE_TITLE%%/g, escapeHtml(title))
    .replace('%%SIDEBAR%%', sidebarHtml)
    .replace('%%CONTENT%%', html);

  // Determine output filename
  const outFile = file === 'Home.md'
    ? 'index.html'
    : file.replace('.md', '.html').toLowerCase();

  fs.writeFileSync(path.join(MANUAL_DIR, outFile), output);
  console.log(`  Created: ${outFile}`);
}

// ============================================
// COPY CSS
// ============================================

if (fs.existsSync(CSS_SOURCE)) {
  fs.copyFileSync(CSS_SOURCE, path.join(MANUAL_DIR, 'manual.css'));
  console.log('  Created: manual.css');
}

console.log(`\nManual built successfully: ${files.length} pages`);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Transform wiki-style links to HTML file links
 * href="Page-Name" -> href="page-name.html"
 */
function transformLinks(html) {
  return html.replace(
    /href="([^"#:]+)"/g,
    (match, link) => {
      // Skip external links
      if (link.includes('://') || link.startsWith('mailto:') || link.startsWith('/')) {
        return match;
      }
      // Skip already-processed .html links
      if (link.endsWith('.html')) {
        return match;
      }
      // Skip anchor links
      if (link.startsWith('#')) {
        return match;
      }
      // Transform wiki page name to HTML filename
      const htmlFile = link === 'Home'
        ? 'index.html'
        : link.toLowerCase() + '.html';
      return `href="${htmlFile}"`;
    }
  );
}

/**
 * Escape HTML special characters for safe insertion
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
