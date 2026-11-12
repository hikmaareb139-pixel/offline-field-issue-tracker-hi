# Offline Field Issue Tracker

## Running on Replit
- The project retains its original Express server, static browser interface, and SQLite database.
- Use the **Run** button to start the `Start application` workflow, which runs `PORT=5000 npm start`. Open Preview to use the app.
- Node.js 22 is configured for compatibility with the existing `better-sqlite3` dependency.
- Dependencies are tracked in `package.json` and `package-lock.json`; use `npm ci` for a clean install.
- No secrets or external services are required by this prototype.

## Data
- SQLite initializes automatically at startup in `field-issues.db`. Database files are excluded from Git.
- The app starts with an empty report list. Optionally run `npm run seed` to add the three sample reports supplied with the project, only when the database is empty.
- The browser stores unsynchronized reports in IndexedDB and caches the interface with a service worker. Clearing site storage removes local reports.
- Authentication and real coordinator permissions are not implemented. Do not expose sensitive reports through a public deployment without adding access controls.
- This setup is for workspace use; durable database storage and backups must be addressed before production use.

## Verification
- Run `npm test` for the existing backend tests covering validation, status transitions, and duplicate synchronization.
- Health check: `GET /api/health`.
- The tests briefly create and then remove their own records in the same SQLite database.
- Offline browser behavior has a manual QA checklist in `README.md`.
