# 🤖 Naukri Job Application Automation Bot

A personal job-application automation bot for **Naukri** built with **Node.js, Playwright, SQLite, and Telegram Bot API**.

The bot automatically searches for relevant jobs, filters them based on configured criteria, prevents duplicate applications, processes applications in the background, and asks for your input only when an application requires information that the bot does not have.

---

## ✨ Features

* 🔐 **Persistent Naukri Session**
  Log in manually once and reuse the saved Playwright browser session.

* 🔎 **Automated Job Search**
  Searches Naukri using configurable keywords, locations, experience levels, and freshness sorting.

* 🎯 **Intelligent Filtering**
  Filters jobs based on configured experience and location preferences.

* 🗄️ **SQLite Application Tracker**
  Stores discovered jobs and application states to prevent duplicate applications.

* ⚡ **Non-Blocking Application Queue**
  Applications that require manual input are suspended while other jobs continue processing.

* 💬 **Telegram Notifications**
  Receive notifications when an application requires your input or manual action.

* 📝 **Questionnaire Handling**
  Automatically answers common questions using your configured profile information and asks you when an answer is unavailable.

* ⏰ **Automatic Scheduling**
  Runs automatically on working days at **10:30 AM and 1:00 PM IST**.

* 🧪 **Dry-Run Mode**
  Test the complete workflow without submitting real applications.

* 📊 **Local Dashboard**
  Monitor applications and answer pending questions from a simple local dashboard.

---

# 🏗️ Architecture

```text
                         ┌──────────────────┐
                         │    Scheduler     │
                         │ 10:30 AM / 1 PM  │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   Job Search     │
                         │     Naukri       │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Job Filtering    │
                         │ Experience       │
                         │ Location         │
                         │ Freshness        │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Duplicate Check  │
                         │     SQLite       │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Application      │
                         │ Queue            │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
             ┌──────────────┐          ┌─────────────────┐
             │ Auto Apply   │          │ Needs User Input│
             └──────┬───────┘          └────────┬────────┘
                    │                           │
                    ▼                           ▼
                APPLIED                  Telegram / Dashboard
                                                │
                                                ▼
                                          User Answers
                                                │
                                                ▼
                                         Resume Application
```

---

# 📁 Project Structure

```text
naukri-bot/
│
├── src/
│   │
│   ├── browser/
│   │   ├── browser.js
│   │   └── naukri.js
│   │
│   ├── jobs/
│   │   ├── search.js
│   │   ├── filter.js
│   │   └── queue.js
│   │
│   ├── applications/
│   │   ├── worker.js
│   │   ├── apply.js
│   │   └── questions.js
│   │
│   ├── notifications/
│   │   └── telegram.js
│   │
│   ├── database/
│   │   └── db.js
│   │
│   ├── scheduler.js
│   └── index.js
│
├── data/
│   └── naukri.db
│
├── browser-profile/
│   └── # Persistent Playwright session
│
├── .env
├── .env.example
├── package.json
└── README.md
```

### Component Overview

| Component          | Responsibility                                       |
| ------------------ | ---------------------------------------------------- |
| `browser/`         | Playwright browser and Naukri session management     |
| `jobs/`            | Job searching, filtering, deduplication and queueing |
| `applications/`    | Application processing and questionnaire handling    |
| `notifications/`   | Telegram notifications and replies                   |
| `database/`        | SQLite database and queries                          |
| `scheduler.js`     | Scheduled job-search runs                            |
| `index.js`         | Application entry point and orchestration            |
| `data/`            | Local SQLite database                                |
| `browser-profile/` | Persistent Naukri authentication session             |

---

# 🚀 Setup

## Prerequisites

Make sure you have:

* Node.js installed
* A Naukri account
* A Telegram account
* A Telegram Bot Token

---

## 1. Install Dependencies

Clone the repository and install dependencies:

```bash
npm install
```

Install the Playwright Chromium browser:

```bash
npx playwright install chromium
```

---

## 2. Configure Environment Variables

Create your `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Then configure:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

Also configure your:

* Job-search keywords
* Preferred locations
* Experience criteria
* Notice period
* Expected salary
* Phone number
* Other profile information used by the questionnaire solver

> ⚠️ Never commit your `.env` file to Git.

---

# 🗄️ 3. Initialize the Database

Initialize the SQLite database:

```bash
npm run init-db
```

This creates the required database tables inside:

```text
data/naukri.db
```

---

# 🔐 4. Login to Naukri

Run:

```bash
npm run login
```

This launches a non-headless Playwright browser.

Complete the Naukri login manually.

If Naukri asks for:

* Password
* OTP
* CAPTCHA
* Security verification

complete it manually.

Once you reach the Naukri dashboard, the authenticated browser session will be stored in:

```text
browser-profile/
```

Future runs can reuse this session.

---

# ⚙️ Configuration

The bot can be configured through `.env`.

Typical configuration includes:

```env
# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Job Search
JOB_KEYWORDS=
JOB_LOCATIONS=
EXPERIENCE_LEVELS=

