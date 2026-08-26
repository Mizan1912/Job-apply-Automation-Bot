import 'dotenv/config';
import { getBrowserContext, closeBrowserContext } from './browser/browser.js';
import { checkLoginStatus, triggerManualLogin } from './browser/naukri.js';
import { initDatabase, closeDbConnection, dbRun, dbGet } from './database/db.js';
import { searchJobsForQuery } from './jobs/search.js';
import { processAndQueueJobs } from './jobs/queue.js';
import { runApplicationQueue } from './applications/worker.js';
import { sendTelegramMessage, pollTelegramUpdates } from './notifications/telegram.js';
import { initScheduler } from './scheduler.js';
import { startDashboardServer } from './dashboard/server.js';

// Configuration Mapper
export function getConfig() {
  const expIds = (process.env.JOB_EXPERIENCE_FILTER_IDS || '0,1').split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
  const maxExp = expIds.length > 0 ? Math.max(...expIds) : 1;

  return {
    dryRun: process.env.DRY_RUN !== 'false', // Default true for safety
    minDelay: parseInt(process.env.MIN_DELAY_BETWEEN_APPLICATIONS || '10000', 10),
    maxDelay: parseInt(process.env.MAX_DELAY_BETWEEN_APPLICATIONS || '30000', 10),
    maxApplicationsPerRun: parseInt(process.env.MAX_APPLICATIONS_PER_RUN || '20', 10),
    maxApplicationsPerDay: parseInt(process.env.MAX_APPLICATIONS_PER_DAY || '40', 10),
    
    keywords: (process.env.KEYWORDS || '').split(',').map(x => x.trim()).filter(Boolean),
    locations: (process.env.LOCATIONS || '').split(',').map(x => x.trim()).filter(Boolean),
    experienceIds: expIds,
    maxExperience: maxExp,

    // Personal details
    name: process.env.MY_NAME || '',
    email: process.env.MY_EMAIL || '',
    phone: process.env.MY_PHONE || '',
    resumePath: process.env.MY_RESUME_PATH || '',
    location: process.env.MY_LOCATION || '',
    noticePeriod: process.env.MY_NOTICE_PERIOD || 'Immediate',
    currentSalary: process.env.MY_CURRENT_SALARY || '0',
    expectedSalary: process.env.MY_EXPECTED_SALARY || '0',
    education: process.env.MY_EDUCATION || '',
    totalExperience: process.env.MY_TOTAL_EXPERIENCE || '0'
  };
}

/**
 * Executes the entire automated job application pipeline:
 * 1. Log Run
 * 2. Search & Scrape
 * 3. Filter & Queue
 * 4. Apply
 * 5. Update Run stats
 */
