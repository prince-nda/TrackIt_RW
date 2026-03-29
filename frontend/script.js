const API_BASE = 'http://localhost:5000/api';
let token = localStorage.getItem('token');
console.log("TOKEN:", token);
let userId = localStorage.getItem('userId');
let allCategories = [];
let allUserReports = [];

// ─────────────────────────────────────────
// Authenticated fetch — auto-handles 401
// ─────────────────────────────────────────
async function apiFetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        // Token expired or invalid — force re-login
        token = null; userId = null; allUserReports = [];
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        toast('Your session has expired. Please log in again.', 'warning');
        showAuth();
        throw new Error('Session expired');
    }
    return res;
}

// ─────────────────────────────────────────
// Toast notification
// ─────────────────────────────────────────
function toast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(container);
    }
    const icons  = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const colors = {
        success: { bg: '#D1FAE5', border: '#059669', text: '#065F46', icon: '#059669' },
        error:   { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B', icon: '#DC2626' },
        info:    { bg: '#DBEAFE', border: '#1A6FD4', text: '#1E40AF', icon: '#1A6FD4' },
        warning: { bg: '#FEF3C7', border: '#D97706', text: '#92400E', icon: '#D97706' }
    };
    const c = colors[type] || colors.info;
    if (!document.getElementById('toastKeyframes')) {
        const style = document.createElement('style');
        style.id = 'toastKeyframes';
        style.textContent = `
            @keyframes toastIn  { from{opacity:0;transform:translateY(14px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
            @keyframes toastOut { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(.92)} }`;
        document.head.appendChild(style);
    }
    const t = document.createElement('div');
    t.style.cssText = `display:flex;align-items:flex-start;gap:10px;background:${c.bg};border:1.5px solid ${c.border};border-radius:14px;padding:13px 18px;min-width:280px;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,.10);pointer-events:all;font-family:'Plus Jakarta Sans',sans-serif;font-size:.875rem;color:${c.text};animation:toastIn .28s cubic-bezier(.34,1.56,.64,1);cursor:default;`;
    t.innerHTML = `<span style="font-size:1rem;color:${c.icon};margin-top:1px;flex-shrink:0;">${icons[type]}</span><span style="flex:1;line-height:1.5;">${message}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:${c.text};opacity:.6;font-size:1rem;padding:0;line-height:1;">×</button>`;
    container.appendChild(t);
    setTimeout(() => { t.style.animation = 'toastOut .22s ease forwards'; setTimeout(() => t.remove(), 220); }, duration);
}

// ─────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    if (token) { showDashboard(); loadCategories(); loadReports(); } else { showAuth(); }

    document.getElementById('loginBtn').addEventListener('click', showLogin);
    document.getElementById('registerBtn').addEventListener('click', showRegister);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    document.getElementById('loginFormEl').addEventListener('submit', handleLogin);
    document.getElementById('registerFormEl').addEventListener('submit', handleRegister);

    // Nav — all wired in JS so role-check can control adminNavBtn
    document.getElementById('submitReportNavBtn')?.addEventListener('click', showReportSubmissionPage);
    document.getElementById('trackReportNavBtn')?.addEventListener('click', showReportTrackingPage);
    document.getElementById('dashboardNavBtn')?.addEventListener('click', showDashboard);
    document.getElementById('adminNavBtn')?.addEventListener('click', showAdminDashboard);
    document.getElementById('mapNavBtn')?.addEventListener('click', showMapView);
    document.getElementById('notificationBell')?.addEventListener('click', showReportTrackingPage);

    document.getElementById('reportSubmissionForm')?.addEventListener('submit', handleReportSubmission);
    document.getElementById('submissionDescription')?.addEventListener('input', updateCharCount);
    document.getElementById('submissionAnonymous')?.addEventListener('change', toggleContactInfo);
    document.getElementById('submissionPhoto')?.addEventListener('change', handlePhotoPreview);

    // ADDED: filters call applyTrackingFilters (client-side) instead of re-fetching
    document.getElementById('trackingStatusFilter')?.addEventListener('change', applyTrackingFilters);
    document.getElementById('trackingCategoryFilter')?.addEventListener('change', applyTrackingFilters);
    document.getElementById('trackingRefreshBtn')?.addEventListener('click', loadUserReports);

    document.getElementById('adminStatusFilter')?.addEventListener('change', applyAdminFilters);
    document.getElementById('adminCategoryFilter')?.addEventListener('change', applyAdminFilters);
    document.getElementById('adminDistrictFilter')?.addEventListener('input', applyAdminFilters);
    document.getElementById('adminPhotoFilter')?.addEventListener('change', applyAdminFilters);
    document.getElementById('adminRefreshBtn')?.addEventListener('click', loadAdminReports);
    document.getElementById('adminUpdateStatusForm')?.addEventListener('submit', handleAdminStatusUpdate);

    // ADDED: modal backdrop click-to-close (reportDetailModal now exists in HTML)
    document.getElementById('reportDetailModal')?.addEventListener('click', function (e) { if (e.target === this) closeReportModal(); });
    document.getElementById('adminUpdateModal')?.addEventListener('click', function (e) { if (e.target === this) closeAdminModal(); });
    document.getElementById('forgotPasswordModal')?.addEventListener('click', function (e) { if (e.target === this) closeForgotModal(); });

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeReportModal(); closeAdminModal(); closeForgotModal(); } });
});

// ─────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────
function hideAllSections() {
    ['authSection','dashboard','reportSubmissionPage','reportTrackingPage','mapViewPage','adminDashboardPage']
        .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
}

// ADDED: decode JWT payload to read role claim without any library
function getUserRole() {
    try {
        const t = localStorage.getItem('token');
        if (!t || typeof t !== 'string' || !t.includes('.')) return null;
        const base64 = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '=='.slice((base64.length % 4) || 4);
        const payload = JSON.parse(atob(padded));
        return payload.role || null;
    } catch (e) {
        console.warn('getUserRole failed:', e);
        return null;
    }
}

// ADDED: adminNavBtn only visible when logged in AND role === 'admin'
function updateNavVisibility() {
    const isLoggedIn = !!localStorage.getItem('token');
    const isAdmin    = getUserRole() === 'Admin';

    document.getElementById('loginBtn').style.display           = isLoggedIn ? 'none'        : 'inline-flex';
    document.getElementById('registerBtn').style.display        = isLoggedIn ? 'none'        : 'inline-flex';
    document.getElementById('logoutBtn').style.display          = isLoggedIn ? 'inline-flex' : 'none';
    // Citizens only — hide these from admins
    document.getElementById('submitReportNavBtn').style.display = (isLoggedIn && !isAdmin) ? 'inline-flex' : 'none';
    document.getElementById('trackReportNavBtn').style.display  = (isLoggedIn && !isAdmin) ? 'inline-flex' : 'none';
    document.getElementById('dashboardNavBtn').style.display    = (isLoggedIn && !isAdmin) ? 'inline-flex' : 'none';
    document.getElementById('mapNavBtn').style.display          = (isLoggedIn && !isAdmin) ? 'inline-flex' : 'none';
    document.getElementById('notificationBell').style.display   = (isLoggedIn && !isAdmin) ? 'flex'        : 'none';
    // Admin only
    document.getElementById('adminNavBtn').style.display        = (isLoggedIn && isAdmin)  ? 'inline-flex' : 'none';
}

function showSection(id) {
    hideAllSections();
    const el = document.getElementById(id);
    if (el) { el.style.display = 'block'; el.style.animation = 'none'; requestAnimationFrame(() => { el.style.animation = ''; }); }
    updateNavVisibility();
}

