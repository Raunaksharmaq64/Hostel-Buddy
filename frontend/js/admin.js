document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Checks
    if (!checkAuth('Admin')) return;

    // 2. Load Initial Data
    loadAnalytics();
});

// Tab Navigation Logic
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');

    if (tabId === 'analytics') loadAnalytics();
    if (tabId === 'verifications') loadVerifications();
    if (tabId === 'students') loadUsers('Student');
    if (tabId === 'owners') loadUsers('Owner');
    if (tabId === 'listings') loadListings();
    if (tabId === 'enquiries') loadEnquiries();
}

// ---- ANALYTICS ----
async function loadAnalytics() {
    const container = document.getElementById('statsContainer');
    try {
        const res = await fetchAPI('/admin/analytics');
        const d = res.data;

        container.innerHTML = `
            <div class="stat-card glass-panel card-3d">
                <h3>Total Students</h3>
                <h1 style="color: #60A5FA">${d.users.students}</h1>
            </div>
            <div class="stat-card glass-panel card-3d">
                <h3>Total Owners</h3>
                <h1 style="color: #F472B6">${d.users.owners}</h1>
            </div>
            <div class="stat-card glass-panel card-3d">
                <h3>Total Properties</h3>
                <h1 style="color: #34D399">${d.hostels.total}</h1>
            </div>
            <div class="stat-card glass-panel card-3d">
                <h3>Approved Properties</h3>
                <h1 style="color: #A78BFA">${d.hostels.active}</h1>
            </div>
            <div class="stat-card glass-panel card-3d">
                <h3>Total Enquiries</h3>
                <h1 style="color: #FBBF24">${d.enquiries}</h1>
            </div>
        `;

        // Stagger animation
        gsap.from(".stat-card", { scale: 0.8, opacity: 0, duration: 0.5, stagger: 0.1, ease: "back.out(1.5)" });
    } catch(err) {
        container.innerHTML = "Error loading stats: " + err.message;
    }
}

// ---- VERIFICATIONS ----
async function loadVerifications() {
    const container = document.getElementById('verificationsContainer');
    container.innerHTML = "Loading...";

    try {
        const res = await fetchAPI('/admin/verifications');
        const verifications = res.data;

        if (verifications.length === 0) {
            container.innerHTML = `No pending verification requests.`;
            return;
        }

        container.innerHTML = verifications.map(u => `
            <div class="list-item" style="align-items: center; border-left: 4px solid var(--secondary);">
                <div style="flex: 1; min-width: 250px;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem;">
                        <h4 style="font-size:1.3rem; margin: 0;">${u.name}</h4>
                        <span class="badge" style="background: rgba(99, 102, 241, 0.1); color: var(--primary);">Owner</span>
                    </div>
                    <p style="color:var(--text-muted); font-size:0.95rem; margin: 0 0 0.8rem 0;">✉️ ${u.email} &nbsp;|&nbsp; 📞 ${u.phone}</p>
                    <div style="padding: 1rem; background: rgba(15, 23, 42, 0.6); border-radius: 12px; border: 1px solid var(--glass-border);">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.8rem;">
                            <div><small style="color:var(--text-muted); display:block;">Property Name</small><strong style="font-size:1.05rem; color:var(--text-main);">${u.hostelName || 'N/A'}</strong></div>
                            <div><small style="color:var(--text-muted); display:block;">Aadhaar Number</small><span style="font-family: monospace; font-size:1.05rem; color: #94a3b8;">${u.aadhaarNumber || 'N/A'}</span></div>
                            <div style="grid-column: 1 / -1;"><small style="color:var(--text-muted); display:block;">Location Match</small><span>📍 ${u.address}, ${u.city || ''}</span></div>
                        </div>
                    </div>
                </div>
                <div style="display:flex; gap:0.8rem; padding-left: 1rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" style="padding:0.6rem 1.2rem; display: flex; align-items: center; gap: 0.4rem;" onclick="handleVerification('${u._id}', 'verified')">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg> Approve
                    </button>
                    <button class="btn btn-outline" style="padding:0.6rem 1.2rem; color:var(--accent); border-color:var(--accent); display: flex; align-items: center; gap: 0.4rem;" onclick="handleVerification('${u._id}', 'rejected')">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg> Reject
                    </button>
                </div>
            </div>
        `).join('');
    } catch(err) {
        container.innerHTML = "Failed to load verifications.";
    }
}

window.handleVerification = async function(id, status) {
    const isConfirmed = await customConfirm(`Are you sure you want to mark this request as ${status}?`);
    if(!isConfirmed) return;
    try {
        await fetchAPI(`/admin/verifications/${id}`, 'PUT', { status });
        showToast(`Request marked as ${status}.`, "success");
        loadVerifications();
    } catch(err) {
        showToast(err.message, "error");
    }
}

