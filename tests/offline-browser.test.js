const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright-core');

const testDatabaseDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'field-issues-browser-test-')
);
process.env.FIELD_ISSUES_DB = path.join(testDatabaseDirectory, 'test.db');
const { app } = require('../server');
const { db } = require('../src/database');

function findChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/repl/tools/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome'
  ].filter(Boolean);

  return candidates.find(candidate => fs.existsSync(candidate));
}

test('offline reports save locally, survive refresh, and sync after reconnect', {
  timeout: 60000
}, async t => {
  let browser;
  let context;
  let server;

  t.after(async () => {
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    if (server?.listening) {
      await new Promise(resolve => server.close(resolve));
    }
    db.close();
    fs.rmSync(testDatabaseDirectory, { recursive: true, force: true });
  });

  const executablePath = findChromium();
  assert.ok(
    executablePath,
    'Chromium is required; set CHROMIUM_PATH to its executable'
  );

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox']
  });
  context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => Boolean(navigator.serviceWorker?.controller),
    undefined,
    { timeout: 10000 }
  );

  const uniqueDescription = `Offline regression ${Date.now()}`;
  await context.setOffline(true);
  await page.waitForFunction(
    () => document.getElementById('connection').textContent.includes('Offline')
  );

  await page.locator('[name="category"]').selectOption({ label: 'Water Point' });
  await page.locator('[name="priority"]').selectOption({ label: 'High' });
  await page.locator('[name="location"]').fill('Test-only field site');
  await page.locator('[name="description"]').fill(uniqueDescription);
  await page.getByRole('button', { name: 'Save report' }).click();

  await page.waitForFunction(description => {
    const formMessage = document.getElementById('formMessage').textContent;
    const reportList = document.getElementById('reportList').textContent;
    return formMessage !== 'Saving report...' &&
      reportList.includes(description);
  }, uniqueDescription);

  const savedMessage = await page.locator('#formMessage').textContent();
  assert.match(savedMessage, /Saved on this device/);
  assert.doesNotMatch(savedMessage, /^Save failed:/);

  const locallySavedReports = await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('field-issue-tracker', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const read = database.transaction('reports').objectStore('reports').getAll();
      read.onerror = () => reject(read.error);
      read.onsuccess = () => {
        database.close();
        resolve(read.result);
      };
    };
  }));
  const localReport = locallySavedReports.find(
    report => report.description === uniqueDescription
  );
  assert.ok(localReport, 'the submitted report should be persisted in IndexedDB');
  assert.equal(localReport.syncState, 'Pending');
  assert.equal(
    db.prepare('SELECT COUNT(*) AS count FROM reports').get().count,
    0,
    'offline submission must not write to the test server database'
  );

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export unsynced reports' }).click()
  ]);
  const backupPath = await download.path();
  assert.ok(backupPath, 'the backup should be downloaded');
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  assert.equal(backup.format, 'field-issue-tracker-backup');
  assert.equal(backup.version, 1);
  assert.equal(backup.reports.length, 1);

  backup.reports[0].status = 'Rejected';
  backup.reports[0].syncState = 'Synchronized';
  backup.reports[0].serverId = 999;
  backup.reports[0].history = [{ action: 'untrusted imported history' }];
  backup.reports.push({
    ...backup.reports[0],
    clientId: '',
    category: 'Not a supported category'
  });
  const craftedBackupPath = path.join(testDatabaseDirectory, 'crafted-backup.json');
  fs.writeFileSync(craftedBackupPath, JSON.stringify(backup));

  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('field-issue-tracker', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('reports', 'readwrite');
      transaction.objectStore('reports').clear();
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
  }));

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Report a field issue.' }).waitFor();
  await page.getByRole('button', { name: 'Restore reports' }).waitFor();
  assert.doesNotMatch(
    await page.locator('#reportList').textContent(),
    new RegExp(uniqueDescription)
  );
  assert.match(await page.locator('#connection').textContent(), /Offline/);

  await page.locator('#backupFile').setInputFiles(craftedBackupPath);
  await page.getByRole('button', { name: 'Restore reports' }).click();
  await page.getByText(uniqueDescription, { exact: true }).waitFor();
  await page.waitForFunction(() =>
    document.getElementById('backupMessage').textContent.includes('Restored 1 report')
  );

  const restoredLocalReport = await page.evaluate(clientId => new Promise((resolve, reject) => {
    const request = indexedDB.open('field-issue-tracker', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const read = database.transaction('reports').objectStore('reports').get(clientId);
      read.onerror = () => reject(read.error);
      read.onsuccess = () => {
        database.close();
        resolve(read.result);
      };
    };
  }), localReport.clientId);
  assert.equal(restoredLocalReport.syncState, 'Pending');
  assert.equal(restoredLocalReport.status, 'Submitted');
  assert.equal(restoredLocalReport.serverId, undefined);
  assert.equal(restoredLocalReport.history, undefined);
  assert.match(await page.locator('#backupMessage').textContent(), /Skipped 1 invalid report/);

  await context.setOffline(false);
  await page.waitForFunction(
    () => Boolean(document.querySelector('.sync-Synchronized')),
    { timeout: 15000 }
  );
  await page.waitForFunction(
    () => document.getElementById('pendingCount').textContent === '0'
  );

  const synchronizedReport = db.prepare(
    'SELECT client_id FROM reports WHERE client_id = ?'
  ).get(localReport.clientId);
  assert.ok(synchronizedReport, 'the pending report should reach the server after reconnect');

  const finalLocalReport = await page.evaluate(clientId => new Promise((resolve, reject) => {
    const request = indexedDB.open('field-issue-tracker', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const read = database.transaction('reports').objectStore('reports').get(clientId);
      read.onerror = () => reject(read.error);
      read.onsuccess = () => {
        database.close();
        resolve(read.result);
      };
    };
  }), localReport.clientId);
  assert.equal(finalLocalReport.syncState, 'Synchronized');
});
