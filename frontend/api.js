/**
 * Student Placement Portal - Frontend API Client
 * Connects frontend views seamlessly to the Express + MongoDB backend
 */

// Dynamically determine the backend API base URL
let API_BASE = 'http://localhost:5000/api';

if (window.location.protocol.startsWith('http')) {
  // If running on the express server port (e.g. 5000), use relative /api
  if (window.location.port === '5000' || (!window.location.port && (window.location.protocol === 'https:' || window.location.protocol === 'http:'))) {
    API_BASE = `${window.location.origin}/api`;
  } else {
    // If running from VS Code Live Server (port 5500/3000/etc), point to port 5000
    API_BASE = `http://${window.location.hostname || 'localhost'}:5000/api`;
  }
}



// Cross-tab real-time event bus
const portalBroadcast = (typeof BroadcastChannel !== 'undefined') 
  ? new BroadcastChannel('placement_portal_channel') 
  : null;

const PortalEvents = {
  emit(type, payload = {}) {
    const message = { type, payload, timestamp: Date.now() };
    if (portalBroadcast) {
      try { portalBroadcast.postMessage(message); } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent('portal-event', { detail: message }));
    try {
      localStorage.setItem('portal_sync_ping', JSON.stringify(message));
    } catch (e) {}
  },
  listen(callback) {
    if (portalBroadcast) {
      portalBroadcast.addEventListener('message', (event) => {
        if (event.data) callback(event.data);
      });
    }
    window.addEventListener('portal-event', (e) => {
      if (e.detail) callback(e.detail);
    });
    window.addEventListener('storage', (e) => {
      if (e.key === 'portal_sync_ping' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          callback(data);
        } catch (err) {}
      }
    });
  }
};

const API = {
  // Auth
  async login(username, password, expectedRole) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, expectedRole }),
    });
    return await res.json();
  },

  // Students
  async getStudents() {
    const res = await fetch(`${API_BASE}/students`);
    return await res.json();
  },

  async getStudent(username) {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(username)}`);
    return await res.json();
  },

  async updateStudentProfile(data) {
    const res = await fetch(`${API_BASE}/students/profile/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.success) {
      PortalEvents.emit('STUDENT_UPDATED', { username: data.username, student: result.student });
    }
    return result;
  },

  async createStudent(data) {
    const res = await fetch(`${API_BASE}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.success) {
      PortalEvents.emit('STUDENT_UPDATED', { student: result.student });
    }
    return result;
  },

  async updateStudent(id, data) {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.success) {
      PortalEvents.emit('STUDENT_UPDATED', { id, student: result.student });
    }
    return result;
  },

  async deleteStudent(id) {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (result.success) {
      PortalEvents.emit('STUDENT_UPDATED', { id });
    }
    return result;
  },

  async regenerateAllStudents() {
    const res = await fetch(`${API_BASE}/students/regenerate-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await res.json();
    if (result.success) {
      PortalEvents.emit('STUDENT_UPDATED', {});
    }
    return result;
  },

  // Questions
  async getQuestions(day) {
    const url = day ? `${API_BASE}/questions?day=${day}` : `${API_BASE}/questions`;
    const res = await fetch(url);
    return await res.json();
  },

  async getQuestionDays() {
    const res = await fetch(`${API_BASE}/questions/days`);
    return await res.json();
  },

  async importQuestions(formDataOrJson, isJson = false) {
    let options = { method: 'POST' };
    if (isJson) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(formDataOrJson);
    } else {
      options.body = formDataOrJson;
    }
    const res = await fetch(`${API_BASE}/questions/import`, options);
    const result = await res.json();
    if (result.success) {
      PortalEvents.emit('QUESTIONS_UPDATED', {});
    }
    return result;
  },

  async deleteAllQuestions(day = null) {
    const url = day ? `${API_BASE}/questions?day=${day}` : `${API_BASE}/questions`;
    const res = await fetch(url, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (result.success) {
      PortalEvents.emit('QUESTIONS_UPDATED', { day });
    }
    return result;
  },

  // Assessments & Submissions
  async submitAssessment(payload) {
    const res = await fetch(`${API_BASE}/assessments/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (result.success) {
      PortalEvents.emit('SUBMISSION_CREATED', {
        studentUsername: payload.studentUsername,
        day: payload.day,
        newAssignedDay: result.newAssignedDay,
        submissionId: result.submissionId,
      });
    }
    return result;
  },

  async getSubmissions(filter = {}) {
    const query = new URLSearchParams(filter).toString();
    const url = query ? `${API_BASE}/assessments?${query}` : `${API_BASE}/assessments`;
    const res = await fetch(url);
    return await res.json();
  },

  async getSubmission(id) {
    const res = await fetch(`${API_BASE}/assessments/${id}`);
    return await res.json();
  },

  async deleteSubmission(id) {
    const res = await fetch(`${API_BASE}/assessments/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (result.success) {
      PortalEvents.emit('SUBMISSION_DELETED', {
        submissionId: id,
        studentUsername: result.studentUsername,
        newAssignedDay: result.newAssignedDay,
      });
    }
    return result;
  },

  // Stats
  async getStats() {
    const res = await fetch(`${API_BASE}/stats`);
    return await res.json();
  },

  // Online Java Compiler Integration
  async compileCode(code, input = '') {
    const payload = {
      code: typeof code === 'string' ? code : '',
      input: typeof input === 'string' ? input : '',
    };

    // Primary attempt: backend proxy endpoint
    try {
      const res = await fetch(`${API_BASE}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[API.compileCode] Backend proxy failed, falling back to direct Catalyst endpoint:', e);
    }

    // Direct fallback to deployed compiler API
    try {
      const directRes = await fetch('https://appsail-50045987380.development.catalystappsail.in/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await directRes.json();
    } catch (directErr) {
      console.error('[API.compileCode] Direct compiler call failed:', directErr);
      return {
        success: false,
        output: `Compilation service unreachable. ${directErr.message || ''}`,
      };
    }
  },
};

// Global helper for user session
function getLoggedInUser() {
  try {
    const raw = localStorage.getItem('currentUser');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function requireAuth(allowedRoles) {
  try {
    const raw = localStorage.getItem('currentUser');
    if (!raw) {
      window.location.replace('index.html');
      return null;
    }
    const user = JSON.parse(raw);
    if (!user || !user.username) {
      localStorage.clear();
      window.location.replace('index.html');
      return null;
    }
    if (allowedRoles) {
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      if (!roles.includes(user.role)) {
        if (user.role === 'admin') {
          window.location.replace('admin.html');
        } else {
          window.location.replace('student.html');
        }
        return null;
      }
    }
    return user;
  } catch (e) {
    localStorage.clear();
    window.location.replace('index.html');
    return null;
  }
}

function setLoggedInUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
  localStorage.setItem('loggedInUser', user.role);
  localStorage.setItem('studentName', user.name || '');
  localStorage.setItem('studentUsername', user.username || '');
  localStorage.setItem('registerNumber', user.registerNumber || '');
  localStorage.setItem('department', user.department || '');
  localStorage.setItem('studentYear', user.year || '');
  localStorage.setItem('assignedDay', String(user.assignedDay || 1));
}

function logoutUser() {
  localStorage.clear();
  window.location.href = 'index.html';
}

window.API = API;
window.PortalEvents = PortalEvents;
window.getLoggedInUser = getLoggedInUser;
window.requireAuth = requireAuth;
window.setLoggedInUser = setLoggedInUser;
window.logoutUser = logoutUser;