// ---- USERS (STUDENTS/OWNERS) ----
async function loadUsers(role) {
    const container = document.getElementById(role.toLowerCase() + 'sContainer');
    container.innerHTML = "Loading...";

    try {
        const res = await fetchAPI(`/admin/users?role=${role}`);
        const users = res.data;

        if (users.length === 0) {
            container.innerHTML = `No ${role.toLowerCase()}s found.`;
            return;
        }

        container.innerHTML = users.map(u => `
            <div class="list-item">
                <div style="display: flex; align-items: center; gap: 1.2rem;">
                    <img src="${u.profilePhoto || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png'}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--glass-border);" loading="lazy">
                    <div>
                        <h4 style="font-size:1.2rem; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                            ${u.name}
                            ${u.isVerified ? '<span class="verified-badge" title="Verified" style="font-size: 0.8rem; padding: 0.2rem 0.5rem;"><svg class="verified-icon-svg" style="width:12px;height:12px;" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg></span>' : ''}
                        </h4>
                        <p style="color:var(--text-muted); font-size:0.9rem; margin: 0.2rem 0;">✉️ ${u.email} &nbsp;|&nbsp; 📞 ${u.phone}</p>
                        <small style="color: #64748b;">Joined: ${new Date(u.createdAt).toLocaleDateString()}</small>
                    </div>
                </div>
                <div>
                    <button class="btn btn-outline" style="border-color:var(--accent); color:var(--accent); padding:0.5rem 1rem; border-radius: 8px;" onclick="deleteUser('${u._id}', '${role}')">Remove User</button>
                </div>
            </div>
        `).join('');
    } catch(err) {
        container.innerHTML = "Failed to load users.";
    }
}

window.deleteUser = async function(id, role) {
    const isConfirmed = await customConfirm(`Are you sure you want to completely remove this ${role}? This action is irreversible.`);
    if(!isConfirmed) return;
    try {
        await fetchAPI(`/admin/users/${id}`, 'DELETE');
        showToast(`User removed successfully.`, "success");
        loadUsers(role);
    } catch(err) {
        showToast(err.message, "error");
    }
}

