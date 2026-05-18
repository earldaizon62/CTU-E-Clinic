// ============================================================================
// CTU E-Clinic - script-enhanced.js
// ============================================================================

let students = [];
let appointments = [];
let queries = [];
let selectedStudentId = null;
let selectedAppointmentId = null;
let role = sessionStorage.getItem('role');
let studentId = sessionStorage.getItem('studentId');
let activityChart = null;

// ============================================================================
// NOTIFICATIONS
// ============================================================================

function showNotification(message, type = 'info', duration = 3500) {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = message;
    n.style.display = 'block';
    document.body.appendChild(n);
    setTimeout(() => n.remove(), duration);
}
function showSuccess(msg) { showNotification(msg, 'success'); }
function showError(msg)   { showNotification(msg, 'error');   console.error(msg); }
function showWarning(msg) { showNotification(msg, 'warning'); }
function showInfo(msg)    { showNotification(msg, 'info'); }

// ============================================================================
// VALIDATION
// ============================================================================

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validatePhone(phone) {
    return /^[\d\s\-\+\(\)]{7,}$/.test(phone);
}
function validateDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date instanceof Date && !isNaN(date) && date >= today;
}
function validateStudentForm() {
    const name     = document.getElementById('name')?.value.trim();
    const idNumber = document.getElementById('idNumber')?.value.trim();
    const course   = document.getElementById('course')?.value.trim();
    const section  = document.getElementById('section')?.value.trim();
    if (!name || !idNumber || !course || !section) {
        showWarning('Please fill in all required fields');
        return false;
    }
    return true;
}

// ============================================================================
// APPOINTMENT FORM VALUES
// For student dashboard: name comes from #fullName, id from #studentIdInput
// ============================================================================

function getAppointmentFormValues() {
    const date    = document.getElementById('appointmentDate')?.value;
    const time    = document.getElementById('appointmentTime')?.value;
    const concern = document.getElementById('concern')?.value;

    let name = '';
    let id   = '';

    if (role === 'admin') {
        name = document.getElementById('studentName')?.value.trim() || '';
        id   = document.getElementById('studentId')?.value.trim()   || '';
    } else {
        // FIX: student dashboard uses #fullName and #studentIdInput
        name = document.getElementById('fullName')?.value.trim() || sessionStorage.getItem('currentUser') || '';
        id   = document.getElementById('studentIdInput')?.value.trim() || studentId || '';
    }

    return { name, id, date, time, concern };
}

function validateAppointmentForm() {
    const { name, id, date, time, concern } = getAppointmentFormValues();
    if (!name || !id || !date || !time || !concern) {
        showWarning('Please fill in all required fields');
        return false;
    }
    if (!validateDate(date)) {
        showWarning('Please select a future date');
        return false;
    }
    return true;
}

// ============================================================================
// UTILITIES
// ============================================================================

function getWeeklyAppointments() {
    const weekData = [0,0,0,0,0,0,0];
    appointments.forEach(a => {
        if (a.date) {
            const day = new Date(a.date).getDay();
            weekData[day === 0 ? 6 : day - 1]++;
        }
    });
    return weekData;
}

function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}
function formatTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}
function formatDateTime(d, t) { return `${formatDate(d)} at ${formatTime(t)}`; }

function getCurrentUserDisplayName() {
    return document.getElementById('fullName')?.value.trim()
        || sessionStorage.getItem('currentUser')
        || 'Student';
}

// ============================================================================
// FIX: STUDENT ID AUTO-FILL
// Reads studentId from sessionStorage and fills all relevant fields.
// Element IDs confirmed from student-dashboard.html:
//   - #studentIdInput  (My Information section, readonly)
// ============================================================================

function prefillStudentIdFields() {
    if (role !== 'student' || !studentId) return;

    // All element IDs that should display the logged-in student's ID
    const targets = ['studentIdInput', 'studentId', 'profileStudentId'];
    targets.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = studentId;
    });
}

// ============================================================================
// FORM CLEARING
// ============================================================================

function clearStudentForm() {
    document.querySelector('.student-form')
        ?.querySelectorAll('input')
        .forEach(i => i.value = '');
    selectedStudentId = null;
    setStudentFormMode(false);
}