function showAuth()                { showSection('authSection'); }
function showReportSubmissionPage(){ showSection('reportSubmissionPage'); loadCategoriesForSubmission(); setTimeout(() => { initSubmissionMapPicker(); }, 250); }
function showReportTrackingPage()  { showSection('reportTrackingPage'); loadUserReports(); loadCategoriesForTracking(); }
async function showAdminDashboard() {
    showSection('adminDashboardPage');
    // Ensure categories are loaded before rendering admin filters
    if (allCategories.length === 0) await loadCategories();
    loadAdminReports();
}
function showMapView()             { showSection('mapViewPage'); initMap(); fetchMapReports(); }
function showDashboard() {
    if (getUserRole() === 'Admin') {
        showAdminDashboard();
    } else {
        showSection('dashboard'); loadCategories(); loadReports();
    }
}
function showLogin()    { document.getElementById('loginForm').style.display = 'block'; document.getElementById('registerForm').style.display = 'none'; }
function showRegister() { document.getElementById('loginForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block'; }

// ─────────────────────────────────────────
// Auth
// ─────────────────────────────────────────
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setLoading(btn, true);
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value })
        });
        const data = await res.json();
        if (res.ok) {
            token = data.access_token; userId = data.user.id;
            localStorage.setItem('token', token); localStorage.setItem('userId', userId);
            toast('Welcome back! You are now logged in.', 'success');
            showDashboard();
        } else { toast(data.message || 'Login failed. Please check your credentials.', 'error'); }
    } catch (err) { console.error('Login error:', err); toast('Unable to connect. Please try again.', 'error'); }
    finally { setLoading(btn, false); }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setLoading(btn, true);
    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: document.getElementById('regUsername').value, email: document.getElementById('regEmail').value, password: document.getElementById('regPassword').value, phone_number: document.getElementById('regPhone').value })
        });
        const data = await res.json();
        if (res.ok) { toast('Account created successfully! Please log in.', 'success'); showLogin(); }
        else { toast(data.message || 'Registration failed.', 'error'); }
    } catch (err) { console.error('Register error:', err); toast('Unable to connect. Please try again.', 'error'); }
    finally { setLoading(btn, false); }
}

function logout() {
    token = null; userId = null; allUserReports = [];
    localStorage.removeItem('token'); localStorage.removeItem('userId');
    toast('You have been logged out.', 'info'); showAuth();
}

