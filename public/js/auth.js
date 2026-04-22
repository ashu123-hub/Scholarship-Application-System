// === Auth.js — Login & Registration Logic ===

// ===== Toast =====
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

// ===== Password Toggle =====
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

// ===== Step Navigation =====
function showStep(stepId) {
  document.querySelectorAll('.auth-step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById(stepId);
  if (step) step.classList.add('active');
}

// ===== REGISTRATION =====
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    // Validation
    if (!name || !email || !phone || !password) {
      return showToast('Please fill all required fields', 'warning');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showToast('Please enter a valid email address', 'warning');
    }

    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      return showToast('Please enter a valid 10-digit phone number', 'warning');
    }

    if (password.length < 6) {
      return showToast('Password must be at least 6 characters', 'warning');
    }

    if (password !== confirmPassword) {
      return showToast('Passwords do not match', 'error');
    }

    const btn = document.getElementById('registerBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loader"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div> Creating account...';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: name, phone, password })
      });

      const result = await res.json();

      if (result.success) {
        showStep('stepSuccess');
        showToast(result.message, 'success');
        const redirect = new URLSearchParams(window.location.search).get('redirect') || '/apply';
        setTimeout(() => window.location.href = redirect, 1500);
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = 'Create Account';
  });
}

// ===== LOGIN =====
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      return showToast('Please enter email and password', 'warning');
    }

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loader"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div> Logging in...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await res.json();

      if (result.success) {
        const userNameEl = document.getElementById('loginUserName');
        if (userNameEl) userNameEl.textContent = result.data.full_name;
        showStep('stepLoginSuccess');
        showToast(result.message, 'success');

        const redirect = new URLSearchParams(window.location.search).get('redirect') || '/apply';
        setTimeout(() => window.location.href = redirect, 1500);
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = 'Login';
  });
}