function clearAppointmentForm() {
    const form = document.querySelector('.appointment-form');
    if (form) {
        form.querySelectorAll('input:not([readonly])').forEach(i => i.value = '');
        form.querySelectorAll('select').forEach(s => s.value = '');
        form.querySelectorAll('textarea').forEach(t => t.value = '');
    }
    // Always re-fill student ID after clearing
    prefillStudentIdFields();
    selectedAppointmentId = null;
    setAppointmentMode(false);
}

function clearStudentInfoForm() {
    const form = document.querySelector('.student-info-form');
    if (form) {
        form.querySelectorAll('input:not([readonly])').forEach(i => i.value = '');
        form.querySelectorAll('textarea').forEach(t => t.value = '');
    }
    prefillStudentIdFields();
}

// ============================================================================
// FIX: STUDENT PROFILE LOAD
// Correct DB column name mapping + always prefer sessionStorage for student ID
// ============================================================================

async function loadStudentProfile() {
    if (role !== 'student') return;

    // Fill student ID immediately — don't wait for API
    prefillStudentIdFields();

    try {
        const response = await fetch('api/student_profile.php', {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            if (response.status === 404) {
                // New student with no profile yet — just keep ID filled
                prefillStudentIdFields();
                return;
            }
            console.error('Profile load failed:', response.status);
            return;
        }

        const profile = await response.json();

        // FIX: map HTML element IDs → actual DB column names (snake_case)
        const fieldMap = {
            'fullName':          'name',
            'course':            'course',
            'section':           'section',
            'contactNumber':     'contact_number',     // DB uses snake_case
            'emailAddress':      'email_address',      // DB uses snake_case
            'allergies':         'allergies',
            'medications':       'medications',
            'medicalConditions': 'medical_conditions'  // DB uses snake_case
        };

        Object.entries(fieldMap).forEach(([elId, dbField]) => {
            const el = document.getElementById(elId);
            if (el) el.value = profile[dbField] || '';
        });

        // FIX: always use sessionStorage over API for student ID
        const studentIdInput = document.getElementById('studentIdInput');
        if (studentIdInput) studentIdInput.value = studentId || profile.student_id || '';

        const usernameInput = document.getElementById('username');
        if (usernameInput) usernameInput.value = sessionStorage.getItem('currentUser') || '';

        // Re-fill all ID fields after profile loads
        prefillStudentIdFields();

    } catch (err) {
        console.error('Error loading profile:', err);
        prefillStudentIdFields(); // Still fill ID even on error
    }
}

async function saveStudentInfo() {
    const fullName          = document.getElementById('fullName')?.value.trim();
    const course            = document.getElementById('course')?.value.trim();
    const section           = document.getElementById('section')?.value.trim();
    const contactNumber     = document.getElementById('contactNumber')?.value.trim();
    const emailAddress      = document.getElementById('emailAddress')?.value.trim();
    const allergies         = document.getElementById('allergies')?.value.trim() || '';
    const medications       = document.getElementById('medications')?.value.trim() || '';
    const medicalConditions = document.getElementById('medicalConditions')?.value.trim() || '';

    if (!fullName || !course || !section || !contactNumber || !emailAddress) {
        showWarning('Please complete all required fields.');
        return;
    }
    if (!validateEmail(emailAddress)) {
        showWarning('Please enter a valid email address.');
        return;
    }
    if (!validatePhone(contactNumber)) {
        showWarning('Please enter a valid contact number.');
        return;
    }

    try {
        const response = await fetch('api/student_profile.php', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, course, section, contactNumber, emailAddress, allergies, medications, medicalConditions })
        });

        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Failed to save profile');
        showSuccess('Personal information saved successfully.');
    } catch (err) {
        showError('Save failed: ' + err.message);
    }
}

// ============================================================================
// QUERIES
// ============================================================================

async function loadQueries() {
    try {
        const url = role === 'admin' ? 'api/queries.php' : `api/queries.php?student_id=${studentId}`;
        const res = await fetch(url, { credentials: 'same-origin' });
        queries = res.ok ? await res.json() : [];
    } catch (e) {
        console.error('Error loading queries:', e);
        queries = [];
    }
}