export async function executeWorkflow() {
  const config = getConfig();

  // Load dry_run override from SQLite settings table
  const drySetting = await dbGet("SELECT value FROM settings WHERE key = 'dry_run'");
  if (drySetting) {
    config.dryRun = (drySetting.value === 'true');
  }

  const startTime = new Date().toISOString();
  
  console.log(`\n========================================`);
  console.log(`Naukri Bot Run Triggered [${config.dryRun ? 'DRY RUN MODE' : 'LIVE MODE'}]`);
  console.log(`Time: ${new Date().toLocaleTimeString()}`);
  console.log(`========================================`);

  // 1. Insert Automation Run logs
  const runResult = await dbRun(
    "INSERT INTO automation_runs (start_time, status) VALUES (?, ?)", 
    [startTime, 'RUNNING']
  );
  const runId = runResult.lastID;

  let totalScraped = 0;
  let totalExists = 0;
  let totalEligible = 0;
  let totalSkippedResult = 0;
  let runStats = { applied: 0, waiting: 0, failed: 0, skipped: 0 };

  try {
    // 2. Browser Search Scope
    const context = await getBrowserContext(false); // Start headed browser
    const page = await context.newPage();

    // Check login state first
    const loggedIn = await checkLoginStatus(page);
    if (!loggedIn) {
      console.log('[Workflow] Login expired. Prompting manual login...');
      await sendTelegramMessage('⚠️ *Naukri Session Exired*\nAutomated job application paused. Run `npm run login` to authenticate.');
      
      const success = await triggerManualLogin(page);
      if (!success) {
        throw new Error('Manual login timeout. Application flow aborted.');
      }
    }

    // Grid search on keyword combination lists
    for (const keyword of config.keywords) {
      for (const location of config.locations) {
        for (const expId of config.experienceIds) {
          console.log(`[Workflow] Scraping: "${keyword}" | Loc: "${location}" | Exp ID: ${expId}`);
          
          const rawJobs = await searchJobsForQuery(page, keyword, location, expId);
          
          if (rawJobs.length > 0) {
            // Filter and insert matches into DB
            const results = await processAndQueueJobs(rawJobs, config);
            totalScraped += results.found;
            totalExists += results.exists;
            totalEligible += results.eligible;
            totalSkippedResult += results.skipped;
          }

          // Polite pause between result page retrievals
          await page.waitForTimeout(4000);
        }
      }
    }

    // Close page used for search
    await page.close();

    // 3. Process Applications Queue
    console.log('[Workflow] Searching jobs finished. Initializing queue processor...');
    runStats = await runApplicationQueue(config);
    
    // Complete Run Successfully
    const endTime = new Date().toISOString();
    const finalStatsJson = JSON.stringify({
      found: totalScraped,
      skippedScrape: totalSkippedResult,
      exists: totalExists,
      eligible: totalEligible,
      applied: runStats.applied,
      waiting: runStats.waiting,
      failed: runStats.failed
    });

    await dbRun(
      "UPDATE automation_runs SET end_time = ?, status = ?, stats = ? WHERE id = ?",
      [endTime, 'COMPLETED', finalStatsJson, runId]
    );

    // Compile message report
    const summary = `📊 *Naukri Run Completed* [${config.dryRun ? 'DRY RUN' : 'LIVE'}]
    
*Jobs Found:* ${totalScraped}
*Already Indexed:* ${totalExists}
*Client Filter Matches:* ${totalEligible}
*Successfully Applied:* ${runStats.applied}
*Skipped Application:* ${runStats.skipped}
*Waiting for Input:* ${runStats.waiting}
*Failed Transactions:* ${runStats.failed}`;

    console.log(`\n========================================`);
    console.log(`Run Completed Successfully`);
    console.log(`Total Found: ${totalScraped}`);
    console.log(`Eligible: ${totalEligible}`);
    console.log(`Applied: ${runStats.applied}`);
    console.log(`Waiting for user input: ${runStats.waiting}`);
    console.log(`Failed: ${runStats.failed}`);
    console.log(`========================================`);

    await sendTelegramMessage(summary);

  } catch (err) {
    console.error(`[Workflow] Run failed with exception: ${err.message}`);
    
    await dbRun(
      "UPDATE automation_runs SET end_time = ?, status = ?, stats = ? WHERE id = ?",
      [new Date().toISOString(), 'FAILED', JSON.stringify({ error: err.message }), runId]
    );

    await sendTelegramMessage(`❌ *Naukri Run Failed*\n\nReason: ${err.message}`);
  } finally {
    await closeBrowserContext();
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--init-db')) {
    try {
      await initDatabase();
    } catch (err) {
      console.error(`[Main] Schema setup failed: ${err.message}`);
    } finally {
      await closeDbConnection();
    }
    return;
  }

  if (args.includes('--login')) {
    try {
      await initDatabase();
      const context = await getBrowserContext(false);
      const page = await context.newPage();
      
      const loggedIn = await checkLoginStatus(page);
      if (loggedIn) {
        console.log('[Main] Cookies match. You are already logged in to Naukri!');
      } else {
        const success = await triggerManualLogin(page);
        if (success) {
          console.log('[Main] manual login completed successfully.');
        } else {
          console.error('[Main] Manual login timed out.');
        }
      }
    } catch (err) {
      console.error(`[Main] Manual login error: ${err.message}`);
    } finally {
      await closeBrowserContext();
      await closeDbConnection();
    }
    return;
  }

  // Handle immediate run command
  if (args.includes('--run-now')) {
    try {
      await initDatabase();
      await executeWorkflow();
    } catch (err) {
      console.error(`[Main] Execute now error: ${err.message}`);
    } finally {
      await closeDbConnection();
    }
    return;
  }

  // Handle direct apply queue command
  if (args.includes('--apply-now')) {
    try {
      await initDatabase();
      const config = getConfig();
      
      const drySetting = await dbGet("SELECT value FROM settings WHERE key = 'dry_run'");
      if (drySetting) {
        config.dryRun = (drySetting.value === 'true');
      }

      console.log(`\n========================================`);
      console.log(`[Worker] Direct Queue Application Triggered [${config.dryRun ? 'DRY RUN' : 'LIVE'}]`);
      console.log(`========================================`);

      await runApplicationQueue(config);
    } catch (err) {
      console.error(`[Main] Direct queue run error: ${err.message}`);
    } finally {
      await closeDbConnection();
    }
    return;
  }

  // Run Web Dashboard only flag
  if (args.includes('--dashboard')) {
    try {
      await startDashboardServer();
    } catch (err) {
      console.error(`[Main] Dashboard launch error: ${err.message}`);
    }
    return;
  }

  // DEFAULT BEHAVIOR: Continuous Daemon Mode
  console.log('\n========================================');
  console.log('Naukri Bot starting in Background Daemon Mode');
  console.log('========================================');

  try {
    await initDatabase();
    
    // Start scheduler cron triggers
    initScheduler();

    // Start background Telegram poller loop
    console.log('[Main] Initializing Telegram response poller (15s interval)...');
    setInterval(async () => {
      await pollTelegramUpdates();
    }, 15000);

    // Launch local Web Dashboard
    await startDashboardServer();

    // Run once immediately on start
    await executeWorkflow();
  } catch (err) {
    console.error(`[Main] Background engine error: ${err.message}`);
    await closeDbConnection();
  }
}

// Only execute main if launched directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch(err => {
    console.error('[Main] Critical process crash:', err);
    process.exit(1);
  });
}
