const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const testDatabaseDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'field-issues-api-test-')
);
process.env.FIELD_ISSUES_DB = path.join(testDatabaseDirectory, 'test.db');
const { app, ALLOWED, validateReport } = require('../server');
const { db, initializeDatabase } = require('../src/database');

initializeDatabase();
test.after(() => {
  db.close();
  fs.rmSync(testDatabaseDirectory, { recursive: true, force: true });
});

test('status workflow defines valid transitions', () => {
  assert.deepEqual(ALLOWED.Draft, ['Submitted', 'Rejected']);
  assert.deepEqual(ALLOWED.Resolved, ['In Progress']);
  assert.deepEqual(ALLOWED.Rejected, []);
});
test('report validation rejects missing or malformed fields', () => {
  assert.ok(validateReport({}).length >= 5);
  assert.equal(validateReport({
    category:'Water Point', description:'A broken tap', location:'Kebele 1',
    priority:'High', reportedAt:new Date().toISOString()
  }).length, 0);
});
test('API creates a report and prevents duplicate sync records', async () => {
  const clientId = `test-${Date.now()}`;
  const payload = { clientId, category:'Equipment', description:'Pump motor is not working.',
    location:'Test village', priority:'High', reportedAt:new Date().toISOString() };
  const first = await request(app).post('/api/reports').send(payload);
  assert.equal(first.status, 201);
  const second = await request(app).post('/api/reports').send(payload);
  assert.equal(second.status, 200);
  assert.equal(second.body.duplicate, true);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM reports WHERE client_id = ?').get(clientId).n, 1);
  db.prepare('DELETE FROM activity WHERE report_id = ?').run(first.body.report.id);
  db.prepare('DELETE FROM reports WHERE id = ?').run(first.body.report.id);
});
test('API rejects an invalid status transition', async () => {
  const clientId = `transition-${Date.now()}`;
  const created = await request(app).post('/api/reports').send({
    clientId, category:'Water Point', description:'Tap needs repair soon.',
    location:'Test location', priority:'Medium', reportedAt:new Date().toISOString()
  });
  assert.equal(created.status, 201);
  const id = created.body.report.id;
  const result = await request(app).patch(`/api/reports/${id}/status`).send({ status:'Resolved' });
  assert.equal(result.status, 409);
  db.prepare('DELETE FROM activity WHERE report_id = ?').run(id);
  db.prepare('DELETE FROM reports WHERE id = ?').run(id);
});
