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
Status Workflow and Assumptions

- Draft → Submitted → Assigned → In Progress → Resolved.
- Rejected is allowed from Draft, Submitted, Assigned, and In Progress.
- Resolved → In Progress is allowed to reopen a resolved issue.
- Rejected is terminal in this prototype.
- The server is authoritative for status changes.
- Offline status editing is not implemented.
- Report content is treated as immutable after submission.
- Duplicate detection uses a unique client-generated UUID.

Data Safety and Error Handling

- Required fields are validated in the browser and API.
- User-provided text is HTML-escaped before rendering.
- Invalid workflow transitions are rejected.
- Failed synchronization does not delete local reports.
- SQLite uses WAL mode for improved reliability under normal single-server use.
- Authentication, authorization, and advanced multi-user conflict resolution are not implemented.

Testing Priorities

Testing focuses on:

- Field validation.
- Allowed workflow transitions.
- Duplicate prevention.
- Invalid status-change rejection.
- API behavior.

Offline browser behavior also requires manual testing.

Manual QA Checklist

- [ ] Create a report while online.
- [ ] Refresh and confirm the report remains visible.
- [ ] Create a report while offline.
- [ ] Refresh while offline and confirm the report remains saved.
- [ ] Restore internet connectivity.
- [ ] Confirm pending reports synchronize.
- [ ] Retry synchronization and check for duplicates.
- [ ] Confirm failed synchronization preserves local data.
- [ ] Test status updates and activity history.
- [ ] Check the mobile layout.

Known Limitations

1. No authentication or real user roles.
2. Advanced data conflict resolution is not implemented.
3. File and image attachments are not supported.
4. Some features require an internet connection.
5. Further security and performance testing is needed.

AI and Development Tools

AI Tool: ChatGPT

Development Tools: Replit, Git, and GitHub.

How AI Was Used: ChatGPT assisted code generation, debugging, explaining technical concepts, and preparing documentation.

Code Verification: I reviewed the generated code, ran the application, and tested important features, including offline report creation, local storage, synchronization, status updates, and activity history.

Responsibility: I planned, reviewed, and tested the implementation and remain responsible for understanding and explaining the submitted project.

Git Workflow

The project was managed using Replit, Git, and GitHub. The source code was organized into separate folders for the frontend, backend, database, and tests. Changes were developed and tested during implementation and uploaded to a dedicated GitHub repository. The repository includes the application source code, documentation, dependency configuration, and instructions for running the project.

Approximate Effort and Future Improvements

Approximately 12–15 hours, including planning, development, testing, debugging, documentation, and GitHub setup.