// ─────────────────────────────────────────
// Categories
// ─────────────────────────────────────────
async function loadCategories() {
    try {
        const res = await fetch(`${API_BASE}/categories`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allCategories = await res.json();
        const list = document.getElementById('categoriesList');
        if (list) { list.innerHTML = ''; allCategories.forEach(cat => { list.innerHTML += `<li><strong>${escapeHtml(cat.name)}</strong>${cat.description ? ' — ' + escapeHtml(cat.description) : ''}</li>`; }); }
        loadCategoriesForSubmission(); loadCategoriesForTracking();
    } catch (err) { console.error('Load categories error:', err); }
}

function loadCategoriesForSubmission() {
    const select = document.getElementById('submissionCategory');
    if (!select) return;
    select.innerHTML = '<option value="">Select a category</option>';
    allCategories.forEach(cat => { select.innerHTML += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`; });
}

function loadCategoriesForTracking() {
    const select = document.getElementById('trackingCategoryFilter');
    if (!select) return;
    select.innerHTML = '<option value="">All Categories</option>';
    allCategories.forEach(cat => { select.innerHTML += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`; });
}

// ─────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────
async function loadReports() {
    if (!token) return; // not logged in, skip silently
    try {
        const res = await apiFetch(`${API_BASE}/reports/user`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const reports = Array.isArray(data) ? data : (data.reports || []);
        const list = document.getElementById('reportsList');
        if (!list) return;
        if (reports.length === 0) {
            list.innerHTML = '<li style="color:var(--stone);font-style:italic;">You haven\'t submitted any reports yet.</li>';
            return;
        }
        list.innerHTML = '';
        reports.slice(0, 8).forEach(report => {
            const sc = statusClass(report.status);
            list.innerHTML += `<li style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--parchment);"><span><strong>${escapeHtml(report.title)}</strong><br><small style="color:var(--stone);">${report.category?.name || 'N/A'}</small></span><span class="status-badge ${sc}" style="font-size:.7rem;">${report.status}</span></li>`;
        });
    } catch (err) {
        if (err.message === 'Session expired') return; // apiFetch already handled redirect
        console.error('Load reports error:', err);
    }
}

// ─────────────────────────────────────────
// Submission form helpers
// ─────────────────────────────────────────
function updateCharCount() {
    const len = document.getElementById('submissionDescription').value.length;
    const el = document.getElementById('charCount');
    if (el) { el.textContent = len; el.style.color = len > 900 ? '#EF4444' : 'var(--stone)'; }
}

function toggleContactInfo() {
    const isAnon = document.getElementById('submissionAnonymous').checked;
    const section = document.getElementById('contactInfoSection');
    if (!section) return;
    section.style.opacity = isAnon ? '0.4' : '1';
    section.style.pointerEvents = isAnon ? 'none' : 'auto';
}

function handlePhotoPreview(e) {
    const file = e.target.files[0];
    const nameSpan = document.getElementById('photoFileName');
    const preview  = document.getElementById('photoPreview');
    const img      = document.getElementById('previewImage');
    if (!file) { nameSpan.textContent = 'Click to upload a photo…'; preview.style.display = 'none'; return; }
    if (file.size > 5 * 1024 * 1024) { toast('File size exceeds 5 MB. Please choose a smaller image.', 'warning'); e.target.value = ''; nameSpan.textContent = 'Click to upload a photo…'; preview.style.display = 'none'; return; }
    nameSpan.textContent = file.name;
    const reader = new FileReader();
    reader.onload = ev => { img.src = ev.target.result; preview.style.display = 'block'; };
    reader.readAsDataURL(file);
}

// ADDED: mirrors validators.py coordinate bounds exactly
function validateCoordinates(lat, lng) {
    if (isNaN(lat) || isNaN(lng)) return 'Coordinates must be valid numbers.';
    if (lat < -90  || lat > 90)   return 'Latitude must be between -90 and 90.';
    if (lng < -180 || lng > 180)  return 'Longitude must be between -180 and 180.';
    return null;
}

// ADDED: converts a File to a base64 data-URL for the Cloudinary upload endpoint
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// POSTs base64 image to /api/reports/photos/upload → Cloudinary → returns URL
async function uploadPhotoIfPresent() {
    const input = document.getElementById('submissionPhoto');
    const file  = input?.files?.[0];
    if (!file) return null;
    try {
        const base64Data = await fileToBase64(file);
        const res = await apiFetch(`${API_BASE}/reports/photos/upload`, {
            method: 'POST',
            body: JSON.stringify({ image: base64Data })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            const msg = data.error || 'Upload failed';
            toast(`Photo upload failed: ${msg}`, 'error', 7000);
            return null;
        }
        return data.url || data.secure_url || null;
    } catch (err) {
        if (err.message === 'Session expired') return null;
        console.error('Photo upload error:', err);
        toast('Photo upload failed — submitting report without photo.', 'warning');
        return null;
    }
}

// ─────────────────────────────────────────
// Report submission
// ─────────────────────────────────────────
async function handleReportSubmission(e) {
    e.preventDefault();
    const btn = e.target.querySelector('.btn-primary');
    setLoading(btn, true);

    const title        = document.getElementById('submissionTitle').value.trim();
    const description  = document.getElementById('submissionDescription').value.trim();
    const category_id  = document.getElementById('submissionCategory').value;
    const address      = document.getElementById('submissionAddress').value.trim();
    const latRaw       = document.getElementById('submissionLat').value;
    const lngRaw       = document.getElementById('submissionLng').value;
    const latitude     = latRaw ? parseFloat(latRaw) : 0;
    const longitude    = lngRaw ? parseFloat(lngRaw) : 0;
    const is_anonymous = document.getElementById('submissionAnonymous').checked;

    if (!title || !description || !category_id || !address) {
        toast('Please fill in all required fields.', 'warning'); setLoading(btn, false); return;
    }

    // ADDED: validate coords before sending — mirrors validators.py bounds check
    if (latRaw || lngRaw) {
        const coordError = validateCoordinates(latitude, longitude);
        if (coordError) { toast(coordError, 'warning'); setLoading(btn, false); return; }
    }

    try {
        // Step 1: upload photo first (returns Cloudinary URL or null)
        const photoUrl = await uploadPhotoIfPresent();

        // Step 2: send everything in one request — backend creates location internally
        const payload = {
            title,
            description,
            category_id: parseInt(category_id),
            latitude,
            longitude,
            address,
            is_anonymous
        };
        if (photoUrl) payload.photo_url = photoUrl;

        const repRes = await apiFetch(`${API_BASE}/reports`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (repRes.ok) {
            const repData = await repRes.json();
            showMessage(`Report submitted! ID: #${repData.report_id}`, 'success');
            toast(`Report #${repData.report_id} submitted successfully!`, 'success', 5000);
            e.target.reset();
            document.getElementById('charCount').textContent = '0';
            document.getElementById('photoFileName').textContent = 'Click to upload a photo…';
            document.getElementById('photoPreview').style.display = 'none';
            clearMapPin();
            toggleContactInfo();
            setTimeout(showReportTrackingPage, 2200);
        } else {
            const err = await repRes.json();
            showMessage(err.error || 'Failed to submit report', 'error');
            toast(err.error || 'Failed to submit report', 'error');
        }
    } catch (err) {
        console.error('Submission error:', err);
        showMessage('An error occurred: ' + err.message, 'error');
        toast('An error occurred. Please try again.', 'error');
    } finally { setLoading(btn, false); }
}

function showMessage(message, type) {
    const div = document.getElementById('submissionMessage');
    if (!div) return;
    div.textContent = message; div.style.display = 'block';
    div.style.padding = '14px 18px'; div.style.borderRadius = '12px';
    div.style.fontSize = '.875rem'; div.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
    if (type === 'success') { div.style.background = '#D1FAE5'; div.style.color = '#065F46'; div.style.border = '1.5px solid #059669'; setTimeout(() => { div.style.display = 'none'; }, 5000); }
    else { div.style.background = '#FEE2E2'; div.style.color = '#991B1B'; div.style.border = '1.5px solid #DC2626'; }
}

// ─────────────────────────────────────────
// User report tracking
// ─────────────────────────────────────────
async function loadUserReports() {
    if (!token) return;
    const list = document.getElementById('trackingReportsList');
    if (list) list.innerHTML = '<div class="empty-state"><p>Loading your reports…</p></div>';
    try {
        const resp = await apiFetch(`${API_BASE}/reports/user`);
        if (!resp.ok) throw new Error('Failed to fetch your reports.');
        allUserReports = await resp.json();
        applyTrackingFilters();
    } catch (err) {
        if (err.message === 'Session expired') return;
        console.error('Load user reports error:', err);
        if (list) list.innerHTML = '<div class="empty-state"><p>Error loading reports. Please try again.</p></div>';
        toast('Failed to load reports.', 'error');
    }
}

// ADDED: filters cached reports client-side — no extra network round-trip
function applyTrackingFilters() {
    const statusFilter   = document.getElementById('trackingStatusFilter')?.value  || '';
    const categoryFilter = document.getElementById('trackingCategoryFilter')?.value || '';
    const filtered = allUserReports.filter(r => {
        const matchStatus   = !statusFilter   || r.status === statusFilter;
        const matchCategory = !categoryFilter || String(r.category?.id) === categoryFilter;
        return matchStatus && matchCategory;
    });
    renderUserReports(filtered);
}

// ADDED: shared render function used by both loadUserReports and applyTrackingFilters
function renderUserReports(reports) {
    const list = document.getElementById('trackingReportsList');
    if (!list) return;
    if (reports.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><p>No reports match your filters.<br><a href="#" onclick="showReportSubmissionPage();return false;" style="color:var(--sky);font-weight:600;">Submit your first report →</a></p></div>`;
        return;
    }
    list.innerHTML = '';
    reports.forEach(report => {
        const sc   = statusClass(report.status);
        const date = new Date(report.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
        const card = document.createElement('div');
        card.className = 'report-card';
        const photoSection = report.photo_url
            ? `<div style="margin-bottom:10px;border-radius:var(--r-md);overflow:hidden;max-height:160px;"><img src="${report.photo_url}" alt="Report photo" style="width:100%;max-height:160px;object-fit:cover;display:block;" loading="lazy"></div>`
            : '';
        card.innerHTML = `
            <div class="report-card-header">
                <div class="report-card-title">
                    <h3>${escapeHtml(report.title)}</h3>
                    <small>Report #${report.id} &nbsp;·&nbsp; Submitted ${date}</small>
                </div>
                <span class="status-badge ${sc}">${report.status}</span>
            </div>
            ${photoSection}
            <div class="report-card-body">
                <p><strong>Category:</strong> ${report.category?.name || 'N/A'}</p>
                <p><strong>Location:</strong> ${report.location?.address || 'N/A'}</p>
                <p>${escapeHtml(report.description.substring(0, 150))}${report.description.length > 150 ? '…' : ''}</p>
            </div>
            <div class="report-card-footer">
                <small>Last updated: ${new Date(report.created_at).toLocaleDateString()}</small>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button class="view-details-btn" onclick="viewReportDetails(${report.id})">View Details →</button>
                    ${report.status === 'Pending'
                        ? `<button onclick="deleteReport(${report.id}, '${escapeHtml(report.title)}')" style="background:var(--ruby-bg);color:var(--ruby);border:1.5px solid var(--ruby);border-radius:var(--r-pill);padding:7px 14px;font-size:.78rem;font-weight:700;cursor:pointer;font-family:var(--font-sans);transition:all var(--ease);" onmouseover="this.style.background='var(--ruby)';this.style.color='#fff'" onmouseout="this.style.background='var(--ruby-bg)';this.style.color='var(--ruby)'">Delete</button>`
                        : ''}
                </div>
            </div>`;
        list.appendChild(card);
    });
}

// ─────────────────────────────────────────
// Report detail modal
// ─────────────────────────────────────────
async function viewReportDetails(reportId) {
    try {
        const res = await apiFetch(`${API_BASE}/reports/${reportId}`);
        if (!res.ok) throw new Error('Failed to load report details');
        const data   = await res.json();
        const report = data.report || data; // handles both {report:{}} and flat object

        document.getElementById('modalReportId').textContent          = report.id;
        document.getElementById('modalReportTitle').textContent       = escapeHtml(report.title);
        document.getElementById('modalReportCategory').textContent    = report.category?.name || 'N/A';
        document.getElementById('modalReportSubmitted').textContent   = new Date(report.created_at).toLocaleString();
        document.getElementById('modalReportDescription').textContent = escapeHtml(report.description);
        document.getElementById('modalReportLocation').textContent    = report.location?.address || 'N/A';

        const statusEl = document.getElementById('modalReportStatus');
        statusEl.textContent = report.status;
        statusEl.className   = `status-badge ${statusClass(report.status)}`;

        const coordEl = document.getElementById('modalReportCoordinates');
        if (report.location?.latitude && report.location?.longitude) {
            coordEl.style.display = 'block';
            document.getElementById('modalReportGPS').textContent = `${report.location.latitude}, ${report.location.longitude}`;
        } else { coordEl.style.display = 'none'; }

        // ADDED: show Cloudinary photo when present; hide section otherwise
        const photoSection = document.getElementById('modalPhotoSection');
        const photoImg     = document.getElementById('modalReportPhoto');
        if (report.photo_url) { photoImg.src = report.photo_url; photoSection.style.display = 'block'; }
        else { photoSection.style.display = 'none'; }

        await loadReportStatusHistory(report);
        await loadReportComments(reportId);

        // Show delete button in footer only if report is still Pending
        const footer = document.querySelector('#reportDetailModal .modal-footer');
        if (footer && report.status === 'Pending') {
            footer.innerHTML = `
                <div style="display:flex;gap:10px;width:100%;justify-content:space-between;align-items:center;">
                    <button onclick="deleteReport(${report.id}, '${escapeHtml(report.title).replace(/'/g, "\\'")}')"
                        style="background:var(--ruby-bg);color:var(--ruby);border:1.5px solid var(--ruby);border-radius:var(--r-pill);padding:9px 20px;font-size:.85rem;font-weight:700;cursor:pointer;font-family:var(--font-sans);">
                        🗑 Delete Report
                    </button>
                    <button class="btn-secondary" onclick="closeReportModal()">Close</button>
                </div>`;
        } else if (footer) {
            footer.innerHTML = '<button class="btn-secondary" onclick="closeReportModal()">Close</button>';
        }

        document.getElementById('reportDetailModal').style.display = 'flex';
    } catch (err) { console.error('View details error:', err); toast('Failed to load report details.', 'error'); }
}

async function loadReportStatusHistory(report) {
    const container = document.getElementById('modalStatusHistory');
    if (!container) return;
    const date = new Date(report.created_at).toLocaleString();
    container.innerHTML = `
        <div class="timeline-item"><div class="timeline-content"><strong>Report Submitted</strong><br><small style="color:var(--stone);">${date}</small></div></div>
        ${report.status !== 'Pending' ? `<div class="timeline-item"><div class="timeline-content"><strong>Status: ${report.status}</strong><br><small style="color:var(--stone);">Updated by admin</small></div></div>` : ''}`;
}

async function loadReportComments(reportId) {
    const container = document.getElementById('modalReportComments');
    if (container) container.innerHTML = '<p class="placeholder">No updates yet</p>';
}

function closeReportModal() {
    const modal = document.getElementById('reportDetailModal');
    if (modal) modal.style.display = 'none';
    // remove admin-only reporter section if present (so it doesn't show for citizens)
    const adminSection = document.getElementById('adminModalReporterSection');
    if (adminSection) adminSection.remove();
    // restore default footer
    const footer = document.querySelector('#reportDetailModal .modal-footer');
    if (footer) footer.innerHTML = '<button class="btn-secondary" onclick="closeReportModal()">Close</button>';
}

async function deleteReport(reportId, title) {
    const confirmed = confirm(`Delete report "${title}"?\n\nThis cannot be undone. You can only delete Pending reports.`);
    if (!confirmed) return;
    try {
        const res = await apiFetch(`${API_BASE}/reports/${reportId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            toast('Report deleted successfully.', 'success');
            closeReportModal();
            loadUserReports(); // refresh the list
        } else {
            toast(data.error || 'Could not delete report.', 'error');
        }
    } catch (err) {
        if (err.message === 'Session expired') return;
        toast('Failed to delete report.', 'error');
    }
}

// ─────────────────────────────────────────
// Map — Submission Form Picker
// ─────────────────────────────────────────
let submissionPickerMap = null;
let submissionPickerMarker = null;

function initSubmissionMapPicker() {
    const container = document.getElementById('submissionMapPicker');
    if (!container) return;

    if (!submissionPickerMap) {
        submissionPickerMap = L.map('submissionMapPicker').setView([-1.9536, 29.8739], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(submissionPickerMap);

        // Try to center on user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const { latitude, longitude } = pos.coords;
                submissionPickerMap.setView([latitude, longitude], 15);
            }, () => { /* silently fall back to Kigali center */ });
        }

        submissionPickerMap.on('click', function (e) {
            const { lat, lng } = e.latlng;
            setSubmissionPin(lat, lng);
        });
    }
    setTimeout(() => submissionPickerMap.invalidateSize(), 250);
}

function setSubmissionPin(lat, lng) {
    // Update hidden inputs
    document.getElementById('submissionLat').value = lat.toFixed(6);
    document.getElementById('submissionLng').value = lng.toFixed(6);

    // Replace marker
    if (submissionPickerMarker) submissionPickerMap.removeLayer(submissionPickerMarker);
    const pinIcon = L.divIcon({
        className: '',
        html: `<div style="position:relative;display:inline-block;">
                 <div style="width:22px;height:22px;background:var(--sky,#1A6FD4);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,.35);"></div>
               </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 22],
        popupAnchor: [0, -24]
    });
    submissionPickerMarker = L.marker([lat, lng], { icon: pinIcon })
        .addTo(submissionPickerMap)
        .bindPopup(`<b>📍 Issue location</b><br><small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small>`)
        .openPopup();

    // Update status bar
    document.getElementById('mapPickerStatus').style.background = 'var(--emerald-bg,#D1FAE5)';
    document.getElementById('mapPickerStatus').style.borderLeft = '3px solid var(--emerald,#059669)';
    document.getElementById('mapPickerIcon').textContent = '✅';
    document.getElementById('mapPickerText').textContent = `Location pinned: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    document.getElementById('clearMapPin').style.display = 'inline-flex';
    document.getElementById('submissionMapPicker').style.borderColor = 'var(--emerald,#059669)';
}

function clearMapPin() {
    if (submissionPickerMarker && submissionPickerMap) {
        submissionPickerMap.removeLayer(submissionPickerMarker);
        submissionPickerMarker = null;
    }
    document.getElementById('submissionLat').value = '';
    document.getElementById('submissionLng').value = '';
    document.getElementById('mapPickerStatus').style.background = 'var(--parchment)';
    document.getElementById('mapPickerStatus').style.borderLeft = '';
    document.getElementById('mapPickerIcon').textContent = '🗺️';
    document.getElementById('mapPickerText').textContent = 'No location pinned yet — click the map above to set one.';
    document.getElementById('clearMapPin').style.display = 'none';
    document.getElementById('submissionMapPicker').style.borderColor = 'var(--sand)';
}

// ─────────────────────────────────────────
// Map — Reports View Page
// ─────────────────────────────────────────
let reportsMap = null;
let reportMarkers = [];

function initMap() {
    const container = document.getElementById('reportsMap');
    if (!container) return;
    if (!reportsMap) {
        reportsMap = L.map('reportsMap').setView([-1.9536, 29.8739], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(reportsMap);
    }
    setTimeout(() => reportsMap.invalidateSize(), 200);
}

async function fetchMapReports() {
    if (!reportsMap) return;
    try {
        const res = await apiFetch(`${API_BASE}/reports`);
        if (!res.ok) return;
        const data = await res.json();
        const reports = Array.isArray(data) ? data : (data.reports || []);
        // Clear old markers
        reportMarkers.forEach(m => reportsMap.removeLayer(m));
        reportMarkers = [];
        reports.forEach(report => {
            const loc = report.location;
            if (!loc?.latitude || !loc?.longitude) return;
            const lat = parseFloat(loc.latitude), lng = parseFloat(loc.longitude);
            if (isNaN(lat) || isNaN(lng)) return;
            const color = report.status === 'Resolved' ? '#059669' : report.status === 'In Progress' ? '#1A6FD4' : '#D97706';
            const icon = L.divIcon({ className: '', html: `<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>`, iconSize: [18,18], iconAnchor: [9,9] });
            const marker = L.marker([lat, lng], { icon }).addTo(reportsMap);
            marker.bindPopup(`<div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:160px;">
                <strong style="font-size:.9rem;">${escapeHtml(report.title)}</strong>
                <p style="margin:5px 0 2px;font-size:.78rem;"><b>Status:</b> ${report.status}</p>
                <p style="margin:0;font-size:.78rem;"><b>Category:</b> ${report.category?.name || 'N/A'}</p>
            </div>`);
            reportMarkers.push(marker);
        });
    } catch (err) { console.error('fetchMapReports error:', err); }
}

// ─────────────────────────────────────────
// Notification badge
// ─────────────────────────────────────────
function updateNotificationBadge(reports) {
    const pendingCount = reports.filter(r => r.status?.toLowerCase() === 'pending').length;
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    if (pendingCount > 0) { badge.textContent = pendingCount; badge.style.display = 'flex'; } else { badge.style.display = 'none'; }
}

// ─────────────────────────────────────────
// Admin — full dashboard
// ─────────────────────────────────────────
let allAdminReports = [];
let statusChartInst = null, categoryChartInst = null;
let adminMapInst = null, adminMapMarkers = [];
let adminCurrentView = 'table';

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
    const el = document.getElementById(`adminTab-${tab}`);
    if (el) el.style.display = 'block';
    if (tab === 'map') initAdminMap();
}

function setAdminView(view) {
    adminCurrentView = view;
    document.getElementById('adminTableView').style.display = view === 'table' ? 'block' : 'none';
    document.getElementById('adminGridView').style.display  = view === 'grid'  ? 'block' : 'none';
    document.getElementById('btnViewTable').style.background = view === 'table' ? 'var(--sky)' : 'var(--parchment)';
    document.getElementById('btnViewTable').style.color = view === 'table' ? '#fff' : 'var(--ink)';
    document.getElementById('btnViewGrid').style.background  = view === 'grid'  ? 'var(--sky)' : 'var(--parchment)';
    document.getElementById('btnViewGrid').style.color = view === 'grid' ? '#fff' : 'var(--ink)';
    applyAdminFilters();
}

async function loadAdminReports() {
    const tbody = document.getElementById('adminReportsTableBody');
    const recentBody = document.getElementById('adminRecentTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--stone);padding:40px;">Loading reports…</td></tr>';
    if (recentBody) recentBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--stone);padding:24px;">Loading…</td></tr>';
    try {
        const res = await apiFetch(`${API_BASE}/reports`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        allAdminReports = Array.isArray(data) ? data : (data.reports || []);
        updateNotificationBadge(allAdminReports);
        renderAdminStats(allAdminReports);
        // Only render charts if Chart.js loaded
        if (typeof Chart !== 'undefined') {
            renderAdminCharts(allAdminReports);
        } else {
            console.warn('Chart.js not loaded yet — skipping charts');
        }
        renderPhotoStrip(allAdminReports);
        renderAdminRecent(allAdminReports);
        loadAdminCategoryFilter();
        applyAdminFilters();
    } catch (err) {
        if (err.message === 'Session expired') return; // already handled by apiFetch
        console.error('Admin reports error:', err);
        const msg = `<tr><td colspan="8" style="text-align:center;padding:32px;">
            <p style="color:var(--ruby);font-weight:600;margin-bottom:8px;">Failed to load reports</p>
            <p style="color:var(--stone);font-size:.82rem;">${err.message}</p>
            <button onclick="loadAdminReports()" class="btn-secondary" style="margin-top:12px;padding:8px 20px;">Retry</button>
        </td></tr>`;
        if (tbody) tbody.innerHTML = msg;
        if (recentBody) recentBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--stone);padding:16px;">Error loading</td></tr>';
        toast('Failed to load admin reports: ' + err.message, 'error');
    }
}

function renderAdminStats(reports) {
    const pending    = reports.filter(r => r.status === 'Pending').length;
    const inProgress = reports.filter(r => r.status === 'In Progress').length;
    const resolved   = reports.filter(r => r.status === 'Resolved').length;
    const withPhoto  = reports.filter(r => r.photo_url).length;
    const statsBar   = document.getElementById('adminStatsBar');
    if (!statsBar) return;
    const stat = (label, val, color, bg, icon) => `
        <div style="background:${bg};border-radius:var(--r-lg);padding:20px 22px;border:1px solid ${color}22;display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div>
                <div style="font-family:var(--font-serif);font-size:2.1rem;font-weight:700;color:${color};line-height:1;">${val}</div>
                <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${color};opacity:.75;margin-top:5px;">${label}</div>
            </div>
            <div style="font-size:1.6rem;opacity:.4;">${icon}</div>
        </div>`;
    statsBar.innerHTML =
        stat('Total Reports', reports.length, 'var(--sky)',    'var(--sky-light)',    '') +
        stat('Pending',        pending,        'var(--amber)',  'var(--amber-bg)',     '') +
        stat('In Progress',    inProgress,     'var(--sky)',    'var(--blue-bg)',      '') +
        stat('Resolved',       resolved,       'var(--emerald)','var(--emerald-bg)',   '');
}

function renderAdminCharts(reports) {
    // Status donut
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
        if (statusChartInst) statusChartInst.destroy();
        const pending    = reports.filter(r => r.status === 'Pending').length;
        const inProgress = reports.filter(r => r.status === 'In Progress').length;
        const resolved   = reports.filter(r => r.status === 'Resolved').length;
        statusChartInst = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'In Progress', 'Resolved'],
                datasets: [{
                    data: [pending, inProgress, resolved],
                    backgroundColor: ['#FEF3C7', '#DBEAFE', '#D1FAE5'],
                    borderColor:     ['#D97706',  '#1A6FD4',  '#059669'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }, padding: 14 } } },
                cutout: '65%'
            }
        });
    }

    // Category bar chart
    const catCtx = document.getElementById('categoryChart');
    if (catCtx) {
        if (categoryChartInst) categoryChartInst.destroy();
        const catCounts = {};
        reports.forEach(r => {
            const name = r.category?.name || 'Other';
            catCounts[name] = (catCounts[name] || 0) + 1;
        });
        const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 7);
        categoryChartInst = new Chart(catCtx, {
            type: 'bar',
            data: {
                labels: sorted.map(([k]) => k),
                datasets: [{
                    label: 'Reports',
                    data: sorted.map(([, v]) => v),
                    backgroundColor: 'rgba(26,111,212,.2)',
                    borderColor: 'rgba(26,111,212,.85)',
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,.05)' } },
                    x: { ticks: { font: { size: 10 } }, grid: { display: false } }
                }
            }
        });
    }
}

