// Global Configuration & API Base URL
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : '/api';

// Utility to handle API calls
async function fetchAPI(endpoint, method = 'GET', body = null, isFormData = false) {
    const token = localStorage.getItem('token');
    const headers = {};

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    const options = {
        method,
        headers,
    };

    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Ensure auth redirects
function checkAuth(roleRequired = null) {
    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user'));

    if (!token || !currentUser) {
        window.location.href = 'login.html';
        return false;
    }

    if (roleRequired && currentUser.role !== roleRequired) {
        // Redirect to appropriate dashboard
        switch (currentUser.role) {
            case 'Admin': window.location.href = 'admin-dashboard.html'; break;
            case 'Student': window.location.href = 'student-dashboard.html'; break;
            case 'Owner': window.location.href = 'owner-dashboard.html'; break;
            default: window.location.href = 'login.html';
        }
        return false;
    }
    return true;
}

// Handle global logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Handle Hero Search execution
function performSearch() {
    const val = document.getElementById('heroSearch').value;
    if(val) {
        // Normally we'd redirect to a search page
        // window.location.href = `student-dashboard.html?search=${encodeURIComponent(val)}`;
        showToast('Search functionality will be integrated with Student Dashboard!', 'info');
    }
}

// ---- CUSTOM UI UTILS ----
window.showToast = function(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Wait for transition
    }, 3000);
}

window.customConfirm = function(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        
        const modal = document.createElement('div');
        modal.className = 'glass-panel card-3d';
        modal.style.padding = '2rem';
        modal.style.maxWidth = '400px';
        modal.style.textAlign = 'center';
        modal.style.background = 'rgba(15, 23, 42, 0.95)';
        
        modal.innerHTML = `
            <h3 style="margin-bottom: 1rem; color: white;">Confirm Action</h3>
            <p style="color: var(--text-muted); margin-bottom: 2rem;">${message}</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn btn-outline" id="confirmCancelBtn" style="flex: 1;">Cancel</button>
                <button class="btn btn-primary" id="confirmOkBtn" style="flex: 1; background: var(--accent);">Confirm</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        gsap.from(modal, { y: 30, opacity: 0, duration: 0.3 });
        
        const cleanup = () => {
            gsap.to(overlay, { 
                opacity: 0, 
                duration: 0.3, 
                onComplete: () => overlay.remove() 
            });
        };
        
        document.getElementById('confirmCancelBtn').addEventListener('click', () => {
            cleanup();
            resolve(false);
        });
        
        document.getElementById('confirmOkBtn').addEventListener('click', () => {
            cleanup();
            resolve(true);
        });
    });
}
