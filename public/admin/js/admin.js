// === Admin.js — Admin Dashboard Logic ===

let currentAppId = null;
let verifyAction = null;

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ===== Auth =====
async function checkAuth() {
  try {
    const response = await fetch('/api/admin/check');
    const result = await response.json();

    if (result.success) {
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('dashboardScreen').classList.remove('hidden');
      document.getElementById('adminName').textContent = result.data.full_name;
      loadDashboard();
    }
  } catch (e) {
    // Not logged in — show login screen
  }
}

async function login(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');

  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (result.success) {
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('dashboardScreen').classList.remove('hidden');
      document.getElementById('adminName').textContent = result.data.full_name;
      showToast('Welcome back, ' + result.data.full_name);
      loadDashboard();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Login failed. Please try again.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '🔐 Sign In';
}

async function logout() {
  await fetch('/api/admin/logout', { method: 'POST' });
  document.getElementById('dashboardScreen').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  showToast('Logged out successfully');
}

// ===== Dashboard =====
async function loadDashboard() {
  loadStats();
  loadApplications();
}

async function loadStats() {
  try {
    const response = await fetch('/api/admin/stats');
    const result = await response.json();

    if (result.success) {
      const s = result.data;
      animateCounter('statTotal', s.total);
      animateCounter('statPending', s.pending);
      animateCounter('statApproved', s.approved);
      animateCounter('statRejected', s.rejected);
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

function animateCounter(elementId, target) {
  const el = document.getElementById(elementId);
  const duration = 600;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

async function loadApplications(status = 'all', search = '') {
  const tbody = document.getElementById('applicationsBody');

  try {
    let url = '/api/admin/applications?';
    if (status !== 'all') url += `status=${status}&`;
    if (search) url += `search=${encodeURIComponent(search)}`;

    const response = await fetch(url);
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      tbody.innerHTML = result.data.map(app => {
        const incomeOk = app.annual_income <= app.income_limit;
        return `
          <tr>
            <td><span style="color: var(--accent-blue-light); font-weight: 600; font-size: 0.85rem;">${app.tracking_id}</span></td>
            <td>
              <div style="font-weight: 600;">${app.full_name}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${app.email}</div>
            </td>
            <td style="font-size: 0.85rem;">${app.scholarship_name}</td>
            <td>
              <span class="${incomeOk ? 'income-ok' : 'income-exceed'}" style="font-weight: 600; font-size: 0.85rem;">
                ${formatCurrency(app.annual_income)}
              </span>
            </td>
            <td style="font-size: 0.85rem;">${formatCurrency(app.income_limit)}</td>
            <td><span class="card-badge badge-${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span></td>
            <td style="font-size: 0.85rem; color: var(--text-muted);">${formatDate(app.created_at)}</td>
            <td>
              <div class="table-actions">
                <button class="action-btn action-btn-view" onclick="viewApplication(${app.id})">View</button>
                ${app.status === 'pending' ? `
                  <button class="action-btn action-btn-approve" onclick="openVerifyModal(${app.id}, 'approved')">✓</button>
                  <button class="action-btn action-btn-reject" onclick="openVerifyModal(${app.id}, 'rejected')">✕</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-icon">📭</div>
              <h3>No applications found</h3>
              <p>No applications match your current filters</p>
            </div>
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Failed to load applications:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center" style="padding: 40px; color: var(--accent-red);">
          Failed to load applications. Please try refreshing.
        </td>
      </tr>
    `;
  }
}

// ===== View Application Detail =====
async function viewApplication(id) {
  try {
    const response = await fetch(`/api/admin/applications/${id}`);
    const result = await response.json();

    if (!result.success) {
      showToast('Failed to load application', 'error');
      return;
    }

    const app = result.data;
    currentAppId = id;
    const incomeOk = app.annual_income <= app.income_limit;

    const body = document.getElementById('appDetailBody');
    body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 8px;">
        <span style="color: var(--accent-blue-light); font-weight: 600;">${app.tracking_id}</span>
        <span class="card-badge badge-${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">📋 Scholarship</div>
        <div class="detail-list">
          <div class="detail-item">
            <span class="label">Name</span>
            <span class="value">${app.scholarship_name}</span>
          </div>
          <div class="detail-item">
            <span class="label">Category</span>
            <span class="value">${app.scholarship_category}</span>
          </div>
          <div class="detail-item">
            <span class="label">Award Amount</span>
            <span class="value">${formatCurrency(app.scholarship_amount)}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">👤 Personal Information</div>
        <div class="detail-list">
          <div class="detail-item">
            <span class="label">Full Name</span>
            <span class="value">${app.full_name}</span>
          </div>
          <div class="detail-item">
            <span class="label">Email</span>
            <span class="value">${app.email}</span>
          </div>
          <div class="detail-item">
            <span class="label">Phone</span>
            <span class="value">${app.phone}</span>
          </div>
          <div class="detail-item">
            <span class="label">Date of Birth</span>
            <span class="value">${app.dob}</span>
          </div>
          <div class="detail-item">
            <span class="label">Gender</span>
            <span class="value">${app.gender}</span>
          </div>
          ${app.address ? `<div class="detail-item"><span class="label">Address</span><span class="value">${app.address}</span></div>` : ''}
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">🎓 Academic Details</div>
        <div class="detail-list">
          <div class="detail-item">
            <span class="label">Institution</span>
            <span class="value">${app.institution}</span>
          </div>
          <div class="detail-item">
            <span class="label">Course</span>
            <span class="value">${app.course}</span>
          </div>
          <div class="detail-item">
            <span class="label">Year of Study</span>
            <span class="value">Year ${app.year_of_study}</span>
          </div>
          <div class="detail-item">
            <span class="label">CGPA</span>
            <span class="value">${app.gpa || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">💰 Financial Details</div>
        <div class="detail-list">
          <div class="detail-item">
            <span class="label">Annual Income</span>
            <span class="value" style="color: ${incomeOk ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight: 700;">${formatCurrency(app.annual_income)}</span>
          </div>
          <div class="detail-item">
            <span class="label">Income Limit</span>
            <span class="value">${formatCurrency(app.income_limit)}</span>
          </div>
          ${app.income_proof_path ? `
          <div class="detail-item">
            <span class="label">Income Proof</span>
            <span class="value"><a href="/uploads/${app.income_proof_path}" target="_blank" style="color: var(--accent-blue-light);">📎 View Document</a></span>
          </div>` : ''}
        </div>
        <div class="income-highlight ${incomeOk ? 'income-within' : 'income-exceeded'}">
          ${incomeOk ? '✅ Income is within the eligible limit' : '⚠️ Income exceeds the scholarship limit'}
        </div>
      </div>

      ${app.admin_remarks ? `
      <div class="detail-section">
        <div class="detail-section-title">💬 Admin Remarks</div>
        <p style="color: var(--text-secondary);">${app.admin_remarks}</p>
        <p class="mt-2" style="font-size: 0.8rem; color: var(--text-muted);">
          By ${app.verified_by} on ${formatDateTime(app.verified_at)}
        </p>
      </div>` : ''}

      <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 16px;">
        Applied on: ${formatDateTime(app.created_at)}
      </div>
    `;

    // Footer buttons
    const footer = document.getElementById('appDetailFooter');
    if (app.status === 'pending') {
      footer.innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn btn-danger" onclick="closeModal(); openVerifyModal(${app.id}, 'rejected')">❌ Reject</button>
        <button class="btn btn-success" onclick="closeModal(); openVerifyModal(${app.id}, 'approved')">✅ Approve</button>
      `;
    } else {
      footer.innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Close</button>`;
    }

    document.getElementById('appDetailModal').classList.add('active');
  } catch (error) {
    showToast('Failed to load application details', 'error');
  }
}

function closeModal() {
  document.getElementById('appDetailModal').classList.remove('active');
}

// ===== Verification =====
function openVerifyModal(id, action) {
  currentAppId = id;
  verifyAction = action;

  const title = document.getElementById('verifyModalTitle');
  const btn = document.getElementById('verifyConfirmBtn');

  if (action === 'approved') {
    title.textContent = '✅ Approve Application';
    btn.className = 'btn btn-success';
    btn.textContent = 'Approve';
  } else {
    title.textContent = '❌ Reject Application';
    btn.className = 'btn btn-danger';
    btn.textContent = 'Reject';
  }

  document.getElementById('verifyRemarks').value = '';
  document.getElementById('verifyModal').classList.add('active');
}

function closeVerifyModal() {
  document.getElementById('verifyModal').classList.remove('active');
  currentAppId = null;
  verifyAction = null;
}

async function confirmVerification() {
  if (!currentAppId || !verifyAction) return;

  const remarks = document.getElementById('verifyRemarks').value;
  const btn = document.getElementById('verifyConfirmBtn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const response = await fetch(`/api/admin/applications/${currentAppId}/verify`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: verifyAction, remarks })
    });

    const result = await response.json();

    if (result.success) {
      showToast(`Application ${verifyAction} successfully!`, 'success');
      closeVerifyModal();
      loadDashboard();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Verification failed', 'error');
  }

  btn.disabled = false;
  btn.textContent = verifyAction === 'approved' ? 'Approve' : 'Reject';
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  document.getElementById('loginForm').addEventListener('submit', login);

  // Status filter tabs
  document.getElementById('statusFilter').addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-tab')) {
      document.querySelectorAll('#statusFilter .filter-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      const status = e.target.dataset.status;
      const search = document.getElementById('adminSearch').value;
      loadApplications(status, search);
    }
  });

  // Search
  let searchTimeout;
  document.getElementById('adminSearch').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const activeTab = document.querySelector('#statusFilter .filter-tab.active');
      const status = activeTab ? activeTab.dataset.status : 'all';
      loadApplications(status, e.target.value);
    }, 300);
  });

  // Close modals on overlay click
  document.getElementById('appDetailModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('appDetailModal')) closeModal();
  });

  document.getElementById('verifyModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('verifyModal')) closeVerifyModal();
  });
});
