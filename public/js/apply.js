// === Apply.js — Multi-step Application Form Logic ===

let currentStep = 1;
let selectedScholarship = null;
let currentUser = null;

// Toast
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

// ===== Auth Check =====
async function checkAuth() {
  try {
    const response = await fetch('/api/auth/check');
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        currentUser = result.data;
        // Show application form, hide login gate
        document.getElementById('loginGate').classList.add('hidden');
        document.getElementById('applicationForm').classList.remove('hidden');

        // Update navbar
        updateNavbarAuth(currentUser);

        // Auto-fill user data
        autoFillUserData();

        return true;
      }
    }
  } catch (e) {
    console.log('Auth check failed:', e.message);
  }

  // Not logged in — show login gate
  document.getElementById('loginGate').classList.remove('hidden');
  document.getElementById('applicationForm').classList.add('hidden');

  // Preserve scholarship query param in login redirect
  const urlParams = new URLSearchParams(window.location.search);
  const scholarshipId = urlParams.get('scholarship');
  const loginBtn = document.getElementById('gateLoginBtn');
  if (loginBtn && scholarshipId) {
    loginBtn.href = `/login?redirect=/apply?scholarship=${scholarshipId}`;
  }

  return false;
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

function autoFillUserData() {
  if (!currentUser) return;

  const nameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');

  if (nameInput && !nameInput.value) nameInput.value = currentUser.full_name;
  if (emailInput && !emailInput.value) emailInput.value = currentUser.email;
  if (phoneInput && !phoneInput.value && currentUser.phone) phoneInput.value = currentUser.phone;
}

// Load scholarships into dropdown
async function loadScholarships() {
  try {
    const response = await fetch('/api/scholarships');
    const result = await response.json();

    if (result.success) {
      const select = document.getElementById('scholarshipSelect');
      result.data.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = `${s.name} — ${formatCurrency(s.amount)} (Income Limit: ${formatCurrency(s.income_limit)})`;
        option.dataset.incomeLimit = s.income_limit;
        option.dataset.name = s.name;
        option.dataset.amount = s.amount;
        option.dataset.deadline = s.deadline;
        option.dataset.eligibility = s.eligibility;
        option.dataset.requiredDocs = s.required_docs;
        select.appendChild(option);
      });

      // Check if scholarship is preselected from URL
      const urlParams = new URLSearchParams(window.location.search);
      const preselectedId = urlParams.get('scholarship');
      if (preselectedId) {
        select.value = preselectedId;
        onScholarshipChange();
      }
    }
  } catch (error) {
    showToast('Failed to load scholarships', 'error');
  }
}

// Handle scholarship selection change
function onScholarshipChange() {
  const select = document.getElementById('scholarshipSelect');
  const infoDiv = document.getElementById('scholarshipInfo');
  const infoContent = document.getElementById('scholarshipInfoContent');
  const selectedOption = select.options[select.selectedIndex];

  if (select.value) {
    selectedScholarship = {
      id: select.value,
      name: selectedOption.dataset.name,
      amount: parseFloat(selectedOption.dataset.amount),
      income_limit: parseFloat(selectedOption.dataset.incomeLimit),
      deadline: selectedOption.dataset.deadline,
      eligibility: selectedOption.dataset.eligibility,
      required_docs: selectedOption.dataset.requiredDocs
    };

    document.getElementById('selectedScholarshipName').textContent = `Applying for: ${selectedScholarship.name}`;

    infoContent.innerHTML = `
      <div class="detail-item">
        <span class="label">💰 Award Amount</span>
        <span class="value">${formatCurrency(selectedScholarship.amount)}</span>
      </div>
      <div class="detail-item">
        <span class="label">📊 Income Limit</span>
        <span class="value" style="color: var(--accent-amber)">${formatCurrency(selectedScholarship.income_limit)}</span>
      </div>
      <div class="detail-item">
        <span class="label">✅ Eligibility</span>
        <span class="value">${selectedScholarship.eligibility}</span>
      </div>
      <div class="detail-item">
        <span class="label">📄 Required Docs</span>
        <span class="value">${selectedScholarship.required_docs}</span>
      </div>
    `;
    infoDiv.style.display = 'block';

    // Re-validate income if already entered
    const incomeInput = document.getElementById('annualIncome');
    if (incomeInput.value) {
      validateIncome();
    }
  } else {
    selectedScholarship = null;
    infoDiv.style.display = 'none';
    document.getElementById('selectedScholarshipName').textContent = 'Select a scholarship and fill out the form below';
  }
}

