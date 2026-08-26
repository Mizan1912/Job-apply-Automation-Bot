import cron from 'node-cron';
import { executeWorkflow } from './index.js';

export function initScheduler() {
  console.log('[Scheduler] Initializing automated schedules...');

  // Mon-Fri at 10:30 AM Asia/Kolkata
  cron.schedule('30 10 * * 1-5', async () => {
    console.log('[Scheduler] Triggering scheduled run (10:30 AM)...');
    try {
      await executeWorkflow();
    } catch (err) {
      console.error(`[Scheduler] 10:30 AM schedule run failed: ${err.message}`);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  // Mon-Fri at 1:00 PM Asia/Kolkata
  cron.schedule('00 13 * * 1-5', async () => {
    console.log('[Scheduler] Triggering scheduled run (1:00 PM)...');
    try {
      await executeWorkflow();
    } catch (err) {
      console.error(`[Scheduler] 1:00 PM schedule run failed: ${err.message}`);
    }
  }, {
    timezone: "Asia/Kolkata"
  });
}
