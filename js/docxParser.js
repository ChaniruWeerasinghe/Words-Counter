/**
 * DOCX Document Heading & Word Count Parser
 * Parses Microsoft Word (.docx) documents in-browser using Mammoth.js,
 * extracting standard headings, bold titles, and numbered section hierarchy.
 */

const DocxParser = {
  /**
   * Parse a DOCX File object
   * @param {File} file 
   * @returns {Promise<Object>}
   */
  async parseFile(file) {
    if (!window.mammoth) {
      throw new Error('Mammoth.js library is not loaded. Please check your network connection.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    return this.parseHtmlHeadings(html, file.name, file.size);
  },

  /**
   * Extract headings and group body paragraphs under each heading
   */
  parseHtmlHeadings(html, fileName = 'Document.docx', fileSize = 0) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild || doc.body;

    const sections = [];
    let currentSection = {
      id: 'sec_0',
      title: 'Cover & Document Preamble',
      level: 1,
      tag: 'h1',
      paragraphs: [],
      rawText: '',
      wordCount: 0,
      excluded: true,
      isAutoExcluded: true
    };

    const isExcludedKeyword = (title) => {
      const lower = title.toLowerCase().trim();
      return /^(references|bibliography|works cited|appendices|appendix|table of contents|contents|acknowledgements|declaration|ethical declaration|cover page|title page)/i.test(lower);
    };

    const isNodeHeading = (node) => {
      const tag = node.tagName.toLowerCase();
      const text = node.textContent.trim();
      if (!text || text.length > 90) return false;

      // 1. Standard HTML H1-H6 tags
      if (/^h[1-6]$/.test(tag)) return true;

      // 2. Paragraph containing ONLY strong/b tag with short title
      if (tag === 'p') {
        const strongEl = node.querySelector('strong, b');
        if (strongEl && strongEl.textContent.trim() === text && text.length <= 80) {
          return true;
        }

        // Numbered heading in p: "1. Introduction", "2 Ethical Declaration", "3.1 Background"
        if (/^(\d+(\.\d+)*\s*[\.:\-]?\s+[A-Z][\w\s\(\)\/,-]{2,70})$/i.test(text)) {
          return true;
        }

        // Academic keyword standalone paragraph
        if (/^(abstract|executive summary|table of contents|contents|ethical declaration.*|introduction|literature review|methodology|results & discussion|results|discussion|conclusion|recommendations?|references|bibliography|appendices|appendix)$/i.test(text)) {
          return true;
        }
      }

      return false;
    };

    Array.from(root.children).forEach((node) => {
      const text = node.textContent.trim();
      if (!text) return;

      if (isNodeHeading(node)) {
        // Flush previous section
        if (currentSection.paragraphs.length > 0 || currentSection.title !== 'Cover & Document Preamble') {
          currentSection.rawText = currentSection.paragraphs.join('\n\n');
          currentSection.wordCount = WordCounter.countWords(currentSection.rawText);
          sections.push(currentSection);
        }

        const tag = node.tagName.toLowerCase();
        let level = 1;
        if (/^h[1-6]$/.test(tag)) {
          level = parseInt(tag.replace('h', ''), 10);
        } else {
          const numMatch = text.match(/^(\d+(\.\d+)*)/);
          if (numMatch) {
            level = Math.min(numMatch[1].split('.').filter(p => p.length > 0).length, 3);
          } else {
            level = 2;
          }
        }

        const autoExclude = isExcludedKeyword(text);

        currentSection = {
          id: `sec_${sections.length + 1}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          title: text,
          level: level,
          tag: `h${level}`,
          paragraphs: [],
          rawText: '',
          wordCount: 0,
          excluded: autoExclude,
          isAutoExcluded: autoExclude
        };
      } else {
        currentSection.paragraphs.push(text);
      }
    });

    // Push final section
    if (currentSection.paragraphs.length > 0 || currentSection.title !== 'Cover & Document Preamble') {
      currentSection.rawText = currentSection.paragraphs.join('\n\n');
      currentSection.wordCount = WordCounter.countWords(currentSection.rawText);
      sections.push(currentSection);
    }

    if (sections.length === 0) {
      const fullText = root.textContent.trim();
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

    const totalRawWords = sections.reduce((sum, s) => sum + s.wordCount, 0);
    const assessableWords = sections.filter(s => !s.excluded).reduce((sum, s) => sum + s.wordCount, 0);
    const excludedWords = totalRawWords - assessableWords;

    return {
      fileName,
      fileSize: this.formatFileSize(fileSize),
      fileType: 'docx',
      sections,
      totalRawWords,
      assessableWords,
      excludedWords,
      headingCount: sections.length
    };
  },

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

window.DocxParser = DocxParser;
