
const DB_NAME = 'field-issue-tracker';
const STORE = 'reports';
let localDb;

function openLocalDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: 'clientId'
        });
        store.createIndex('reportedAt', 'reportedAt');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database is blocked.'));
  });
}

function tx(mode = 'readonly') {
  if (!localDb) throw new Error('Database is not ready.');
  return localDb.transaction(STORE, mode).objectStore(STORE);
}

function getAllLocal() {
  return new Promise((resolve, reject) => {
    try {
      const request = tx().getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

function saveLocal(report) {
  return new Promise((resolve, reject) => {
    try {
      const request = tx('readwrite').put(report);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

async function updateLocal(clientId, changes) {
  const reports = await getAllLocal();
  const report = reports.find(item => item.clientId === clientId);
  if (report) {
    await saveLocal({ ...report, ...changes });
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Server request failed.');
  }

  return data;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function syncLabel(report) {
  return report.syncState || 'Synchronized';
}

function renderCard(report) {
  const serverId = report.serverId || report.id;
  const sync = syncLabel(report);

  return `<article class="report-card">
    <div>
      <h3>${escapeHtml(report.category)} · ${escapeHtml(report.location)}</h3>
      <p>${escapeHtml(report.description)}</p>
      <div class="meta">
        <span class="pill">${escapeHtml(report.status)}</span>
        <span class="pill priority-${escapeHtml(report.priority)}">${escapeHtml(report.priority)} priority</span>
        <span class="pill sync-${escapeHtml(sync)}">${escapeHtml(sync)}</span>
        <span class="pill">${new Date(report.reportedAt || report.reported_at).toLocaleString()}</span>
      </div>
    </div>
    <div class="card-actions">
      <button class="secondary" data-detail="${escapeHtml(report.clientId || `server-${serverId}`)}">Details</button>
      ${serverId ? `<button data-status="${serverId}" data-current="${escapeHtml(report.status)}">Update status</button>` : ''}
    </div>
  </article>`;
}

async function render() {
  const local = await getAllLocal();
  let server = [];

  try {
    server = await api('/api/reports');
  } catch (error) {
    console.log('Server unavailable; showing local reports.');
  }

  const byClient = new Map(
    server.map(report => [
      report.client_id,
      {
        ...report,
        clientId: report.client_id,
        reportedAt: report.reported_at,
        syncState: 'Synchronized'
      }
    ])
  );

  for (const report of local) {
    byClient.set(
      report.clientId,
      report.syncState === 'Synchronized' && byClient.has(report.clientId)
        ? byClient.get(report.clientId)
        : report
    );
  }

  const all = [...byClient.values()].sort(
    (a, b) => new Date(b.reportedAt || b.reported_at) -
              new Date(a.reportedAt || a.reported_at)
  );

  document.getElementById('totalCount').textContent = all.length;
  document.getElementById('pendingCount').textContent =
    all.filter(report => syncLabel(report) !== 'Synchronized').length;

  const query = document.getElementById('searchInput').value.toLowerCase();
  const status = document.getElementById('statusFilter').value;

  const filtered = all.filter(report =>
    `${report.category} ${report.location} ${report.description}`
      .toLowerCase().includes(query) &&
    (!status || report.status === status)
  );

  const list = document.getElementById('reportList');

  list.innerHTML = filtered.length
    ? filtered.map(renderCard).join('')
    : '<p class="empty">No reports match your filters.</p>';

  list.querySelectorAll('[data-detail]').forEach(button => {
    button.addEventListener('click', () =>
      showDetails(button.dataset.detail, all)
    );
  });

  list.querySelectorAll('[data-status]').forEach(button => {
    button.addEventListener('click', () =>
      changeStatus(button.dataset.status, button.dataset.current)
    );
  });

  updateConnection();
}

function updateConnection() {
  const element = document.getElementById('connection');
  element.textContent = navigator.onLine
    ? '● Online'
    : '● Offline — saved locally';
}

async function syncPending() {
  if (!navigator.onLine) return;

  try {
    const reports = await getAllLocal();

    for (const report of reports.filter(
      item => item.syncState !== 'Synchronized'
    )) {
      try {
        await updateLocal(report.clientId, {
          syncState: 'Pending',
          lastError: ''
        });

        const result = await api('/api/reports', {
          method: 'POST',
          body: JSON.stringify(report)
        });

        await updateLocal(report.clientId, {
          syncState: 'Synchronized',
          serverId: result.report.id,
          status: result.report.status,
          lastError: ''
        });
      } catch (error) {
        await updateLocal(report.clientId, {
          syncState: 'Failed',
          lastError: error.message
        });
      }
    }

    await render();
  } catch (error) {
    console.error('Synchronization error:', error);
  }
}

async function showDetails(key, all) {
  const report = all.find(item =>
    item.clientId === key || `server-${item.id}` === key
  );

  if (!report) return;

  let history = report.history || [];
  const id = report.serverId || report.id;

  if (id) {
    try {
      history = await api(`/api/reports/${id}/history`);
    } catch (error) {
      console.log('Could not load server history.');
    }
  }

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-row"><b>Category</b>${escapeHtml(report.category)}</div>
    <div class="detail-row"><b>Description</b>${escapeHtml(report.description)}</div>
    <div class="detail-row"><b>Location</b>${escapeHtml(report.location)}</div>
    <div class="detail-row"><b>Priority / status</b>${escapeHtml(report.priority)} / ${escapeHtml(report.status)}</div>
    <div class="detail-row"><b>Synchronization</b>${escapeHtml(syncLabel(report))}${report.lastError ? ` — ${escapeHtml(report.lastError)}` : ''}</div>
    <div class="history">
      <b>Activity history</b>
      <ul>
        ${history.length
          ? history.map(item => `<li>${escapeHtml(item.action)}: ${escapeHtml(item.details || '')} <small>${new Date(item.created_at).toLocaleString()}</small></li>`).join('')
          : '<li>No server history yet.</li>'}
      </ul>
    </div>
  `;

  document.getElementById('detailDialog').showModal();
}

async function changeStatus(id, current) {
  const options = {
    Draft: ['Submitted', 'Rejected'],
    Submitted: ['Assigned', 'Rejected'],
    Assigned: ['In Progress', 'Rejected'],
    'In Progress': ['Resolved', 'Rejected'],
    Resolved: ['In Progress'],
    Rejected: []
  };

  const allowed = options[current] || [];

  if (!allowed.length) {
    alert('No status changes are allowed from this status.');
    return;
  }

  const choice = prompt(
    `Current status: ${current}\nAllowed next status: ${allowed.join(', ')}\nType the exact new status:`
  );

  if (!choice) return;

  if (!allowed.includes(choice)) {
    alert('That transition is not allowed.');
    return;
  }

  try {
    await api(`/api/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: choice,
        actor: 'Coordinator'
      })
    });

    await render();
  } catch (error) {
    alert(error.message);
  }
}

// Save a new report
document.getElementById('reportForm').addEventListener('submit', async event => {
  event.preventDefault();

  const formElement = event.currentTarget;
  const message = document.getElementById('formMessage');
  message.textContent = 'Saving report...';

  try {
    const form = new FormData(formElement);

    const clientId = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);

    const report = {
      clientId,
      category: form.get('category'),
      description: form.get('description').trim(),
      location: form.get('location').trim(),
      priority: form.get('priority'),
      status: 'Submitted',
      reportedAt: new Date().toISOString(),
      syncState: 'Pending'
    };

    await saveLocal(report);

    message.textContent =
      'Saved on this device. Synchronization will happen when online.';

    formElement.reset();

    await render();

    if (navigator.onLine) {
      await syncPending();
    }
  } catch (error) {
    console.error('Report save error:', error);
    message.textContent = 'Save failed: ' + error.message;
  }
});

// Manual synchronization
document.getElementById('syncButton').addEventListener('click', syncPending);

document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('statusFilter').addEventListener('change', render);

document.getElementById('closeDialog').addEventListener('click', () => {
  document.getElementById('detailDialog').close();
});

// Synchronize when internet returns
window.addEventListener('online', () => {
  updateConnection();
  syncPending();
});

window.addEventListener('offline', updateConnection);

// Start application
(async function init() {
  try {
    localDb = await openLocalDb();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(error => {
        console.error('Service worker registration failed:', error);
      });
    }

    await render();

    if (navigator.onLine) {
      await syncPending();
    }
  } catch (error) {
    console.error('Application startup error:', error);

    const message = document.getElementById('formMessage');

    if (message) {
      message.textContent = 'Application error: ' + error.message;
    }
  }
})();
