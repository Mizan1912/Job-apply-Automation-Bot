import { dbGet, dbRun, dbAll } from '../database/db.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

/**
 * Send a message via Telegram.
 * @param {string} text 
 * @returns {Promise<number|null>} Returns the message ID if successful, otherwise null
 */
export async function sendTelegramMessage(text) {
  if (!token || !chatId || token === 'YOUR_BOT_TOKEN' || chatId === 'YOUR_CHAT_ID') {
    console.log('[Telegram] Credentials not initialized. Skipping notification.');
    return null;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });

    const data = await response.json();
    if (data.ok) {
      return data.result.message_id;
    } else {
      console.error(`[Telegram] Error sending message: ${data.description}`);
      return null;
    }
  } catch (err) {
    console.error(`[Telegram] Network error sending message: ${err.message}`);
    return null;
  }
}

/**
 * Polls Telegram Bot APIs for user replies and processes answers.
 * Implements long polling.
 */
export async function pollTelegramUpdates() {
  if (!token || !chatId || token === 'YOUR_BOT_TOKEN' || chatId === 'YOUR_CHAT_ID') {
    return;
  }

  // Get last verified offset
  let offset = 0;
  const offsetSetting = await dbGet("SELECT value FROM settings WHERE key = 'tg_offset'");
  if (offsetSetting) {
    offset = parseInt(offsetSetting.value, 10);
  }

  console.log(`[Telegram] Starting polling updates from offset ${offset}...`);

  const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=10`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.ok && data.result.length > 0) {
      let maxUpdateId = offset;
      
      for (const update of data.result) {
        maxUpdateId = Math.max(maxUpdateId, update.update_id);
        
        if (update.message && String(update.message.chat.id) === String(chatId)) {
          await handleTelegramMessage(update.message);
        }
      }

      // Save next offset index
      const nextOffset = maxUpdateId + 1;
      await dbRun(
        "INSERT INTO settings (key, value) VALUES ('tg_offset', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [String(nextOffset)]
      );
    }
  } catch (err) {
    // Graceful catch for search poll timeouts
    if (!err.message.includes('timeout') && !err.message.includes('Timeout')) {
      console.error(`[Telegram] Polling error: ${err.message}`);
    }
  }
}

/**
 * Parses user text responses and updates database targets.
 * Matches commands like "/answer <app_id> <reply>" or direct replies.
 * @param {object} message Telegram Message object
 */
async function handleTelegramMessage(message) {
  const text = (message.text || '').trim();
  if (!text) return;

  console.log(`[Telegram] Received user message: "${text}"`);

  let applicationId = null;
  let rawAnswers = '';

  // Case A: Reply to Message mapping
  if (message.reply_to_message) {
    const replyMsgId = message.reply_to_message.message_id;
    
    // Look up application ID where tg_message_id matches
    const app = await dbGet(
      "SELECT id FROM applications WHERE telegram_message_ids = ? AND status = 'NEEDS_USER_INPUT'",
      [String(replyMsgId)]
    );
    
    if (app) {
      applicationId = app.id;
      rawAnswers = text;
    }
  }

  // Case B: Slash Command mapping: /answer <application_id> <answers...>
  if (!applicationId && text.startsWith('/answer')) {
    const match = text.match(/^\/answer\s+(\d+)\s+(.+)$/s);
    if (match) {
      applicationId = parseInt(match[1], 10);
      rawAnswers = match[2];
    }
  }

  if (applicationId) {
    await saveUserAnswers(applicationId, rawAnswers);
  } else if (text.startsWith('/')) {
    await sendTelegramMessage(`❌ *Invalid Command*\n\nUsage:\n- Reply directly to a question prompt.\n- Or send: \`/answer <application_id> answer1 | answer2\``);
  }
}

/**
 * Saves missing replies and queues application.
 * @param {number} applicationId 
 * @param {string} rawAnswers Answers text split by |
 */
async function saveUserAnswers(applicationId, rawAnswers) {
  try {
    // Find matching application details
    const app = await dbGet(
      `SELECT a.id, j.title, j.company 
       FROM applications a 
       JOIN jobs j ON a.job_id = j.id 
       WHERE a.id = ?`,
      [applicationId]
    );

    if (!app) {
      await sendTelegramMessage(`❌ Application ID ${applicationId} not found.`);
      return;
    }

    // Get pending questions
    const pendingQuestions = await dbAll(
      `SELECT id, question_text 
       FROM application_questions 
       WHERE application_id = ? AND status = 'PENDING' 
       ORDER BY id ASC`,
      [applicationId]
    );

    if (pendingQuestions.length === 0) {
      await sendTelegramMessage(`ℹ️ All questions for *${app.company} (ID: ${app.id})* are already answered.`);
      return;
    }

    // Split answers by pipe character
    const answerParts = rawAnswers.split('|').map(x => x.trim()).filter(Boolean);

    if (answerParts.length < pendingQuestions.length) {
      await sendTelegramMessage(`⚠️ Provided ${answerParts.length} answers but job requires ${pendingQuestions.length} answers.\n\nType responses split by \`|\`.\nExample: \`Immediate | 500000\``);
      return;
    }

    // Insert answers into global library and mark questions answered
    for (let i = 0; i < pendingQuestions.length; i++) {
      const q = pendingQuestions[i];
      const ansText = answerParts[i];

      // Save to global answers
      await dbRun(
        "INSERT INTO answers (question_text, answer_text) VALUES (?, ?) ON CONFLICT(question_text) DO UPDATE SET answer_text = excluded.answer_text",
        [q.question_text, ansText]
      );

      // Update question status
      await dbRun(
        "UPDATE application_questions SET status = 'ANSWERED', answer_text = ? WHERE id = ?",
        [ansText, q.id]
      );
    }

    // Set application back to QUEUED
    await dbRun(
      "UPDATE applications SET status = 'QUEUED', error_message = NULL, updated_at = ? WHERE id = ?",
      [new Date().toISOString(), applicationId]
    );

    await sendTelegramMessage(`✅ *Answers Saved*\nUpdated details for *${app.company}*.\nJob is now back in the QUEUED pipeline.`);
    console.log(`[Telegram] Application ID ${applicationId} successfully updated and QUEUED.`);
  } catch (err) {
    console.error(`[Telegram] Error saving answers: ${err.message}`);
    await sendTelegramMessage(`❌ Error updating answers: ${err.message}`);
  }
}
