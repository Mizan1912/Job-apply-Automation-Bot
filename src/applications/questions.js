import { dbAll } from '../database/db.js';
import fs from 'fs';
import path from 'path';


/**
 * Normalizes question strings to improve matching consistency.
 * @param {string} text 
 * @returns {string}
 */
export function normalizeText(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // remove special characters
    .replace(/\s+/g, ' ');   // normalize spaces
}

/**
 * Attempts to automatically answer a question based on user profile config or saved database answers.
 * @param {string} questionText 
 * @param {object} profileConfig 
 * @param {Record<string, string>} dbAnswers Map of normalized question text to answer text
 * @returns {string|null}
 */
export function findAutoAnswer(questionText, profileConfig, dbAnswers) {
  const normQuestion = normalizeText(questionText);

  // 1. Check global saved responses from DB first
  const dbMatch = dbAnswers[normQuestion];
  if (dbMatch !== undefined) {
    return dbMatch;
  }

  // 2. Rule-based matcher on profile configuration settings
  if (normQuestion.includes('notice period') || normQuestion.includes('notice') || normQuestion.includes('how soon can you join')) {
    return profileConfig.noticePeriod;
  }
  if (normQuestion.includes('expected salary') || normQuestion.includes('expected ctc') || normQuestion.includes('expected lpa') || normQuestion.includes('expected compensation')) {
    return String(profileConfig.expectedSalary);
  }
  if (normQuestion.includes('current salary') || normQuestion.includes('current ctc') || normQuestion.includes('current lpa') || normQuestion.includes('fixed ctc')) {
    return String(profileConfig.currentSalary);
  }
  if (normQuestion.includes('total experience') || normQuestion.includes('years of experience') || normQuestion.includes('work experience') || normQuestion.includes('relevant experience')) {
    return String(profileConfig.totalExperience);
  }
  if (normQuestion.includes('location') || normQuestion.includes('current city') || normQuestion.includes('hometown') || normQuestion.includes('where do you live')) {
    return profileConfig.location;
  }
  if (normQuestion.includes('education') || normQuestion.includes('qualification') || normQuestion.includes('degree') || normQuestion.includes('highest education')) {
    return profileConfig.education;
  }
  if (normQuestion.includes('phone') || normQuestion.includes('mobile') || normQuestion.includes('contact number')) {
    return profileConfig.phone;
  }
  if (normQuestion.includes('email') || normQuestion.includes('email address')) {
    return profileConfig.email;
  }
  if (normQuestion.includes('full name') || normQuestion.includes('your name') || normQuestion.includes('first name') || normQuestion.includes('last name') || normQuestion.startsWith('name')) {
    return profileConfig.name;
  }

  return null; // Not matching, requires user input
}

/**
 * Fetch all saved global answers from SQLite and return as mapping.
 * @returns {Promise<Record<string, string>>}
 */
export async function getDbAnswersMap() {
  const rows = await dbAll('SELECT question_text, answer_text FROM answers');
  const mapping = {};
  for (const row of rows) {
    mapping[normalizeText(row.question_text)] = row.answer_text;
  }
  return mapping;
}

/**
 * Scrapes questions and inputs on the active form page.
 * Injectable script.
 * @param {import('playwright').Page} page 
 * @returns {Promise<Array<object>>} Array of { questionText, type, selectorInfo, options: [] }
 */
