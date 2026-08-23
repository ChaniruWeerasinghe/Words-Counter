/**
 * Main Application Coordinator
 * State management, Live Section Builder, Upload Analyzer, Custom Dropdowns, and Theme handling.
 */

document.addEventListener('DOMContentLoaded', () => {
  const App = {
    state: {
      mode: 'live', // 'live' | 'upload'
      globalTarget: 2000,
      tolerance: 10, // +-10%
      excludeCitations: false,
      theme: 'light',
      sections: [],
      uploadedDoc: null,
      activeTemplate: 'custom'
    },

    init() {
      try {
        this.initTheme();
        this.initCustomDropdowns();
        this.initEventListeners();
        this.loadSavedState();
        this.render();
      } catch (error) {
        console.error('App initialization error:', error);
        window.Toast?.error('Initialization Error', 'Failed to initialize workspace.');
      }
    },

    /* ==========================================================================
       Theme Management
       ========================================================================== */
    initTheme() {
      const savedTheme = localStorage.getItem('scholarly_word_counter_theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      this.setTheme(savedTheme);

      const themeToggleBtn = document.getElementById('theme-toggle-btn');
      if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
          const nextTheme = this.state.theme === 'dark' ? 'light' : 'dark';
          this.setTheme(nextTheme);
        });
      }
    },

    setTheme(theme) {
      this.state.theme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('scholarly_word_counter_theme', theme);

      const iconWrap = document.getElementById('theme-toggle-icon');
      if (iconWrap) {
        iconWrap.innerHTML = theme === 'dark'
          ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
          : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      }
    },

    /* ==========================================================================
       Custom Dropdown System (Replaces default HTML select)
       ========================================================================== */
    initCustomDropdowns() {
      document.addEventListener('click', (e) => {
        const isTrigger = e.target.closest('.dropdown-trigger');
        const openDropdowns = document.querySelectorAll('.custom-dropdown');

        if (!isTrigger) {
          openDropdowns.forEach(dd => {
            dd.querySelector('.dropdown-trigger')?.classList.remove('open');
            dd.querySelector('.dropdown-menu')?.classList.remove('open');
          });
          return;
        }

        const dropdown = isTrigger.closest('.custom-dropdown');
        const menu = dropdown.querySelector('.dropdown-menu');
        const isOpen = isTrigger.classList.contains('open');

        // Close other dropdowns
        openDropdowns.forEach(dd => {
          if (dd !== dropdown) {
            dd.querySelector('.dropdown-trigger')?.classList.remove('open');
            dd.querySelector('.dropdown-menu')?.classList.remove('open');
          }
        });

        isTrigger.classList.toggle('open', !isOpen);
        menu?.classList.toggle('open', !isOpen);
      });

      // Template selection handler
      document.querySelectorAll('#template-dropdown .dropdown-option').forEach(option => {
        option.addEventListener('click', (e) => {
          const templateId = option.getAttribute('data-value');
          this.loadTemplate(templateId);
          this.updateDropdownTriggerText('template-dropdown', option.querySelector('.option-text').textContent);
        });
      });

      // Tolerance selection handler
      document.querySelectorAll('#tolerance-dropdown .dropdown-option').forEach(option => {
        option.addEventListener('click', (e) => {
          const val = parseInt(option.getAttribute('data-value'), 10);
          this.state.tolerance = val;
          this.updateDropdownTriggerText('tolerance-dropdown', option.querySelector('.option-text').textContent);
          this.saveState();
          this.updateStats();
        });
      });
    },

    updateDropdownTriggerText(dropdownId, text) {
      const dd = document.getElementById(dropdownId);
      if (!dd) return;
      const labelEl = dd.querySelector('.dropdown-label');
      if (labelEl) labelEl.textContent = text;
      
      // Update selected class
      dd.querySelectorAll('.dropdown-option').forEach(opt => {
        const isMatch = opt.querySelector('.option-text')?.textContent === text;
        opt.classList.toggle('selected', isMatch);
      });

      // Close menu
      dd.querySelector('.dropdown-trigger')?.classList.remove('open');
      dd.querySelector('.dropdown-menu')?.classList.remove('open');
    },

    /* ==========================================================================
       Event Listeners & Workspace Navigation
       ========================================================================== */
    initEventListeners() {
      // Workspace Mode Tabs
      const tabLive = document.getElementById('tab-live-btn');
      const tabUpload = document.getElementById('tab-upload-btn');

      tabLive?.addEventListener('click', () => this.switchMode('live'));
      tabUpload?.addEventListener('click', () => this.switchMode('upload'));

      // Global Target Input
      const targetInput = document.getElementById('global-target-input');
      targetInput?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.state.globalTarget = isNaN(val) || val < 0 ? 0 : val;
        this.saveState();
        this.updateStats();
      });

      // Citation Toggle Switch
      const citationToggle = document.getElementById('citation-toggle');
      citationToggle?.addEventListener('change', (e) => {
        this.state.excludeCitations = e.target.checked;
        this.saveState();
        this.updateStats();
        window.Toast?.info('Citation Filter', this.state.excludeCitations ? 'In-text citations excluded from count' : 'In-text citations included');
      });

      // Add Section Button
      document.getElementById('add-section-btn')?.addEventListener('click', () => this.addNewSection());
      document.getElementById('add-section-card-btn')?.addEventListener('click', () => this.addNewSection());

      // Clear Workspace Button
      document.getElementById('clear-all-btn')?.addEventListener('click', () => this.clearWorkspace());

      // Export / Declaration Modal Triggers
      document.getElementById('export-declaration-btn')?.addEventListener('click', () => this.openDeclarationModal());
      document.getElementById('close-modal-btn')?.addEventListener('click', () => this.closeDeclarationModal());
      document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') this.closeDeclarationModal();
      });
      document.getElementById('copy-declaration-btn')?.addEventListener('click', () => this.copyDeclaration());

      // File Upload Drag and Drop
      this.initDropzone();
    },

    switchMode(mode) {
      this.state.mode = mode;
      document.getElementById('tab-live-btn')?.classList.toggle('active', mode === 'live');
      document.getElementById('tab-upload-btn')?.classList.toggle('active', mode === 'upload');

      document.getElementById('live-mode-pane')?.classList.toggle('active', mode === 'live');
      document.getElementById('upload-mode-pane')?.classList.toggle('active', mode === 'upload');

      this.updateStats();
    },

    /* ==========================================================================
       State Persistence
       ========================================================================== */
    saveState() {
      try {
        const data = {
          globalTarget: this.state.globalTarget,
          tolerance: this.state.tolerance,
          excludeCitations: this.state.excludeCitations,
          activeTemplate: this.state.activeTemplate,
          sections: this.state.sections.map(s => ({
            id: s.id,
            title: s.title,
            targetWords: s.targetWords,
            excluded: s.excluded,
            text: s.text,
            placeholder: s.placeholder
          }))
        };
        localStorage.setItem('lexicount_v3_state', JSON.stringify(data));
      } catch (e) {
        console.warn('Could not save state to localStorage:', e);
      }
    },

    loadSavedState() {
      try {
        // Clear legacy state if exists
        localStorage.removeItem('scholarly_word_counter_data');

        const saved = localStorage.getItem('lexicount_v3_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.state.globalTarget = parsed.globalTarget ?? 2000;
          this.state.tolerance = parsed.tolerance ?? 10;
          this.state.excludeCitations = parsed.excludeCitations ?? false;
          this.state.activeTemplate = parsed.activeTemplate ?? 'custom';

          const targetInput = document.getElementById('global-target-input');
          if (targetInput) targetInput.value = this.state.globalTarget;

          const citationToggle = document.getElementById('citation-toggle');
          if (citationToggle) citationToggle.checked = this.state.excludeCitations;

          if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
            this.state.sections = parsed.sections;
            return;
          }
        }
      } catch (e) {
        console.warn('Error reading localStorage:', e);
      }

      // Default to Single Section Template if empty
      this.loadTemplate('custom', false);
    },

    /* ==========================================================================
       Live Section Builder Operations
       ========================================================================== */
    loadTemplate(templateId, showToast = true) {
      const template = window.AcademicTemplates.getTemplate(templateId);
      this.state.activeTemplate = templateId;
      this.state.globalTarget = template.defaultTarget;

      const targetInput = document.getElementById('global-target-input');
      if (targetInput) targetInput.value = this.state.globalTarget;

      this.state.sections = template.sections.map((s, idx) => ({
        id: `section_${Date.now()}_${idx}`,
        title: s.title,
        targetWords: s.targetWords,
        excluded: s.excluded,
        text: '',
        placeholder: s.placeholder || 'Type or paste content here...'
      }));

      this.renderSections();
      this.saveState();
      this.updateStats();

      if (showToast) {
        window.Toast?.success('Template Loaded', `Loaded "${template.name}" with ${template.sections.length} sections.`);
      }
    },

    addNewSection(title = '', target = 0) {
      const newSec = {
        id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: title || `Section ${this.state.sections.length + 1}`,
        targetWords: target,
        excluded: false,
        text: '',
        placeholder: 'Type or paste section content here...'
      };

      this.state.sections.push(newSec);
      this.renderSections();
      this.saveState();
      this.updateStats();

      // Focus the new section textarea
      setTimeout(() => {
        const el = document.getElementById(`textarea-${newSec.id}`);
        el?.focus();
      }, 100);

      window.Toast?.info('Section Added', `Created "${newSec.title}"`);
    },

    deleteSection(id) {
      const index = this.state.sections.findIndex(s => s.id === id);
      if (index === -1) return;

      const title = this.state.sections[index].title;
      this.state.sections.splice(index, 1);

      if (this.state.sections.length === 0) {
        this.addNewSection('Section 1');
      } else {
        this.renderSections();
        this.saveState();
        this.updateStats();
      }

      window.Toast?.warning('Section Removed', `Deleted "${title}"`);
    },

    duplicateSection(id) {
      const section = this.state.sections.find(s => s.id === id);
      if (!section) return;

      const duplicated = {
        id: `section_${Date.now()}_dup`,
        title: `${section.title} (Copy)`,
        targetWords: section.targetWords,
        excluded: section.excluded,
        text: section.text,
        placeholder: section.placeholder
      };

      const index = this.state.sections.findIndex(s => s.id === id);
      this.state.sections.splice(index + 1, 0, duplicated);

      this.renderSections();
      this.saveState();
      this.updateStats();
      window.Toast?.success('Section Duplicated', `Created copy of "${section.title}"`);
    },

    clearWorkspace() {
      const hasContent = this.state.sections.some(s => s.text.trim().length > 0);
      if (!hasContent) {
        window.Toast?.info('Workspace is empty', 'Nothing to clear.');
        return;
      }

      this.state.sections.forEach(s => s.text = '');
      this.renderSections();
      this.saveState();
      this.updateStats();
      window.Toast?.info('Cleared Workspace', 'All section text has been reset.');
    },

    renderSections() {
      const container = document.getElementById('sections-list');
      if (!container) return;

      container.innerHTML = '';

      this.state.sections.forEach((section, index) => {
        const stats = window.WordCounter.analyzeText(section.text, {
          excludeCitations: this.state.excludeCitations
        });

        const tol = window.WordCounter.evaluateTolerance(stats.words, section.targetWords, this.state.tolerance);

        const card = document.createElement('div');
        card.className = `section-card ${section.excluded ? 'excluded' : ''}`;
        card.id = `card-${section.id}`;

        card.innerHTML = `
          <div class="section-header">
            <div class="section-title-wrap">
              <span class="section-drag-handle" title="Section ${index + 1}">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="6" r="1.5"></circle><circle cx="15" cy="6" r="1.5"></circle><circle cx="9" cy="12" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><circle cx="9" cy="18" r="1.5"></circle><circle cx="15" cy="18" r="1.5"></circle></svg>
              </span>
              <input type="text" class="section-title-input" id="title-${section.id}" value="${this.escapeHtml(section.title)}" placeholder="Section Title..." />
            </div>

            <div class="section-meta-controls">
              <div class="section-target-wrap" title="Target word limit for this section">
                <span>Target:</span>
                <input type="number" min="0" step="50" class="section-target-input" id="target-${section.id}" value="${section.targetWords || ''}" placeholder="None" />
                <span>words</span>
              </div>

              <label class="switch-label" title="Exclude from official assessable coursework count">
                <input type="checkbox" class="switch-input" id="exclude-${section.id}" ${section.excluded ? 'checked' : ''} />
                <span class="switch-slider"></span>
                <span>Exclude</span>
              </label>

              <button type="button" class="btn-icon btn-sm" id="dup-${section.id}" title="Duplicate section">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>

              <button type="button" class="btn-icon btn-sm" id="del-${section.id}" title="Delete section">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>

          <div class="section-body">
            <textarea class="section-textarea" id="textarea-${section.id}" placeholder="${this.escapeHtml(section.placeholder || 'Type or paste section text...')}">${this.escapeHtml(section.text)}</textarea>
          </div>

          <div class="section-footer">
            <div class="section-stats-chips">
              <span class="stat-chip highlight" id="words-chip-${section.id}">
                <strong>${stats.words}</strong> words
              </span>
              <span class="stat-chip" id="chars-chip-${section.id}">
                ${stats.charsWithSpaces} chars
              </span>
              <span class="stat-chip" id="sentences-chip-${section.id}">
                ${stats.sentences} sentences
              </span>
              <span class="stat-chip" id="reading-chip-${section.id}">
                ~${stats.readingTime} read
              </span>
              ${section.excluded ? '<span class="limit-status-pill warning">Excluded from total</span>' : ''}
            </div>

            ${section.targetWords > 0 ? `
              <div class="section-progress-wrap" id="progress-wrap-${section.id}">
                <div class="section-progress-labels">
                  <span>${stats.words} / ${section.targetWords}w</span>
                  <span class="limit-status-pill ${tol.status}">${tol.percent}%</span>
                </div>
                <div class="limit-progress-bar">
                  <div class="limit-progress-fill ${tol.status}" style="width: ${tol.percent}%;"></div>
                </div>
              </div>
            ` : ''}
          </div>
        `;

        container.appendChild(card);

        // Bind interactive events for this card
        this.bindSectionEvents(section);
      });
    },

    bindSectionEvents(section) {
      const textarea = document.getElementById(`textarea-${section.id}`);
      const titleInput = document.getElementById(`title-${section.id}`);
      const targetInput = document.getElementById(`target-${section.id}`);
      const excludeCheckbox = document.getElementById(`exclude-${section.id}`);
      const delBtn = document.getElementById(`del-${section.id}`);
      const dupBtn = document.getElementById(`dup-${section.id}`);

      // Auto resize textarea
      const autoResize = (el) => {
        el.style.height = 'auto';
        el.style.height = `${Math.max(140, el.scrollHeight)}px`;
      };

      if (textarea) {
        autoResize(textarea);
        textarea.addEventListener('input', (e) => {
          section.text = e.target.value;
          autoResize(textarea);
          this.updateSectionStats(section);
          this.updateStats();
          this.debouncedSave();
        });
      }

      titleInput?.addEventListener('input', (e) => {
        section.title = e.target.value;
        this.debouncedSave();
      });

      targetInput?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        section.targetWords = isNaN(val) || val < 0 ? 0 : val;
        this.renderSections();
        this.saveState();
        this.updateStats();
      });

      excludeCheckbox?.addEventListener('change', (e) => {
        section.excluded = e.target.checked;
        const card = document.getElementById(`card-${section.id}`);
        card?.classList.toggle('excluded', section.excluded);
        this.renderSections();
        this.saveState();
        this.updateStats();
        window.Toast?.info('Section Status', `"${section.title}" ${section.excluded ? 'excluded from' : 'included in'} total count.`);
      });

      delBtn?.addEventListener('click', () => this.deleteSection(section.id));
      dupBtn?.addEventListener('click', () => this.duplicateSection(section.id));
    },

    updateSectionStats(section) {
      const stats = window.WordCounter.analyzeText(section.text, {
        excludeCitations: this.state.excludeCitations
      });

      const wordsChip = document.getElementById(`words-chip-${section.id}`);
      if (wordsChip) wordsChip.innerHTML = `<strong>${stats.words}</strong> words`;

      const charsChip = document.getElementById(`chars-chip-${section.id}`);
      if (charsChip) charsChip.textContent = `${stats.charsWithSpaces} chars`;

      const sentencesChip = document.getElementById(`sentences-chip-${section.id}`);
      if (sentencesChip) sentencesChip.textContent = `${stats.sentences} sentences`;

      const readingChip = document.getElementById(`reading-chip-${section.id}`);
      if (readingChip) readingChip.textContent = `~${stats.readingTime} read`;

      if (section.targetWords > 0) {
        const tol = window.WordCounter.evaluateTolerance(stats.words, section.targetWords, this.state.tolerance);
        const progressWrap = document.getElementById(`progress-wrap-${section.id}`);
        if (progressWrap) {
          progressWrap.innerHTML = `
            <div class="section-progress-labels">
              <span>${stats.words} / ${section.targetWords}w</span>
              <span class="limit-status-pill ${tol.status}">${tol.percent}%</span>
            </div>
            <div class="limit-progress-bar">
              <div class="limit-progress-fill ${tol.status}" style="width: ${tol.percent}%;"></div>
            </div>
          `;
        }
      }
    },

    debouncedSave: (() => {
      let timeout;
      return function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => this.saveState(), 500);
      };
    })(),

    /* ==========================================================================
       Document Upload & Parsing (Upload Mode)
       ========================================================================== */
    initDropzone() {
      const dropzone = document.getElementById('file-dropzone');
      const fileInput = document.getElementById('doc-file-input');

      if (!dropzone || !fileInput) return;

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          this.handleFileUpload(files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          this.handleFileUpload(files[0]);
        }
      });

      // Transfer to Live Workspace Button
      document.getElementById('transfer-to-live-btn')?.addEventListener('click', () => {
        this.transferUploadedToLive();
      });
    },

    async handleFileUpload(file) {
      if (!file) return;

      const dropzone = document.getElementById('file-dropzone');
      const resultsCard = document.getElementById('doc-results-card');

      try {
        if (dropzone) {
          dropzone.innerHTML = `
            <div class="dropzone-icon" style="animation: spin 1s linear infinite;">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
            </div>
            <div class="dropzone-title">Parsing "${this.escapeHtml(file.name)}"...</div>
            <div class="dropzone-subtitle">Extracting heading structure and analyzing word counts...</div>
          `;
        }

        const parsedData = await window.DocumentParser.parse(file);
        this.state.uploadedDoc = parsedData;

        // Reset dropzone
        this.resetDropzoneUI();

        // Render results
        this.renderUploadedDocResults();
        this.updateStats();

        window.Toast?.success('File Parsed Successfully', `Extracted ${parsedData.headingCount} sections from "${file.name}"`);
      } catch (error) {
        console.error('File parsing failed:', error);
        this.resetDropzoneUI();
        window.Toast?.error('Parsing Failed', error.message || 'Could not parse document.');
      }
    },

    resetDropzoneUI() {
      const dropzone = document.getElementById('file-dropzone');
      if (!dropzone) return;

      dropzone.innerHTML = `
        <input type="file" id="doc-file-input" class="file-input-hidden" accept=".docx,.pdf,.md,.markdown,.txt" />
        <div class="dropzone-icon">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>
        <div class="dropzone-title">Drop your coursework report here</div>
        <div class="dropzone-subtitle">Supports Microsoft Word (.docx), PDF (.pdf), Markdown (.md), and plain text (.txt)</div>
        <div class="dropzone-tags">
          <span class="file-type-tag">.DOCX</span>
          <span class="file-type-tag">.PDF</span>
          <span class="file-type-tag">.MD</span>
          <span class="file-type-tag">.TXT</span>
        </div>
      `;

      this.initDropzone();
    },

    renderUploadedDocResults() {
      const doc = this.state.uploadedDoc;
      const resultsCard = document.getElementById('doc-results-card');
      if (!doc || !resultsCard) return;

      resultsCard.style.display = 'flex';

      // Update file info bar
      document.getElementById('doc-filename').textContent = doc.fileName;
      document.getElementById('doc-file-details').textContent = `${doc.fileType.toUpperCase()} • ${doc.fileSize} • ${doc.headingCount} Headings Detected`;

      const tbody = document.getElementById('headings-table-body');
      if (!tbody) return;

      tbody.innerHTML = '';

      doc.sections.forEach((sec, idx) => {
        const row = document.createElement('tr');
        if (sec.excluded) row.classList.add('excluded-row');
        row.id = `row-${sec.id}`;

        const percentOfDoc = doc.totalRawWords > 0 ? Math.round((sec.wordCount / doc.totalRawWords) * 100) : 0;
        const indentClass = `indent-${Math.min(sec.level || 1, 3)}`;

        row.innerHTML = `
          <td>
            <span class="heading-tag ${sec.tag || 'h1'}">${(sec.tag || 'h1').toUpperCase()}</span>
          </td>
          <td class="heading-name-col ${indentClass}">
            <span>${this.escapeHtml(sec.title)}</span>
            ${sec.isAutoExcluded ? '<span class="limit-status-pill warning" style="font-size:0.65rem; padding: 0.1rem 0.4rem;">Auto-Excluded</span>' : ''}
          </td>
          <td style="font-family: var(--font-mono); font-weight: 700;">
            ${sec.wordCount.toLocaleString()} words
          </td>
          <td style="color: var(--text-muted); font-size: 0.8rem;">
            ${percentOfDoc}%
          </td>
          <td>
            <label class="switch-label">
              <input type="checkbox" class="switch-input" id="doc-exclude-${sec.id}" ${sec.excluded ? 'checked' : ''} />
              <span class="switch-slider"></span>
              <span style="font-size:0.75rem;">Exclude</span>
            </label>
          </td>
        `;

        tbody.appendChild(row);

        // Bind exclude checkbox
        row.querySelector(`#doc-exclude-${sec.id}`)?.addEventListener('change', (e) => {
          sec.excluded = e.target.checked;
          row.classList.toggle('excluded-row', sec.excluded);
          this.recalculateUploadedDocWords();
          this.updateStats();
        });
      });
    },

    recalculateUploadedDocWords() {
      if (!this.state.uploadedDoc) return;
      const doc = this.state.uploadedDoc;
      doc.totalRawWords = doc.sections.reduce((sum, s) => sum + s.wordCount, 0);
      doc.assessableWords = doc.sections.filter(s => !s.excluded).reduce((sum, s) => sum + s.wordCount, 0);
      doc.excludedWords = doc.totalRawWords - doc.assessableWords;
    },

    transferUploadedToLive() {
      if (!this.state.uploadedDoc || !this.state.uploadedDoc.sections) return;

      this.state.sections = this.state.uploadedDoc.sections.map(s => ({
        id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: s.title,
        targetWords: 0,
        excluded: s.excluded,
        text: s.rawText || s.paragraphs.join('\n\n'),
        placeholder: 'Type or paste content here...'
      }));

      this.switchMode('live');
      this.renderSections();
      this.saveState();
      this.updateStats();

      window.Toast?.success('Transferred to Workspace', 'All parsed sections imported to Live Section Counter.');
    },

    /* ==========================================================================
       Master Stats Dashboard Calculation
       ========================================================================== */
    updateStats() {
      let assessableWords = 0;
      let totalRawWords = 0;
      let excludedWords = 0;
      let totalChars = 0;
      let totalSentences = 0;
      let totalParagraphs = 0;

      if (this.state.mode === 'live') {
        this.state.sections.forEach(s => {
          const stats = window.WordCounter.analyzeText(s.text, {
            excludeCitations: this.state.excludeCitations
          });

          totalRawWords += stats.words;
          totalChars += stats.charsWithSpaces;
          totalSentences += stats.sentences;
          totalParagraphs += stats.paragraphs;

          if (s.excluded) {
            excludedWords += stats.words;
          } else {
            assessableWords += stats.words;
          }
        });
      } else {
        if (this.state.uploadedDoc) {
          assessableWords = this.state.uploadedDoc.assessableWords;
          totalRawWords = this.state.uploadedDoc.totalRawWords;
          excludedWords = this.state.uploadedDoc.excludedWords;
        }
      }

      // Update DOM values
      const assessableEl = document.getElementById('stat-assessable-words');
      if (assessableEl) assessableEl.textContent = assessableWords.toLocaleString();

      const totalRawEl = document.getElementById('stat-raw-words');
      if (totalRawEl) totalRawEl.textContent = totalRawWords.toLocaleString();

      const excludedEl = document.getElementById('stat-excluded-words');
      if (excludedEl) excludedEl.textContent = excludedWords.toLocaleString();

      const charsEl = document.getElementById('stat-chars');
      if (charsEl) charsEl.textContent = totalChars.toLocaleString();

      const readingTimeEl = document.getElementById('stat-reading-time');
      if (readingTimeEl) readingTimeEl.textContent = window.WordCounter.getReadingTime(assessableWords);

      // Target limit evaluation
      const tol = window.WordCounter.evaluateTolerance(assessableWords, this.state.globalTarget, this.state.tolerance);

      const statusPill = document.getElementById('target-status-pill');
      if (statusPill) {
        statusPill.className = `limit-status-pill ${tol.status}`;
        statusPill.textContent = tol.label;
      }

      const progressBar = document.getElementById('global-progress-bar');
      if (progressBar) {
        progressBar.style.width = `${tol.percent}%`;
        progressBar.className = `limit-progress-fill ${tol.status}`;
      }

      const progressLabel = document.getElementById('progress-percentage-label');
      if (progressLabel) {
        progressLabel.textContent = `${tol.percent}% of ${this.state.globalTarget.toLocaleString()}w`;
      }
    },

    /* ==========================================================================
       Academic Declaration Export Modal
       ========================================================================== */
    openDeclarationModal() {
      const modal = document.getElementById('modal-overlay');
      const reportBox = document.getElementById('declaration-report-box');
      if (!modal || !reportBox) return;

      reportBox.textContent = this.generateDeclarationText();
      modal.classList.add('open');
    },

    closeDeclarationModal() {
      const modal = document.getElementById('modal-overlay');
      modal?.classList.remove('open');
    },

    generateDeclarationText() {
      const isLive = this.state.mode === 'live';
      const sections = isLive ? this.state.sections : (this.state.uploadedDoc?.sections || []);

      let assessableWords = 0;
      let totalWords = 0;
      let excludedWords = 0;

      const lines = [];
      lines.push('================================================================');
      lines.push('               COURSEWORK WORD COUNT DECLARATION                ');
      lines.push('================================================================\n');
      lines.push(`Generated On       : ${new Date().toLocaleString()}`);
      lines.push(`Target Word Limit  : ${this.state.globalTarget.toLocaleString()} words (Margin: ±${this.state.tolerance}%)`);
      lines.push(`Mode               : ${isLive ? 'Live Coursework Workspace' : `Document Analysis (${this.state.uploadedDoc?.fileName || 'Upload'})`}\n`);
      lines.push('----------------------------------------------------------------');
      lines.push('SECTION BREAKDOWN                                    WORDS     STATUS');
      lines.push('----------------------------------------------------------------');

      sections.forEach(s => {
        const count = isLive ? window.WordCounter.countWords(s.text, { excludeCitations: this.state.excludeCitations }) : s.wordCount;
        totalWords += count;
        if (s.excluded) {
          excludedWords += count;
        } else {
          assessableWords += count;
        }

        const titlePadded = (s.title || 'Untitled').padEnd(48, '.');
        const countPadded = count.toString().padStart(6, ' ');
        const status = s.excluded ? '[EXCLUDED]' : '[ASSESSABLE]';
        lines.push(`${titlePadded} ${countPadded}  ${status}`);
      });

      const tol = window.WordCounter.evaluateTolerance(assessableWords, this.state.globalTarget, this.state.tolerance);

      lines.push('----------------------------------------------------------------\n');
      lines.push(`OFFICIAL ASSESSABLE WORDS : ${assessableWords.toLocaleString()} words`);
      lines.push(`EXCLUDED SECTIONS WORDS   : ${excludedWords.toLocaleString()} words`);
      lines.push(`TOTAL DOCUMENT RAW WORDS  : ${totalWords.toLocaleString()} words`);
      lines.push(`TOLERANCE STATUS          : ${tol.label} (${tol.percent}% of target)\n`);
      lines.push('================================================================');
      lines.push('I confirm that the assessable word count declared above complies with');
      lines.push('the university coursework assessment regulations.');
      lines.push('================================================================');

      return lines.join('\n');
    },

    copyDeclaration() {
      const text = this.generateDeclarationText();
      navigator.clipboard.writeText(text).then(() => {
        window.Toast?.success('Declaration Copied', 'Word count declaration copied to clipboard.');
      }).catch(() => {
        window.Toast?.error('Copy Failed', 'Please select and copy the text manually.');
      });
    },

    render() {
      this.renderSections();
      this.updateStats();
    },

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  // Run app
  window.App = App;
  App.init();
});
