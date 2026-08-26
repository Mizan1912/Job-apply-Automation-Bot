import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbAll, dbGet, dbRun, initDatabase } from '../database/db.js';

const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_PATH = path.join(__dirname, 'index.html');

export async function startDashboardServer() {
  await initDatabase();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/') {
      try {
        const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlContent);
      } catch (err) {
        res.writeHead(500);
        res.end(`Error loading dashboard template: ${err.message}`);
      }
      return;
    }

    // API: GET stats summary
    if (req.method === 'GET' && url.pathname === '/api/stats') {
      try {
        const total = await dbGet("SELECT COUNT(*) as count FROM jobs");
        const applied = await dbGet("SELECT COUNT(*) as count FROM applications WHERE status = 'APPLIED'");
        const waiting = await dbGet("SELECT COUNT(*) as count FROM applications WHERE status = 'NEEDS_USER_INPUT'");
        const queued = await dbGet("SELECT COUNT(*) as count FROM applications WHERE status = 'QUEUED'");

        // Get dry run setting override
        const drySetting = await dbGet("SELECT value FROM settings WHERE key = 'dry_run'");
        const dryRun = drySetting ? drySetting.value === 'true' : process.env.DRY_RUN !== 'false';

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          total: total?.count || 0,
          applied: applied?.count || 0,
          waiting: waiting?.count || 0,
          queued: queued?.count || 0,
          dryRun
        }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // API: GET all list entries with details
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

        // Attach pending questions detail mapping
        for (const app of apps) {
          if (app.status === 'NEEDS_USER_INPUT') {
            app.questions = await dbAll(
              "SELECT id, question_text FROM application_questions WHERE application_id = ? AND status = 'PENDING'",
              [app.application_id]
            );
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(apps));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // API: POST toggle dry run setting
    if (req.method === 'POST' && url.pathname === '/api/settings/dryrun') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const dryRunValue = payload.dryRun ? 'true' : 'false';

          await dbRun(
            "INSERT INTO settings (key, value) VALUES ('dry_run', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [dryRunValue]
          );

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, dryRun: payload.dryRun }));
        } catch (err) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // API: POST submit answer inputs for user questions
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
              "UPDATE application_questions SET status = 'ANSWERED' WHERE id = ?",
              [item.questionId]
            );
          }

          // Return application flow back to QUEUED
          await dbRun(
            "UPDATE applications SET status = 'QUEUED', error_message = NULL, updated_at = ? WHERE id = ?",
            [new Date().toISOString(), applicationId]
          );

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // API: POST requeue / retry any application status
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

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Fallback NOT FOUND page
    res.writeHead(404);
    res.end('Not Found');
  });

  server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`[Dashboard] Running at http://localhost:${PORT}`);
    console.log(`========================================\n`);
  });
}

// Enable direct run
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  startDashboardServer().catch(err => {
    console.error('[Dashboard] Crash starting server:', err);
  });
}
