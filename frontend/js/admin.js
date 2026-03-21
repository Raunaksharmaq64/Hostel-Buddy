document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Checks
    if (!checkAuth('Admin')) return;

    // 2. Load Initial Data
    loadAnalytics();
});

// Tab Navigation Logic
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.sidebar-item[id^="nav-"]').forEach(item => item.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    const sidebarBtn = document.getElementById('nav-' + tabId);
    if (sidebarBtn) sidebarBtn.classList.add('active');

    if (tabId === 'analytics') loadAnalytics();
    if (tabId === 'verifications') loadVerifications();
    if (tabId === 'students') loadUsers('Student');
    if (tabId === 'owners') loadUsers('Owner');
    if (tabId === 'listings') loadListings();
    if (tabId === 'enquiries') loadEnquiries();
    if (tabId === 'system-requests') loadDeactivations();
}

// Spinner helper
const spinner = `<div style="text-align:center;padding:2.5rem;color:var(--text-muted)"><div class="spinner"></div><p style="margin-top:1rem;font-size:.9rem">Loading...</p></div>`;

// ---- ANALYTICS ----
async function loadAnalytics() {
    const container = document.getElementById('statsContainer');
    try {
        const res = await fetchAPI('/admin/analytics');
        const d = res.data;

        const stats = [
            { label: 'Total Students', value: d.users.students, color: 'var(--primary)' },
            { label: 'Total Owners', value: d.users.owners, color: 'var(--violet)' },
            { label: 'Total Properties', value: d.hostels.total, color: 'var(--accent-dark)' },
            { label: 'Approved Properties', value: d.hostels.active, color: '#059669' },
            { label: 'Total Enquiries', value: d.enquiries, color: '#D97706' },
        ];

        container.innerHTML = stats.map(s => `
            <div class="stat-card">
                <h3 style="color:var(--text-muted); font-size:0.85rem; font-weight:700; margin-bottom:0.5rem; text-transform:uppercase; letter-spacing:0.5px;">${s.label}</h3>
                <h1 style="color:${s.color}; font-size:2.4rem; font-weight:900;">${s.value}</h1>
            </div>
        `).join('');

        gsap.from('.stat-card', { scale: 0.85, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'back.out(1.5)' });

        // Render Most Viewed
        const popContainer = document.getElementById('mostViewedContainer');
        if (d.mostViewedHostels && d.mostViewedHostels.length > 0) {
            popContainer.innerHTML = d.mostViewedHostels.map((h, i) => `
                <div class="list-item" style="padding: 1rem 1.5rem;">
                    <div style="display:flex; align-items:center; gap: 1rem;">
                        <span style="font-size: 1.5rem; font-weight: 800; color: var(--text-light); width: 30px; text-align: center;">#${i+1}</span>
                        <div>
                            <h4 style="margin: 0; font-size: 1.05rem; color: var(--text);">${h.name}</h4>
                            <p style="margin: 0.2rem 0 0; font-size: 0.85rem; color: var(--text-muted);">Total Views: <strong style="color: var(--primary);">${h.views}</strong></p>
                        </div>
                    </div>
                </div>
            `).join('');
            gsap.from('#mostViewedContainer .list-item', { y: 20, opacity: 0, duration: 0.4, stagger: 0.1 });
        } else {
            popContainer.innerHTML = `<div class="panel" style="text-align:center;color:var(--text-muted);padding:2rem;">No property data available.</div>`;
        }

    } catch(err) {
        container.innerHTML = `<div class="panel" style="text-align:center;color:var(--danger)">Error loading analytics: ${err.message}</div>`;
        document.getElementById('mostViewedContainer').innerHTML = '';
    }
}