function renderQueriesTable() {
    const tbody = document.getElementById('queriesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const list = role === 'admin' ? queries : queries.filter(q => q.student_id === studentId);

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${role === 'admin' ? 7 : 6}" style="text-align:center;padding:20px;">No queries found</td></tr>`;
        return;
    }

    list.forEach(q => {
        const date = q.submitted_at
            ? `${formatDate(q.submitted_at.split(' ')[0])} ${new Date(q.submitted_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`
            : 'Unknown';

        const badge   = `<span class="status-badge ${q.status === 'Resolved' ? 'resolved' : 'pending'}">${q.status}</span>`;
        const actions = role === 'admin'
            ? `<button class="edit" onclick="resolveQuery(${q.id})">Resolve</button> <button class="delete" onclick="deleteQueryEntry(${q.id})">Delete</button>`
            : `<button class="delete" onclick="deleteQueryEntry(${q.id})">Cancel</button>`;

        const tr = document.createElement('tr');
        tr.innerHTML = role === 'admin'
            ? `<td>${q.student_name||''}</td><td>${q.student_id||''}</td><td>${q.type}</td><td>${q.message}</td><td>${date}</td><td>${badge}</td><td>${actions}</td>`
            : `<td>${date}</td><td>${q.type}</td><td>${q.message}</td><td>${badge}</td><td>${q.response||'No response yet'}</td><td>${actions}</td>`;
        tbody.appendChild(tr);
    });
}

async function submitQuery() {
    const type    = document.getElementById('queryType')?.value;
    const message = document.getElementById('queryMessage')?.value.trim();

    if (!type || !message) { showWarning('Please provide a query type and message.'); return; }

    try {
        const res = await fetch('api/queries.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, student_name: getCurrentUserDisplayName(), type, message })
        });
        const result = await res.json();
        if (result.success) {
            showSuccess('Query submitted successfully.');
            document.getElementById('queryType').value    = '';
            document.getElementById('queryMessage').value = '';
            await loadQueries();
            renderQueriesTable();
        } else {
            showError(result.message || 'Failed to submit query');
        }
    } catch (e) { showError('Error: ' + e.message); }
}

async function resolveQuery(id) {
    try {
        const res = await fetch('api/queries.php', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: 'Resolved', response: 'Your query has been reviewed. The clinic staff will follow up shortly.' })
        });
        const result = await res.json();
        if (result.success) { showSuccess('Query resolved.'); await loadQueries(); renderQueriesTable(); }
        else showError(result.message || 'Failed');
    } catch (e) { showError('Error: ' + e.message); }
}

async function deleteQueryEntry(id) {
    const q = queries.find(q => q.id === id);
    if (!q) { showWarning('Query not found'); return; }
    if (role !== 'admin' && q.student_id !== studentId) { showWarning('Unauthorized'); return; }
    if (!confirm('Delete this query?')) return;

    try {
        const res = await fetch(`api/queries.php?id=${id}`, { method: 'DELETE', credentials: 'same-origin' });
        const result = await res.json();
        if (result.success) { showSuccess('Query deleted.'); await loadQueries(); renderQueriesTable(); }
        else showError(result.message || 'Failed');
    } catch (e) { showError('Error: ' + e.message); }
}

// ============================================================================
// PASSWORD
// ============================================================================

function updatePassword() {
    const cur  = document.getElementById('currentPassword')?.value.trim();
    const nw   = document.getElementById('newPassword')?.value.trim();
    const conf = document.getElementById('confirmPassword')?.value.trim();

    if (!cur || !nw || !conf)      { showWarning('Please fill in all password fields.'); return; }
    if (nw !== conf)               { showWarning('Passwords do not match.'); return; }
    if (nw.length < 6)             { showWarning('Password must be at least 6 characters.'); return; }

    showSuccess('Password updated. (Backend not yet configured.)');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value     = '';
    document.getElementById('confirmPassword').value = '';
}

// ============================================================================
// FORM MODE
// ============================================================================

function setStudentFormMode(editMode) {
    const add = document.querySelector('.student-form button[onclick="addStudent()"]');
    const upd = document.querySelector('.student-form button[onclick="updateStudent()"]');
    if (add) add.style.display = editMode ? 'none'         : 'inline-block';
    if (upd) upd.style.display = editMode ? 'inline-block' : 'none';
}
function setAppointmentMode(editMode) {
    const btn = document.querySelector('.appointment-form button[onclick="saveAppointment()"]');
    if (btn) btn.textContent = editMode ? 'Update Appointment' : 'Request Appointment';
}