# Application
DRY_RUN=true
MAX_APPLICATIONS_PER_RUN=
MAX_APPLICATIONS_PER_DAY=

# Profile
NOTICE_PERIOD=
EXPECTED_SALARY=
PHONE=
```

Refer to `.env.example` for the available configuration options.

---

# 🧪 Dry-Run Mode

It is strongly recommended to start with:

```env
DRY_RUN=true
```

In dry-run mode, the bot will:

* Search for jobs
* Apply configured filters
* Detect duplicate jobs
* Queue eligible jobs
* Process the application workflow where possible

But it will **not submit the final application**.

Example:

```text
[DRY RUN]

Would apply:
ABC Technologies - MERN Stack Developer

Would apply:
XYZ Technologies - Node.js Developer
```

After verifying that everything works correctly, change:

```env
DRY_RUN=false
```

to enable real applications.

---

# ▶️ Running the Bot

## Manual Full Run

Run the complete workflow immediately:

```bash
npm run run-now
```

This performs:

```text
Search
  ↓
Scrape
  ↓
Filter
  ↓
Deduplicate
  ↓
Queue
  ↓
Apply
```

---

## Process Existing Queue

If jobs already exist in the database and you want to skip the search phase:

```bash
npm run apply-now
```

This directly processes applications currently waiting in the queue.

Useful for jobs with states such as:

```text
QUEUED
FAILED
SKIPPED
```

---

# 📊 Local Dashboard

Start the local dashboard:

```bash
npm run dashboard
```

Then open:

```text
http://localhost:3000
```

The dashboard allows you to:

* View applications
* View application statuses
* See jobs requiring input
* Answer pending questionnaires
* Re-queue failed applications
* Re-queue skipped applications

---

# ⏰ Automatic Scheduler

Start the bot in scheduler mode:

```bash
npm start
```

The scheduler automatically runs:

```text
Monday ──────── 10:30 AM
                1:00 PM

Tuesday ─────── 10:30 AM
                1:00 PM

Wednesday ───── 10:30 AM
                1:00 PM

Thursday ────── 10:30 AM
                1:00 PM

Friday ──────── 10:30 AM
                1:00 PM
```

Timezone:

```text
Asia/Kolkata (IST)
```

The scheduler also:

* Starts the local dashboard
* Processes application queues
* Polls Telegram for user responses
* Resumes applications after receiving answers

---

# 💬 Handling Application Questions

When an application asks a question that cannot be automatically answered, the application moves to:

```text
NEEDS_USER_INPUT
```

The bot does **not** block other applications.

For example:

```text
Job A → APPLIED
Job B → NEEDS_USER_INPUT
Job C → APPLIED
Job D → APPLIED
```

Job B waits until you provide the required information.

---

## Option 1 — Web Dashboard

Start:

```bash
npm run dashboard
```

Open:

```text
http://localhost:3000
```

Navigate to the:

```text
Needs Input
```

section.

You will see the questionnaire and can enter the required answers.

Click:

```text
Submit Answers & Queue
```

The application will then be placed back into the queue.

---

## Option 2 — Telegram

The bot sends a Telegram notification containing:

* Company
* Job title
* Application ID
* Questions requiring answers

Example:

```text
Naukri application needs your input.

Company:
ABC Technologies

Role:
MERN Stack Developer

Application ID:
123

Question:
What is your notice period?
```

Reply using:

```text
/answer <APPLICATION_ID> Value 1 | Value 2
```

Example:

```text
/answer 123 Immediate
```

The bot will:

```text
Receive answer
     ↓
Save answer
     ↓
Update application
     ↓
Queue application
     ↓
Resume application
```

---

# 🤖 Automated Questionnaire Handling

The application worker attempts to automatically handle common questionnaire flows.

It can:

* Use configured profile information
* Fill known answers
* Click common buttons such as `Next` and `Send`
* Handle conversational application steps
* Continue through multi-step questionnaires

If the bot cannot determine a safe answer, it stops that application and requests manual input.

The bot should **never guess an answer to a question when the correct answer is unknown**.

---

# 🔄 Application States

Applications are tracked using explicit states.

```text
DISCOVERED
    ↓