// ---- VERIFICATIONS ----
async function loadVerifications() {
    const container = document.getElementById('verificationsContainer');
    container.innerHTML = spinner;

    try {
        const res = await fetchAPI('/admin/verifications');
        const verifications = res.data;

        if (verifications.length === 0) {
            container.innerHTML = `<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">✅ No pending verification requests.</div>`;
            return;
        }

        container.innerHTML = verifications.map(u => `
            <div class="list-item" style="border-left-color:var(--success)">
                <div style="flex:1;min-width:250px">
                    <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.3rem">
                        <h4>${u.name}</h4>
                        <span class="badge-info">Owner</span>
                    </div>
                    <p>✉️ ${u.email} &nbsp;|&nbsp; 📞 ${u.phone}</p>
                    <div class="info-box" style="margin-top:.75rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.6rem">
                        <div><small>Property Name</small><strong>${u.hostelName || 'N/A'}</strong></div>
                        <div><small>Aadhaar Number</small><strong style="font-family:monospace">${u.aadhaarNumber || 'N/A'}</strong></div>
                        <div style="grid-column:1/-1"><small>Location</small><strong>📍 ${u.address || ''}, ${u.city || ''}</strong></div>
                    </div>
                </div>
                <div style="display:flex;gap:.6rem;flex-wrap:wrap;padding-left:1rem">
                    <button class="btn btn-primary btn-sm" onclick="handleVerification('${u._id}', 'verified')">
                        ✔ Approve
                    </button>
                    <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger)" onclick="handleVerification('${u._id}', 'rejected')">
                        ✖ Reject
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="openNotifyModal('${u._id}')">
                        🔔 Notify
                    </button>
                </div>
            </div>
        `).join('');
    } catch(err) {
        container.innerHTML = `<p style="color:var(--danger)">Failed to load verifications.</p>`;
    }
}

window.handleVerification = async function(id, status) {
    const isConfirmed = await customConfirm(`Are you sure you want to mark this request as ${status}?`);
    if(!isConfirmed) return;
    try {
        await fetchAPI(`/admin/verifications/${id}`, 'PUT', { status });
        showToast(`Request marked as ${status}.`, 'success');
        loadVerifications();
    } catch(err) {
        showToast(err.message, 'error');
    }
}

// ---- USERS (STUDENTS/OWNERS) ----
async function loadUsers(role) {
    const container = document.getElementById(role.toLowerCase() + 'sContainer');
    container.innerHTML = spinner;

    try {
        const res = await fetchAPI(`/admin/users?role=${role}`);
        const users = res.data;

        if (users.length === 0) {
            container.innerHTML = `<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">No ${role.toLowerCase()}s found.</div>`;
            return;
        }

        container.innerHTML = users.map(u => `
            <div class="list-item">
                <div style="display:flex;align-items:center;gap:1rem;flex:1">
                    <img src="${u.profilePhoto || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png'}"
                        style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid var(--border);flex-shrink:0" loading="lazy">
                    <div>
                        <h4 style="display:flex;align-items:center;gap:.5rem">
                            ${u.name}
                            ${u.isVerified ? '<span class="badge-approved" style="font-size:.72rem">✔ Verified</span>' : ''}
                        </h4>
                        <p>✉️ ${u.email} &nbsp;|&nbsp; 📞 ${u.phone}</p>
                        <small>Joined: ${new Date(u.createdAt).toLocaleDateString()}</small>
                    </div>
                </div>
                <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger)" onclick="deleteUser('${u._id}', '${role}')">Remove</button>
            </div>
        `).join('');
    } catch(err) {
        container.innerHTML = `<p style="color:var(--danger)">Failed to load users.</p>`;
    }
}

window.deleteUser = async function(id, role) {
    const isConfirmed = await customConfirm(`Are you sure you want to completely remove this ${role}? This is irreversible.`);
    if(!isConfirmed) return;
    try {
        await fetchAPI(`/admin/users/${id}`, 'DELETE');
        showToast('User removed successfully.', 'success');
        loadUsers(role);
    } catch(err) {
        showToast(err.message, 'error');
    }
}