export async function scrapeFormQuestions(page) {
  try {
    const debugData = await page.evaluate(() => {
      let container = document.querySelector('.chatbot-container, #chatbot, .apply-form, form[name*="apply"], [class*="modal"], [class*="dialog"]');
      if (!container) container = document.body;
      return {
        html: container.outerHTML,
        url: window.location.href
      };
    });
    const scratchDir = 'C:\\Users\\UNIQUE ENTERPRISES\\.gemini\\antigravity-ide\\brain\\39c5570e-4b99-4097-8011-1a3b5c49330c\\scratch';
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }
    fs.writeFileSync(path.join(scratchDir, 'chatbot_dom.html'), `<!-- URL: ${debugData.url} -->\n${debugData.html}`);
    console.log(`[DOM Debug] Dumped chatbot DOM to scratch/chatbot_dom.html`);
  } catch (err) {
    console.error(`[DOM Debug] Failed to dump DOM:`, err);
  }

  return await page.evaluate(() => {
    // 1. Identify active questionnaire container (prioritize overlays/dialogs/chatbots)
    let container = document.querySelector('.chatbot-container, #chatbot, .apply-form, form[name*="apply"], [class*="modal"], [class*="dialog"]');
    if (!container) {
      container = document.body;
    }

    const questionsList = [];

    // Helper to check if element is inside global navigation/search area
    const isGlobalLayoutElement = (el) => {
      let current = el;
      while (current && current !== document.body) {
        if (!current) break;
        const tag = current.tagName.toLowerCase();
        const id = current.id || '';
        const className = typeof current.className === 'string' ? current.className : '';
        if (
          tag === 'header' || 
          tag === 'nav' || 
          id.includes('nav') || 
          id.includes('header') || 
          id.includes('search') ||
          className.includes('header') ||
          className.includes('nav') ||
          className.includes('search') ||
          className.includes('qsb')
        ) {
          return true;
        }
        current = current.parentElement;
      }
      
      // Also filter by placeholder/name/id keywords
      const placeholder = (el.placeholder || '').toLowerCase();
      const name = (el.name || '').toLowerCase();
      const idStr = (el.id || '').toLowerCase();
      if (
        placeholder.includes('search') || 
        placeholder.includes('keyword') || 
        placeholder.includes('designation') || 
        placeholder.includes('company') ||
        placeholder.includes('skills') ||
        name.includes('keyword') ||
        idStr.includes('keyword')
      ) {
        return true;
      }
    };

    // Helper to locate label/question text for an input
    const findLabelForInput = (inputEl) => {
      // If the input is a radio button, handle it as a radio group
      if (inputEl.type === 'radio') {
        const groupName = inputEl.name;
        const groupElements = Array.from(container.querySelectorAll(`input[name="${groupName}"]`));
        
        // 1. Get the list of option texts to exclude them from being identified as the question
        const optionTexts = new Set(groupElements.map(el => {
          let text = el.value || '';
          let sibling = el.nextElementSibling;
          if (sibling && sibling.innerText) text = sibling.innerText.trim();
          return text.toLowerCase();
        }));

        // 2. Find the common ancestor of all radio buttons in the group
        let ancestor = inputEl.parentElement;
        while (ancestor && ancestor !== document.body) {
          const containsAll = groupElements.every(el => ancestor.contains(el));
          if (containsAll) break;
          ancestor = ancestor.parentElement;
        }

        // 3. Search preceding siblings of the ancestor (which would be message bubbles containing the question)
        let current = ancestor;
        for (let depth = 0; depth < 5; depth++) {
          if (!current || current === document.body) break;

          let sibling = current.previousElementSibling;
          while (sibling) {
            // Check list items or message bubbles inside the sibling from last-to-first (bottom-up)
            const bubbles = Array.from(sibling.querySelectorAll('.qText, .question-text, .botMsg, .botItem, li, p, span'));
            for (let i = bubbles.length - 1; i >= 0; i--) {
              const text = bubbles[i].innerText ? bubbles[i].innerText.trim() : '';
              if (text.length > 5 && !optionTexts.has(text.toLowerCase()) && !text.toLowerCase().includes('thank you for showing interest')) {
                return text;
              }
            }

            // Check sibling itself
            const text = sibling.innerText ? sibling.innerText.trim() : '';
            if (text.length > 5 && !optionTexts.has(text.toLowerCase()) && !text.toLowerCase().includes('thank you for showing interest')) {
              return text;
            }

            sibling = sibling.previousElementSibling;
          }

          // Check if the current container itself has a title/question element (checking bottom-up)
          const qEls = Array.from(current.querySelectorAll('.qText, .question-text, .botMsg, .title, h3, h4, span'));
          for (let i = qEls.length - 1; i >= 0; i--) {
            const text = qEls[i].innerText ? qEls[i].innerText.trim() : '';
            if (text.length > 5 && !optionTexts.has(text.toLowerCase()) && !text.toLowerCase().includes('thank you for showing interest')) {
              return text;
            }
          }

          current = current.parentElement;
        }

        // Fallback: search for last non-option bubble inside the chatbot container
        const chatbot = document.querySelector('.chatbot-container, #chatbot, .apply-form');
        if (chatbot) {
          const bubbles = Array.from(chatbot.querySelectorAll('.qText, .question-text, [class*="bubble"], [class*="message"]'));
          for (let i = bubbles.length - 1; i >= 0; i--) {
            const text = bubbles[i].innerText ? bubbles[i].innerText.trim() : '';
            if (text.length > 5 && !optionTexts.has(text.toLowerCase()) && !text.toLowerCase().includes('thank you for showing interest')) {
              return text;
            }
          }
        }
        
        // Ensure we NEVER fall through to individual option labels
        return groupName || 'Question';
      }

      // Standard label lookup for text/select/number inputs
      if (inputEl.id) {
        const label = document.querySelector(`label[for="${inputEl.id}"]`);
        if (label && label.innerText.trim()) return label.innerText.trim();
      }
      
      let parent = inputEl.parentElement;
      for (let depth = 0; depth < 5; depth++) {
        if (!parent) break;
        
        // Search preceding siblings of the input parent (e.g. bubble text immediately above input text box)
        let sibling = parent.previousElementSibling;
        while (sibling) {
          // Check children bottom-up (useful if sibling is a UL of message bubbles)
          const bubbles = Array.from(sibling.querySelectorAll('.qText, .question-text, .botMsg, .botItem, li, p, span'));
          for (let i = bubbles.length - 1; i >= 0; i--) {
            const text = bubbles[i].innerText ? bubbles[i].innerText.trim() : '';
            if (text.length > 5 && !text.toLowerCase().includes('thank you for showing interest')) {
              return text;
            }
          }

          const text = sibling.innerText ? sibling.innerText.trim() : '';
          if (text.length > 5 && !text.toLowerCase().includes('thank you for showing interest')) {
            return text;
          }
          sibling = sibling.previousElementSibling;
        }

        const textElements = parent.querySelectorAll('label, span, p, div.label, div.question-text, .title, .qText');
        for (const el of textElements) {
          if (el !== inputEl && el.innerText.trim().length > 3 && !isGlobalLayoutElement(el)) {
            return el.innerText.trim();
          }
        }
        parent = parent.parentElement;
      }

      return inputEl.placeholder || inputEl.name || '';
    };

    // Find standard text inputs/textareas
    const textFields = Array.from(container.querySelectorAll('input[type="text"], input[type="number"], textarea, input:not([type])'));
    textFields.forEach((input, index) => {
      if (input.offsetWidth === 0 || input.offsetHeight === 0) return;
      if (isGlobalLayoutElement(input)) return;
      const label = findLabelForInput(input);
      if (label && label.length > 2) {
        questionsList.push({
          id: `text-${index}`,
          questionText: label,
          type: 'text',
          tagName: input.tagName.toLowerCase(),
          inputType: input.type || 'text',
          value: input.value
        });
      }
    });

    // Find select dropdown tags
    const selectFields = Array.from(container.querySelectorAll('select'));
    selectFields.forEach((select, index) => {
      if (select.offsetWidth === 0 || select.offsetHeight === 0) return;
      if (isGlobalLayoutElement(select)) return;
      const label = findLabelForInput(select);
      if (label && label.length > 2) {
        const options = Array.from(select.options).map(o => o.text.trim());
        questionsList.push({
          id: `select-${index}`,
          questionText: label,
          type: 'select',
          options,
          tagName: 'select'
        });
      }
    });

    // Find radio checkboxes
    const radios = Array.from(container.querySelectorAll('input[type="radio"]'));
    const radioGroups = {};
    radios.forEach(radio => {
      if (isGlobalLayoutElement(radio)) return;
      if (!radio.name) return;
      if (!radioGroups[radio.name]) radioGroups[radio.name] = [];
      radioGroups[radio.name].push(radio);
    });

    Object.keys(radioGroups).forEach((groupName, idx) => {
      const groupElements = radioGroups[groupName];
      const visible = groupElements.some(el => el.offsetWidth > 0 && el.offsetHeight > 0);
      if (!visible) return;

      const label = findLabelForInput(groupElements[0]);
      if (label && label.length > 2) {
        const options = groupElements.map(el => {
          let optLabel = el.value || '';
          let sibling = el.nextElementSibling;
          if (sibling && sibling.innerText) {
            optLabel = sibling.innerText.trim();
          } else {
            let parent = el.parentElement;
            if (parent && parent.innerText) optLabel = parent.innerText.trim();
          }
          return optLabel;
        }).filter(Boolean);

        questionsList.push({
          id: `radio-${idx}`,
          questionText: label,
          type: 'radio',
          options,
          groupName
        });
      }
    });

    return questionsList.filter((item, index, self) => 
      item.questionText.length > 2 &&
      self.findIndex(t => t.questionText === item.questionText) === index
    );
  });
}