function renderPhotoStrip(reports) {
    const strip = document.getElementById('adminPhotoStrip');
    if (!strip) return;
    const withPhotos = reports.filter(r => r.photo_url).slice(0, 15);
    if (withPhotos.length === 0) {
        strip.innerHTML = '<p style="color:var(--stone);font-style:italic;font-size:.875rem;">No photos uploaded yet.</p>';
        return;
    }
    strip.innerHTML = withPhotos.map(r => `
        <div class="photo-strip-item" onclick="adminViewReport(${r.id})" title="${escapeHtml(r.title)}">
            <img src="${r.photo_url}" alt="${escapeHtml(r.title)}" loading="lazy">
            <div class="strip-label">#${r.id} ${escapeHtml(r.title)}</div>
        </div>`).join('');
}

function renderAdminRecent(reports) {
    const tbody = document.getElementById('adminRecentTableBody');
    if (!tbody) return;
    const recent = [...reports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
    if (recent.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--stone);">No reports yet.</td></tr>'; return; }
    tbody.innerHTML = recent.map(report => {
        const sc        = statusClass(report.status);
        const safeTitle = escapeHtml(report.title);
        const photoThumb = report.photo_url
            ? `<img src="${report.photo_url}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;border:1.5px solid var(--sand);cursor:pointer;" onclick="adminViewReport(${report.id})" title="View report with photo">`
            : '<span style="color:var(--stone);font-size:.75rem;">—</span>';
        return `<tr>
            <td style="font-weight:700;color:var(--sky);font-size:.82rem;">#${report.id}</td>
            <td><div style="font-weight:600;color:var(--ink);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeTitle}</div></td>
            <td>${report.category?.name || 'N/A'}</td>
            <td>${photoThumb}</td>
            <td><span class="status-badge ${sc}">${report.status}</span></td>
            <td><button class="view-details-btn" style="padding:5px 12px;font-size:.75rem;" onclick="adminViewReport(${report.id})">View</button></td>
        </tr>`;
    }).join('');
}

function loadAdminCategoryFilter() {
    const sel = document.getElementById('adminCategoryFilter');
    if (!sel || allCategories.length === 0) return;
    sel.innerHTML = '<option value="">All Categories</option>';
    allCategories.forEach(c => sel.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`);
}

function applyAdminFilters() {
    const statusFilter   = (document.getElementById('adminStatusFilter')?.value  || '');
    const districtFilter = (document.getElementById('adminDistrictFilter')?.value || '').toLowerCase();
    const categoryFilter = (document.getElementById('adminCategoryFilter')?.value || '');
    const photoFilter    = (document.getElementById('adminPhotoFilter')?.value    || '');

    const filtered = allAdminReports.filter(r => {
        const matchStatus   = !statusFilter   || r.status === statusFilter;
        const addr          = (r.location?.address || r.location?.district || '').toLowerCase();
        const matchDistrict = !districtFilter || addr.includes(districtFilter);
        const matchCategory = !categoryFilter || String(r.category?.id) === categoryFilter;
        const matchPhoto    = !photoFilter    || (photoFilter === 'yes' ? !!r.photo_url : !r.photo_url);
        return matchStatus && matchDistrict && matchCategory && matchPhoto;
    });

    const countEl = document.getElementById('adminReportCount');
    if (countEl) countEl.textContent = `Showing ${filtered.length} of ${allAdminReports.length} reports`;

    if (adminCurrentView === 'grid') renderAdminGrid(filtered);
    else renderAdminTable(filtered);

    // update admin map markers if map tab is active
    if (adminMapInst) plotAdminMapReports(filtered);
}

function renderAdminTable(reports) {
    const tbody = document.getElementById('adminReportsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--stone);padding:48px;font-size:.875rem;">No reports match the current filters</td></tr>';
        return;
    }
    reports.forEach(report => {
        const sc         = statusClass(report.status);
        const safeTitle  = escapeHtml(report.title);
        const date       = new Date(report.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
        const reporter   = report.is_anonymous ? '<em style="color:var(--stone);">Anonymous</em>' : escapeHtml(report.user?.username || 'Unknown');
        const photoThumb = report.photo_url
            ? `<img src="${report.photo_url}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1.5px solid var(--sand);vertical-align:middle;cursor:pointer;transition:transform .2s;" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'" onclick="adminViewReport(${report.id})" title="Click to view full report with photo">`
            : '<span style="color:var(--stone);font-size:.75rem;">—</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700;color:var(--sky);font-size:.82rem;">#${report.id}</td>
            <td>
                <div style="font-weight:600;color:var(--ink);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeTitle}</div>
                <div style="font-size:.72rem;color:var(--stone);margin-top:2px;">${date}</div>
            </td>
            <td style="font-size:.82rem;">${report.category?.name || 'N/A'}</td>
            <td style="max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.78rem;color:var(--bark);">${report.location ? escapeHtml(report.location.address || report.location.district || 'N/A') : 'N/A'}</td>
            <td style="font-size:.82rem;">${reporter}</td>
            <td>${photoThumb}</td>
            <td><span class="status-badge ${sc}">${report.status}</span></td>
            <td>
                <div style="display:flex;gap:6px;align-items:center;">
                    <button class="view-details-btn" style="padding:5px 10px;font-size:.72rem;background:var(--parchment);color:var(--ink);border:1px solid var(--sand);" onclick="adminViewReport(${report.id})">View</button>
                    <button class="view-details-btn" style="padding:5px 10px;font-size:.72rem;" onclick="openAdminModal(${report.id},'${safeTitle.replace(/'/g,"\\'")}','${report.status}')">Update</button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}

function renderAdminGrid(reports) {
    const container = document.getElementById('adminGridView');
    if (!container) return;
    if (reports.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><p>No reports match the current filters.</p></div>';
        return;
    }
    container.className = 'admin-grid-view';
    container.innerHTML = reports.map(report => {
        const sc        = statusClass(report.status);
        const safeTitle = escapeHtml(report.title);
        const date      = new Date(report.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
        const reporter  = report.is_anonymous ? 'Anonymous' : escapeHtml(report.user?.username || 'Unknown');
        const photoSection = report.photo_url
            ? `<img class="admin-report-card-img" src="${report.photo_url}" alt="${safeTitle}" loading="lazy">`
            : `<div class="admin-report-card-img-placeholder">📷</div>`;
        return `
        <div class="admin-report-card">
            <div style="cursor:pointer;" onclick="adminViewReport(${report.id})">${photoSection}</div>
            <div class="admin-report-card-body">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:.72rem;font-weight:700;color:var(--sky);">#${report.id} · ${date}</span>
                    <span class="status-badge ${sc}" style="font-size:.65rem;">${report.status}</span>
                </div>
                <h4>${safeTitle}</h4>
                <p style="font-size:.78rem;color:var(--stone);margin:4px 0 10px;">${report.category?.name || 'N/A'} · ${reporter}</p>
                <p style="font-size:.8rem;color:var(--bark);line-height:1.5;margin-bottom:12px;">${escapeHtml((report.description || '').substring(0, 90))}${(report.description?.length || 0) > 90 ? '…' : ''}</p>
                <div style="display:flex;gap:6px;">
                    <button class="view-details-btn" style="flex:1;padding:7px;font-size:.75rem;background:var(--parchment);color:var(--ink);border:1px solid var(--sand);text-align:center;" onclick="adminViewReport(${report.id})">View</button>
                    <button class="view-details-btn" style="flex:1;padding:7px;font-size:.75rem;text-align:center;" onclick="openAdminModal(${report.id},'${safeTitle.replace(/'/g,"\\'")}','${report.status}')">Update</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ─────────────────────────────────────────
// Admin embedded map
// ─────────────────────────────────────────
function initAdminMap() {
    if (!adminMapInst) {
        adminMapInst = L.map('adminReportsMap').setView([-1.9536, 29.8739], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(adminMapInst);
    }
    setTimeout(() => { adminMapInst.invalidateSize(); }, 220);
    plotAdminMapReports(allAdminReports);
}

function plotAdminMapReports(reports) {
    if (!adminMapInst) return;
    adminMapMarkers.forEach(m => adminMapInst.removeLayer(m)); adminMapMarkers = [];
    reports.forEach(report => {
        const loc = report.location;
        if (!loc?.latitude || !loc?.longitude) return;
        const lat = parseFloat(loc.latitude), lng = parseFloat(loc.longitude);
        if (isNaN(lat) || isNaN(lng)) return;
        const color = report.status === 'Resolved' ? '#059669' : report.status === 'In Progress' ? '#1A6FD4' : '#D97706';
        const icon = L.divIcon({ className: 'custom-pin', html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>`, iconSize: [18,18], iconAnchor: [9,9] });
        const marker = L.marker([lat, lng], { icon }).addTo(adminMapInst);
        const photoHtml = report.photo_url
            ? `<img src="${report.photo_url}" style="width:100%;max-height:80px;object-fit:cover;border-radius:6px;margin-top:8px;cursor:pointer;" onclick="adminViewReport(${report.id})">`
            : '';
        marker.bindPopup(`<div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:180px;">
            <h4 style="margin:0 0 5px;font-size:.9rem;">${escapeHtml(report.title)}</h4>
            <p style="margin:0 0 3px;font-size:.78rem;"><strong>Status:</strong> ${report.status}</p>
            <p style="margin:0 0 3px;font-size:.78rem;"><strong>Category:</strong> ${report.category?.name || 'N/A'}</p>
            ${photoHtml}
            <button onclick="adminViewReport(${report.id})" style="margin-top:8px;width:100%;padding:5px;background:#1A6FD4;color:#fff;border:none;border-radius:6px;font-size:.75rem;cursor:pointer;font-family:inherit;">View Full Report</button>
        </div>`);
        adminMapMarkers.push(marker);
    });
}

// Full report detail viewer for admin (reuses the citizen modal but adds comment box + status update)
async function adminViewReport(reportId) {
    try {
        const res = await apiFetch(`${API_BASE}/reports/${reportId}`);
        if (!res.ok) throw new Error('Failed to load report');
        const data   = await res.json();
        const report = data.report || data;

        // populate shared modal fields
        document.getElementById('modalReportId').textContent          = report.id;
        document.getElementById('modalReportTitle').textContent       = escapeHtml(report.title);
        document.getElementById('modalReportCategory').textContent    = report.category?.name || 'N/A';
        document.getElementById('modalReportSubmitted').textContent   = new Date(report.created_at).toLocaleString();
        document.getElementById('modalReportDescription').textContent = escapeHtml(report.description);
        document.getElementById('modalReportLocation').textContent    = report.location?.address || 'N/A';

        const statusEl = document.getElementById('modalReportStatus');
        statusEl.textContent = report.status;
        statusEl.className   = `status-badge ${statusClass(report.status)}`;

        const coordEl = document.getElementById('modalReportCoordinates');
        if (report.location?.latitude && report.location?.longitude) {
            coordEl.style.display = 'block';
            document.getElementById('modalReportGPS').textContent = `${report.location.latitude}, ${report.location.longitude}`;
        } else { coordEl.style.display = 'none'; }

        // reporter info (admin can see who submitted)
        let reporterSection = document.getElementById('adminModalReporterSection');
        if (!reporterSection) {
            reporterSection = document.createElement('div');
            reporterSection.id = 'adminModalReporterSection';
            reporterSection.className = 'report-detail-section';
            document.querySelector('#reportDetailModal .modal-body').prepend(reporterSection);
        }
        if (report.is_anonymous) {
            reporterSection.innerHTML = '<h4>Reporter</h4><p style="color:var(--stone);font-style:italic;">Anonymous submission</p>';
        } else if (report.user) {
            reporterSection.innerHTML = `<h4>Reporter</h4>
                <p><strong>Name:</strong> ${escapeHtml(report.user.username)}</p>
                <p><strong>Email:</strong> ${escapeHtml(report.user.email || '—')}</p>
                <p><strong>Phone:</strong> ${escapeHtml(report.user.phone_number || '—')}</p>`;
        } else {
            reporterSection.innerHTML = '<h4>Reporter</h4><p>Unknown</p>';
        }

        // photo
        const photoSection = document.getElementById('modalPhotoSection');
        const photoImg     = document.getElementById('modalReportPhoto');
        if (report.photo_url) { photoImg.src = report.photo_url; photoSection.style.display = 'block'; }
        else { photoSection.style.display = 'none'; }

        // status history timeline
        const histContainer = document.getElementById('modalStatusHistory');
        if (histContainer) {
            if (report.status_history && report.status_history.length > 0) {
                histContainer.innerHTML = report.status_history.map(h => `
                    <div class="timeline-item">
                        <div class="timeline-content">
                            <strong>${escapeHtml(h.from_status)} → ${escapeHtml(h.to_status)}</strong>
                            ${h.note ? `<p style="font-size:.82rem;color:var(--bark);margin-top:3px;">${escapeHtml(h.note)}</p>` : ''}
                            <small style="color:var(--stone);">${h.changed_at ? new Date(h.changed_at).toLocaleString() : ''} ${h.changed_by ? '· by ' + escapeHtml(h.changed_by) : ''}</small>
                        </div>
                    </div>`).join('');
            } else {
                histContainer.innerHTML = '<div class="timeline-item"><div class="timeline-content"><strong>Report Submitted</strong><br><small style="color:var(--stone);">' + new Date(report.created_at).toLocaleString() + '</small></div></div>';
            }
        }

        // comments + admin reply box
        await loadAdminComments(reportId, report.comments || []);

        // admin quick-action bar inside the modal footer
        const footer = document.querySelector('#reportDetailModal .modal-footer');
        footer.innerHTML = `
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;width:100%;">
                <select id="modalQuickStatus" style="flex:1;min-width:160px;padding:9px 12px;font-size:.85rem;border-radius:var(--r-pill);border:1.5px solid var(--sand);background:var(--parchment);font-family:var(--font-sans);">
                    <option value="Pending"${report.status==='Pending'?' selected':''}>Pending</option>
                    <option value="In Progress"${report.status==='In Progress'?' selected':''}>In Progress</option>
                    <option value="Resolved"${report.status==='Resolved'?' selected':''}>Resolved</option>
                </select>
                <button class="btn-primary" style="padding:9px 20px;" onclick="quickUpdateStatus(${report.id})">Save Status</button>
                <button class="btn-secondary" onclick="closeReportModal()">Close</button>
            </div>`;

        document.getElementById('reportDetailModal').style.display = 'flex';
    } catch (err) {
        console.error('Admin view report error:', err);
        toast('Failed to load report details.', 'error');
    }
}

async function loadAdminComments(reportId, existingComments) {
    const container = document.getElementById('modalReportComments');
    if (!container) return;

    const commentsList = existingComments.length > 0
        ? existingComments.map(c => `
            <div style="background:${c.is_official ? 'var(--sky-light)' : 'var(--parchment)'};border-radius:var(--r-md);padding:12px 14px;margin-bottom:10px;border-left:3px solid ${c.is_official ? 'var(--sky)' : 'var(--sand)'};">
                <div style="font-size:.75rem;font-weight:700;color:${c.is_official ? 'var(--sky)' : 'var(--bark)'};margin-bottom:4px;">
                    ${c.is_official ? '🛡 Official · ' : ''}${escapeHtml(c.user?.username || 'Unknown')} · ${new Date(c.created_at).toLocaleDateString()}
                </div>
                <div style="font-size:.875rem;color:var(--ink);">${escapeHtml(c.content)}</div>
            </div>`).join('')
        : '<p class="placeholder" style="color:var(--stone);font-style:italic;font-size:.875rem;">No updates yet.</p>';

    container.innerHTML = `
        ${commentsList}
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--parchment);">
            <label style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--sky);display:block;margin-bottom:8px;">Post Official Update</label>
            <textarea id="adminCommentInput" rows="3" placeholder="Write an official update for the citizen…" style="width:100%;font-family:var(--font-sans);font-size:.875rem;padding:10px 12px;border:1.5px solid var(--sand);border-radius:var(--r-md);background:var(--parchment);resize:vertical;"></textarea>
            <button class="btn-primary" style="margin-top:10px;padding:9px 20px;" onclick="postAdminComment(${reportId})">Post Update</button>
        </div>`;
}

async function postAdminComment(reportId) {
    const input   = document.getElementById('adminCommentInput');
    const content = input?.value?.trim();
    if (!content) { toast('Please write a comment first.', 'warning'); return; }
    try {
        const res = await apiFetch(`${API_BASE}/reports/${reportId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        if (!res.ok) throw new Error('Failed to post comment');
        toast('Update posted successfully.', 'success');
        adminViewReport(reportId); // reload modal with new comment
    } catch (err) {
        console.error('Post comment error:', err);
        toast('Failed to post update.', 'error');
    }
}

async function quickUpdateStatus(reportId) {
    const newStatus = document.getElementById('modalQuickStatus')?.value;
    if (!newStatus) return;
    try {
        const res = await apiFetch(`${API_BASE}/reports/${reportId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus, note: '' })
        });
        if (res.ok) {
            toast(`Report #${reportId} → "${newStatus}"`, 'success');
            closeReportModal();
            loadAdminReports();
            if (reportsMap) fetchMapReports();
        } else {
            const err = await res.json();
            toast('Update failed: ' + (err.error || err.message), 'error');
        }
    } catch (err) {
        console.error('Quick status update error:', err);
        toast('An error occurred while updating status.', 'error');
    }
}

