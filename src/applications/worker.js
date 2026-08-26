import { dbGet, dbAll, dbRun } from '../database/db.js';
import { applyToJob } from './apply.js';
import { getBrowserContext } from '../browser/browser.js';
import { checkLoginStatus } from '../browser/naukri.js';
import { sendTelegramMessage } from '../notifications/telegram.js';

/**
 * Check if the daily application limit is reached.
 * @param {number} maxPerDay 
 * @returns {Promise<boolean>}
 */
async function isDailyLimitReached(maxPerDay) {
  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);
  const isoStart = startOfDay.toISOString();

  const result = await dbGet(
    `SELECT COUNT(*) as count FROM applications 
     WHERE status = 'APPLIED' AND updated_at >= ?`,
    [isoStart]
  );
  
  return (result ? result.count : 0) >= maxPerDay;
}

/**
 * Processes queued applications sequentially with rate limits and delays.
 * @param {object} config System configuration details
 * @returns {Promise<{applied: number, waiting: number, failed: number, skipped: number}>}
 */
export async function runApplicationQueue(config) {
  const stats = {
    applied: 0,
    waiting: 0,
    failed: 0,
    skipped: 0
  };

  // 1. Check daily limit
  if (await isDailyLimitReached(config.maxApplicationsPerDay)) {
    console.log(`[Worker] Daily limit of ${config.maxApplicationsPerDay} applications reached. Skipping queue run.`);
    return stats;
  }

  // 2. Fetch QUEUED applications
  const queuedApps = await dbAll(
    `SELECT a.id, a.job_id, a.status, j.title, j.company, j.url, j.location, j.experience, j.salary 
     FROM applications a
     JOIN jobs j ON a.job_id = j.id
     WHERE a.status = 'QUEUED'
     ORDER BY a.updated_at ASC`
  );

  if (queuedApps.length === 0) {
    console.log('[Worker] No applications in QUEUED state.');
    return stats;
  }

  console.log(`[Worker] Found ${queuedApps.length} queued applications to process.`);

  // 3. Initialize Browser Context
  const context = await getBrowserContext(false); // Non-headless helps with visual inspection and manual intervention
  const page = await context.newPage();

  // Validate session is active
  const loggedIn = await checkLoginStatus(page);
  if (!loggedIn) {
    console.error('[Worker] User is not logged into Naukri. Cannot apply to jobs.');
    const errMsg = 'Naukri session expired. Please run manual login again.';
    await sendTelegramMessage(`⚠️ *Naukri Session Expired*\n${errMsg}\nRun \`npm run login\` locally to re-authenticate.`);
    await page.close();
    return stats;
  }

  let runAppliedCount = 0;

  for (const app of queuedApps) {
    // Check constraints
    if (runAppliedCount >= config.maxApplicationsPerRun) {
      console.log(`[Worker] Max applications per run (${config.maxApplicationsPerRun}) reached. Stopping run.`);
      break;
    }
    if (await isDailyLimitReached(config.maxApplicationsPerDay)) {
      console.log(`[Worker] Max applications per day (${config.maxApplicationsPerDay}) reached during execution. Stopping.`);
      break;
    }

    console.log(`\n========================================`);
    console.log(`[Worker] Processing Application: ${app.company} - ${app.title}`);
    console.log(`========================================`);

    // Mark as applying to prevent parallel runs grabbing it
    const timestamp = new Date().toISOString();
    await dbRun("UPDATE applications SET status = 'APPLYING', updated_at = ? WHERE id = ?", [timestamp, app.id]);

    // Clear previous questions to ensure a clean slate for the new run
    await dbRun("DELETE FROM application_questions WHERE application_id = ?", [app.id]);

    const result = await applyToJob(page, app, config);

    // Write-back status to DB
    const finalTimestamp = new Date().toISOString();
    await dbRun(
      "UPDATE applications SET status = ?, error_message = ?, updated_at = ? WHERE id = ?",
      [result.status, result.error || null, finalTimestamp, app.id]
    );

    if (result.status === 'APPLIED') {
      stats.applied++;
      runAppliedCount++;
      console.log(`[Worker] Applied successfully!`);
    } else if (result.status === 'NEEDS_USER_INPUT') {
      stats.waiting++;
      console.log(`[Worker] Needs user input. Registering questions.`);
      
      // Save questions in the database
      for (const qText of result.questions) {
        await dbRun(
          `INSERT OR IGNORE INTO application_questions (application_id, question_text, status) 
           VALUES (?, ?, ?)`,
          [app.id, qText, 'PENDING']
        );
      }

      // Format Telegram question notification
      const questionsFormatted = result.questions.map((q, idx) => `${idx + 1}. ${q}`).join('\n');
      const message = `❓ *Input Required* \n\n*Company:* ${app.company}\n*Position:* ${app.title}\n*Job Link:* [Open Details](${app.url})\n\nSelect a reply option or send:\n\`/answer ${app.id} your answers split by |\`\n\n*Questions:*\n${questionsFormatted}`;
      await sendTelegramMessage(message);

    } else if (result.status === 'NEEDS_USER_ACTION') {
      stats.waiting++;
      console.log(`[Worker] Needs manual user action (Redirect/MFA).`);
      
      const message = `⚠️ *Action Required*\n\n*Company:* ${app.company}\n*Position:* ${app.title}\n\nThe job requires direct applications outside Naukri or has triggered security challenges.\nPlease open the browser and complete it manually.\n\n*Job URL:* ${app.url}`;
      await sendTelegramMessage(message);
    } else if (result.status === 'FAILED') {
      stats.failed++;
      console.log(`[Worker] Job application FAILED: ${result.error}`);
    } else if (result.status === 'SKIPPED') {
      stats.skipped++;
      console.log(`[Worker] Job application SKIPPED.`);
    }

    // Apply delay between applications (Skip delay on last job)
    if (app.id !== queuedApps[queuedApps.length - 1].id) {
      const delayRange = config.maxDelay - config.minDelay;
      const sleepTime = Math.floor(Math.random() * delayRange) + config.minDelay;
      console.log(`[Worker] Waiting for ${Math.round(sleepTime / 1000)}s before next transaction...`);
      await page.waitForTimeout(sleepTime);
    }
  }

  // Clean browser resources
  await page.close();
  return stats;
}
