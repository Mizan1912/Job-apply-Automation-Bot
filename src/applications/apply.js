import { SELECTORS } from '../browser/naukri.js';
import { scrapeFormQuestions, findAutoAnswer, getDbAnswersMap } from './questions.js';
import { dbRun, dbGet } from '../database/db.js';

/**
 * Open a single job, check status, complete form questions, and apply.
 * @param {import('playwright').Page} page 
 * @param {object} application Object containing application database details
 * @param {object} config System config (profile answers, dry_run, etc.)
 * @returns {Promise<{status: string, error?: string, questions?: Array<string>}>}
 */
export async function applyToJob(page, application, config) {
  const { url, title, company } = application;
  console.log(`[Apply] Opening job URL: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 50000 });
    await page.waitForTimeout(3000); // brief wait for scripts to load

    // 1. Check if already applied
    const appliedIndicator = await page.locator(SELECTORS.alreadyApplied).first().isVisible().catch(() => false);

    if (appliedIndicator) {
      console.log(`[Apply] Already applied to "${title}" at "${company}". Skipping.`);
      return { status: 'APPLIED' };
    }

    // 2. Check for "Apply on Company Site" redirects
    const redirectsToCompanySite = await page.locator(SELECTORS.companySiteApply).first().isVisible().catch(() => false);

    if (redirectsToCompanySite) {
      console.log(`[Apply] Job "${title}" requires redirecting to company website. Marking NEEDS_USER_ACTION.`);
      return { status: 'NEEDS_USER_ACTION', error: 'Apply redirects to company website' };
    }

    // 3. Locate standard Apply button
    const applyButton = page.locator(SELECTORS.applyButton).first();
    const applyButtonExists = await applyButton.isVisible().catch(() => false);

    if (!applyButtonExists) {
      console.log(`[Apply] Apply button not found or disabled for "${title}".`);
      return { status: 'FAILED', error: 'Apply button not found or disabled' };
    }

    // 4. Click Apply Button
    console.log(`[Apply] Clicking apply button...`);
    await applyButton.click({ timeout: 8000 }).catch(async () => {
      // Fallback click via browser evaluation
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, a')).find(el => {
          const txt = el.innerText || '';
          return txt.toLowerCase().includes('apply') || el.id === 'apply-button' || el.classList.contains('apply-button');
        });
        if (btn) btn.click();
      });
    });

    // Wait a dynamic period for dialogs, forms, or immediate success notification
    await page.waitForTimeout(4000);

    // Check if immediate success redirect or text matches "Applied successfully"
    const immediateApplied = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('successfully applied') || text.includes('application submitted') || text.includes('already applied');
    });

    if (immediateApplied) {
      console.log(`[Apply] Applied successfully immediately! (No questionnaire)`);
      return { status: config.dryRun ? 'QUEUED' : 'APPLIED' };
    }

    // 5. Questionnaire Form & Chatbot Parsing Loop
    console.log(`[Apply] Checking for questionnaire/application questions...`);
    
    let chatbotLoopIndex = 0;
    const maxChatbotTurns = 8; // Safety limit of 8 steps/questions
    let answeredQuestionsSet = new Set();
    
    while (chatbotLoopIndex < maxChatbotTurns) {
      const questions = await scrapeFormQuestions(page);
      
      // Filter out elements we already answered in this loop to avoid double-processing
      const newQuestions = questions.filter(q => !answeredQuestionsSet.has(q.questionText));
      
      if (newQuestions.length === 0) {
        // No new questions found. Check if standard submit button or chatbot exists to click.
        const hasActiveDialog = await page.evaluate(() => {
          const dialog = document.querySelector('#chatbot, .chatbot-container, .apply-form, [class*="modal"]') ||
                         Array.from(document.querySelectorAll('button')).find(el => {
                           const txt = el.innerText || '';
                           return txt.toLowerCase().includes('submit') || txt.toLowerCase().includes('apply now') || txt.toLowerCase().includes('next');
                         });
          return !!dialog;
        });
        
        if (!hasActiveDialog) {
          console.log(`[Apply] No questionnaire dialog or questions detected. Completed.`);
          break;
        }
        
        // If there's a dialog but no new questions, maybe we are at the end, so try clicking submit once.
        console.log(`[Apply] Dialog active but no new questions. Clicking submit/next...`);
        await clickSubmitOrNext(page);
        await page.waitForTimeout(3000);
        
        // Check final check
        const nextQuestions = await scrapeFormQuestions(page);
        if (nextQuestions.filter(q => !answeredQuestionsSet.has(q.questionText)).length === 0) {
          break;
        }
        chatbotLoopIndex++;
        continue;
      }
      
      console.log(`[Apply] Step ${chatbotLoopIndex + 1}: Found ${newQuestions.length} new question(s).`);
      const dbAnswers = await getDbAnswersMap();
      const unansweredQuestions = [];
      const solvePlan = [];
      
      for (const q of newQuestions) {
        const ans = findAutoAnswer(q.questionText, config, dbAnswers);
        if (ans !== null && ans !== undefined) {
          solvePlan.push({ questionText: q.questionText, answerText: ans });
        } else {
          unansweredQuestions.push(q.questionText);
        }
      }
      
      if (unansweredQuestions.length > 0) {
        console.log(`[Apply] Script cannot auto-solve all fields. Pending inputs:`, unansweredQuestions);
        return { status: 'NEEDS_USER_INPUT', questions: unansweredQuestions };
      }
      
      // If DRY_RUN is enabled, do NOT perform UI fill & submission
      if (config.dryRun) {
        console.log(`[Apply] [DRY RUN] Would solve questionnaire and apply to "${title}" at "${company}".`);
        return { status: 'QUEUED' };
      }
      
      // Complete Auto-Solve Questionnaire in browser page
      console.log(`[Apply] Autofilling current step questions...`);
      for (const action of solvePlan) {
        await fillQuestionValue(page, action.questionText, action.answerText);
        answeredQuestionsSet.add(action.questionText);

        // Log the auto-solved question & answer to the database
        await dbRun(
          `INSERT INTO application_questions (application_id, question_text, answer_text, status) 
           VALUES (?, ?, ?, ?)
           ON CONFLICT(application_id, question_text) DO UPDATE SET 
             answer_text = excluded.answer_text, 
             status = excluded.status`,
          [application.id, action.questionText, action.answerText, 'AUTO_SOLVED']
        ).catch(err => {
          console.error(`[Apply] Failed to log auto-solved question: ${err.message}`);
        });
      }
      
      // Submit/Next step click
      console.log(`[Apply] Submitting current chatbot step...`);
      await clickSubmitOrNext(page);
      
      chatbotLoopIndex++;
      await page.waitForTimeout(3500); // Wait for chatbot to answer and draw next question bubble
    }

    await page.waitForTimeout(2000);
    return { status: 'APPLIED' };
  } catch (err) {
    console.error(`[Apply] Exception applying to "${title}": ${err.message}`);
    return { status: 'FAILED', error: err.message };
  }
}

/**
 * Fills action values into browser fields
 */
async function fillQuestionValue(page, questionText, answerText) {
  const solved = await page.evaluate(({ questionText, answerText }) => {
    const labels = Array.from(document.querySelectorAll('label, span, p, div, .qText'));
    let targetLabel = null;
    for (const el of labels) {
      if (el.innerText.trim().toLowerCase().includes(questionText.toLowerCase()) && el.innerText.trim().length > 3) {
        targetLabel = el;
        break;
      }
    }
    
    // Fallback if no explicit label with matching text is found: check placeholder
    if (!targetLabel) {
      const inputs = Array.from(document.querySelectorAll('input[placeholder], textarea[placeholder]'));
      for (const input of inputs) {
        if (input.placeholder.toLowerCase().includes(questionText.toLowerCase())) {
          input.value = answerText;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }
    
    let container = targetLabel.parentElement;
    for (let depth = 0; depth < 5; depth++) {
      if (!container) break;
      
      const input = container.querySelector('input[type="text"], input[type="number"], textarea');
      if (input) {
        input.value = answerText;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      
      const select = container.querySelector('select');
      if (select) {
        const opt = Array.from(select.options).find(o => o.text.trim().toLowerCase().includes(answerText.toLowerCase()));
        if (opt) {
          select.value = opt.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      
      const radios = Array.from(container.querySelectorAll('input[type="radio"]'));
      if (radios.length > 0) {
        for (const radio of radios) {
          let rLabel = radio.value || '';
          const sibling = radio.nextElementSibling;
          if (sibling && sibling.innerText) rLabel = sibling.innerText;
          if (rLabel.toLowerCase().includes(answerText.toLowerCase())) {
            radio.click();
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
      }
      
      container = container.parentElement;
    }
    return false;
  }, { questionText, answerText });
  
  console.log(`[Apply] Filled: "${questionText}" -> "${answerText}" (Success: ${solved})`);
  return solved;
}

/**
 * Click Submit / Next / Continue button to submit chatbot questions
 */
async function clickSubmitOrNext(page) {
  const nextSelectors = 'button:has-text("Submit"), button:has-text("Apply Now"), button:has-text("Next"), button:has-text("Send"), button:has-text("Continue"), .chatbot-send, .chatbot-container button';
  await page.locator(nextSelectors).first().click({ timeout: 6000 }).catch(async () => {
    // Fallback: search DOM for buttons containing next/submit/send/apply
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')).find(el => {
        const txt = (el.innerText || el.value || '').toLowerCase();
        return txt.includes('submit') || txt.includes('apply now') || txt.includes('next') || txt.includes('send') || txt.includes('continue');
      });
      if (btn) {
        btn.click();
      } else {
        // Fallback: trigger Enter keypress in active input if send button not found
        const activeInput = document.activeElement;
        if (activeInput && (activeInput.tagName === 'INPUT' || activeInput.tagName === 'TEXTAREA')) {
          activeInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
          activeInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        }
      }
    });
  });
}
