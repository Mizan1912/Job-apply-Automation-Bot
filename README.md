# Naukri Job Application Automation Bot

A working personal automated job-application bot for Naukri using Node.js, Playwright, SQLite, and Telegram Bot API.

## Project Structure
```text
naukri-bot/
│
├── src/
│   ├── browser/
│   │   ├── browser.js           # Playwright persistent context setup
│   │   └── naukri.js            # Selectors & login state check helpers
│   │
│   ├── jobs/
│   │   ├── search.js            # Constructs search parameters & scrapes listings
│   │   ├── filter.js            # Checks experience & location criteria
│   │   └── queue.js             # Deduplicates & queues matches in SQLite
│   │
│   ├── applications/
│   │   ├── worker.js            # Application queue processor (non-blocking)
│   │   ├── apply.js             # Form navigation and submission
│   │   └── questions.js         # Extraction and auto-answering of question forms
│   │
│   ├── notifications/
│   │   └── telegram.js          # Telegram messaging and reply polling daemon
│   │
│   ├── database/
│   │   └── db.js                # SQLite tables init and Promise query wrapper
│   │
│   ├── scheduler.js             # Runs cron schedules (Mon-Fri, 10:30 AM & 1:00 PM IST)
│   └── index.js                 # App orchestrator & CLI entry
│
├── data/
│   └── naukri.db                # SQLite Database
│
├── browser-profile/             # Playwright persistent session cookies
├── .env
├── package.json
└── README.md
```

## Features
- **Persistent Session**: Log in manually once; cookies and authentication are stored locally inside `browser-profile`.
- **Intelligent Filters**: Automated filters for experience levels (e.g. Freshers / 0-1 Yr) and location sets.
- **SQLite Tracker**: Keeps a log of applications to avoid duplicate submissions.
- **Non-blocking Queue**: If a job requires manual answers, it gets flagged as `NEEDS_USER_INPUT` and suspended while other applications continue processing.
- **Telegram Integration**: Receives job-specific questionnaires on Messenger, allows direct text replies to solve them, and changes queue states instantly.
- **Scheduler**: Automatically searches and applies on working days at 10:30 AM and 01:00 PM IST.

---

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Configure Environment `.env`
Edit the `.env` file in the project root:
- Set your `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
- Set your search keywords and locations.
- Update your personal profile criteria for the autosolve generator (notice period, expected salary, phone, etc.).
- Keep `DRY_RUN=true` enabled during initial runs to test safely!

### 3. Initialize SQLite Database
```bash
npm run init-db
```

### 4. Perform Initial Naukri Login
```bash
npm run login
```
This launches a non-headless browser. Enter your username, password, OTPs or CAPTCHAs, and confirm you see the Naukri dashboard. Close the browser only after.

---

## Run Commands

### Manual Instant Run (Full Workflow)
Runs the entire search, scrape, and queue-apply workflow:
```bash
npm run run-now
```

### Direct Application Queue Processing (Skip Search)
If you already have jobs in your database (e.g., status `QUEUED`, `FAILED`, `SKIPPED`) and want to bypass the keyword/location scraping phase altogether, trigger the application worker queue directly:
```bash
npm run apply-now
```

### Launch Web Dashboard
Starts the dashboard local server at `http://localhost:3000`:
```bash
npm run dashboard
```

### Scheduler Daemon Mode
Run the bot as a background service:
```bash
npm start
```
This runs the background scheduler (Monday–Friday at 10:30 AM and 01:00 PM Asia/Kolkata timezone), automatically initiates the dashboard server, and starts polling Telegram for message responses every 15 seconds.

---

## Handling Questionnaire Answers

When a job application requires answers that aren't in your `.env` profile configs, it transitions to **`NEEDS_USER_INPUT`**. You can solve questionnaires in three ways:

### 1. Unified Web Dashboard (Recommended)
1. Go to `http://localhost:3000` and navigate to the **"Needs Input"** tab.
2. In the job card, look at the **📋 Questionnaire Solver** form showing the exact question labels.
3. Fill in the inputs and click **"Submit Answers & Queue"**.
4. You can also re-queue failed or skipped applications by clicking the yellow **"Re-Queue"** buttons.

### 2. Telegram Messaging
* Read the notification showing the pending questions and Application ID.
* Send a reply using the answer command:
  `/answer <APPLICATION_ID> Value 1 | Value 2`

### 3. Automated Chatbot Loop
The application worker executes a conversational loop to handle step-by-step chatbot modals. It inputs your configured profile metrics, triggers standard buttons ("Next"/"Send"), or falls back to sending simulated `Enter` keyboard events until the questionnaire is fully submitted or a manual input is required.

