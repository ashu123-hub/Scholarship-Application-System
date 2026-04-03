// === Auth.js — Login & Registration Logic ===

let currentEmail = '';
let resendTimerInterval = null;

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

// ===== OTP Input Auto-focus =====
function initOTPInputs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const inputs = container.querySelectorAll('.otp-box');

  inputs.forEach((input, index) => {
    input.value = '';

    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val.slice(0, 1);
      if (val && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        inputs[index - 1].focus();
        inputs[index - 1].value = '';
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      for (let i = 0; i < Math.min(text.length, inputs.length); i++) {
        inputs[i].value = text[i];
      }
      const nextIndex = Math.min(text.length, inputs.length - 1);
      inputs[nextIndex].focus();
    });
  });

  // Auto-focus first input
  setTimeout(() => inputs[0]?.focus(), 200);
}

function getOTPValue(containerId) {
  const container = document.getElementById(containerId);
  const inputs = container.querySelectorAll('.otp-box');
  return Array.from(inputs).map(i => i.value).join('');
}

// ===== Resend Timer =====
function startResendTimer(timerSpanId, resendBtnId, seconds = 60) {
  const timerSpan = document.getElementById(timerSpanId);
  const resendBtn = document.getElementById(resendBtnId);
  let remaining = seconds;

  timerSpan.style.display = 'inline';
  resendBtn.style.display = 'none';

  if (resendTimerInterval) clearInterval(resendTimerInterval);

  resendTimerInterval = setInterval(() => {
    remaining--;
    timerSpan.innerHTML = `Resend OTP in <strong>${remaining}s</strong>`;

    if (remaining <= 0) {
      clearInterval(resendTimerInterval);
      timerSpan.style.display = 'none';
      resendBtn.style.display = 'inline-block';
    }
  }, 1000);
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
        currentEmail = result.data.email;
        document.getElementById('otpEmailDisplay').textContent = currentEmail;
        showStep('stepOTP');
        initOTPInputs('otpInputs');
        startResendTimer('resendTimer', 'resendBtn');
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '📧 Create Account & Send OTP';
  });
}

// ===== REGISTER OTP VERIFY =====
const otpForm = document.getElementById('otpForm');
if (otpForm) {
  otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const otp = getOTPValue('otpInputs');
    if (otp.length !== 6) {
      return showToast('Please enter the complete 6-digit OTP', 'warning');
    }

    const btn = document.getElementById('verifyOTPBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loader"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div> Verifying...';

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail, otp })
      });

      const result = await res.json();

      if (result.success) {
        showStep('stepSuccess');
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Verification failed. Please try again.', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '✅ Verify OTP';
  });
}

// ===== RESEND OTP (Register) =====
async function resendOTP() {
  try {
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentEmail, purpose: 'verify' })
    });
    const result = await res.json();
    showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) startResendTimer('resendTimer', 'resendBtn');
  } catch (error) {
    showToast('Failed to resend OTP', 'error');
  }
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
        // Password correct — move to OTP step
        currentEmail = result.data.email;
        document.getElementById('loginOtpEmailDisplay').textContent = currentEmail;
        showStep('stepLoginOTP');
        initOTPInputs('loginOtpInputs');
        startResendTimer('loginResendTimer', 'loginResendBtn');
        showToast(result.message, 'success');
      } else if (res.status === 403 && result.data && result.data.step === 'verify_otp') {
        // Email not verified — show email verification
        currentEmail = result.data.email;
        document.getElementById('verifyEmailDisplay').textContent = currentEmail;
        showStep('stepVerifyEmail');
        initOTPInputs('verifyEmailOtpInputs');
        startResendTimer('emailResendTimer', 'emailResendBtn');
        showToast(result.message, 'warning');
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '🔐 Login & Send OTP';
  });
}

// ===== LOGIN OTP VERIFY =====
const loginOtpForm = document.getElementById('loginOtpForm');
if (loginOtpForm) {
  loginOtpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const otp = getOTPValue('loginOtpInputs');
    if (otp.length !== 6) {
      return showToast('Please enter the complete 6-digit OTP', 'warning');
    }

    const btn = document.getElementById('verifyLoginOTPBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loader"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div> Verifying...';

    try {
      const res = await fetch('/api/auth/verify-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail, otp })
      });

      const result = await res.json();

      if (result.success) {
        document.getElementById('loginUserName').textContent = result.data.full_name;
        showStep('stepLoginSuccess');
        showToast(result.message, 'success');

        // Redirect after short delay
        const redirect = new URLSearchParams(window.location.search).get('redirect') || '/apply';
        setTimeout(() => window.location.href = redirect, 1500);
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Login failed. Please try again.', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '✅ Verify & Login';
  });
}

// ===== RESEND LOGIN OTP =====
async function resendLoginOTP() {
  try {
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentEmail, purpose: 'login' })
    });
    const result = await res.json();
    showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) startResendTimer('loginResendTimer', 'loginResendBtn');
  } catch (error) {
    showToast('Failed to resend OTP', 'error');
  }
}

// ===== VERIFY EMAIL OTP (from login page) =====
const verifyEmailForm = document.getElementById('verifyEmailForm');
if (verifyEmailForm) {
  verifyEmailForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const otp = getOTPValue('verifyEmailOtpInputs');
    if (otp.length !== 6) {
      return showToast('Please enter the complete 6-digit OTP', 'warning');
    }

    const btn = document.getElementById('verifyEmailOTPBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loader"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div> Verifying...';

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail, otp })
      });

      const result = await res.json();

      if (result.success) {
        document.getElementById('loginUserName').textContent = result.data.full_name;
        showStep('stepLoginSuccess');
        showToast('Email verified & logged in!', 'success');

        const redirect = new URLSearchParams(window.location.search).get('redirect') || '/apply';
        setTimeout(() => window.location.href = redirect, 1500);
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Verification failed.', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '✅ Verify Email';
  });
}

async function resendVerifyEmailOTP() {
  try {
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentEmail, purpose: 'verify' })
    });
    const result = await res.json();
    showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) startResendTimer('emailResendTimer', 'emailResendBtn');
  } catch (error) {
    showToast('Failed to resend OTP', 'error');
  }
}