// ---- LISTINGS ----
async function loadListings() {
    const container = document.getElementById('hostelsContainer');
    if (!container) return; // Prevent crash if missing
    container.innerHTML = "Loading...";

    try {
        const res = await fetchAPI('/admin/hostels');
        const hostels = res.data;

        if (hostels.length === 0) {
            container.innerHTML = `No listings found.`;
            return;
        }

        container.innerHTML = hostels.map(h => `
            <div class="list-item" style="align-items: center; border-left: 4px solid ${h.isApproved ? 'var(--primary)' : 'var(--accent)'};">
                <div style="flex: 1; min-width: 200px;">
                    <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.4rem;">
                        <h4 style="font-size:1.3rem; margin: 0; color:var(--white)">${h.name}</h4>
                        <span class="badge" style="background: ${h.isApproved ? 'rgba(16, 185, 129, 0.1); color: #10b981;' : 'rgba(245, 158, 11, 0.1); color: #f59e0b;'}">
                            ${h.isApproved ? '✅ Approved' : '⏳ Pending'}
                        </span>
                    </div>
                    <p style="color:var(--text-muted); font-size:0.95rem; margin: 0 0 0.5rem 0;">📍 ${h.address}, ${h.city}</p>
                    <div style="display: flex; gap: 1.5rem; font-size: 0.9rem; color: #94a3b8; align-items: center; flex-wrap: wrap;">
                        <span><strong style="color: var(--text-main);">Owner:</strong> ${h.ownerId ? h.ownerId.name : 'Unknown'}</span>
                        <span><strong style="color: var(--text-main);">Contact:</strong> 📞 ${h.ownerId ? h.ownerId.phone : 'N/A'}</span>
                        <span><strong style="color: var(--text-main);">Views:</strong> 👁️ ${h.views}</span>
                    </div>
                </div>
                <div style="display:flex; gap:0.6rem; flex-wrap: wrap;">
                    ${h.isApproved 
                        ? `<button class="btn btn-outline" style="padding:0.5rem 1rem; color:#f59e0b; border-color:#f59e0b;" onclick="toggleApproval('${h._id}', false)">Revoke</button>`
                        : `<button class="btn btn-primary" style="padding:0.5rem 1rem; background: #10b981; border-color: #10b981; box-shadow: none;" onclick="toggleApproval('${h._id}', true)">Approve Listing</button>`
                    }
                    <button class="btn btn-outline" style="padding:0.5rem 1rem; color:var(--accent); border-color:var(--accent)" onclick="deleteAdminHostel('${h._id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch(err) {
        console.error("loadListings Error:", err);
        container.innerHTML = "Failed to load listings.";
    }
}

window.toggleApproval = async function(id, isApproved) {
    try {
        await fetchAPI(`/admin/hostels/${id}/approve`, 'PUT', { isApproved });
        showToast(`Listing ${isApproved ? 'approved' : 'revoked'}.`, "success");
        loadListings();
    } catch(err) {
        showToast(err.message, "error");
    }
}

window.deleteAdminHostel = async function(id) {
    const isConfirmed = await customConfirm(`Are you sure you want to delete this listing?`);
    if(!isConfirmed) return;
    try {
        await fetchAPI(`/hostels/${id}`, 'DELETE');
        showToast(`Listing deleted successfully.`, "success");
        loadListings();
    } catch(err) {
        showToast(err.message, "error");
    }
}

// ---- ENQUIRIES MANAGEMENT ----
async function loadEnquiries() {
    const container = document.getElementById('enquiriesContainer');
    if(!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid var(--primary); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p class="text-muted" style="margin-top: 1rem;">Loading student enquiries...</p>
        </div>
    `;

    try {
        const res = await fetchAPI('/admin/enquiries');
        const eq = res.data;

        if (eq.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-muted); background: rgba(15, 23, 42, 0.5); border-radius: 12px; border: 1px solid var(--glass-border);">No enquiries found in the system.</div>`;
            return;
        }

        container.innerHTML = eq.map(e => `
            <div class="list-item" style="display: flex; flex-direction: column; gap: 1rem; align-items: stretch;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.3rem;">
                            Hostel: <span style="color: var(--primary);">${e.hostelId ? e.hostelId.name : 'Unknown Property'}</span>
                        </h4>
                        <p style="font-size: 0.9rem; color: var(--text-muted);">
                            <strong>From:</strong> ${e.studentId ? e.studentId.name : 'Unknown Student'} (${e.studentId ? e.studentId.phone : 'No phone'})
                        </p>
                        <p style="font-size: 0.9rem; color: var(--text-muted);">
                            <strong>To Owner:</strong> ${e.ownerId ? e.ownerId.name : 'Unknown Owner'} (${e.ownerId ? e.ownerId.phone : 'No phone'})
                        </p>
                    </div>
                    <span class="badge" style="background: ${e.status === 'Pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${e.status === 'Pending' ? '#f59e0b' : '#10b981'}; padding: 0.4rem 0.8rem;">
                        ${e.status}
                    </span>
                </div>
                
                <div style="background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: 8px; border-left: 3px solid var(--primary);">
                    <p style="font-size: 0.95rem; font-style: italic;">"${e.message}"</p>
                </div>

                ${e.adminResponse ? `
                    <div style="background: rgba(16, 185, 129, 0.1); padding: 1rem; border-radius: 8px; border-left: 3px solid var(--secondary); margin-top: 0.5rem;">
                        <p style="font-size: 0.85rem; color: var(--secondary); font-weight: 600; margin-bottom: 0.3rem;">Platform Response:</p>
                        <p style="font-size: 0.95rem;">${e.adminResponse}</p>
                    </div>
                ` : `
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                        <input type="text" id="replyInput_${e._id}" class="form-input" placeholder="Type official response..." style="flex: 1; padding: 0.6rem; background: rgba(15,23,42,0.6);">
                        <button class="btn btn-outline" style="border-color: var(--primary); color: var(--primary); padding: 0.6rem 1.2rem;" onclick="replyEnquiry('${e._id}')">Submit Reply</button>
                    </div>
                `}
                <div style="font-size: 0.75rem; color: var(--text-muted); text-align: right; margin-top: 0.5rem;">
                    Submitted: ${new Date(e.createdAt).toLocaleDateString()}
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error("loadEnquiries Error:", err);
        showToast("Error loading enquiries: " + err.message, "error");
        container.innerHTML = "Failed to load enquiries.";
    }
}

window.replyEnquiry = async function(enquiryId) {
    const replyInput = document.getElementById(`replyInput_${enquiryId}`);
    const responseText = replyInput ? replyInput.value.trim() : '';
    
    if (!responseText) {
        showToast("Please type a response before submitting.", "error");
        return;
    }

    try {
        await fetchAPI(`/admin/enquiries/${enquiryId}/respond`, 'PUT', { responseText });
        showToast("Official response submitted successfully!", "success");
        loadEnquiries(); // Refresh the list
    } catch (err) {
        showToast("Error submitting response: " + err.message, "error");
    }
};
