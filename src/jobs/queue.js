import { dbGet, dbRun } from '../database/db.js';
import { filterJob } from './filter.js';

/**
 * Filter scraped jobs, perform duplicate checks, and insert matching elements into SQLite database as QUEUED or SKIPPED.
 * @param {Array<object>} jobs 
 * @param {object} config 
 * @returns {Promise<{found: number, exists: number, eligible: number, skipped: number}>}
 */
export async function processAndQueueJobs(jobs, config) {
  const stats = {
    found: jobs.length,
    exists: 0,
    eligible: 0,
    skipped: 0
  };

  const timestamp = new Date().toISOString();

  for (const job of jobs) {
    try {
      // 1. Duplicate prevention
      const existing = await dbGet('SELECT id FROM jobs WHERE id = ?', [job.id]);
      if (existing) {
        const existingApp = await dbGet('SELECT id, status, updated_at FROM applications WHERE job_id = ?', [job.id]);
        
        let requeued = false;
        if (existingApp && config.reallowDuplicateApplyDays !== undefined) {
          const limitMs = config.reallowDuplicateApplyDays * 24 * 60 * 60 * 1000;
          const lastUpdated = new Date(existingApp.updated_at).getTime();
          const ageMs = Date.now() - lastUpdated;
          
          if ((existingApp.status === 'APPLIED' || existingApp.status === 'FAILED') && ageMs > limitMs) {
            console.log(`[Queue] Job ${job.id} has expired (age: ${Math.round(ageMs / (24*60*60*1000))} days). Re-queueing application...`);
            
            // Clear any stale questions
            await dbRun('DELETE FROM application_questions WHERE application_id = ?', [existingApp.id]);
            
            // Reset application state
            await dbRun(
              "UPDATE applications SET status = 'QUEUED', error_message = NULL, updated_at = ? WHERE id = ?",
              [timestamp, existingApp.id]
            );
            stats.eligible++;
            requeued = true;
          }
        }
        
        if (requeued) {
          continue;
        }

        stats.exists++;
        // Already processed on a previous run, skip entirely.
        continue;
      }

      // 2. Client-side filtering check
      const filterRes = filterJob(job, config);
      let status = 'QUEUED';
      let errorMsg = null;

      if (!filterRes.eligible) {
        status = 'SKIPPED';
        errorMsg = filterRes.reason;
        stats.skipped++;
      } else {
        stats.eligible++;
      }

      // 3. Save job profile metadata
      await dbRun(
        `INSERT INTO jobs (id, title, company, url, location, experience, salary, posted_date, description, discovered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          job.id,
          job.title,
          job.company,
          job.url,
          job.location,
          job.experience,
          job.salary,
          job.posted_date,
          job.description,
          timestamp
        ]
      );

      // 4. Save and index application state
      await dbRun(
        `INSERT INTO applications (job_id, status, error_message, updated_at)
         VALUES (?, ?, ?, ?)`,
        [job.id, status, errorMsg, timestamp]
      );

      console.log(`[Queue] Saved job: ${job.company} - ${job.title} -> [${status}]${errorMsg ? ` (${errorMsg})` : ''}`);

    } catch (err) {
      console.error(`[Queue] Failed to process job ${job.id}: ${err.message}`);
    }
  }

  return stats;
}