// ============================================================================
// ACTIVITY
// ============================================================================

function addActivity(action) {
    const tbody = document.getElementById('activityTable');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${sessionStorage.getItem('currentUser')||'System'}</td><td>${action}</td><td>${new Date().toLocaleString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</td>`;
    tbody.prepend(tr);
    while (tbody.children.length > 10) tbody.removeChild(tbody.lastChild);
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

function updateDashboard() {
    const qs = document.getElementById('totalStudents');
    const qq = document.getElementById('totalQueries');
    const qa = document.getElementById('totalAppointments');
    const qt = document.getElementById('todayAppointments');

    if (qs) qs.innerText = students.length;
    if (qq) qq.innerText = role === 'admin' ? queries.length : queries.filter(q => q.student_id === studentId).length;
    if (qa) qa.innerText = role === 'admin'
        ? appointments.filter(a => a.status === 'Approved').length
        : appointments.filter(a => a.student_id === studentId && a.status === 'Approved').length;
    if (qt) {
        if (role === 'admin') {
            qt.innerText = appointments.filter(a => a.status === 'Pending').length;
        } else {
            const today = new Date().toISOString().split('T')[0];
            qt.innerText = appointments.filter(a => a.date === today && a.status === 'Approved').length;
        }
    }

    if (activityChart) {
        try { activityChart.data.datasets[0].data = getWeeklyAppointments(); activityChart.update(); }
        catch (e) { console.warn('Chart update failed:', e); }
    }
}

// ============================================================================
// LOAD DATA
// ============================================================================

async function loadData() {
    try {
        if (role === 'admin') {
            const res = await fetch('api/students.php', { credentials: 'same-origin' });
            students = res.ok ? await res.json() || [] : [];
        } else {
            students = [];
        }

        const apptRes = await fetch('api/appointments.php', { credentials: 'same-origin' });
        appointments = apptRes.ok ? await apptRes.json() || [] : [];

        renderStudentTable();
        renderAppointmentTable();

        try { initializeChart(); } catch (e) { console.warn('Chart failed:', e); }

        await loadStudentProfile();
        await loadQueries();
        renderQueriesTable();
        updateDashboard();

    } catch (e) { showError('Error loading data: ' + e.message); }
}

// ============================================================================
// AUTH
// ============================================================================

async function logout() {
    try { await fetch('api/logout.php', { credentials: 'same-origin' }); } catch (e) {}
    sessionStorage.clear();
    window.location.href = 'landing.html';
}

// ============================================================================
// STUDENT MANAGEMENT (ADMIN)
// ============================================================================

async function addStudent() {
    if (role !== 'admin') { showWarning('Unauthorized'); return; }
    if (!validateStudentForm()) return;

    const name     = document.getElementById('name').value.trim();
    const idNumber = document.getElementById('idNumber').value.trim();
    const course   = document.getElementById('course').value.trim();
    const section  = document.getElementById('section').value.trim();

    try {
        const res = await fetch('api/students.php', {
            credentials: 'same-origin', method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, idNumber, course, section })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || result.message || 'Failed');
        showSuccess(`Student "${name}" added`);
        await loadData();
        addActivity(`Added student: ${name}`);
        clearStudentForm();
    } catch (e) { showError(e.message); }
}

async function updateStudent() {
    if (role !== 'admin' || !selectedStudentId) return;
    if (!validateStudentForm()) return;

    const name     = document.getElementById('name').value.trim();
    const idNumber = document.getElementById('idNumber').value.trim();
    const course   = document.getElementById('course').value.trim();
    const section  = document.getElementById('section').value.trim();

    try {
        const res = await fetch('api/students.php', {
            credentials: 'same-origin', method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedStudentId, name, idNumber, course, section })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || result.message || 'Failed');
        showSuccess(`Student "${name}" updated`);
        await loadData();
        addActivity(`Updated student: ${name}`);
        clearStudentForm();
    } catch (e) { showError(e.message); }
}

function editStudent(id) {
    const s = students.find(s => s.id == id);
    if (!s) { showWarning('Not found'); return; }
    selectedStudentId = id;
    document.getElementById('name').value     = s.name;
    document.getElementById('idNumber').value = s.student_id;
    document.getElementById('course').value   = s.course;
    document.getElementById('section').value  = s.section;
    setStudentFormMode(true);
    window.scrollTo(0, 0);
}

async function deleteStudent(id) {
    if (role !== 'admin') { showWarning('Unauthorized'); return; }
    const s = students.find(s => s.id == id);
    if (!s) { showWarning('Not found'); return; }
    if (!confirm(`Delete ${s.name}?`)) return;

    try {
        const res = await fetch(`api/students.php?id=${id}`, { credentials: 'same-origin', method: 'DELETE' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || result.message || 'Failed');
        showSuccess(`"${s.name}" deleted`);
        await loadData();
        addActivity(`Deleted student: ${s.name}`);
    } catch (e) { showError(e.message); }
}

function renderStudentTable() {
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No students found</td></tr>';
        return;
    }
    students.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${s.name}</td><td>${s.student_id}</td><td>${s.course}</td><td>${s.section}</td><td>${s.contact_number||''}</td><td>${s.email_address||''}</td><td><button class="edit" onclick="editStudent(${s.id})">Edit</button> <button class="delete" onclick="deleteStudent(${s.id})">Delete</button></td>`;
        tbody.appendChild(tr);
    });
}

