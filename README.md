# Verba - Academic Coursework Word Counter and Document Analyzer

A comprehensive web-based word counter built for university students, researchers, and academic writers. It tracks strict coursework word limits, calculates tolerance margins (+-10%), and parses full documents to count words per heading.

## Features

- Live Section Counter: Write or paste coursework across structured sections (e.g., Abstract, Introduction, Methodology, Results, Conclusion, References).
- Per-Heading Document Analyzer: Upload DOCX, PDF, Markdown, or TXT documents to automatically detect headings (H1, H2, H3) and analyze word counts for each section.
- Academic Exclusion Filters: Easily exclude References, Bibliographies, Appendices, or Title Pages from the official assessable word count while keeping track of total raw words.
- University Tolerance Rules: Visual indicators for target word limits and standard university +-10% safety margins (Safe, Warning, Exceeded).
- Advanced Metrics: Accurate words, characters (with/without spaces), sentences, paragraphs, estimated reading time, and speaking time.
- Coursework Templates: Pre-configured layouts for Essays, Dissertations, Lab Reports, and Case Studies.
- Declaration Export: Generate a formatted summary breakdown ready for assignment cover sheets.
- Dark and Light Mode: Custom polished design with full theme support.

## Technologies Used

- HTML5 semantic structure
- Vanilla CSS3 with custom design system and micro-animations
- Vanilla JavaScript (ES6+)
- Mammoth.js for client-side DOCX heading parsing
- PDF.js for client-side PDF text extraction

## Getting Started

1. Clone the repository:
   git clone https://github.com/ChaniruWeerasinghe/Words-Counter.git
2. Open `index.html` in any modern web browser.

## Privacy

All document parsing and counting operations happen entirely client-side inside your browser. No documents or text are ever uploaded to an external server.
