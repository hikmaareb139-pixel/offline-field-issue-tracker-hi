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