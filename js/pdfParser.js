/**
 * PDF, Markdown, and TXT Document Parser
 * Parses PDF files via PDF.js with positional line reconstruction and heading detection.
 */

const DocumentParser = {
  /**
   * Parse generic file based on extension
   */
  async parse(file) {
    const name = file.name.toLowerCase();

    if (name.endsWith('.docx')) {
      return window.DocxParser.parseFile(file);
    } else if (name.endsWith('.pdf')) {
      return this.parsePdf(file);
    } else if (name.endsWith('.md') || name.endsWith('.markdown')) {
      return this.parseMarkdown(file);
    } else {
      return this.parsePlainText(file);
    }
  },

  /**
   * Parse PDF file using pdf.js with positional text grouping
   */
  async parsePdf(file) {
    if (!window.pdfjsLib) {
      throw new Error('PDF.js library is not loaded. Please check your network connection.');
    }

    // Set worker source
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const allLines = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items;

      if (!items || items.length === 0) continue;

      // Group text items by their vertical Y position (lines)
      const linesMap = new Map();
      
      items.forEach(item => {
        const text = item.str;
        if (!text) return;

        // Round Y coordinate to group items on same line
        const y = Math.round(item.transform[5] * 10) / 10;
        const x = item.transform[4];

        // Find nearest existing line within 4px tolerance
        let foundKey = null;
        for (const existingY of linesMap.keys()) {
          if (Math.abs(existingY - y) <= 4) {
            foundKey = existingY;
            break;
          }
        }

        const lineKey = foundKey !== null ? foundKey : y;
        if (!linesMap.has(lineKey)) {
          linesMap.set(lineKey, []);
        }

        linesMap.get(lineKey).push({ x, text, height: item.height || 12 });
      });

      // Sort lines from top of page to bottom (descending Y)
      const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

      sortedY.forEach(y => {
        const lineItems = linesMap.get(y).sort((a, b) => a.x - b.x);
        const lineStr = lineItems.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
        if (lineStr.length > 0) {
          allLines.push(lineStr);
        }
      });

      // Add page boundary spacing
      allLines.push('__PAGE_BREAK__');
    }

    return this.parseLinesIntoSections(allLines, file.name, file.size, 'pdf');
  },

  /**
   * Parse Markdown file
   */
  async parseMarkdown(file) {
    const text = await file.text();
    const rawLines = text.split(/\r?\n/);
    const lines = [];

    rawLines.forEach(l => {
      lines.push(l.trim());
    });

    return this.parseLinesIntoSections(lines, file.name, file.size, 'markdown');
  },

  /**
   * Parse Plain Text file
   */
  async parsePlainText(file) {
    const text = await file.text();
    const rawLines = text.split(/\r?\n/);
    const lines = rawLines.map(l => l.trim()).filter(l => l.length > 0);
    return this.parseLinesIntoSections(lines, file.name, file.size, 'txt');
  },

  /**
   * Robust academic heading detector
   */
  isHeading(line) {
    if (!line || line.length > 100) return false;
    const trimmed = line.trim();

    // 1. Markdown style: # Heading
    if (/^#{1,6}\s+/.test(trimmed)) return true;

    // 2. Numbered Section Patterns:
    // e.g. "1. Introduction", "2.1 Background", "3.0 System Architecture", "2 Ethical Declaration", "Chapter 1"
    if (/^(\d+(\.\d+)*\s*[\.:\-]?\s+[A-Z][\w\s\(\)\/,-]{2,70})$/i.test(trimmed)) {
      return true;
    }

    // 3. Common Academic Section Keywords (Standalone):
    const academicKeywords = /^(abstract|executive summary|table of contents|contents|introduction|ethical declaration.*|declaration.*|acknowledgements?|literature review|theoretical framework|methodology|research design|system design|system architecture|implementation|results and findings|results & discussion|discussion|evaluation|conclusion|recommendations?|references|bibliography|works cited|appendices|appendix(\s+[a-z0-9]+)?)$/i;
    if (academicKeywords.test(trimmed)) {
      return true;
    }

    // 4. All-Caps Headings of short length (e.g. "PROJECT OBJECTIVES", "SYSTEM REQUIREMENTS")
    if (trimmed.length >= 4 && trimmed.length <= 50 && /^[A-Z0-9\s\-:–,&()]{4,50}$/.test(trimmed) && !trimmed.includes('.')) {
      // Don't treat university title headers like "NATIONAL INSTITUTE OF..." as a section unless standalone
      if (!/^(NATIONAL|FACULTY|SCHOOL OF|DEPARTMENT|MODULE|LECTURER|BATCH|SUBMISSION)/i.test(trimmed)) {
        return true;
      }
    }

    return false;
  },

  cleanHeadingTitle(line) {
    return line.replace(/^#{1,6}\s+/, '').trim();
  },

  getHeadingLevel(line) {
    const trimmed = line.trim();
    const hashMatch = trimmed.match(/^(#{1,6})\s+/);
    if (hashMatch) return Math.min(hashMatch[1].length, 4);

    const numMatch = trimmed.match(/^(\d+(\.\d+)*)/);
    if (numMatch) {
      const parts = numMatch[1].split('.').filter(p => p.length > 0);
      return Math.min(parts.length, 3);
    }

    if (/^(abstract|executive summary|introduction|methodology|results|discussion|conclusion|references|appendices)/i.test(trimmed)) {
      return 1;
    }

    return 2;
  },

  isExcludedKeyword(title) {
    const lower = title.toLowerCase().trim();
    return /^(references|bibliography|works cited|appendices|appendix|table of contents|contents|acknowledgements|declaration|ethical declaration|cover page|title page)/i.test(lower);
  },

  /**
   * Group lines into well-formatted sections and paragraphs
   */
  parseLinesIntoSections(lines, fileName, fileSize, type) {
    const sections = [];
    let currentSection = {
      id: `sec_0_${Date.now()}`,
      title: 'Cover & Document Preamble',
      level: 1,
      tag: 'h1',
      paragraphs: [],
      rawText: '',
      wordCount: 0,
      excluded: true, // preamble / cover is excluded by default
      isAutoExcluded: true
    };

    let currentParagraph = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const pText = currentParagraph.join(' ').replace(/\s+/g, ' ').trim();
        if (pText.length > 0) {
          currentSection.paragraphs.push(pText);
        }
        currentParagraph = [];
      }
    };

    const flushSection = () => {
      flushParagraph();
      if (currentSection.paragraphs.length > 0 || currentSection.title !== 'Cover & Document Preamble') {
        currentSection.rawText = currentSection.paragraphs.join('\n\n');
        currentSection.wordCount = WordCounter.countWords(currentSection.rawText);
        sections.push(currentSection);
      }
    };

    lines.forEach(line => {
      if (line === '__PAGE_BREAK__') {
        flushParagraph();
        return;
      }

      if (this.isHeading(line)) {
        flushSection();

        const headingTitle = this.cleanHeadingTitle(line);
        const level = this.getHeadingLevel(line);
        const autoExclude = this.isExcludedKeyword(headingTitle);

        currentSection = {
          id: `sec_${sections.length + 1}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          title: headingTitle,
          level: level,
          tag: `h${level}`,
          paragraphs: [],
          rawText: '',
          wordCount: 0,
          excluded: autoExclude,
          isAutoExcluded: autoExclude
        };
      } else {
        // Body text
        currentParagraph.push(line);
        // If line ends with period, question mark, or colon, consider paragraph break
        if (/[.!?:]$/.test(line.trim()) || line.length < 40) {
          flushParagraph();
        }
      }
    });

    flushSection();

    // If still 0 sections, create fallback
    if (sections.length === 0) {
      const fullText = lines.filter(l => l !== '__PAGE_BREAK__').join('\n');
      sections.push({
        id: 'sec_1',
        title: 'Full Document Text',
        level: 1,
        tag: 'h1',
        paragraphs: [fullText],
        rawText: fullText,
        wordCount: WordCounter.countWords(fullText),
        excluded: false,
        isAutoExcluded: false
      });
    }

    return this.createSummary(sections, fileName, fileSize, type);
  },

  createSummary(sections, fileName, fileSize, type) {
    const totalRawWords = sections.reduce((sum, s) => sum + s.wordCount, 0);
    const assessableWords = sections.filter(s => !s.excluded).reduce((sum, s) => sum + s.wordCount, 0);
    const excludedWords = totalRawWords - assessableWords;

    return {
      fileName,
      fileSize: window.DocxParser ? window.DocxParser.formatFileSize(fileSize) : `${Math.round(fileSize / 1024)} KB`,
      fileType: type,
      sections,
      totalRawWords,
      assessableWords,
      excludedWords,
      headingCount: sections.length
    };
  }
};

window.DocumentParser = DocumentParser;
