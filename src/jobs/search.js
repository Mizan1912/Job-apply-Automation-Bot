import { SELECTORS } from '../browser/naukri.js';

/**
 * Format string as slug / kebab-case (replaces non-alphanumeric with hyphen)
 * @param {string} str 
 * @returns {string}
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Scrape jobs matching the keyword, location, and experience combination.
 * @param {import('playwright').Page} page 
 * @param {string} keyword 
 * @param {string} location 
 * @param {number|string} experience 
 * @returns {Promise<Array<object>>}
 */
export async function searchJobsForQuery(page, keyword, location, experience) {
  const kebabKeyword = slugify(keyword);
  const kebabLocation = slugify(location);
  
  // Construct Naukri search URL
  // Example: https://www.naukri.com/mern-stack-developer-jobs-in-bangalore?experience=1&sort=freshness
  const searchUrl = `https://www.naukri.com/${kebabKeyword}-jobs-in-${kebabLocation}?experience=${experience}&sort=freshness`;
  console.log(`[Search] Navigating to: ${searchUrl}`);
  
  try {
    await page.goto(searchUrl, { waitUntil: 'load', timeout: 50000 });
    
    // Wait for either the job card listing or zero results indicators
    await page.waitForSelector(`${SELECTORS.jobTuple}, .no-result, .zero-results, :has-text("0 jobs found"), :has-text("We could not find")`, { timeout: 10000 }).catch(() => {
      console.log('[Search] Page loaded, neither job list nor empty state selector triggered. Parsing page as is.');
    });

    // Check if empty page or zero results
    const isZeroResults = await page.evaluate(() => {
      const pageText = document.body.innerText;
      return pageText.includes('0 jobs found') || pageText.includes('We could not find jobs');
    });

    if (isZeroResults) {
      console.log(`[Search] No jobs found for keyword: "${keyword}" in "${location}" at Exp: ${experience}`);
      return [];
    }

    // Extract job elements
    const jobs = await page.evaluate((selectors) => {
      const items = Array.from(document.querySelectorAll(selectors.jobTuple));
      
      return items.map(el => {
        // Find title and link
        const titleEl = el.querySelector(selectors.jobTitle) || el.querySelector('a.title');
        const title = titleEl ? titleEl.innerText.trim() : '';
        const url = titleEl ? titleEl.href || '' : '';
        
        // Find company
        const companyEl = el.querySelector(selectors.companyName);
        const company = companyEl ? companyEl.innerText.trim() : '';

        // Find details
        const expEl = el.querySelector(selectors.jobExperience) || el.querySelector('.expMinMax') || el.querySelector('[class*="experience"]');
        const experience = expEl ? expEl.innerText.trim() : '';

        const salEl = el.querySelector(selectors.jobSalary) || el.querySelector('[class*="salary"]');
        const salary = salEl ? salEl.innerText.trim() : '';

        const locEl = el.querySelector(selectors.jobLocation) || el.querySelector('[class*="location"]');
        const location = locEl ? locEl.innerText.trim() : '';

        const dateEl = el.querySelector(selectors.jobPostedDate) || el.querySelector('[class*="postedDate"]');
        const posted_date = dateEl ? dateEl.innerText.trim() : '';

        // Find description snippet
        const descEl = el.querySelector('.job-desc, .description, [class*="jobDescription"]');
        const description = descEl ? descEl.innerText.trim() : '';

        // Try getting job ID
        let jobId = el.getAttribute(selectors.jobIdAttr) || '';
        if (!jobId && url) {
          // Extract 12 digits (date prefix + numeric) from end of Url
          const idMatch = url.match(/_([a-zA-Z0-9_\-]+)?-(\d{12})(?:\?|$)/) || url.match(/-(\d{12})(?:\?|$)/);
          if (idMatch) {
            jobId = idMatch[1] || idMatch[0];
          }
        }

        return {
          id: jobId,
          title,
          company,
          url,
          experience,
          salary,
          location,
          posted_date,
          description
        };
      });
    }, SELECTORS);

    // Filter jobs with incomplete information, or generate fingerprints for those missing Job ID
    const processedJobs = jobs
      .filter(j => j.title && j.url)
      .map(j => {
        if (!j.id) {
          // Generate stable fingerprint: Simple hash of url + title
          let hash = 0;
          const str = `${j.url}-${j.title}-${j.company}`;
          for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
          }
          j.id = `fp-${Math.abs(hash)}`;
        }
        return j;
      });

    console.log(`[Search] Extracted ${processedJobs.length} raw jobs for "${keyword}" | "${location}"`);
    return processedJobs;
  } catch (err) {
    console.error(`[Search] Error searching keyword "${keyword}" in Location "${location}": ${err.message}`);
    return [];
  }
}
