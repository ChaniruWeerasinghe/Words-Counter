/**
 * DOCX Document Heading & Word Count Parser
 * Parses Microsoft Word (.docx) documents in-browser using Mammoth.js,
 * reconstructing the full heading hierarchy and computing word counts per section.
 */

const DocxParser = {
  /**
   * Parse a DOCX File object
   * @param {File} file 
   * @returns {Promise<Object>}
   */
  async parseFile(file) {
    if (!window.mammoth) {
      throw new Error('Mammoth.js library is not loaded. Please check your internet connection.');
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

    Array.from(root.children).forEach((node, index) => {
      const tagName = node.tagName.toLowerCase();

      if (/^h[1-6]$/.test(tagName)) {
        // If the current section has text or is not empty, push it
        if (currentSection.paragraphs.length > 0 || currentSection.title !== 'Preamble / Front Matter') {
          currentSection.rawText = currentSection.paragraphs.join('\n\n');
          currentSection.wordCount = WordCounter.countWords(currentSection.rawText);
          sections.push(currentSection);
        }

        const headingText = node.textContent.trim() || `Untitled Heading ${sections.length + 1}`;
        const level = parseInt(tagName.replace('h', ''), 10);
        const autoExclude = isExcludedKeyword(headingText);

        currentSection = {
          id: `sec_${sections.length + 1}_${Date.now()}`,
          title: headingText,
          level: level,
          tag: tagName,
          paragraphs: [],
          rawText: '',
          wordCount: 0,
          excluded: autoExclude,
          isAutoExcluded: autoExclude
        };
      } else {
        const pText = node.textContent.trim();
        if (pText.length > 0) {
          currentSection.paragraphs.push(pText);
        }
      }
    });

    // Push the final section
    if (currentSection.paragraphs.length > 0 || currentSection.title !== 'Preamble / Front Matter') {
      currentSection.rawText = currentSection.paragraphs.join('\n\n');
      currentSection.wordCount = WordCounter.countWords(currentSection.rawText);
      sections.push(currentSection);
    }

    // If no headings were found, put all content in a single section
    if (sections.length === 0) {
      const fullText = root.textContent.trim();
      sections.push({
        id: 'sec_1',
        title: 'Full Document Body',
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