function openAdminModal(id, title, currentStatus) {
    document.getElementById('adminUpdateReportId').value = id;
    document.getElementById('adminUpdateReportTitle').textContent = title;
    document.getElementById('adminStatusNote').value = '';
    const select = document.getElementById('adminNewStatus');
    Array.from(select.options).forEach(opt => { opt.selected = opt.value === currentStatus; });
    document.getElementById('adminUpdateModal').style.display = 'flex';
}

function closeAdminModal() { document.getElementById('adminUpdateModal').style.display = 'none'; }

async function handleAdminStatusUpdate(e) {
    e.preventDefault();
    const btn       = e.target.querySelector('.btn-primary');
    setLoading(btn, true);
    const reportId  = document.getElementById('adminUpdateReportId').value;
    const newStatus = document.getElementById('adminNewStatus').value;
    const note      = document.getElementById('adminStatusNote').value;
    try {
        const res = await apiFetch(`${API_BASE}/reports/${reportId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus, note })
        });
        if (res.ok) {
            closeAdminModal();
            loadAdminReports();
            if (reportsMap) fetchMapReports();
            toast(`Report #${reportId} updated to "${newStatus}".`, 'success');
        } else {
            const err = await res.json();
            toast('Update failed: ' + (err.error || err.message), 'error');
        }
    } catch (err) {
        console.error('Status update error:', err);
        toast('An error occurred while updating status.', 'error');
    } finally { setLoading(btn, false); }
}

