/**
 * Main Portal Script - Authentication & Session Routing
 */

let currentLoginMode = 'student';

function setLoginMode(mode) {
  currentLoginMode = mode === 'admin' ? 'admin' : 'student';

  const modeInput = document.getElementById('loginMode');
  const studentBtn = document.getElementById('modeStudentBtn');
  const adminBtn = document.getElementById('modeAdminBtn');
  const badge = document.getElementById('portalBadge');
  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  const usernameLabel = document.getElementById('usernameLabel');
  const passwordLabel = document.getElementById('passwordLabel');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginBtnText = document.getElementById('loginBtnText');
  const authFooter = document.getElementById('authFooter');
  const alertBox = document.getElementById('loginAlert');

  if (modeInput) modeInput.value = currentLoginMode;

  if (studentBtn && adminBtn) {
    const isAdmin = currentLoginMode === 'admin';
    studentBtn.classList.toggle('active', !isAdmin);
    adminBtn.classList.toggle('active', isAdmin);
    studentBtn.setAttribute('aria-selected', String(!isAdmin));
    adminBtn.setAttribute('aria-selected', String(isAdmin));
  }

  if (alertBox) {
    alertBox.style.display = 'none';
    alertBox.textContent = '';
  }

  if (currentLoginMode === 'admin') {
    if (badge) badge.textContent = 'Admin Access';
    if (title) title.textContent = 'Admin Sign In';
    if (subtitle) subtitle.textContent = 'Enter admin credentials to open the console';
    if (usernameLabel) usernameLabel.textContent = 'Admin Username';
    if (passwordLabel) passwordLabel.textContent = 'Admin Password';
    if (usernameInput) {
      usernameInput.placeholder = 'Enter admin username';
      usernameInput.value = '';
    }
    if (passwordInput) {
      passwordInput.placeholder = 'Enter admin password';
      passwordInput.value = '';
    }
    if (loginBtnText) loginBtnText.textContent = 'Continue to Admin Console';
    if (authFooter) {
      authFooter.innerHTML = '<p><strong>@Admin / Admin@555</strong> — Admin console access</p>';
    }
  } else {
    if (badge) badge.textContent = 'Student Access';
    if (title) title.textContent = 'Student Sign In';
    if (subtitle) subtitle.textContent = 'Enter your student credentials to open the workspace';
    if (usernameLabel) usernameLabel.textContent = 'Student Username';
    if (passwordLabel) passwordLabel.textContent = 'Student Password';
    if (usernameInput) {
      usernameInput.placeholder = 'Enter student username';
      usernameInput.value = '';
    }
    if (passwordInput) {
      passwordInput.placeholder = 'Enter student password';
      passwordInput.value = '';
    }
    if (loginBtnText) loginBtnText.textContent = 'Continue to Student Workspace';
    if (authFooter) {
      authFooter.innerHTML = '<p><strong>student1 to student200</strong> / password: <strong>1234</strong> — Student accounts</p>';
    }
  }

  if (usernameInput) usernameInput.focus();
}

async function login() {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const loginBtnText = document.getElementById('loginBtnText');
  const modeInput = document.getElementById('loginMode');

  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';
  const expectedRole = (modeInput && modeInput.value) || currentLoginMode || 'student';

  if (!username || !password) {
    const roleLabel = expectedRole === 'admin' ? 'admin' : 'student';
    showAlert(`Please enter both ${roleLabel} username and password.`, 'error');
    return;
  }

  const originalBtnText = loginBtnText
    ? loginBtnText.textContent
    : (expectedRole === 'admin' ? 'Continue to Admin Console' : 'Continue to Student Workspace');

  if (loginBtn) {
    loginBtn.disabled = true;
    if (loginBtnText) {
      loginBtnText.textContent = 'Signing in...';
    } else {
      loginBtn.innerText = 'Signing in...';
    }
  }

  try {
    const res = await API.login(username, password, expectedRole);

    if (res.success && res.user) {
      if (res.user.role !== expectedRole) {
        if (expectedRole === 'admin') {
          showAlert('Admin credentials required. Switch to Student mode for student login.', 'error');
        } else {
          showAlert('Student credentials required. Switch to Admin mode for admin login.', 'error');
        }
        return;
      }

      setLoggedInUser(res.user);

      if (res.user.role === 'admin') {
        sessionStorage.removeItem('showPythonPromo');
        window.location.href = 'admin.html';
      } else {
        sessionStorage.setItem('showPythonPromo', 'true');
        window.location.href = 'student.html';
      }
    } else {
      const fallback =
        expectedRole === 'admin'
          ? 'Invalid admin username or password.'
          : 'Invalid student username or password.';
      showAlert(res.message || fallback, 'error');
    }
  } catch (err) {
    console.error('Login error:', err);
    showAlert('Unable to connect to the backend server. Please check MongoDB and Server status.', 'error');
  } finally {
    if (loginBtn) {
      loginBtn.disabled = false;
      if (loginBtnText) {
        loginBtnText.textContent = originalBtnText;
      } else {
        loginBtn.innerText = originalBtnText;
      }
    }
  }
}

function showAlert(msg, type = 'error') {
  const alertBox = document.getElementById('loginAlert');
  if (!alertBox) {
    alert(msg);
    return;
  }
  alertBox.className = `alert-box alert-${type}`;
  alertBox.textContent = msg;
  alertBox.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('loginForm')) {
    setLoginMode('student');
  }
});
