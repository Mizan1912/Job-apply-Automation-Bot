import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profilePath = path.resolve(__dirname, '../../browser-profile');

let contextInstance = null;

/**
 * Initializes and returns a persistent Playwright browser context.
 * Reuse existing.
 * @param {boolean} headless 
 * @returns {Promise<import('playwright').BrowserContext>}
 */
export async function getBrowserContext(headless = true) {
  if (contextInstance) {
    return contextInstance;
  }

  contextInstance = await chromium.launchPersistentContext(profilePath, {
    headless,
    viewport: { width: 1280, height: 850 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ]
  });

  // Mask webdriver
  await contextInstance.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  contextInstance.setDefaultTimeout(30000);
  contextInstance.setDefaultNavigationTimeout(45000);

  return contextInstance;
}

/**
 * Closes the browser context.
 */
export async function closeBrowserContext() {
  if (contextInstance) {
    await contextInstance.close();
    contextInstance = null;
  }
}
