/**
 * PDF, Markdown, and TXT Document Parser
 * Parses PDF files via PDF.js and plain text / markdown files with heading heuristics.
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
   * Parse PDF file using pdf.js
   */
  async parsePdf(file) {
    if (!window.pdfjsLib) {
      throw new Error('PDF.js library is not loaded. Please check your network connection.');
    }

    // Set worker source
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
    }

    return this.parseTextWithHeadingHeuristics(fullText, file.name, file.size, 'pdf');
  },

  /**
   * Parse Markdown file
   */
  async parseMarkdown(file) {
    const text = await file.text();
    const lines = text.split('\n');
    const sections = [];
    let currentSection = {
      id: 'sec_0',
      title: 'Preamble / Front Matter',
      level: 1,
      tag: 'h1',
      paragraphs: [],
      rawText: '',
      wordCount: 0,
      excluded: false,
      isAutoExcluded: false
    };

    const isExcludedKeyword = (title) => {
      const lower = title.toLowerCase().trim();
      return /^(references|bibliography|works cited|appendices|appendix|table of contents|contents|acknowledgements|declaration)/i.test(lower);
    };

    lines.forEach(line => {
      const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        if (currentSection.paragraphs.length > 0 || currentSection.title !== 'Preamble / Front Matter') {
          currentSection.rawText = currentSection.paragraphs.join('\n');
          currentSection.wordCount = WordCounter.countWords(currentSection.rawText);
          sections.push(currentSection);
        }

        const hashes = headerMatch[1];
        const headingText = headerMatch[2].trim();
        const level = hashes.length;
        const autoExclude = isExcludedKeyword(headingText);

        currentSection = {
          id: `sec_${sections.length + 1}_${Date.now()}`,
          title: headingText,
          level: level,
          tag: `h${level}`,
          paragraphs: [],
          rawText: '',
          wordCount: 0,
          excluded: autoExclude,
          isAutoExcluded: autoExclude
        };
      } else if (line.trim().length > 0) {
        currentSection.paragraphs.push(line.trim());
      }
    });

    if (currentSection.paragraphs.length > 0 || currentSection.title !== 'Preamble / Front Matter') {
      currentSection.rawText = currentSection.paragraphs.join('\n');
      currentSection.wordCount = WordCounter.countWords(currentSection.rawText);
      sections.push(currentSection);
    }

    return this.createSummary(sections, file.name, file.size, 'markdown');
  },

  /**
   * Parse Plain Text file
   */
  async parsePlainText(file) {
    const text = await file.text();
    return this.parseTextWithHeadingHeuristics(text, file.name, file.size, 'txt');
  },

  /**
   * Heuristic heading detector for unstructured plain text or extracted PDF text
   */
  parseTextWithHeadingHeuristics(rawText, fileName, fileSize, type) {
    const lines = rawText.split(/\r?\n+/).map(l => l.trim()).filter(l => l.length > 0);
    const sections = [];

    // Heading patterns: "1. Introduction", "Chapter 1: ...", "ABSTRACT", etc.
    const headingPattern = /^(\d+(\.\d+)*\s+[A-Z][\w\s-]{2,60}|Chapter\s+\d+[:\s]+[A-Z][\w\s-]{2,60}|[A-Z\s]{4,40})$/;

    const isExcludedKeyword = (title) => {
      const lower = title.toLowerCase().trim();
      return /^(references|bibliography|works cited|appendices|appendix|table of contents|contents|acknowledgements|declaration)/i.test(lower);
    };

    let currentSection = {
      id: 'sec_0',
      title: 'Opening Section',
      level: 1,
      tag: 'h1',
      paragraphs: [],
      rawText: '',
      wordCount: 0,
      excluded: false,
      isAutoExcluded: false
    };

    lines.forEach(line => {
      // Check if line looks like a heading (short length and matches pattern)
      if (line.length <= 70 && headingPattern.test(line)) {
        if (currentSection.paragraphs.length > 0 || currentSection.title !== 'Opening Section') {
          currentSection.rawText = currentSection.paragraphs.join('\n\n');
          currentSection.wordCount = WordCounter.countWords(currentSection.rawText);
          sections.push(currentSection);
        }

        const autoExclude = isExcludedKeyword(line);
        currentSection = {
          id: `sec_${sections.length + 1}_${Date.now()}`,
          title: line,
          level: line.startsWith('Chapter') || /^\d+\s+[A-Z]/.test(line) ? 1 : 2,
          tag: 'h2',
          paragraphs: [],
          rawText: '',
          wordCount: 0,
          excluded: autoExclude,
          isAutoExcluded: autoExclude
        };
      } else {
        currentSection.paragraphs.push(line);
      }
    });

    if (currentSection.paragraphs.length > 0 || currentSection.title !== 'Opening Section') {
      currentSection.rawText = currentSection.paragraphs.join('\n\n');
      currentSection.wordCount = WordCounter.countWords(currentSection.rawText);
      sections.push(currentSection);
    }

    if (sections.length === 0) {
      sections.push({
        id: 'sec_1',
        title: 'Full Document Text',
        level: 1,
        tag: 'h1',
        paragraphs: [rawText],
        rawText: rawText,
        wordCount: WordCounter.countWords(rawText),
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
