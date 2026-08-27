import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbAll, dbGet, dbRun, initDatabase } from '../database/db.js';

const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, 'dist');

// Global running flags to prevent concurrent backend worker pipelines
let isWorkerRunning = false;

// Media types for static file serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

export async function startDashboardServer() {
  await initDatabase();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Helper to send JSON error
    const sendError = (status, msg) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: msg }));
    };

    // Helper to send JSON success
    const sendJson = (data) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    // ==========================================
    // API: GET stats summary
    // ==========================================
    if (req.method === 'GET' && url.pathname === '/api/stats') {
      try {
        const total = await dbGet("SELECT COUNT(*) as count FROM jobs");
        const applied = await dbGet("SELECT COUNT(*) as count FROM applications WHERE status = 'APPLIED'");
        const waiting = await dbGet("SELECT COUNT(*) as count FROM applications WHERE status = 'NEEDS_USER_INPUT'");
        const queued = await dbGet("SELECT COUNT(*) as count FROM applications WHERE status = 'QUEUED'");
        const failed = await dbGet("SELECT COUNT(*) as count FROM applications WHERE status = 'FAILED'");

        // Get dry run setting override
        const drySetting = await dbGet("SELECT value FROM settings WHERE key = 'dry_run'");
        const dryRun = drySetting ? drySetting.value === 'true' : process.env.DRY_RUN !== 'false';

        sendJson({
          total: total?.count || 0,
          applied: applied?.count || 0,
          waiting: waiting?.count || 0,
          queued: queued?.count || 0,
          failed: failed?.count || 0,
          dryRun,
          isWorkerRunning
        });
      } catch (err) {
        sendError(500, err.message);
      }
      return;
    }

    // ==========================================
    // API: GET all list entries with details
    // ==========================================
    if (req.method === 'GET' && url.pathname === '/api/applications') {
      try {
        const apps = await dbAll(`
          SELECT 
            a.id as application_id, 
            a.status, 
            a.error_message, 
            a.updated_at,
            j.id as job_id, 
            j.title, 
            j.company, 
            j.url, 
            j.location, 
            j.experience, 
            j.discovered_at as created_at
          FROM applications a
          JOIN jobs j ON a.job_id = j.id
          ORDER BY a.updated_at DESC
        `);

        // Attach questionnaire logs (all pending, answered, and auto-solved questions)
        for (const app of apps) {
          app.questions = await dbAll(
            "SELECT id, question_text, question_type, options, answer_text, status FROM application_questions WHERE application_id = ? ORDER BY id ASC",
            [app.application_id]
          );
        }

        sendJson(apps);
      } catch (err) {
        sendError(500, err.message);
      }
      return;
    }

    // ==========================================
    // API: GET existing settings overrides
    // ==========================================
    if (req.method === 'GET' && url.pathname === '/api/settings') {
      try {
        // Query database overrides
        const dbRows = await dbAll("SELECT key, value FROM settings");
        const dbSettings = {};
        for (const row of dbRows) {
          dbSettings[row.key] = row.value;
        }

        // Return combined list of configuration variables
        const responseSettings = {
          dry_run: dbSettings['dry_run'] !== undefined ? dbSettings['dry_run'] : (process.env.DRY_RUN || 'true'),
          keywords: dbSettings['keywords'] !== undefined ? dbSettings['keywords'] : (process.env.KEYWORDS || ''),
          locations: dbSettings['locations'] !== undefined ? dbSettings['locations'] : (process.env.LOCATIONS || ''),
          experience_filter_ids: dbSettings['experience_filter_ids'] !== undefined ? dbSettings['experience_filter_ids'] : (process.env.JOB_EXPERIENCE_FILTER_IDS || '0,1'),
          
          min_delay: dbSettings['min_delay'] !== undefined ? dbSettings['min_delay'] : (process.env.MIN_DELAY_BETWEEN_APPLICATIONS || '10000'),
          max_delay: dbSettings['max_delay'] !== undefined ? dbSettings['max_delay'] : (process.env.MAX_DELAY_BETWEEN_APPLICATIONS || '30000'),
          max_applications_per_run: dbSettings['max_applications_per_run'] !== undefined ? dbSettings['max_applications_per_run'] : (process.env.MAX_APPLICATIONS_PER_RUN || '20'),
          max_applications_per_day: dbSettings['max_applications_per_day'] !== undefined ? dbSettings['max_applications_per_day'] : (process.env.MAX_APPLICATIONS_PER_DAY || '40'),

          my_name: dbSettings['my_name'] !== undefined ? dbSettings['my_name'] : (process.env.MY_NAME || ''),
          my_email: dbSettings['my_email'] !== undefined ? dbSettings['my_email'] : (process.env.MY_EMAIL || ''),
          my_phone: dbSettings['my_phone'] !== undefined ? dbSettings['my_phone'] : (process.env.MY_PHONE || ''),
          my_resume_path: dbSettings['my_resume_path'] !== undefined ? dbSettings['my_resume_path'] : (process.env.MY_RESUME_PATH || ''),
          my_location: dbSettings['my_location'] !== undefined ? dbSettings['my_location'] : (process.env.MY_LOCATION || ''),
          
          my_notice_period: dbSettings['my_notice_period'] !== undefined ? dbSettings['my_notice_period'] : (process.env.MY_NOTICE_PERIOD || 'Immediate'),
          my_current_salary: dbSettings['my_current_salary'] !== undefined ? dbSettings['my_current_salary'] : (process.env.MY_CURRENT_SAVALARY || '0'),
          my_expected_salary: dbSettings['my_expected_salary'] !== undefined ? dbSettings['my_expected_salary'] : (process.env.MY_EXPECTED_SALARY || '0'),
          my_education: dbSettings['my_education'] !== undefined ? dbSettings['my_education'] : (process.env.MY_EDUCATION || ''),
          my_total_experience: dbSettings['my_total_experience'] !== undefined ? dbSettings['my_total_experience'] : (process.env.MY_TOTAL_EXPERIENCE || '0'),

          telegram_bot_token: dbSettings['telegram_bot_token'] !== undefined ? dbSettings['telegram_bot_token'] : (process.env.TELEGRAM_BOT_TOKEN || ''),
          telegram_chat_id: dbSettings['telegram_chat_id'] !== undefined ? dbSettings['telegram_chat_id'] : (process.env.TELEGRAM_CHAT_ID || ''),
          
          schedule_time_1: dbSettings['schedule_time_1'] !== undefined ? dbSettings['schedule_time_1'] : '10:30',
          schedule_time_2: dbSettings['schedule_time_2'] !== undefined ? dbSettings['schedule_time_2'] : '13:00',
          schedule_days: dbSettings['schedule_days'] !== undefined ? dbSettings['schedule_days'] : '1-5',
          reallow_duplicate_apply_days: dbSettings['reallow_duplicate_apply_days'] !== undefined ? dbSettings['reallow_duplicate_apply_days'] : (process.env.REALLOW_DUPLICATE_APPLY_DAYS || '30')
        };

        sendJson(responseSettings);
      } catch (err) {
        sendError(500, err.message);
      }
      return;
    }

    // ==========================================
    // API: POST save settings overrides
    // ==========================================
    if (req.method === 'POST' && url.pathname === '/api/settings') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body); // Key-Value map of settings to write
          for (const [key, value] of Object.entries(payload)) {
            await dbRun(
              "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
              [key, String(value)]
            );
          }

          // Trigger cron reschedule dynamically
          const { initScheduler } = await import('../scheduler.js');
          await initScheduler();

          sendJson({ success: true });
        } catch (err) {
          sendError(400, err.message);
        }
      });
      return;
    }

    // ==========================================
    // API: POST submit answer inputs for user questions
    // ==========================================
    if (req.method === 'POST' && url.pathname === '/api/applications/answer') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body); // { applicationId, answers: [{ questionId, answerText }] }
          const { applicationId, answers } = payload;

          if (!applicationId || !answers || !Array.isArray(answers)) {
            throw new Error('Invalid answer submission details');
          }

          // Loop answers, write into DB and update question statuses
          for (const item of answers) {
            const question = await dbGet(
              "SELECT question_text FROM application_questions WHERE id = ?",
              [item.questionId]
            );

            if (question) {
              // Store in global library
              await dbRun(
                "INSERT INTO answers (question_text, answer_text) VALUES (?, ?) ON CONFLICT(question_text) DO UPDATE SET answer_text = excluded.answer_text",
                [question.question_text, item.answerText]
              );
            }

            // Update specific application question
            await dbRun(
              "UPDATE application_questions SET status = 'ANSWERED', answer_text = ? WHERE id = ?",
              [item.answerText, item.questionId]
            );
          }

          // Return application flow back to QUEUED
          await dbRun(
            "UPDATE applications SET status = 'QUEUED', error_message = NULL, updated_at = ? WHERE id = ?",
            [new Date().toISOString(), applicationId]
          );

          sendJson({ success: true });
        } catch (err) {
          sendError(400, err.message);
        }
      });
      return;
    }

    // ==========================================
    // API: POST requeue / retry any application status
    // ==========================================
    if (req.method === 'POST' && url.pathname === '/api/applications/requeue') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const { applicationId } = payload;
          if (!applicationId) {
            throw new Error('Missing applicationId');
          }

          await dbRun(
            "UPDATE applications SET status = 'QUEUED', error_message = NULL, updated_at = ? WHERE id = ?",
            [new Date().toISOString(), applicationId]
          );

          // Clear old questions on requeue so the interface doesn't render stale questions
          await dbRun("DELETE FROM application_questions WHERE application_id = ?", [applicationId]);

          sendJson({ success: true });
        } catch (err) {
          sendError(400, err.message);
        }
      });
      return;
    }

    // ==========================================
    // API: POST trigger force run (search & apply)
    // ==========================================
    if (req.method === 'POST' && url.pathname === '/api/trigger-run') {
      if (isWorkerRunning) {
        sendError(400, 'A background crawler run or queue process is already executing.');
        return;
      }

      isWorkerRunning = true;
      sendJson({ success: true, message: 'Job search & apply trigger started.' });

      // Run execution loop asynchronously in background
      (async () => {
        try {
          const { executeWorkflow } = await import('../index.js');
          await executeWorkflow();
        } catch (err) {
          console.error(`[Dashboard trigger-run] Execution error: ${err.message}`);
        } finally {
          isWorkerRunning = false;
        }
      })();
      return;
    }

    // ==========================================
    // API: POST & GET trigger force apply (process queue)
    // ==========================================
    if (req.method === 'POST' && url.pathname === '/api/trigger-apply') {
      if (isWorkerRunning) {
        sendError(400, 'A background crawler run or queue process is already executing.');
        return;
      }

      isWorkerRunning = true;
      sendJson({ success: true, message: 'Queue application worker trigger started.' });

      // Run execution loop asynchronously in background
      (async () => {
        try {
          const { getConfig } = await import('../index.js');
          const { runApplicationQueue } = await import('../applications/worker.js');
          const config = await getConfig();
          console.log(`[Dashboard trigger-apply] Resolving queue directly [${config.dryRun ? 'DRY' : 'LIVE'}]`);
          await runApplicationQueue(config);
        } catch (err) {
          console.error(`[Dashboard trigger-apply] Queue execution error: ${err.message}`);
        } finally {
          isWorkerRunning = false;
        }
      })();
      return;
    }

    // ==========================================
    // Static Files Server: serve Vite compiled assets
    // ==========================================
    if (req.method === 'GET') {
      let pathname = url.pathname;
      if (pathname === '/') pathname = '/index.html';

      let filePath = path.join(DIST_DIR, pathname);

      // If file doesn't exist, check index.html as fallback for Single Page Application routing support
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      // Check if file exists inside compiled directory
      if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
        try {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          const fileStream = fs.createReadStream(filePath);
          
          res.writeHead(200, { 'Content-Type': contentType });
          fileStream.pipe(res);
          return;
        } catch (err) {
          res.writeHead(500);
          res.end(`Error reading file: ${err.message}`);
          return;
        }
      }
    }

    // Return Not Found
    res.writeHead(404);
    res.end('Not Found');
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================`);
    console.log(`[Dashboard] Running at http://localhost:${PORT}`);
    console.log(`========================================\n`);
  });
}

// Enable direct run
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startDashboardServer().catch(err => {
    console.error('[Dashboard] Crash starting server:', err);
  });
}