// ─────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text || ''; return div.innerHTML; }
function statusClass(status) { if (!status) return ''; return 'status-' + status.toLowerCase().replace(/\s+/g, '-'); }
function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) { btn.dataset.originalText = btn.textContent; btn.textContent = 'Please wait…'; btn.disabled = true; btn.style.opacity = '.7'; }
    else { btn.textContent = btn.dataset.originalText || btn.textContent; btn.disabled = false; btn.style.opacity = '1'; }
}
function showSubmitReportPage() { showReportSubmissionPage(); }

// ─────────────────────────────────────────
// Forgot & Reset Password
// ─────────────────────────────────────────
function showForgotPassword() {
    showForgotStep1();
    document.getElementById('forgotEmail').value = '';
    document.getElementById('resetToken').value = '';
    document.getElementById('resetNewPassword').value = '';
    document.getElementById('resetConfirmPassword').value = '';
    hideForgotMessage();
    document.getElementById('forgotPasswordModal').style.display = 'flex';
}

function closeForgotModal() {
    document.getElementById('forgotPasswordModal').style.display = 'none';
}

function showForgotStep1() {
    document.getElementById('forgotStep1').style.display = 'block';
    document.getElementById('forgotStep2').style.display = 'none';
    document.getElementById('forgotModalTitle').textContent = 'Reset Password';
    hideForgotMessage();
}