// Validate income against scholarship limit
function validateIncome() {
  const incomeInput = document.getElementById('annualIncome');
  const alert = document.getElementById('incomeAlert');
  const income = parseFloat(incomeInput.value);

  if (!selectedScholarship || !income || isNaN(income)) {
    alert.className = 'income-alert';
    alert.style.display = 'none';
    return;
  }
  
  alert.style.display = 'flex';

  const alertIcon = alert.querySelector('.alert-icon');
  const alertMessage = alert.querySelector('.alert-message');

  if (income > 600000) {
    alert.className = 'income-alert not-eligible';
    alertIcon.textContent = '❌';
    alertMessage.textContent = `Not eligible. Annual income exceeds the IP strict limit of ₹6,00,000.`;
  } else if (income > selectedScholarship.income_limit) {
    alert.className = 'income-alert not-eligible';
    alertIcon.textContent = '❌';
    alertMessage.textContent = `Not eligible. Your income (${formatCurrency(income)}) exceeds the limit of ${formatCurrency(selectedScholarship.income_limit)} for this scholarship.`;
  } else if (income <= 300000) {
    alert.className = 'income-alert eligible';
    alertIcon.textContent = '✅';
    alertMessage.textContent = `Eligible for Full Scholarship! (Income ≤ ₹3,00,000).`;
  } else {
    alert.className = 'income-alert eligible';
    alertIcon.textContent = '✅';
    alertMessage.textContent = `Eligible for Partial Scholarship! (Income ₹3,00,001 - ₹6,00,000).`;
  }
}

