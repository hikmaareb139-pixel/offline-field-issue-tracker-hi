# Assumptions and Design Decisions

1. A field report needs a category, description, location, priority and report timestamp.
2. A generated UUID is the idempotency key. The API's unique constraint protects against duplicate submissions caused by retries.
3. Offline-first means the report is saved to IndexedDB before any network request.
4. A failed network request never deletes the local record.
5. The service worker caches static app resources only; API data is fetched from the server when connected.
6. The server owns status transitions and status history.
7. Allowed transitions are Draft→Submitted/Rejected; Submitted→Assigned/Rejected; Assigned→In Progress/Rejected; In Progress→Resolved/Rejected; Resolved→In Progress. Rejected is terminal.
8. Submitted report content is immutable in this first version. A correction is a new report.
9. Conflicts in status are prevented by accepting only valid transitions from the current server status. Last-write-wins editing is avoided because editing is not implemented.
10. The prototype simulates a coordinator role and does not implement authentication.
11. A report timestamp is captured on the client at creation. The server records its own creation/update timestamps separately.
12. A user must keep browser site data to retain offline reports. A future version should add encrypted export/backup.
