# Offline Field Issue Tracker

A small full-stack, offline-first application for field workers to report infrastructure issues and for coordinators to manage report status.

## Features
- Create reports with category, description, location, priority and reported date/time.
- Save reports in browser IndexedDB before attempting network synchronization.
- Keep local reports after refresh/reopening the browser.
- Automatically attempt synchronization when connectivity returns; also provide a manual Sync now action.
- Show Pending, Synchronized and Failed synchronization states.
- Use a stable client-generated ID so retries do not create duplicate server records.
- Coordinator status workflow with server-side transition validation.
- Report detail view and server-side activity history.
- Cached application shell through a service worker.
- Automated backend tests.

## Requirements
- Node.js 18 or newer
- npm

## Setup
```bash
npm install
npm run seed
npm start
```
Open https://d0e10a43-efda-4c42-a85e-546835e3cef5-00-2is2mjhvac3cf.worf.replit.dev/ in a browser. To run tests:
```bash
npm test
```

## Architecture
- `public/`: browser interface, IndexedDB persistence, service worker and manifest.
- `server.js`: Express REST API, validation, workflow rules and static hosting.
- `src/database.js`: SQLite schema and database connection.
- `tests/`: automated tests for validation, workflow, duplicate protection and API behavior.

## API
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/reports` | List reports |
| GET | `/api/reports/:id` | Read one report with history |
| POST | `/api/reports` | Synchronize/create report |
| PATCH | `/api/reports/:id/status` | Change report status |
| GET | `/api/reports/:id/history` | Read activity history |

## Synchronization strategy
1. The browser creates a UUID (`clientId`) and writes the report to IndexedDB immediately.
2. The report is marked Pending. If online, the client sends it to `POST /api/reports`.
3. The server enforces a unique constraint on `client_id`. Repeated requests with the same ID return the existing record rather than inserting another.
4. On success, the client marks the local item Synchronized and records the server ID.
5. On failure, it marks the item Failed and retains the error message and local data. The user can retry with Sync now; the browser also retries on the `online` event.
6. The service worker caches the application shell, not API responses. This keeps the UI available offline while avoiding stale server data.

## Status workflow and assumptions
- Draft → Submitted → Assigned → In Progress → Resolved.
- Rejected is permitted from Draft, Submitted, Assigned and In Progress.
- Resolved → In Progress is allowed to represent reopening a resolved issue.
- Rejected is terminal in this prototype.
- A report is considered submitted when it is synchronized to the server. The offline record uses Submitted as its intended workflow status while its sync state remains Pending.
- The server is authoritative for status changes. Offline status editing is not implemented.
- After submission, report content is treated as immutable in this prototype; a correction should be submitted as a new report or handled by a future coordinator edit feature.
- Duplicate detection uses a stable client-generated UUID, not fuzzy matching of descriptions. Two different reports about the same issue may be legitimate.

## Data safety and error handling
- Required fields are validated in the browser and again by the API.
- User-provided text is HTML-escaped before rendering.
- The server limits JSON request size and rejects invalid workflow transitions.
- Failed synchronization does not delete the local record.
- SQLite uses WAL mode for improved reliability under normal single-server use.
- Authentication, authorization and multi-user conflict resolution are not implemented; roles are simulated by the coordinator status action.

## Testing priorities
The tests focus on high-risk behavior: field validation, allowed workflow transitions, duplicate prevention on retries, and rejection of invalid status changes. The browser offline behavior should also be manually tested because it depends on browser IndexedDB, service-worker lifecycle and network conditions.

## Manual QA checklist
- [ ] Create a report while online and confirm it appears on the list.
- [ ] Refresh the page and confirm reports remain visible.
- [ ] Turn off network access, create a report, refresh, and confirm it remains.
- [ ] Restore network access and confirm it becomes Synchronized.
- [ ] Use Sync now and confirm retry does not create duplicates.
- [ ] Simulate a server failure and confirm local data remains with Failed state.
- [ ] Try an invalid status transition through the API and confirm it is rejected.
- [ ] Confirm activity history records server creation and status changes.
- [ ] Test narrow/mobile screen layout.

## Known limitations
- No authentication or real role-based permissions.
- No offline coordinator status changes.
- No conflict-resolution UI for editing the same report on multiple devices.
- No file/photo attachments, maps, push notifications or deployment configuration.
- Local browser data can be lost if the user clears site storage; export/backup is a future improvement.
- SQLite is suitable for a small demonstration, not a high-concurrency production deployment.

## AI and development-tool disclosure
AI assistance was used to draft the initial project structure, code, tests and documentation. The project owner must review the code, run the test suite and manual QA checklist, understand the implementation, and disclose any changes made before submission. Do not claim tests passed until `npm test` has been run successfully in the target environment.

## Git workflow 

The project was managed using reptile  Git and GitHub. The source code was organized into separate folders for the frontend, backend, database, and tests. Changes were developed and tested incrementally, then uploaded to a dedicated GitHub repository. The repository includes the application source code, documentation, dependencies configuration, and instructions for running the project.

## Approximate effort and future improvements

Approximately 10–12 hours, including planning, development, testing, debugging, documentation, and GitHub setup.
