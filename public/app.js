const DB_NAME = 'field-issue-tracker';
const STORE = 'reports';
let localDb;

function openLocalDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'clientId' });
      store.createIndex('reportedAt', 'reportedAt');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function tx(mode = 'readonly') { return localDb.transaction(STORE, mode).objectStore(STORE); }
function getAllLocal() {
  return new Promise((resolve, reject) => {
    const r = tx().getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
}
function saveLocal(report) {
  return new Promise((resolve, reject) => {
    const r = tx('readwrite').put(report); r.onsuccess = resolve; r.onerror = () => reject(r.error);
  });
}
function deleteLocal(clientId) {
  return new Promise((resolve, reject) => {
    const r = tx('readwrite').delete(clientId); r.onsuccess = resolve; r.onerror = () => reject(r.error);
  });
}
function updateLocal(clientId, changes) {
  return getAllLocal().then(async all => {
    const found = all.find(x => x.clientId === clientId);
    if (found) await saveLocal({ ...found, ...changes });
  });
}
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Server request failed.');
  return data;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function syncLabel(r) { return r.syncState || 'Synchronized'; }
function renderCard(r) {
  const serverId = r.serverId || r.id;
  const sync = syncLabel(r);
  return `<article class="report-card">
    <div><h3>${escapeHtml(r.category)} · ${escapeHtml(r.location)}</h3>
    <p>${escapeHtml(r.description)}</p>
    <div class="meta"><span class="pill">${escapeHtml(r.status)}</span><span class="pill priority-${escapeHtml(r.priority)}">${escapeHtml(r.priority)} priority</span>
    <span class="pill sync-${escapeHtml(sync)}">${escapeHtml(sync)}</span><span class="pill">${new Date(r.reportedAt || r.reported_at).toLocaleString()}</span></div></div>
    <div class="card-actions"><button class="secondary" data-detail="${escapeHtml(r.clientId || `server-${serverId}`)}">Details</button>
    ${serverId ? `<button data-status="${serverId}" data-current="${escapeHtml(r.status)}">Update status</button>` : ''}</div></article>`;
}
async function render() {
  const local = await getAllLocal();
  let server = [];
  try { server = await api('/api/reports'); } catch (_) {}
  const byClient = new Map(server.map(r => [r.client_id, { ...r, clientId: r.client_id, reportedAt: r.reported_at, syncState: 'Synchronized' }]));
  for (const r of local) byClient.set(r.clientId, r.syncState === 'Synchronized' && byClient.has(r.clientId) ? byClient.get(r.clientId) : r);
  const all = [...byClient.values()].sort((a,b) => new Date(b.reportedAt || b.reported_at) - new Date(a.reportedAt || a.reported_at));
  document.getElementById('totalCount').textContent = all.length;
  document.getElementById('pendingCount').textContent = all.filter(r => syncLabel(r) !== 'Synchronized').length;
  const q = document.getElementById('searchInput').value.toLowerCase();
  const status = document.getElementById('statusFilter').value;
  const filtered = all.filter(r => `${r.category} ${r.location} ${r.description}`.toLowerCase().includes(q) && (!status || r.status === status));
  document.getElementById('reportList').innerHTML = filtered.length ? filtered.map(renderCard).join('') : '<p class="empty">No reports match your filters.</p>';
  document.getElementById('reportList').querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => showDetails(b.dataset.detail, all)));
  document.getElementById('reportList').querySelectorAll('[data-status]').forEach(b => b.addEventListener('click', () => changeStatus(b.dataset.status, b.dataset.current)));
  updateConnection();
}
function updateConnection() {
  const el = document.getElementById('connection');
  el.textContent = navigator.onLine ? '● Online' : '● Offline — saved locally';
}
async function syncPending() {
  if (!navigator.onLine) return;
  const local = await getAllLocal();
  for (const r of local.filter(x => x.syncState !== 'Synchronized')) {
    try {
      await updateLocal(r.clientId, { syncState: 'Pending', lastError: '' });
      const result = await api('/api/reports', { method: 'POST', body: JSON.stringify(r) });
      await updateLocal(r.clientId, { syncState: 'Synchronized', serverId: result.report.id, status: result.report.status, lastError: '' });
    } catch (error) {
      await updateLocal(r.clientId, { syncState: 'Failed', lastError: error.message });
    }
  }
  await render();
}
async function showDetails(key, all) {
  const r = all.find(x => x.clientId === key || `server-${x.id}` === key);
  if (!r) return;
  let history = r.history || [];
  const id = r.serverId || r.id;
  if (id) { try { history = await api(`/api/reports/${id}/history`); } catch (_) {} }
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-row"><b>Category</b>${escapeHtml(r.category)}</div>
    <div class="detail-row"><b>Description</b>${escapeHtml(r.description)}</div>
    <div class="detail-row"><b>Location</b>${escapeHtml(r.location)}</div>
    <div class="detail-row"><b>Priority / status</b>${escapeHtml(r.priority)} / ${escapeHtml(r.status)}</div>
    <div class="detail-row"><b>Synchronization</b>${escapeHtml(syncLabel(r))}${r.lastError ? ` — ${escapeHtml(r.lastError)}` : ''}</div>
    <div class="history"><b>Activity history</b><ul>${history.length ? history.map(h => `<li>${escapeHtml(h.action)}: ${escapeHtml(h.details || '')} <small>${new Date(h.created_at).toLocaleString()}</small></li>`).join('') : '<li>No server history yet.</li>'}</ul></div>`;
  document.getElementById('detailDialog').showModal();
}
async function changeStatus(id, current) {
  const options = { Draft:['Submitted','Rejected'], Submitted:['Assigned','Rejected'], Assigned:['In Progress','Rejected'], 'In Progress':['Resolved','Rejected'], Resolved:['In Progress'], Rejected:[] };
  const allowed = options[current] || [];
  if (!allowed.length) return alert('No status changes are allowed from this status.');
  const choice = prompt(`Current status: ${current}\nAllowed next status: ${allowed.join(', ')}\nType the exact new status:`);
  if (!choice) return;
  if (!allowed.includes(choice)) return alert('That transition is not allowed.');
  try { await api(`/api/reports/${id}/status`, { method:'PATCH', body:JSON.stringify({ status:choice, actor:'Coordinator' }) }); await render(); }
  catch (e) { alert(e.message); }
}
document.getElementById('reportForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const report = {
    clientId: crypto.randomUUID(),
    category: form.get('category'),
    description: form.get('description').trim(),
    location: form.get('location').trim(),
    priority: form.get('priority'),
    status: 'Submitted',
    reportedAt: new Date().toISOString(),
    syncState: 'Pending'
  };
  await saveLocal(report);
  e.currentTarget.reset();
  document.getElementById('formMessage').textContent = 'Saved on this device. Synchronization will happen when online.';
  await render();
  syncPending();
});
document.getElementById('syncButton').addEventListener('click', syncPending);
document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('statusFilter').addEventListener('change', render);
document.getElementById('closeDialog').addEventListener('click', () => document.getElementById('detailDialog').close());
window.addEventListener('online', () => { updateConnection(); syncPending(); });
window.addEventListener('offline', updateConnection);
(async function init() {
  localDb = await openLocalDb();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(console.error);
  await render();
  if (navigator.onLine) syncPending();
})();
