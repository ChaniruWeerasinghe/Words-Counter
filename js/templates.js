/**
 * Academic Coursework Templates
 * Common university report and essay section structures with recommended word distributions.
 */

const AcademicTemplates = {
  templates: [
    {
      id: 'custom',
      name: 'Single Section (Quick Check)',
      description: 'Clean single workspace for quick section checking',
      defaultTarget: 0,
      sections: [
        { title: 'Main Section', targetWords: 0, excluded: false, placeholder: 'Type or paste your coursework text here to check word count...' }
      ]
    },
    {
      id: 'essay',
      name: 'Undergraduate Essay',
      description: 'Standard 5-part academic essay structure (~2,000 words)',
      defaultTarget: 2000,
      sections: [
        { title: 'Introduction & Thesis', targetWords: 300, excluded: false, placeholder: 'Context, problem statement, scope, and thesis statement...' },
        { title: 'Main Argument 1 (Core Concepts)', targetWords: 500, excluded: false, placeholder: 'Primary conceptual foundation with literature evidence...' },
        { title: 'Main Argument 2 (Critical Analysis)', targetWords: 500, excluded: false, placeholder: 'Detailed evaluation, counter-perspectives, and synthesis...' },
        { title: 'Evaluation & Counter-Arguments', targetWords: 400, excluded: false, placeholder: 'Addressing limitations and alternative arguments...' },
        { title: 'Conclusion & Recommendations', targetWords: 300, excluded: false, placeholder: 'Summary of findings, significance, and future outlook...' },
        { title: 'References & Bibliography', targetWords: 0, excluded: true, placeholder: 'Alphabetical list of academic sources (excluded from assessable count)...' }
      ]
    },
    {
      id: 'dissertation',
      name: 'Dissertation / Thesis',
      description: 'Comprehensive research paper structure (~10,000 words)',
      defaultTarget: 10000,
      sections: [
        { title: 'Abstract & Title Page', targetWords: 300, excluded: true, placeholder: 'Research aim, summary of methods, key findings, and contributions...' },
        { title: 'Chapter 1: Introduction & Research Aims', targetWords: 1200, excluded: false, placeholder: 'Background, problem formulation, research questions, and objectives...' },
        { title: 'Chapter 2: Literature Review', targetWords: 2800, excluded: false, placeholder: 'Theoretical framework, historical context, critique of existing studies, research gap...' },
        { title: 'Chapter 3: Methodology', targetWords: 1800, excluded: false, placeholder: 'Research paradigm, data collection, sampling, analytical tools, ethical considerations...' },
        { title: 'Chapter 4: Results & Findings', targetWords: 2200, excluded: false, placeholder: 'Presentation of empirical data, themes, quantitative or qualitative results...' },
        { title: 'Chapter 5: Discussion & Implications', targetWords: 1500, excluded: false, placeholder: 'Interpretation of results against literature, theoretical and practical implications...' },
        { title: 'Chapter 6: Conclusion & Recommendations', targetWords: 500, excluded: false, placeholder: 'Concluding remarks, limitations of study, future research directions...' },
        { title: 'References', targetWords: 0, excluded: true, placeholder: 'APA/Harvard citations list...' },
        { title: 'Appendices', targetWords: 0, excluded: true, placeholder: 'Survey instruments, raw tables, code snippets, interview transcripts...' }
      ]
    },
    {
      id: 'lab_report',
      name: 'Scientific / Lab Report',
      description: 'IMRAD scientific experimental report (~2,500 words)',
      defaultTarget: 2500,
      sections: [
        { title: 'Abstract', targetWords: 200, excluded: true, placeholder: 'Brief summary of experiment, hypothesis, key result, and conclusion...' },
        { title: '1. Introduction & Hypothesis', targetWords: 450, excluded: false, placeholder: 'Scientific background, testable hypothesis, objectives...' },
        { title: '2. Materials & Methods', targetWords: 600, excluded: false, placeholder: 'Apparatus, experimental setup, step-by-step procedures, controls...' },
        { title: '3. Results & Observations', targetWords: 650, excluded: false, placeholder: 'Experimental data description, trends, statistical analysis...' },
        { title: '4. Discussion & Error Analysis', targetWords: 600, excluded: false, placeholder: 'Explanation of results, comparison to theory, sources of experimental error...' },
        { title: '5. Conclusion', targetWords: 200, excluded: false, placeholder: 'Final summary answering the hypothesis...' },
        { title: 'References', targetWords: 0, excluded: true, placeholder: 'Cited journals and textbooks...' }
      ]
    },
    {
      id: 'case_study',
      name: 'Business Case Study',
      description: 'Strategic analysis and recommendation report (~3,000 words)',
      defaultTarget: 3000,
      sections: [
        { title: 'Executive Summary', targetWords: 300, excluded: false, placeholder: 'High-level summary of company problem, key analysis, and strategic recommendation...' },
        { title: '1. Problem Statement & Context', targetWords: 500, excluded: false, placeholder: 'Organizational background, market challenge, internal & external factors...' },
        { title: '2. Strategic Analysis (PESTEL / SWOT)', targetWords: 900, excluded: false, placeholder: 'In-depth market diagnosis, competitor benchmarking, resource audit...' },
        { title: '3. Evaluation of Alternatives', targetWords: 700, excluded: false, placeholder: 'Comparison of 3 strategic options with pros, cons, and financial feasibility...' },
        { title: '4. Recommended Strategy & Action Plan', targetWords: 600, excluded: false, placeholder: 'Implementation roadmap, KPI milestones, risk mitigation strategy...' },
        { title: 'References & Appendices', targetWords: 0, excluded: true, placeholder: 'Financial model tables, references...' }
      ]
    }
  ],

  getTemplate(id) {
    return this.templates.find(t => t.id === id) || this.templates[0];
  }
};

window.AcademicTemplates = AcademicTemplates;
