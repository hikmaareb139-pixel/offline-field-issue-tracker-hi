# Project Defense – Quick Preparation

## 60-second introduction
“My project is an Offline Field Issue Tracker. It helps field workers report infrastructure problems even when internet access is unavailable. The browser saves each report in IndexedDB first. When connectivity returns, the app sends pending reports to an Express API. The backend stores them in SQLite and uses a unique client ID to prevent duplicate records during retries. Coordinators can move reports through a controlled status workflow, and important server-side actions are stored in activity history.”

## Architecture
- Frontend: HTML, CSS and JavaScript.
- Offline local storage: IndexedDB.
- Offline application shell: service worker cache.
- Backend: Node.js and Express REST API.
- Persistent server database: SQLite.

## Likely questions and answers
**Why IndexedDB?** It is a browser database designed for structured data and can persist records beyond a page refresh. It works without network access.

**Why save locally first?** It prevents a weak connection from blocking field workers from recording an issue.

**How do you prevent duplicates?** Each report receives a stable UUID. The backend enforces a UNIQUE constraint on that client ID. Retrying the same request returns the existing report.

**What happens if synchronization fails?** The client keeps the record, marks it Failed and stores an error message. The user can retry manually or when the browser reports that it is online.

**Why validate on both frontend and backend?** Frontend validation improves usability, but clients can be bypassed. Backend validation protects stored data.

**Why does the server control status transitions?** The server is the authoritative shared record. It prevents clients from skipping workflow steps.

**What is the role of the service worker?** It caches the app shell so the interface can open offline. IndexedDB stores report data; these are separate responsibilities.

**What are the limitations?** Authentication, real role permissions, offline status changes, attachment uploads, advanced conflict resolution and production deployment are outside this prototype.

## Demonstration order
1. Open the app and create a report online.
2. Refresh and show that the report remains.
3. Switch the browser to offline mode and create another report.
4. Refresh while offline and show that it is still present with Pending state.
5. Restore network access and use Sync now.
6. Open report details and show history.
7. Update a server report status and show the workflow.
8. Explain the tests and README decisions.

## Important
Run `npm test` and complete the manual QA checklist before claiming the project works. Be ready to explain every file you submit.
