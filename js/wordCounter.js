/**
 * Word Counting & Text Analytics Engine
 * Precise academic word counts, citation stripping, reading metrics, and tolerance margin evaluations.
 */

const WordCounter = {
  /**
   * Count words in a string with academic formatting precision
   * @param {string} text 
   * @param {Object} options 
   * @returns {number}
   */
  countWords(text, options = {}) {
    if (!text || typeof text !== 'string') return 0;

    let processed = text;

    // Optional: strip in-text citations if enabled
    if (options.excludeCitations) {
      processed = this.stripCitations(processed);
    }

    // Clean whitespace and normalize
    const trimmed = processed.trim();
    if (!trimmed) return 0;

    // Split on whitespace and filter empty tokens
    const tokens = trimmed.split(/\s+/);
    
    // Filter tokens that contain at least one alphanumeric character or valid symbol
    const validWords = tokens.filter(token => {
      const cleaned = token.replace(/^[^\w]+|[^\w]+$/g, '');
      return cleaned.length > 0;
    });

    return validWords.length;
  },

  /**
   * Count total characters including whitespace
   */
  countCharactersWithSpaces(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.length;
  },

  /**
   * Count characters excluding whitespace
   */
  countCharactersNoSpaces(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.replace(/\s+/g, '').length;
  },

  /**
   * Count sentences with intelligent abbreviation protection
   */
  countSentences(text) {
    if (!text || typeof text !== 'string') return 0;
    const trimmed = text.trim();
    if (!trimmed) return 0;

    // Replace common academic abbreviations temporarily so they don't trigger sentence splits
    let protectedText = trimmed
      .replace(/\b(e\.g\.|i\.e\.|etc\.|et al\.|vs\.|fig\.|dr\.|mr\.|mrs\.|ms\.|prof\.|vol\.|no\.|p\.|pp\.)/gi, match => match.replace(/\./g, '___DOT___'));

    // Match sentence terminators . ! ? followed by whitespace or end of text
    const sentences = protectedText.split(/[.!?]+(?=\s+|$)/).filter(s => s.trim().length > 0);
    return Math.max(sentences.length, 1);
  },

  /**
   * Count non-empty paragraphs
   */
  countParagraphs(text) {
    if (!text || typeof text !== 'string') return 0;
    const paragraphs = text
      .split(/\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    return paragraphs.length;
  },

  /**
   * Detect in-text citations (APA/Harvard e.g. "(Smith, 2020)", IEEE "[1, 2]")
   */
  detectCitations(text) {
    if (!text || typeof text !== 'string') return [];
    
    // Match APA/Harvard: (Author et al., 2023) or (Author, 2020: 12-15)
    const authorYearRegex = /\([A-Z][a-zA-Z\s&.,]+,\s*\d{4}[a-z]?(?::\s*[\d\-–]+)?\)/g;
    
    // Match numeric citations: [1], [1, 2], [1-4]
    const numericRegex = /\[\s*\d+(?:\s*[,–-]\s*\d+)*\s*\]/g;

    const matches = [];
    let match;

    while ((match = authorYearRegex.exec(text)) !== null) {
      matches.push({ text: match[0], index: match.index, type: 'author-year' });
    }

    while ((match = numericRegex.exec(text)) !== null) {
      matches.push({ text: match[0], index: match.index, type: 'numeric' });
    }

    return matches;
  },

  /**
   * Strip in-text citations from text for assessable count
   */
  stripCitations(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/\([A-Z][a-zA-Z\s&.,]+,\s*\d{4}[a-z]?(?::\s*[\d\-–]+)?\)/g, ' ')
      .replace(/\[\s*\d+(?:\s*[,–-]\s*\d+)*\s*\]/g, ' ');
  },

  /**
   * Estimate reading time in minutes (standard ~200 words per minute)
   */
  getReadingTime(wordCount) {
    const minutes = wordCount / 200;
    if (minutes < 1) {
      const seconds = Math.ceil(minutes * 60);
      return `${seconds} sec`;
    }
    return `${Math.ceil(minutes)} min`;
  },

  /**
   * Estimate speaking time in minutes (standard ~130 words per minute)
   */
  getSpeakingTime(wordCount) {
    const minutes = wordCount / 130;
    if (minutes < 1) {
      const seconds = Math.ceil(minutes * 60);
      return `${seconds} sec`;
    }
    return `${Math.ceil(minutes)} min`;
  },

  /**
   * Evaluate word count against target and university tolerance margin (+-10%)
   * @param {number} currentWords 
   * @param {number} targetLimit 
   * @param {number} tolerancePercent (e.g. 10 for +-10%)
   * @returns {Object}
   */
  evaluateTolerance(currentWords, targetLimit, tolerancePercent = 10) {
    if (!targetLimit || targetLimit <= 0) {
      return {
        status: 'neutral',
        label: 'No Limit Set',
        minAllowed: 0,
        maxAllowed: Infinity,
        percent: 0,
        diff: 0,
        isWithinTolerance: true
      };
    }

    const margin = Math.round(targetLimit * (tolerancePercent / 100));
    const minAllowed = Math.max(0, targetLimit - margin);
    const maxAllowed = targetLimit + margin;
    const percent = Math.min(Math.round((currentWords / targetLimit) * 100), 100);
    const diff = currentWords - targetLimit;

    let status = 'safe';
    let label = 'Within Safe Range';

    if (currentWords > maxAllowed) {
      status = 'danger';
      label = `Exceeded by ${currentWords - maxAllowed} words`;
    } else if (currentWords > targetLimit) {
      status = 'warning';
      label = `In +${tolerancePercent}% Buffer (+${diff}w)`;
    } else if (currentWords < minAllowed && currentWords > 0) {
      status = 'warning';
      label = `Under -${tolerancePercent}% Buffer (${minAllowed - currentWords}w left)`;
    } else if (currentWords === 0) {
      status = 'neutral';
      label = 'Ready to write';
    }

    return {
      status,
      label,
      target: targetLimit,
      margin,
      minAllowed,
      maxAllowed,
      percent,
      diff,
      isWithinTolerance: currentWords >= minAllowed && currentWords <= maxAllowed
    };
  },

  /**
   * Run full analytics on a text block
   */
  analyzeText(text, options = {}) {
    const words = this.countWords(text, options);
    const charsWithSpaces = this.countCharactersWithSpaces(text);
    const charsNoSpaces = this.countCharactersNoSpaces(text);
    const sentences = this.countSentences(text);
    const paragraphs = this.countParagraphs(text);
    const citations = this.detectCitations(text);
    const readingTime = this.getReadingTime(words);
    const speakingTime = this.getSpeakingTime(words);

    return {
      words,
      charsWithSpaces,
      charsNoSpaces,
      sentences,
      paragraphs,
      citationsCount: citations.length,
      readingTime,
      speakingTime
    };
  }
};

window.WordCounter = WordCounter;