function showForgotStep2() {
    document.getElementById('forgotStep1').style.display = 'none';
    document.getElementById('forgotStep2').style.display = 'block';
    document.getElementById('forgotModalTitle').textContent = 'Enter New Password';
}

function showForgotMessage(message, type) {
    const div = document.getElementById('forgotMessage');
    div.textContent = message;
    div.style.display = 'block';
    div.style.padding = '12px 16px';
    div.style.borderRadius = '10px';
    div.style.fontSize = '.875rem';
    div.style.fontWeight = '500';
    if (type === 'success') {
        div.style.background = '#D1FAE5'; div.style.color = '#065F46'; div.style.border = '1.5px solid #059669';
    } else {
        div.style.background = '#FEE2E2'; div.style.color = '#991B1B'; div.style.border = '1.5px solid #DC2626';
    }
}

function hideForgotMessage() {
    const div = document.getElementById('forgotMessage');
    if (div) div.style.display = 'none';
}

async function handleForgotPassword() {
    const email = document.getElementById('forgotEmail').value.trim();
    if (!email) { showForgotMessage('Please enter your email address.', 'error'); return; }

    const btn = document.querySelector('#forgotStep1 .btn-primary');
    setLoading(btn, true);
    hideForgotMessage();

    try {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
            showForgotMessage('Reset link sent! Check your inbox (and spam folder) for the token.', 'success');
            setTimeout(() => showForgotStep2(), 1800);
        } else {
            showForgotMessage(data.message || data.error || 'Could not send reset email. Please try again.', 'error');
        }
    } catch (err) {
        console.error('Forgot password error:', err);
        showForgotMessage('Connection error. Please try again.', 'error');
    } finally { setLoading(btn, false); }
}