// ---- LISTINGS ----
async function loadListings() {
    const container = document.getElementById('hostelsContainer');
    if (!container) return;
    container.innerHTML = spinner;

    try {
        const res = await fetchAPI('/admin/hostels');
        const hostels = res.data;

        if (hostels.length === 0) {
            container.innerHTML = `<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">No listings found.</div>`;
            return;
        }

        container.innerHTML = hostels.map(h => `
            <div class="list-item" style="border-left-color:${h.isApproved ? 'var(--success)' : '#F59E0B'}">
                <div style="flex:1;min-width:200px">
                    <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.3rem">
                        <h4>${h.name}</h4>
                        ${h.isApproved
                            ? '<span class="badge-approved">✅ Approved</span>'
                            : '<span class="badge-pending">⏳ Pending</span>'
                        }
                    </div>
                    <p>📍 ${h.address}, ${h.city}</p>
                    <div style="display:flex;gap:1.25rem;font-size:.88rem;color:var(--text-muted);flex-wrap:wrap;margin-top:.4rem">
                        <span><strong style="color:var(--text)">Owner:</strong> ${h.ownerId ? h.ownerId.name : 'Unknown'}</span>
                        <span><strong style="color:var(--text)">Contact:</strong> 📞 ${h.ownerId ? h.ownerId.phone : 'N/A'}</span>
                        <span><strong style="color:var(--text)">Views:</strong> 👁️ ${h.views || 0}</span>
                    </div>
                </div>
                <div style="display:flex;gap:.6rem;flex-wrap:wrap">
                    ${h.isApproved
                        ? `<button class="btn btn-sm" style="background:rgba(245,158,11,.1);color:#B45309" onclick="toggleApproval('${h._id}', false)">Revoke</button>`
                        : `<button class="btn btn-sm" style="background:rgba(16,185,129,.1);color:#059669" onclick="toggleApproval('${h._id}', true)">Approve ✔</button>`
                    }
                    <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger)" onclick="deleteAdminHostel('${h._id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch(err) {
        console.error('loadListings Error:', err);
        container.innerHTML = `<p style="color:var(--danger)">Failed to load listings.</p>`;
    }
}

window.toggleApproval = async function(id, isApproved) {
    try {
        await fetchAPI(`/admin/hostels/${id}/approve`, 'PUT', { isApproved });
        showToast(`Listing ${isApproved ? 'approved' : 'revoked'}.`, 'success');
        loadListings();
    } catch(err) {
        showToast(err.message, 'error');
    }
}

window.deleteAdminHostel = async function(id) {
    const isConfirmed = await customConfirm('Are you sure you want to delete this listing?');
    if(!isConfirmed) return;
    try {
        await fetchAPI(`/hostels/${id}`, 'DELETE');
        showToast('Listing deleted successfully.', 'success');
        loadListings();
    } catch(err) {
        showToast(err.message, 'error');
    }
}

// ---- ENQUIRIES MANAGEMENT ----
async function loadEnquiries() {
    const container = document.getElementById('enquiriesContainer');
    if(!container) return;
    container.innerHTML = spinner;

    try {
        const res = await fetchAPI('/admin/enquiries');
        const eq = res.data;

        if (eq.length === 0) {
            container.innerHTML = `<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">No enquiries found in the system.</div>`;
            return;
        }

        container.innerHTML = eq.map(e => `
            <div class="list-item" style="flex-direction:column;align-items:stretch;border-left-color:var(--primary)">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem">
                    <div>
                        <h4>Hostel: <span style="color:var(--primary)">${e.hostelId ? e.hostelId.name : 'Unknown Property'}</span></h4>
                        <p><strong>From:</strong> ${e.studentId ? e.studentId.name : 'Unknown'} (${e.studentId ? e.studentId.phone : 'No phone'})</p>
                        <p><strong>To Owner:</strong> ${e.ownerId ? e.ownerId.name : 'Unknown Owner'} (${e.ownerId ? e.ownerId.phone : 'No phone'})</p>
                    </div>
                    <span class="${e.status === 'Pending' ? 'badge-pending' : 'badge-approved'}">${e.status}</span>
                </div>

                <div class="msg-bubble" style="margin-top:.75rem">"${e.message}"</div>

                ${e.adminResponse ? `
                    <div class="msg-bubble msg-bubble-success" style="margin-top:.5rem">
                        <p style="font-size:.8rem;font-weight:700;color:var(--success);margin-bottom:.25rem">Platform Response:</p>
                        <p>${e.adminResponse}</p>
                    </div>
                ` : `
                    <div style="display:flex;gap:.5rem;margin-top:.75rem">
                        <input type="text" id="replyInput_${e._id}" class="form-input" placeholder="Type official response..." style="flex:1">
                        <button class="btn btn-primary btn-sm" onclick="replyEnquiry('${e._id}')">Submit Reply</button>
                    </div>
                `}
                <div style="font-size:.75rem;color:var(--text-light);text-align:right;margin-top:.5rem">
                    Submitted: ${new Date(e.createdAt).toLocaleDateString()}
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('loadEnquiries Error:', err);
        container.innerHTML = `<p style="color:var(--danger)">Failed to load enquiries.</p>`;
    }
}

window.replyEnquiry = async function(enquiryId) {
    const replyInput = document.getElementById(`replyInput_${enquiryId}`);
    const responseText = replyInput ? replyInput.value.trim() : '';

    if (!responseText) { showToast('Please type a response before submitting.', 'error'); return; }

    try {
        await fetchAPI(`/admin/enquiries/${enquiryId}/respond`, 'PUT', { responseText });
        showToast('Official response submitted successfully!', 'success');
        loadEnquiries();
    } catch (err) {
        showToast('Error submitting response: ' + err.message, 'error');
    }
};

// ---- DEACTIVATION MANAGEMENT ----
async function loadDeactivations() {
    const container = document.getElementById('deactivationsContainer');
    container.innerHTML = spinner;

    try {
        const res = await fetchAPI('/admin/deactivations');
        const requests = res.data;

        if (requests.length === 0) {
            container.innerHTML = `<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">✅ No pending deactivation requests.</div>`;
            return;
        }

        container.innerHTML = requests.map(r => `
            <div class="list-item" style="border-left-color:var(--danger)">
                <div style="flex:1">
                    <h4>${r.name} <span class="badge-info" style="font-size:.78rem">${r.role}</span></h4>
                    <p>✉️ ${r.email} &nbsp;|&nbsp; 📞 ${r.phone}</p>
                    <div class="msg-bubble msg-bubble-warn" style="margin-top:.75rem">
                        <p style="font-size:.8rem;font-weight:700;color:var(--accent);margin-bottom:.25rem;text-transform:uppercase">Reason for Deactivation:</p>
                        <p>${r.deactivationReason}</p>
                    </div>
                </div>
                <div style="display:flex;gap:.6rem;padding-left:1rem">
                    <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger)" onclick="handleDeactivation('${r._id}', 'approve')">Approve & Delete</button>
                    <button class="btn btn-outline btn-sm" onclick="handleDeactivation('${r._id}', 'reject')">Reject</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<p style="color:var(--danger)">Failed to load deactivation requests.</p>`;
    }
}

window.handleDeactivation = async function(id, action) {
    const isConfirmed = await customConfirm(`Are you sure you want to ${action} this deactivation request?`);
    if(!isConfirmed) return;

    try {
        await fetchAPI(`/admin/deactivations/${id}`, 'PUT', { action });
        showToast(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`, 'success');
        loadDeactivations();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ---- NOTIFICATION MODAL ----
let currentNotifyUserId = null;

window.openNotifyModal = function(userId) {
    currentNotifyUserId = userId;
    document.getElementById('notifyModal').style.display = 'flex';
};

window.closeNotifyModal = function() {
    currentNotifyUserId = null;
    document.getElementById('notifyModal').style.display = 'none';
    document.getElementById('notifyMessage').value = '';
};

window.submitNotification = async function() {
    const message = document.getElementById('notifyMessage').value.trim();
    const type = document.getElementById('notifyType').value;
    if (!message) { showToast('Please enter a message.', 'error'); return; }
    try {
        await fetchAPI(`/admin/notify-owner/${currentNotifyUserId}`, 'POST', { message, type });
        showToast('Notification sent to owner successfully!', 'success');
        closeNotifyModal();
    } catch (err) {
        showToast(err.message, 'error');
    }
};
