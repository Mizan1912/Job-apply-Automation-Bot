import { getBrowserContext } from './browser.js';

// Selectors for Naukri UI components
export const SELECTORS = {
  // Login
  loginUrl: 'https://www.naukri.com/nlogin/login',
  dashboardUrl: 'https://www.naukri.com/mnj/dashboard',
  
  // Dashboard indicators
  dashboardIndicator: '.dashboard-container, .profile-summary, a[href*="logout"], .mnj-dashboard',
  
  // Search results
  jobTuple: '.srp-jobtuple-wrapper, [class*="jobTuple"]',
  jobTitle: '.title, [class*="title"]',
  companyName: '.comp-name, [class*="companyName"]',
  jobLink: 'a.title, a[href*="/job-listings-"]',
  jobExperience: '.expwd, [class*="experience"]',
  jobSalary: '.sal, [class*="salary"]',
  jobLocation: '.loc, [class*="location"]',
  jobPostedDate: '.postedDate, [class*="postedDate"]',
  jobIdAttr: 'data-job-id',
  
  // Application details page selectors
  applyButton: 'button#apply-button, button:has-text("Apply"), .apply-button, a:has-text("Apply")',
  alreadyApplied: '.already-applied, :has-text("Already Applied"), button:disabled:has-text("Applied")',
  companySiteApply: 'button:has-text("Apply on company site"), a:has-text("Apply on company site")',
  
  // Application form/questionnaire selectors
  chatbotContainer: '#chatbot, .chatbot-container',
  inputQuestions: '.chatbot-input, input[type="text"], textarea',
  selectQuestions: 'select',
  radioQuestions: 'input[type="radio"]',
  submitApply: 'button:has-text("Submit"), button:has-text("Apply Now")'
};

/**
 * Check if the browser session is currently logged into Naukri.
 * @param {import('playwright').Page} page 
 * @returns {Promise<boolean>}
 */
export async function checkLoginStatus(page) {
  try {
    console.log('[LoginCheck] Navigating to dashboard to verify session...');
    await page.goto(SELECTORS.dashboardUrl, { waitUntil: 'load', timeout: 30000 });
    
    // Wait a brief moment for redirects to settle
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log(`[LoginCheck] Current URL: ${currentUrl}`);

    if (currentUrl.includes('/nlogin/login') || currentUrl.includes('login.php') || currentUrl.includes('/signin')) {
      console.log('[LoginCheck] Session is not logged in (redirected to login).');
      return false;
    }

    // Check for dashboard indicator elements
    const dashboardPresent = await page.evaluate((selector) => {
      return !!document.querySelector(selector);
    }, SELECTORS.dashboardIndicator);

    if (dashboardPresent || currentUrl.includes('/dashboard') || currentUrl.includes('/mnj') || currentUrl.includes('homepage')) {
      console.log('[LoginCheck] Session is VALID.');
      return true;
    }

    console.log('[LoginCheck] Could not confirm dashboard elements, assuming logged out.');
    return false;
  } catch (err) {
    console.error(`[LoginCheck] Error checking login status: ${err.message}`);
    return false;
  }
}

/**
 * Open the Naukri login page and wait for manual user login.
 * Polls url change to detect successful completion.
 * @param {import('playwright').Page} page 
 * @param {number} timeoutMs Max time to wait for manual login (default 10 mins)
 * @returns {Promise<boolean>}
 */
export async function triggerManualLogin(page, timeoutMs = 600000) {
  console.log('[ManualLogin] Launching Naukri login page...');
  await page.goto(SELECTORS.loginUrl, { waitUntil: 'load' });
  
  console.log('========================================================');
  console.log('MANUAL ACTION REQUIRED:');
  console.log('Please log into your Naukri account in the opened browser window.');
  console.log('Complete any CAPTCHAs, OTPs, or security verifications.');
  console.log('========================================================');
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    // Check if the current URL points to dashboard or if dashboard elements are present
    const currentUrl = page.url();
    const loggedIn = currentUrl.includes('/dashboard') || currentUrl.includes('/mnj') || currentUrl.includes('homepage') || await page.evaluate((selector) => {
      return !!document.querySelector(selector);
    }, SELECTORS.dashboardIndicator);
    
    if (loggedIn) {
      console.log('[ManualLogin] Login detected! Proceeding...');
      // Wait another 5 seconds to ensure cookies are fully set and saved
      await page.waitForTimeout(5000);
      return true;
    }

    await page.waitForTimeout(5000);
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    console.log(`[ManualLogin] Waiting for login... (${elapsedSeconds}s elapsed)`);
  }

  console.error('[ManualLogin] Timeout waiting for manual login.');
  return false;
}