QUEUED
    ↓
APPLYING
    │
    ├──→ APPLIED
    │
    ├──→ NEEDS_USER_INPUT
    │          ↓
    │      User answers
    │          ↓
    │        QUEUED
    │
    ├──→ NEEDS_USER_ACTION
    │
    └──→ FAILED
```

Previously processed jobs are stored in SQLite to prevent accidental duplicate applications.

---

# 🔔 Telegram Notifications

Telegram is used for important events such as:

### User Input Required

```text
Naukri Bot needs your input

Company: ABC Technologies
Role: MERN Stack Developer

Question:
What is your notice period?
```

### Manual Action Required

For example, if Naukri requires manual verification:

```text
Manual action required.

Please open the browser and complete the verification.

Application:
ABC Technologies - MERN Developer
```

### Run Summary

```text
Naukri run completed

Jobs found: 32
Eligible: 21
Applied: 15
Skipped: 5
Waiting for input: 1
Failed: 0
```

---

# 🛡️ Safety & Manual Verification

The bot does **not** attempt to bypass Naukri security mechanisms.

It does not automate or bypass:

* CAPTCHA
* OTP
* Login verification
* Security challenges
* Anti-bot protections

If manual verification is required, the affected application is marked:

```text
NEEDS_USER_ACTION
```

and you are notified.

Other independent applications can continue processing whenever possible.

---

# 🧠 Non-Blocking Application Processing

One of the main design goals of this project is that a single application should never unnecessarily stop the entire queue.

Example:

```text
Application Queue

Job A ──→ APPLYING ──→ APPLIED
                         │
Job B ──→ APPLYING ──→ NEEDS_USER_INPUT
                         │
                         └── waiting...

Job C ──→ APPLYING ──→ APPLIED

Job D ──→ APPLYING ──→ APPLIED
```

When you answer Job B:

```text
User Answer
     ↓
Job B → QUEUED
     ↓
Application resumes
     ↓
Job B → APPLIED
```

---

# 📝 Useful Commands

| Command                           | Description                        |
| --------------------------------- | ---------------------------------- |
| `npm install`                     | Install project dependencies       |
| `npx playwright install chromium` | Install Chromium for Playwright    |
| `npm run init-db`                 | Initialize SQLite database         |
| `npm run login`                   | Open Naukri login                  |
| `npm run run-now`                 | Run complete workflow immediately  |
| `npm run apply-now`               | Process existing application queue |
| `npm run dashboard`               | Start local dashboard              |
| `npm start`                       | Start scheduler/background mode    |

---

# 🗂️ Local Data

The application stores local runtime data in:

```text
data/
└── naukri.db
```

The persistent browser session is stored in:

```text
browser-profile/
```

These directories may contain sensitive information.

**Do not commit them to Git.**

Recommended `.gitignore` entries:

```gitignore
.env
data/
browser-profile/
node_modules/
```

---

# 🐛 Troubleshooting

## Naukri asks me to log in again

Run:

```bash
npm run login
```

Complete the login manually and allow the session to be saved.

---

## Telegram notifications are not working

Check:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Make sure both values are correct.

---

## Applications are not being submitted

First verify:

```env
DRY_RUN=true
```

Run:

```bash
npm run run-now
```

Review the terminal output and application state.

Only switch to:

```env
DRY_RUN=false
```

after verifying the workflow.

---

## A job requires an unknown question

The application should move to:

```text
NEEDS_USER_INPUT
```

Use either:

* Local dashboard
* Telegram `/answer` command

to provide the answer.

---

# 🚧 Current Limitations

Naukri's website and application flows can change over time.

The automation therefore depends on the current Naukri UI and selectors.

If Naukri changes:

* Search pages
* Job cards
* Application forms
* Buttons
* Questionnaire components

some automation functionality may require selector updates.

Naukri-specific browser logic is kept inside the `browser/` and application modules to make such updates easier.

---

# 📌 Development Philosophy

This project intentionally avoids unnecessary infrastructure.

It is designed as a lightweight personal automation tool using:

```text
Node.js
JavaScript
Playwright
SQLite
Telegram
```

There is no requirement for:

* Microservices
* Kubernetes
* Redis
* Cloud infrastructure
* Complex frontend frameworks

The focus is on:

> **Reliable job discovery → filtering → queueing → application → user intervention when necessary.**

---

# 📄 License

Add the project's chosen license here.

---

## ⭐ Project Status

**Personal automation project — actively developed**

The project is intended for personal use and may require maintenance when Naukri changes its website or application workflow.
