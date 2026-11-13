Offline Field Issue Tracker

A full-stack, offline-first application that helps field workers report infrastructure issues and allows coordinators to manage reports.

Published Application:
https://offline-field-issue-trackerzip--hikmaareb.replit.app/

Features

- Create reports with category, description, location, priority, and date/time.
- Save reports locally using IndexedDB.
- Keep reports after refreshing or reopening the browser.
- Automatically synchronize reports when internet connectivity returns.
- Provide a manual Sync Now option.
- Display Pending, Synchronized, and Failed synchronization states.
- Prevent duplicate server records during synchronization retries.
- Manage report statuses through a coordinator workflow.
- View report details and activity history.
- Cache the application interface using a service worker.
- Include automated backend tests.
Offline Field Issue Tracker

A full-stack, offline-first application that helps field workers report infrastructure issues and allows coordinators to manage reports.

Published Application:
https://offline-field-issue-trackerzip--hikmaareb.replit.app/

Features

- Create reports with category, description, location, priority, and date/time.
- Save reports locally using IndexedDB.
- Keep reports after refreshing or reopening the browser.
- Automatically synchronize reports when internet connectivity returns.
- Provide a manual Sync Now option.
- Display Pending, Synchronized, and Failed synchronization states.
- Prevent duplicate server records during synchronization retries.
- Manage report statuses through a coordinator workflow.
- View report details and activity history.
- Cache the application interface using a service worker.
- Include automated backend tests.
Requirements

- Node.js 18 or newer
- npm

Setup

Install dependencies:

npm install

Initialize the database with demo data:

npm run seed

Start the application:

npm start

Open the local URL printed by the server in your browser.

Run automated tests:

npm test

Live Application:

https://offline-field-issue-trackerzip--hikmaareb.replit.app/

Technology Stack

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- SQLite
- IndexedDB
- Service Workers
Project Architecture

- "public/": Frontend interface, IndexedDB storage, service worker, and manifest.
- "server.js": Express REST API, validation, workflow rules, and static hosting.
- "src/database.js": SQLite schema and database connection.
- "tests/": Automated backend tests.

API Endpoints

Method| Endpoint| Purpose
GET| "/api/health"| Health check
GET| "/api/reports"| List reports
GET| "/api/reports/:id"| Read one report with history
POST| "/api/reports"| Create or synchronize a report
PATCH| "/api/reports/:id/status"| Change report status
GET| "/api/reports/:id/history"| Read activity history
Synchronization Strategy

1. The browser creates a unique UUID ("clientId") for each report.
2. The report is saved immediately in IndexedDB.
3. The report is marked Pending until synchronization succeeds.
4. When online, the browser sends the report to the backend API.
5. The server uses a unique client ID to prevent duplicate records.
6. After successful synchronization, the local report is marked Synchronized.
7. If synchronization fails, the local report remains saved and is marked Failed.
8. Users can retry synchronization using Sync Now or when connectivity returns.

The service worker caches the application interface, not API responses.