// ============================================================================
// APPOINTMENTS
// ============================================================================

async function saveAppointment() {
    selectedAppointmentId ? await updateAppointment() : await addAppointment();
}

async function addAppointment() {
    if (!validateAppointmentForm()) return;
    const { name, id, date, time, concern } = getAppointmentFormValues();

    if (role !== 'admin' && id !== studentId) {
        showWarning('You can only book appointments for yourself');
        return;
    }

    try {
        const res = await fetch('api/appointments.php', {
            credentials: 'same-origin', method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, id, date, time, concern })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || result.message || 'Failed');
        showSuccess(`Appointment scheduled for ${formatDateTime(date, time)}`);
        await loadData();
        addActivity(`Scheduled appointment on ${formatDate(date)}`);
        clearAppointmentForm();
    } catch (e) { showError(e.message); }
}

async function updateAppointment() {
    if (!selectedAppointmentId || !validateAppointmentForm()) return;
    const { name, id, date, time, concern } = getAppointmentFormValues();

    if (role !== 'admin' && id !== studentId) {
        showWarning('You can only update your own appointments');
        return;
    }

    try {
        const res = await fetch('api/appointments.php', {
            credentials: 'same-origin', method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedAppointmentId, name, student_id: id, date, time, concern })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || result.message || 'Failed');
        showSuccess('Appointment updated');
        await loadData();
        clearAppointmentForm();
    } catch (e) { showError(e.message); }
}

function editAppointment(id) {
    const a = appointments.find(a => a.id == id);
    if (!a) { showWarning('Not found'); return; }
    if (role !== 'admin' && a.student_id !== studentId) { showWarning('Unauthorized'); return; }

    selectedAppointmentId = id;
    document.getElementById('appointmentDate').value = a.date;
    document.getElementById('appointmentTime').value = a.time;
    document.getElementById('concern').value         = a.concern;

    if (role !== 'admin') {
        const fn = document.getElementById('fullName');
        const si = document.getElementById('studentIdInput');
        if (fn) fn.value = a.name;
        if (si) si.value = a.student_id;
    }

    setAppointmentMode(true);
    window.scrollTo(0, 0);
}

async function deleteAppointment(id) {
    const a = appointments.find(a => a.id == id);
    if (!a) { showWarning('Not found'); return; }
    if (role !== 'admin' && a.student_id !== studentId) { showWarning('Unauthorized'); return; }
    if (!confirm(`Delete appointment on ${formatDate(a.date)}?`)) return;

    try {
        const res = await fetch(`api/appointments.php?id=${id}`, { credentials: 'same-origin', method: 'DELETE' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || result.message || 'Failed');
        showSuccess('Appointment deleted');
        await loadData();
        clearAppointmentForm();
    } catch (e) { showError(e.message); }
}

async function updateAppointmentStatus(id, status) {
    if (role !== 'admin') { showError('Unauthorized'); return; }
    const adminNotes = status === 'Rejected' ? (prompt('Reason for rejection (optional):') || '') : '';

    try {
        const res = await fetch('api/appointments.php', {
            credentials: 'same-origin', method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status, admin_notes: adminNotes })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || result.message || 'Failed');
        showSuccess(`Appointment ${status.toLowerCase()}`);
        await loadData();
    } catch (e) { showError(e.message); }
}