// Step navigation
function goToStep(step) {
  // Update step content visibility
  document.querySelectorAll('.form-step-content').forEach(el => el.classList.remove('active'));
  document.querySelector(`.form-step-content[data-step="${step}"]`).classList.add('active');

  // Update step indicators
  document.querySelectorAll('.step-circle').forEach(circle => {
    const s = parseInt(circle.dataset.step);
    circle.classList.remove('active', 'completed');
    circle.nextElementSibling.classList.remove('active');

    if (s === step) {
      circle.classList.add('active');
      circle.nextElementSibling.classList.add('active');
    } else if (s < step) {
      circle.classList.add('completed');
      circle.textContent = '✓';
    } else {
      circle.textContent = s;
    }
  });

  // Update connectors
  document.querySelectorAll('.step-connector').forEach((conn, index) => {
    if (index < step - 1) {
      conn.classList.add('completed');
    } else {
      conn.classList.remove('completed');
    }
  });

  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(step) {
  let isValid = true;

  if (step === 0) {
    // Validate scholarship selection
    if (!document.getElementById('scholarshipSelect').value) {
      showToast('Please select a scholarship first', 'warning');
      return false;
    }
  }

  if (step === 1) {
    const fields = ['fullName', 'email', 'phone', 'dob', 'gender'];
    fields.forEach(fieldId => {
      const input = document.getElementById(fieldId);
      const group = input.closest('.form-group');
      if (!input.value.trim()) {
        group.classList.add('error');
        isValid = false;
      } else {
        group.classList.remove('error');
      }
    });

    // Email validation
    const email = document.getElementById('email');
    if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      email.closest('.form-group').classList.add('error');
      isValid = false;
    }

    // Phone validation
    const phone = document.getElementById('phone');
    if (phone.value && !/^\d{10}$/.test(phone.value.replace(/\D/g, ''))) {
      phone.closest('.form-group').classList.add('error');
      isValid = false;
    }

    // IP Age Rule Validation
    const dobInput = document.getElementById('dob');
    if (dobInput.value) {
      const birthDate = new Date(dobInput.value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      
      if (age < 15 || age > 30) {
        showToast(`Age ${age} is not eligible. Must be between 15 and 30.`, 'warning');
        isValid = false;
        dobInput.closest('.form-group').classList.add('error');
      }
    }
  }

  if (step === 2) {
    const fields = ['institution', 'course', 'yearOfStudy'];
    fields.forEach(fieldId => {
      const input = document.getElementById(fieldId);
      const group = input.closest('.form-group');
      if (!input.value.trim()) {
        group.classList.add('error');
        isValid = false;
      } else {
        group.classList.remove('error');
      }
    });

    // IP Percentage Rule Validation
    const gpaInput = document.getElementById('gpa');
    if (gpaInput.value) {
      const gpaValue = parseFloat(gpaInput.value);
      const percentage = gpaValue <= 10 ? gpaValue * 10 : gpaValue;
      if (percentage < 60) {
        showToast(`Score (${percentage}%) is below minimum 60% requirement.`, 'warning');
        isValid = false;
        gpaInput.closest('.form-group').classList.add('error');
      }
    }
  }

  if (step === 3) {
    const income = document.getElementById('annualIncome');
    if (!income.value || parseFloat(income.value) <= 0) {
      income.closest('.form-group').classList.add('error');
      isValid = false;
    } else {
      income.closest('.form-group').classList.remove('error');
    }

    // Check income limit
    if (parseFloat(income.value) > 600000) {
      showToast(`Income exceeds maximum allowed IP limit of ₹6,00,000`, 'error');
      isValid = false;
    } else if (selectedScholarship && parseFloat(income.value) > selectedScholarship.income_limit) {
      showToast(`Your income exceeds the limit of ${formatCurrency(selectedScholarship.income_limit)} for this scholarship`, 'error');
      isValid = false;
    }
  }

  if (!isValid) {
    showToast('Please fill all required fields correctly', 'warning');
  }

  return isValid;
}

function nextStep() {
  // Validate scholarship selection before proceeding
  if (currentStep === 1 && !validateStep(0)) return;
  if (!validateStep(currentStep)) return;

  if (currentStep === 3) {
    populateReview();
  }

  goToStep(currentStep + 1);
}

function prevStep() {
  goToStep(currentStep - 1);
}

function calculateEstimatedAmount(income, gpa) {
  const gpaValue = gpa ? parseFloat(gpa) : 0;
  const percentage = gpaValue <= 10 ? gpaValue * 10 : gpaValue;
  
  let amount = 0;
  if (income <= 300000) {
    amount = percentage >= 80 ? 50000 : 30000;
  } else {
    amount = percentage >= 80 ? 25000 : 15000;
  }
  
  if (amount > selectedScholarship.amount) {
    amount = selectedScholarship.amount;
  }
  return amount;
}

function populateReview() {
  const review = document.getElementById('reviewContent');
  
  const income = parseFloat(document.getElementById('annualIncome').value);
  const gpa = parseFloat(document.getElementById('gpa').value);
  const estimatedAmount = calculateEstimatedAmount(income, gpa);

  review.innerHTML = `
    <h4 style="color: var(--accent-blue-light); margin-bottom: 12px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Scholarship</h4>
    <div class="detail-item">
      <span class="label">Scholarship</span>
      <span class="value">${selectedScholarship.name}</span>
    </div>
    <div class="detail-item">
      <span class="label">Estimated Award</span>
      <span class="value">${formatCurrency(estimatedAmount)} <span style="font-size:0.8rem;color:var(--text-muted)">(Max: ${formatCurrency(selectedScholarship.amount)})</span></span>
    </div>
    <hr style="border: none; border-top: 1px solid var(--border-color); margin: 16px 0;">

    <h4 style="color: var(--accent-blue-light); margin-bottom: 12px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Personal Details</h4>
    <div class="detail-item">
      <span class="label">Full Name</span>
      <span class="value">${document.getElementById('fullName').value}</span>
    </div>
    <div class="detail-item">
      <span class="label">Email</span>
      <span class="value">${document.getElementById('email').value}</span>
    </div>
    <div class="detail-item">
      <span class="label">Phone</span>
      <span class="value">${document.getElementById('phone').value}</span>
    </div>
    <div class="detail-item">
      <span class="label">Date of Birth</span>
      <span class="value">${document.getElementById('dob').value}</span>
    </div>
    <div class="detail-item">
      <span class="label">Gender</span>
      <span class="value">${document.getElementById('gender').value}</span>
    </div>
    <hr style="border: none; border-top: 1px solid var(--border-color); margin: 16px 0;">

    <h4 style="color: var(--accent-blue-light); margin-bottom: 12px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Academic Details</h4>
    <div class="detail-item">
      <span class="label">Institution</span>
      <span class="value">${document.getElementById('institution').value}</span>
    </div>
    <div class="detail-item">
      <span class="label">Course</span>
      <span class="value">${document.getElementById('course').value}</span>
    </div>
    <div class="detail-item">
      <span class="label">Year of Study</span>
      <span class="value">Year ${document.getElementById('yearOfStudy').value}</span>
    </div>
    <div class="detail-item">
      <span class="label">CGPA</span>
      <span class="value">${document.getElementById('gpa').value || 'N/A'}</span>
    </div>
    <hr style="border: none; border-top: 1px solid var(--border-color); margin: 16px 0;">

    <h4 style="color: var(--accent-blue-light); margin-bottom: 12px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Financial Details</h4>
    <div class="detail-item">
      <span class="label">Annual Income</span>
      <span class="value">${formatCurrency(document.getElementById('annualIncome').value)}</span>
    </div>
    <div class="detail-item">
      <span class="label">Income Proof</span>
      <span class="value">${document.getElementById('incomeProof').files.length > 0 ? document.getElementById('incomeProof').files[0].name : 'Not uploaded'}</span>
    </div>
  `;
}

// Submit application
async function submitApplication(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="loader"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div> Submitting...';

  const formData = new FormData();
  formData.append('scholarship_id', selectedScholarship.id);
  formData.append('full_name', document.getElementById('fullName').value);
  formData.append('email', document.getElementById('email').value);
  formData.append('phone', document.getElementById('phone').value);
  formData.append('dob', document.getElementById('dob').value);
  formData.append('gender', document.getElementById('gender').value);
  formData.append('address', document.getElementById('address').value);
  formData.append('institution', document.getElementById('institution').value);
  formData.append('course', document.getElementById('course').value);
  formData.append('year_of_study', document.getElementById('yearOfStudy').value);
  formData.append('gpa', document.getElementById('gpa').value);
  formData.append('annual_income', document.getElementById('annualIncome').value);

  const fileInput = document.getElementById('incomeProof');
  if (fileInput.files.length > 0) {
    formData.append('income_proof', fileInput.files[0]);
  }

  try {
    const response = await fetch('/api/applications', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      document.getElementById('applicationForm').classList.add('hidden');
      document.getElementById('successScreen').classList.remove('hidden');
      document.getElementById('trackingIdDisplay').textContent = result.data.tracking_id;
      showToast('Application submitted successfully!', 'success');
    } else {
      if (result.redirect) {
        // Not logged in — redirect to login
        window.location.href = result.redirect + '?redirect=/apply';
        return;
      }
      showToast(result.message || 'Failed to submit application', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '✅ Submit Application';
    }
  } catch (error) {
    console.error('Submit error:', error);
    showToast('Network error. Please try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '✅ Submit Application';
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Check auth first
  checkAuth().then(isLoggedIn => {
    if (isLoggedIn) {
      loadScholarships();
    }
  });

  document.getElementById('scholarshipSelect').addEventListener('change', onScholarshipChange);

  // Income validation on input
  document.getElementById('annualIncome').addEventListener('input', validateIncome);

  // File upload display
  document.getElementById('incomeProof').addEventListener('change', (e) => {
    const fileUpload = document.getElementById('fileUpload');
    const fileName = document.getElementById('fileName');
    if (e.target.files.length > 0) {
      fileUpload.classList.add('has-file');
      fileName.style.display = 'block';
      fileName.textContent = '📄 ' + e.target.files[0].name;
    } else {
      fileUpload.classList.remove('has-file');
      fileName.style.display = 'none';
    }
  });

  // Form submit
  document.getElementById('applyForm').addEventListener('submit', submitApplication);

  // Mobile nav
  document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });

  // User dropdown
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

  // Remove error on input
  document.querySelectorAll('.form-input, .form-select').forEach(input => {
    input.addEventListener('input', () => {
      input.closest('.form-group').classList.remove('error');
    });
  });
});
