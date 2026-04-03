// === Track.js — Application Tracking Logic ===

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
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ===== Auth State =====
async function checkAuthState() {
  try {
    const response = await fetch('/api/auth/check');
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        updateNavbarAuth(result.data);
      }
    }
  } catch (e) {}
}

function updateNavbarAuth(user) {
  const guest = document.getElementById('navAuthGuest');
  const userEl = document.getElementById('navAuthUser');

  if (guest && userEl && user) {
    guest.style.display = 'none';
    userEl.style.display = 'block';

    const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('navUserAvatar').textContent = initials;
    document.getElementById('navUserName').textContent = user.full_name.split(' ')[0];
    document.getElementById('dropdownName').textContent = user.full_name;
    document.getElementById('dropdownEmail').textContent = user.email;
  }
}

async function logoutUser() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    showToast('Logged out successfully');
    setTimeout(() => window.location.reload(), 500);
  } catch (e) {
    window.location.reload();
  }
}

async function trackApplication() {
  const input = document.getElementById('trackingInput');
  const trackingId = input.value.trim().toUpperCase();

  if (!trackingId) {
    showToast('Please enter a tracking ID', 'warning');
    return;
  }

  const resultDiv = document.getElementById('trackResult');
  const loadingDiv = document.getElementById('trackLoading');
  const detailsDiv = document.getElementById('trackDetails');
  const notFoundDiv = document.getElementById('trackNotFound');

  resultDiv.style.display = 'block';
  loadingDiv.style.display = 'block';
  detailsDiv.style.display = 'none';
  notFoundDiv.style.display = 'none';

  try {
    const response = await fetch(`/api/applications/track/${encodeURIComponent(trackingId)}`);
    const result = await response.json();

    loadingDiv.style.display = 'none';

    if (result.success) {
      const app = result.data;

      detailsDiv.style.display = 'block';

      document.getElementById('trackScholarshipName').textContent = app.scholarship_name;
      document.getElementById('trackId').textContent = app.tracking_id;
      document.getElementById('trackName').textContent = app.full_name;
      document.getElementById('trackEmail').textContent = app.email;
      document.getElementById('trackInstitution').textContent = app.institution;
      document.getElementById('trackCourse').textContent = `${app.course} — Year ${app.year_of_study}`;
      document.getElementById('trackAmount').textContent = formatCurrency(app.scholarship_amount);
      document.getElementById('trackDate').textContent = formatDate(app.created_at);

      // Status badge
      const statusBadge = document.getElementById('trackStatusBadge');
      statusBadge.textContent = app.status.charAt(0).toUpperCase() + app.status.slice(1);
      statusBadge.className = `card-badge badge-${app.status}`;

      // Admin remarks
      const remarksCard = document.getElementById('trackRemarksCard');
      if (app.admin_remarks && app.status !== 'pending') {
        remarksCard.style.display = 'block';
        document.getElementById('trackRemarks').textContent = app.admin_remarks || 'No remarks provided.';
        document.getElementById('trackVerifiedBy').textContent = app.verified_by || 'Admin';
        document.getElementById('trackVerifiedAt').textContent = formatDate(app.verified_at);
      } else {
        remarksCard.style.display = 'none';
      }

      // Build timeline
      buildTimeline(app);
    } else {
      notFoundDiv.style.display = 'block';
    }
  } catch (error) {
    loadingDiv.style.display = 'none';
    notFoundDiv.style.display = 'block';
    showToast('Failed to track application', 'error');
  }
}

function buildTimeline(app) {
  const timeline = document.getElementById('trackTimeline');
  let html = '';

  // Step 1: Application submitted
  html += `
    <div class="track-event completed">
      <div class="track-event-title">Application Submitted</div>
      <div class="track-event-time">${formatDate(app.created_at)}</div>
    </div>
  `;

  // Step 2: Under review
  if (app.status === 'pending') {
    html += `
      <div class="track-event current">
        <div class="track-event-title">Under Review</div>
        <div class="track-event-time">Your application is being reviewed by the admin team</div>
      </div>
    `;
    html += `
      <div class="track-event">
        <div class="track-event-title" style="color: var(--text-muted);">Decision Pending</div>
        <div class="track-event-time">Waiting for verification</div>
      </div>
    `;
  } else if (app.status === 'approved') {
    html += `
      <div class="track-event completed">
        <div class="track-event-title">Under Review</div>
        <div class="track-event-time">Application reviewed by admin team</div>
      </div>
    `;
    html += `
      <div class="track-event completed">
        <div class="track-event-title" style="color: var(--accent-green);">✅ Approved</div>
        <div class="track-event-time">${formatDate(app.verified_at)}</div>
      </div>
    `;
  } else if (app.status === 'rejected') {
    html += `
      <div class="track-event completed">
        <div class="track-event-title">Under Review</div>
        <div class="track-event-time">Application reviewed by admin team</div>
      </div>
    `;
    html += `
      <div class="track-event rejected-event">
        <div class="track-event-title" style="color: var(--accent-red);">❌ Rejected</div>
        <div class="track-event-time">${formatDate(app.verified_at)}</div>
      </div>
    `;
  }

  timeline.innerHTML = html;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Check auth state
  checkAuthState();

  // Enter key to track
  document.getElementById('trackingInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') trackApplication();
  });

  // Check URL params
  const urlParams = new URLSearchParams(window.location.search);
  const trackId = urlParams.get('id');
  if (trackId) {
    document.getElementById('trackingInput').value = trackId;
    trackApplication();
  }

  // Mobile nav
  document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });

  // User dropdown toggle
  const userBtn = document.getElementById('navUserBtn');
  if (userBtn) {
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('navUserDropdown').classList.toggle('open');
    });
    document.addEventListener('click', () => {
      document.getElementById('navUserDropdown')?.classList.remove('open');
    });
  }
});