function renderAppointmentTable() {
    const tbody = document.querySelector('#appointmentTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const list = role === 'admin' ? appointments : appointments.filter(a => a.student_id === studentId);
    const isAdmin = role === 'admin';

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 7 : 5}" style="text-align:center;padding:20px;">No appointments found</td></tr>`;
        return;
    }

    list.forEach(a => {
        const canEdit = role === 'admin' || (a.student_id === studentId && a.status === 'Pending');
        let btns = '';
        if (canEdit) btns += `<button class="edit" onclick="editAppointment(${a.id})">Edit</button> <button class="delete" onclick="deleteAppointment(${a.id})">Delete</button> `;
        if (isAdmin && a.status === 'Pending') btns += `<button class="approve" onclick="updateAppointmentStatus(${a.id},'Approved')">Approve</button> <button class="reject" onclick="updateAppointmentStatus(${a.id},'Rejected')">Reject</button>`;

        const statusClass = a.status === 'Approved' ? 'resolved' : a.status === 'Rejected' ? 'error' : 'pending';
        const badge = `<span class="status-badge ${statusClass}">${a.status}</span>`;
        const tr = document.createElement('tr');

        tr.innerHTML = isAdmin
            ? `<td>${a.name}</td><td>${a.student_id}</td><td>${formatDate(a.date)}</td><td>${formatTime(a.time)}</td><td>${a.concern}</td><td>${badge}</td><td>${btns}</td>`
            : `<td>${formatDate(a.date)}</td><td>${formatTime(a.time)}</td><td>${a.concern}</td><td>${badge}</td><td>${btns}</td>`;
        tbody.appendChild(tr);
    });
}

// ============================================================================
// CHART
// ============================================================================

function initializeChart() {
    const el = document.getElementById('activityChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    if (activityChart) { try { activityChart.destroy(); } catch(e){} activityChart = null; }

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
            datasets: [{ label:'Appointments', data: getWeeklyAppointments(), borderColor:'#1e88e5', backgroundColor:'rgba(30,136,229,0.1)', borderWidth:2, fill:true, tension:0.4, pointBackgroundColor:'#1e88e5', pointBorderColor:'#fff', pointBorderWidth:2, pointRadius:5, pointHoverRadius:7 }]
        },
        options: { responsive:true, maintainAspectRatio:true, plugins:{legend:{display:true,position:'top'}}, scales:{y:{beginAtZero:true,ticks:{stepSize:1}}} }
    });
}

// ============================================================================
// INIT
// ============================================================================

async function init() {
    if (sessionStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    const page = window.location.pathname.split('/').pop();
    if (role === 'admin'   && page === 'student-dashboard.html') { window.location.href = 'admin-dashboard.html'; return; }
    if (role === 'student' && page === 'admin-dashboard.html')   { window.location.href = 'student-dashboard.html'; return; }

    if (role !== 'admin') document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');

    setStudentFormMode(false);
    setAppointmentMode(false);

    // *** FIX: Fill student ID fields right now, before any API call ***
    prefillStudentIdFields();

    document.getElementById('logoutLink')?.addEventListener('click', e => { e.preventDefault(); logout(); });

    await loadData();
    window.initComplete = true;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================
window.logout                  = logout;
window.showSuccess             = showSuccess;
window.showError               = showError;
window.showWarning             = showWarning;
window.addStudent              = addStudent;
window.updateStudent           = updateStudent;
window.editStudent             = editStudent;
window.deleteStudent           = deleteStudent;
window.saveAppointment         = saveAppointment;
window.addAppointment          = addAppointment;
window.updateAppointment       = updateAppointment;
window.editAppointment         = editAppointment;
window.deleteAppointment       = deleteAppointment;
window.updateAppointmentStatus = updateAppointmentStatus;
window.clearStudentForm        = clearStudentForm;
window.clearAppointmentForm    = clearAppointmentForm;
window.clearStudentInfoForm    = clearStudentInfoForm;
window.saveStudentInfo         = saveStudentInfo;
window.submitQuery             = submitQuery;
window.updatePassword          = updatePassword;
window.resolveQuery            = resolveQuery;
window.deleteQueryEntry        = deleteQueryEntry;