async function handleResetPassword() {
    const token           = document.getElementById('resetToken').value.trim();
    const newPassword     = document.getElementById('resetNewPassword').value;
    const confirmPassword = document.getElementById('resetConfirmPassword').value;

    if (!token)       { showForgotMessage('Please enter the reset token from your email.', 'error'); return; }
    if (!newPassword) { showForgotMessage('Please enter a new password.', 'error'); return; }
    if (newPassword !== confirmPassword) { showForgotMessage('Passwords do not match.', 'error'); return; }
    if (newPassword.length < 6) { showForgotMessage('Password must be at least 6 characters.', 'error'); return; }

    const btn = document.querySelector('#forgotStep2 .btn-primary');
    setLoading(btn, true);
    hideForgotMessage();

    try {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, new_password: newPassword })
        });
        const data = await res.json();
        if (res.ok) {
            showForgotMessage('Password reset successfully! You can now sign in.', 'success');
            setTimeout(() => { closeForgotModal(); showLogin(); toast('Password updated — please sign in.', 'success'); }, 2000);
        } else {
            showForgotMessage(data.message || data.error || 'Reset failed. The token may have expired.', 'error');
        }
    } catch (err) {
        console.error('Reset password error:', err);
        showForgotMessage('Connection error. Please try again.', 'error');
    } finally { setLoading(btn, false); }
}