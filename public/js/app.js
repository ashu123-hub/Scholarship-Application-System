// === App.js — Landing Page Logic ===

const API_BASE = '';

// Toast notifications
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

// Format currency
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// Get badge class by category
function getCategoryBadge(category) {
  const map = {
    'Merit-Based': 'badge-merit',
    'Need-Based': 'badge-need',
    'Category-Based': 'badge-category',
    'Research': 'badge-research'
  };
  return map[category] || 'badge-merit';
}

// Get icon by category
function getCategoryIcon(category) {
  const map = {
    'Merit-Based': '🏆',
    'Need-Based': '🤝',
    'Category-Based': '👩‍🔬',
    'Research': '🔬'
  };
  return map[category] || '🎓';
}

// Format date
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Days remaining
function daysRemaining(deadline) {
  const now = new Date();
  const dl = new Date(deadline);
  const diff = Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
  return diff;
}

// Create scholarship card HTML
function createScholarshipCard(scholarship) {
  const days = daysRemaining(scholarship.deadline);
  const isExpiring = days <= 30 && days > 0;
  const isExpired = days <= 0;

  return `
    <div class="card scholarship-card" data-category="${scholarship.category}" data-id="${scholarship.id}">
      <div class="card-header">
        <div class="card-icon" style="background: ${scholarship.category === 'Merit-Based' ? 'rgba(59,130,246,0.15)' : scholarship.category === 'Need-Based' ? 'rgba(16,185,129,0.15)' : scholarship.category === 'Research' ? 'rgba(245,158,11,0.15)' : 'rgba(139,92,246,0.15)'}">
          ${getCategoryIcon(scholarship.category)}
        </div>
        <span class="card-badge ${getCategoryBadge(scholarship.category)}">${scholarship.category}</span>
      </div>
      <h3 class="card-title">${scholarship.name}</h3>
      <p class="card-description">${scholarship.description}</p>
      <div class="card-meta">
        <div class="card-meta-item">
          <span class="icon">💰</span>
          <span class="value">${formatCurrency(scholarship.amount)}</span>
        </div>
        <div class="card-meta-item">
          <span class="icon">📊</span>
          <span>Income Limit: </span>
          <span class="value">${formatCurrency(scholarship.income_limit)}</span>
        </div>
        <div class="card-meta-item">
          <span class="icon">📅</span>
          <span class="${isExpired ? 'value' : isExpiring ? 'value' : ''}" style="${isExpired ? 'color: var(--accent-red)' : isExpiring ? 'color: var(--accent-amber)' : ''}">
            ${isExpired ? 'Expired' : `${days} days left`}
          </span>
        </div>
      </div>
      <div class="card-actions">
        <a href="/apply?scholarship=${scholarship.id}" class="btn btn-primary btn-sm" ${isExpired ? 'style="pointer-events:none;opacity:0.5"' : ''}>
          Apply Now →
        </a>
        <button class="btn btn-secondary btn-sm" onclick="showScholarshipDetails(${scholarship.id})">
          View Details
        </button>
      </div>
    </div>
  `;
}

// Load scholarships
async function loadScholarships(category = 'all', search = '') {
  const grid = document.getElementById('scholarshipGrid');

  try {
    let url = `${API_BASE}/api/scholarships?`;
    if (category !== 'all') url += `category=${encodeURIComponent(category)}&`;
    if (search) url += `search=${encodeURIComponent(search)}`;

    const response = await fetch(url);
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      grid.innerHTML = result.data.map(createScholarshipCard).join('');
    } else {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📭</div>
          <h3>No scholarships found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading scholarships:', error);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠️</div>
        <h3>Failed to load scholarships</h3>
        <p>Please try refreshing the page</p>
      </div>
    `;
  }
}

// Show scholarship details modal
async function showScholarshipDetails(id) {
  try {
    const response = await fetch(`${API_BASE}/api/scholarships/${id}`);
    const result = await response.json();

    if (!result.success) {
      showToast('Failed to load details', 'error');
      return;
    }

    const s = result.data;
    const days = daysRemaining(s.deadline);

    const modalHtml = `
      <div class="modal-overlay active" id="scholarshipModal" onclick="if(event.target===this)this.remove()">
        <div class="modal">
          <div class="modal-header">
            <h3>${s.name}</h3>
            <button class="modal-close" onclick="document.getElementById('scholarshipModal').remove()">✕</button>
          </div>
          <div class="modal-body">
            <div style="margin-bottom: 20px;">
              <span class="card-badge ${getCategoryBadge(s.category)}">${s.category}</span>
            </div>
            <p style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.7;">${s.description}</p>
            <div class="detail-list">
              <div class="detail-item">
                <span class="label">💰 Award Amount</span>
                <span class="value">${formatCurrency(s.amount)}</span>
              </div>
              <div class="detail-item">
                <span class="label">📊 Income Limit</span>
                <span class="value">${formatCurrency(s.income_limit)}</span>
              </div>
              <div class="detail-item">
                <span class="label">📅 Deadline</span>
                <span class="value">${formatDate(s.deadline)} (${days > 0 ? days + ' days left' : 'Expired'})</span>
              </div>
              <div class="detail-item">
                <span class="label">✅ Eligibility</span>
                <span class="value">${s.eligibility}</span>
              </div>
              <div class="detail-item">
                <span class="label">📄 Required Docs</span>
                <span class="value">${s.required_docs}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('scholarshipModal').remove()">Close</button>
            <a href="/apply?scholarship=${s.id}" class="btn btn-primary" ${days <= 0 ? 'style="pointer-events:none;opacity:0.5"' : ''}>Apply Now →</a>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  } catch (error) {
    showToast('Error loading scholarship details', 'error');
  }
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
  } catch (e) {
    // Not logged in — stays as guest
  }
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

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Load scholarships
  loadScholarships();

  // Check auth state
  checkAuthState();

  // Filter tabs
  document.getElementById('filterTabs').addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-tab')) {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      const category = e.target.dataset.filter;
      const search = document.getElementById('searchInput').value;
      loadScholarships(category, search);
    }
  });

  // Search
  let searchTimeout;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const activeTab = document.querySelector('.filter-tab.active');
      const category = activeTab ? activeTab.dataset.filter : 'all';
      loadScholarships(category, e.target.value);
    }, 300);
  });

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Mobile nav toggle
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
