const API_BASE = 'http://localhost:5000/api';
let token = localStorage.getItem('token');
let userId = localStorage.getItem('userId');

document.addEventListener('DOMContentLoaded', function() {
    if (token) {
        showDashboard();
        loadCategories();
        loadReports();
    } else {
        showAuth();
    }

    // Event listeners
    document.getElementById('loginBtn').addEventListener('click', showLogin);
    document.getElementById('registerBtn').addEventListener('click', showRegister);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    document.getElementById('loginFormEl').addEventListener('submit', handleLogin);
    document.getElementById('registerFormEl').addEventListener('submit', handleRegister);
    document.getElementById('createReportForm').addEventListener('submit', handleCreateReport);
});

function showAuth() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loginBtn').style.display = 'inline-block';
    document.getElementById('registerBtn').style.display = 'inline-block';
    document.getElementById('logoutBtn').style.display = 'none';
}

function showDashboard() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('registerBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'inline-block';
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            token = data.access_token;
            userId = data.user.id;
            localStorage.setItem('token', token);
            localStorage.setItem('userId', userId);
            showDashboard();
            loadCategories();
            loadReports();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone_number = document.getElementById('regPhone').value;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, phone_number })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Registration successful! Please login.');
            showLogin();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Register error:', error);
        alert('Registration failed');
    }
}

function logout() {
    token = null;
    userId = null;
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    showAuth();
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        const categories = await response.json();
        const select = document.getElementById('reportCategory');
        const list = document.getElementById('categoriesList');
        select.innerHTML = '<option value="">Select Category</option>';
        list.innerHTML = '';
        categories.forEach(cat => {
            select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            list.innerHTML += `<li>${cat.name}: ${cat.description}</li>`;
        });
    } catch (error) {
        console.error('Load categories error:', error);
    }
}

async function loadReports() {
    try {
        const response = await fetch(`${API_BASE}/reports`);
        const data = await response.json();
        const list = document.getElementById('reportsList');
        list.innerHTML = '';
        data.reports.forEach(report => {
            list.innerHTML += `<li><strong>${report.title}</strong> - ${report.status} (${report.category.name})</li>`;
        });
    } catch (error) {
        console.error('Load reports error:', error);
    }
}

async function handleCreateReport(e) {
    e.preventDefault();
    const title = document.getElementById('reportTitle').value;
    const description = document.getElementById('reportDescription').value;
    const category_id = document.getElementById('reportCategory').value;
    const address = document.getElementById('reportLocation').value;
    const latitude = parseFloat(document.getElementById('reportLat').value) || 0;
    const longitude = parseFloat(document.getElementById('reportLng').value) || 0;
    const is_anonymous = document.getElementById('anonymous').checked;

    try {
        // First create location
        const locationResponse = await fetch(`${API_BASE}/locations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ latitude, longitude, address })
        });
        const locationData = await locationResponse.json();
        if (!locationResponse.ok) throw new Error('Location creation failed');

        // Then create report
        const reportResponse = await fetch(`${API_BASE}/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                description,
                category_id: parseInt(category_id),
                location_id: locationData.id,
                user_id: parseInt(userId),
                is_anonymous
            })
        });
        if (reportResponse.ok) {
            alert('Report created successfully!');
            loadReports();
            e.target.reset();
        } else {
            const errorData = await reportResponse.json();
            alert(errorData.error || 'Failed to create report');
        }
    } catch (error) {
        console.error('Create report error:', error);
        alert('Failed to create report');
    }
}