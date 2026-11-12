const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, db } = require('./src/database');

initializeDatabase();
const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const CATEGORIES = ['Water Point', 'Equipment', 'Service Interruption', 'Safety Concern', 'Maintenance'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Draft', 'Submitted', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
const ALLOWED = {
  Draft: ['Submitted', 'Rejected'],
  Submitted: ['Assigned', 'Rejected'],
  Assigned: ['In Progress', 'Rejected'],
  'In Progress': ['Resolved', 'Rejected'],
  Resolved: ['In Progress'],
  Rejected: []
};

function validateReport(body) {
  const errors = [];
  if (!CATEGORIES.includes(body.category)) errors.push('A valid category is required.');
  if (typeof body.description !== 'string' || body.description.trim().length < 5 || body.description.trim().length > 2000)
    errors.push('Description must contain 5–2000 characters.');
  if (typeof body.location !== 'string' || body.location.trim().length < 2 || body.location.trim().length > 200)
    errors.push('Location must contain 2–200 characters.');
  if (!PRIORITIES.includes(body.priority)) errors.push('A valid priority is required.');
  if (!body.reportedAt || Number.isNaN(Date.parse(body.reportedAt))) errors.push('A valid reported date/time is required.');
  return errors;
}

function recordActivity(reportId, action, details = '') {
  db.prepare('INSERT INTO activity (report_id, action, details, created_at) VALUES (?, ?, ?, ?)')
    .run(reportId, action, details, new Date().toISOString());
}

function fullReport(id) {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  if (!report) return null;
  report.history = db.prepare('SELECT action, details, created_at FROM activity WHERE report_id = ? ORDER BY id ASC').all(id);
  return report;
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/reports', (req, res) => {
  const reports = db.prepare('SELECT * FROM reports ORDER BY reported_at DESC').all();
  res.json(reports.map(r => fullReport(r.id)));
});

app.get('/api/reports/:id', (req, res) => {
  const report = fullReport(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  res.json(report);
});

app.post('/api/reports', (req, res) => {
  const errors = validateReport(req.body);
  if (errors.length) return res.status(400).json({ error: 'Validation failed.', details: errors });

  const clientId = String(req.body.clientId || '').trim();
  if (!clientId || clientId.length > 100) return res.status(400).json({ error: 'A valid clientId is required for safe synchronization.' });

  const existing = db.prepare('SELECT id FROM reports WHERE client_id = ?').get(clientId);
  if (existing) return res.status(200).json({ report: fullReport(existing.id), duplicate: true });

  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO reports (client_id, category, description, location, priority, status, reported_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'Submitted', ?, ?, ?)
  `).run(clientId, req.body.category, req.body.description.trim(), req.body.location.trim(),
    req.body.priority, new Date(req.body.reportedAt).toISOString(), now, now);

  recordActivity(result.lastInsertRowid, 'Report synchronized', 'Created on the server from an offline-capable client.');
  res.status(201).json({ report: fullReport(result.lastInsertRowid), duplicate: false });
});

app.patch('/api/reports/:id/status', (req, res) => {
  const { status, actor } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const current = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Report not found.' });
  if (!ALLOWED[current.status].includes(status)) {
    return res.status(409).json({ error: `Invalid transition: ${current.status} → ${status}.`, allowed: ALLOWED[current.status] });
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE reports SET status = ?, updated_at = ? WHERE id = ?').run(status, now, current.id);
  recordActivity(current.id, 'Status changed', `${current.status} → ${status}${actor ? ` by ${String(actor).slice(0, 80)}` : ''}`);
  res.json(fullReport(current.id));
});

app.get('/api/reports/:id/history', (req, res) => {
  if (!db.prepare('SELECT id FROM reports WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Report not found.' });
  res.json(db.prepare('SELECT action, details, created_at FROM activity WHERE report_id = ? ORDER BY id ASC').all(req.params.id));
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Offline Field Issue Tracker running at http://localhost:${port}`));
}
module.exports = { app, ALLOWED, validateReport };
