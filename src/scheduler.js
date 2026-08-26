import cron from 'node-cron';
import { executeWorkflow } from './index.js';
import { dbGet } from './database/db.js';

let runningJobs = [];

export async function initScheduler() {
  console.log('[Scheduler] Initializing automated schedules...');

  // Stop existing cron jobs if any
  for (const job of runningJobs) {
    job.stop();
  }
  runningJobs = [];

  // Load schedule configuration from database
  let time1 = '10:30';
  let time2 = '13:00';
  let days = '1-5';

  try {
    const t1 = await dbGet("SELECT value FROM settings WHERE key = 'schedule_time_1'");
    if (t1) time1 = t1.value;
    const t2 = await dbGet("SELECT value FROM settings WHERE key = 'schedule_time_2'");
    if (t2) time2 = t2.value;
    const d = await dbGet("SELECT value FROM settings WHERE key = 'schedule_days'");
    if (d) days = d.value;
  } catch (err) {
    console.error(`[Scheduler] Error loading config: ${err.message}`);
  }

  // Parse time1 (HH:MM)
  const [m1, h1] = time1.split(':').map(x => x.trim()).reverse();
  const cron1 = `${m1 || '30'} ${h1 || '10'} * * ${days}`;

  // Parse time2 (HH:MM)
  const [m2, h2] = time2.split(':').map(x => x.trim()).reverse();
  const cron2 = `${m2 || '00'} ${h2 || '13'} * * ${days}`;

  console.log(`[Scheduler] Setting triggers - Schedule 1: ${cron1}, Schedule 2: ${cron2}`);

  const job1 = cron.schedule(cron1, async () => {
    console.log('[Scheduler] Triggering scheduled run (Morning)...');
    try {
      await executeWorkflow();
    } catch (err) {
      console.error(`[Scheduler] Morning schedule run failed: ${err.message}`);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  const job2 = cron.schedule(cron2, async () => {
    console.log('[Scheduler] Triggering scheduled run (Afternoon)...');
    try {
      await executeWorkflow();
    } catch (err) {
      console.error(`[Scheduler] Afternoon schedule run failed: ${err.message}`);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  runningJobs.push(job1, job2);
}
