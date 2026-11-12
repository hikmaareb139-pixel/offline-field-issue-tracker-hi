const { db, initializeDatabase } = require('./src/database');
initializeDatabase();
const count = db.prepare('SELECT COUNT(*) AS n FROM reports').get().n;
if (count === 0) {
  const now = new Date().toISOString();
  const insert = db.prepare(`INSERT INTO reports (client_id, category, description, location, priority, status, reported_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const samples = [
    ['demo-water-001', 'Water Point', 'Community water tap is leaking and needs inspection.', 'Kebele 04, near the health post', 'High', 'Submitted'],
    ['demo-equipment-002', 'Equipment', 'Solar pump controller is not responding.', 'North water station', 'Critical', 'In Progress'],
    ['demo-service-003', 'Service Interruption', 'Water service has been interrupted since morning.', 'Market area', 'Medium', 'Resolved']
  ];
  for (const s of samples) {
    const r = insert.run(...s.slice(0, 1), ...s.slice(1, 6), now, now, now);
    db.prepare('INSERT INTO activity (report_id, action, details, created_at) VALUES (?, ?, ?, ?)')
      .run(r.lastInsertRowid, 'Demo report created', 'Seed data for demonstration.', now);
  }
  console.log('Demo reports added.');
} else console.log('Database already contains reports; seed skipped.');
