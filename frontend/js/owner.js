document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Checks
    if (!checkAuth('Owner')) return;

    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('userNameDisplay').textContent = `Hello, ${user.name}`;

    // 2. Load Initial Data
    loadDashboardStats();
});

// Tab Navigation Logic
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    
    // Only add active to nav item if triggered by an actual click event
    if (window.event && window.event.currentTarget && window.event.currentTarget.classList) {
        window.event.currentTarget.classList.add('active');
    } else {
        // Fallback for programmatic tab switches
        const targetNavBtn = Array.from(document.querySelectorAll('.nav-item')).find(btn => btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`switchTab('${tabId}')`));
        if (targetNavBtn) targetNavBtn.classList.add('active');
    }

    // Load data based on tab
    if (tabId === 'dashboard') loadDashboardStats();
    if (tabId === 'my-hostels') loadMyHostels();
    if (tabId === 'enquiries') loadOwnerEnquiries();
    if (tabId === 'profile') loadOwnerProfile();
}

// ---- DASHBOARD STATS LOGIC ----
async function loadDashboardStats() {
    try {
        const [hostelRes, enqRes] = await Promise.all([
            fetchAPI('/hostels/owner/my-hostels'),
            fetchAPI('/enquiries/owner')
        ]);
        
        document.getElementById('stat-hostels').textContent = hostelRes.count;
        document.getElementById('stat-enquiries').textContent = enqRes.count;
    } catch(err) {
        console.error("Failed loading stats:", err);
    }
}

// ---- PROFILE LOGIC ----
async function loadOwnerProfile() {
    try {
        const res = await fetchAPI('/auth/me');
        const user = res.data;
        document.getElementById('opName').value = user.name || '';
        document.getElementById('opPhone').value = user.phone || '';
        document.getElementById('opAddress').value = user.address || '';
        document.getElementById('opCity').value = user.city || '';
        document.getElementById('opHostelName').value = user.hostelName || '';
        document.getElementById('opDescription').value = user.description || '';
        document.getElementById('opAadhaarNumber').value = user.aadhaarNumber || '';
        
        const statusEl = document.getElementById('verificationStatusText');
        const vStatus = user.verificationStatus || 'unverified';
        statusEl.textContent = `Status: ${vStatus.charAt(0).toUpperCase() + vStatus.slice(1)}`;
        
        const btnReq = document.getElementById('btnRequestVerification');
        if(vStatus === 'pending') {
            btnReq.style.display = 'none';
            statusEl.style.color = 'orange';
        } else if(vStatus === 'verified') {
            btnReq.style.display = 'none';
            statusEl.style.color = 'green';
        } else if(vStatus === 'rejected') {
            btnReq.textContent = 'Request Again';
            btnReq.style.display = 'inline-block';
            statusEl.style.color = 'red';
        } else {
            btnReq.style.display = 'inline-block';
            btnReq.textContent = 'Request Verification';
            statusEl.style.color = 'var(--text-muted)';
        }
        
        if(user.profilePhoto) {
            document.getElementById('ownerProfilePreview').src = user.profilePhoto;
        }

        // Load Notifications
        loadNotifications();

        // Display Verified Badge next to name if verified
        const nameDisplay = document.getElementById('userNameDisplay');
        if (user.isVerified && !nameDisplay.innerHTML.includes('verified-badge')) {
            nameDisplay.innerHTML = `Hello, ${user.name} <span class="verified-badge" title="Verified Owner"><svg class="verified-icon-svg" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg> Verified</span>`;
        }
    } catch(err) {
        console.error(err);
    }
}

// Local image preview update
document.getElementById('ownerProfilePhotoInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('ownerProfilePreview').src = event.target.result;
        }
        reader.readAsDataURL(file);
    }
});

document.getElementById('ownerProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Saving...";
    
    const payload = {
        name: document.getElementById('opName').value,
        phone: document.getElementById('opPhone').value,
        address: document.getElementById('opAddress').value,
        city: document.getElementById('opCity').value,
        hostelName: document.getElementById('opHostelName').value,
        description: document.getElementById('opDescription').value,
        aadhaarNumber: document.getElementById('opAadhaarNumber').value
    };

    const formData = new FormData();
    Object.keys(payload).forEach(key => formData.append(key, payload[key]));
    
    const photoInput = document.getElementById('ownerProfilePhotoInput');
    if (photoInput.files[0]) {
        formData.append('profilePhoto', photoInput.files[0]);
    }

    try {
        await fetchAPI('/profiles/owner', 'PUT', formData, true);
        showToast("Profile updated successfully!", "success");
        // Reload to update the UI including the verification button
        loadOwnerProfile();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.textContent = "Save Profile";
    }
});

// Request Verification
window.requestVerification = async function() {
    try {
        document.getElementById('btnRequestVerification').textContent = 'Requesting...';
        await fetchAPI('/profiles/owner/request-verification', 'POST');
        showToast('Verification request sent successfully!', 'success');
        loadOwnerProfile();
    } catch (err) {
        showToast(err.message, 'error');
        document.getElementById('btnRequestVerification').textContent = 'Request Verification';
    }
}

// In-memory store for selected images to allow multiple additions and deletions
const selectedImages = {
    buildingPhotos: [],
    roomPhotos: [],
    messPhotos: [],
    washroomPhotos: []
};

function handleImagePreviews(inputId, previewContainerId, storeKey) {
    document.getElementById(inputId).addEventListener('change', function(e) {
        const container = document.getElementById(previewContainerId);
        
        if (this.files) {
            Array.from(this.files).forEach(file => {
                // Prevent duplicate files based on name + size
                if (!selectedImages[storeKey].some(f => f.name === file.name && f.size === file.size)) {
                    selectedImages[storeKey].push(file);
                    
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const wrapper = document.createElement('div');
                        wrapper.style.position = 'relative';
                        wrapper.style.display = 'inline-block';
                        
                        const img = document.createElement('img');
                        img.src = event.target.result;
                        img.style.width = '60px';
                        img.style.height = '60px';
                        img.style.objectFit = 'cover';
                        img.style.borderRadius = '8px';
                        img.style.border = '2px solid var(--primary)';
                        
                        const removeBtn = document.createElement('button');
                        removeBtn.innerHTML = '×';
                        removeBtn.style.position = 'absolute';
                        removeBtn.style.top = '-5px';
                        removeBtn.style.right = '-5px';
                        removeBtn.style.background = 'var(--accent)';
                        removeBtn.style.color = 'white';
                        removeBtn.style.border = 'none';
                        removeBtn.style.borderRadius = '50%';
                        removeBtn.style.width = '20px';
                        removeBtn.style.height = '20px';
                        removeBtn.style.cursor = 'pointer';
                        removeBtn.style.lineHeight = '20px';
                        removeBtn.style.padding = '0';
                        
                        removeBtn.onclick = (eventClick) => {
                            eventClick.preventDefault();
                            wrapper.remove();
                            selectedImages[storeKey] = selectedImages[storeKey].filter(f => f !== file);
                        };
                        
                        wrapper.appendChild(img);
                        wrapper.appendChild(removeBtn);
                        container.appendChild(wrapper);
                    }
                    reader.readAsDataURL(file);
                }
            });
        }
        // Reset file input so same file can be selected again if removed
        this.value = '';
    });
}

// Attach preview listeners
handleImagePreviews('hBuildingImages', 'previewBuilding', 'buildingPhotos');
handleImagePreviews('hRoomImages', 'previewRooms', 'roomPhotos');
handleImagePreviews('hMessImages', 'previewMess', 'messPhotos');
handleImagePreviews('hBathroomImages', 'previewBathrooms', 'washroomPhotos');

let editingHostelId = null;

// ---- HOSTEL CREATION LOGIC ----
document.getElementById('hostelForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Uploading (This may take a while)...";
    
    const formData = new FormData();
    formData.append('name', document.getElementById('hName').value);
    formData.append('monthlyPrice', document.getElementById('hPrice').value);
    formData.append('dailyPrice', document.getElementById('hDaily').value || 0);
    formData.append('depositAmount', document.getElementById('hDeposit').value);
    formData.append('description', document.getElementById('hDesc').value);
    formData.append('address', document.getElementById('hAddress').value);
    formData.append('city', document.getElementById('hCity').value);
    formData.append('state', document.getElementById('hState').value);
    formData.append('pincode', document.getElementById('hPincode').value);
    formData.append('foodAvailability', document.getElementById('hFood').value);
    formData.append('foodDetails', document.getElementById('hFoodDetails').value);
    formData.append('rules', document.getElementById('hRules').value);

    // Location & Keywords
    const googleMapLink = document.getElementById('hGoogleMapLink').value;
    if(googleMapLink) {
        formData.append('googleMapLink', googleMapLink);
    }

    const keywordsVal = document.getElementById('hKeywords').value;
    const keywordsArray = keywordsVal ? keywordsVal.split(',').map(k => k.trim()).filter(k=>k) : [];
    formData.append('keywords', JSON.stringify(keywordsArray));

    // Append Categorized Images from in-memory store
    const appendFiles = (storeKey, fieldName) => {
        const files = selectedImages[storeKey];
        for(let i=0; i<files.length; i++) {
            formData.append(fieldName, files[i]);
        }
    };

    appendFiles('buildingPhotos', 'buildingPhotos');
    appendFiles('roomPhotos', 'roomPhotos');
    appendFiles('messPhotos', 'messPhotos');
    appendFiles('washroomPhotos', 'washroomPhotos');

    try {
        if (editingHostelId) {
            await fetchAPI(`/hostels/${editingHostelId}`, 'PUT', formData, true);
            showToast("Listing updated successfully!", "success");
            cancelHostelEdit();
        } else {
            await fetchAPI('/hostels', 'POST', formData, true);
            showToast("Listing created! Awaiting admin approval.", "success");
            e.target.reset();
            Object.keys(selectedImages).forEach(key => selectedImages[key] = []);
            ['previewBuilding', 'previewRooms', 'previewMess', 'previewBathrooms'].forEach(id => {
                document.getElementById(id).innerHTML = '';
            });
        }
    } catch (err) {
        showToast("Failed to save listing: " + err.message, "error");
    } finally {
        if(btn) btn.textContent = editingHostelId ? "Update Listing" : "Create Listing";
    }
});

window.editHostel = async function(id) {
    try {
        const res = await fetchAPI(`/hostels/${id}`);
        const h = res.data;
        
        editingHostelId = id;
        
        document.getElementById('hName').value = h.name;
        document.getElementById('hPrice').value = h.monthlyPrice;
        document.getElementById('hDaily').value = h.dailyPrice || '';
        document.getElementById('hDeposit').value = h.depositAmount;
        document.getElementById('hDesc').value = h.description;
        document.getElementById('hAddress').value = h.address;
        document.getElementById('hCity').value = h.city;
        document.getElementById('hState').value = h.state;
        document.getElementById('hPincode').value = h.pincode;
        document.getElementById('hFood').value = h.foodAvailability.toString();
        document.getElementById('hFoodDetails').value = h.foodDetails || '';
        document.getElementById('hRules').value = h.rules || '';
        document.getElementById('hGoogleMapLink').value = h.googleMapLink || '';
        document.getElementById('hKeywords').value = h.keywords ? h.keywords.join(', ') : '';

        // Reset previews
        Object.keys(selectedImages).forEach(key => selectedImages[key] = []);
        ['previewBuilding', 'previewRooms', 'previewMess', 'previewBathrooms'].forEach(gridId => {
            document.getElementById(gridId).innerHTML = '';
        });
        
        // Change UI text
        const titleEl = document.querySelector('#add-hostel h2');
        if (titleEl) titleEl.textContent = "Edit Listing";
        
        const submitBtn = document.getElementById('submitHostelBtn');
        if (submitBtn) submitBtn.textContent = "Update Listing";
        
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) cancelBtn.style.display = 'block';
        
        // Switch tab
        switchTab('add-hostel');
        
    } catch(err) {
        showToast("Error loading hostel details: " + err.message, "error");
    }
}

window.cancelHostelEdit = function() {
    editingHostelId = null;
    document.getElementById('hostelForm').reset();
    Object.keys(selectedImages).forEach(key => selectedImages[key] = []);
    ['previewBuilding', 'previewRooms', 'previewMess', 'previewBathrooms'].forEach(gridId => {
        document.getElementById(gridId).innerHTML = '';
    });
    
    const titleEl = document.querySelector('#add-hostel h2');
    if (titleEl) titleEl.textContent = "Add New Listing";
    
    const submitBtn = document.getElementById('submitHostelBtn');
    if (submitBtn) submitBtn.textContent = "Create Listing";
    
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    switchTab('my-hostels');
    loadMyHostels();
}

// ---- MY HOSTELS LOGIC ----
async function loadMyHostels() {
    const container = document.getElementById('myHostelsContainer');
    container.innerHTML = "Loading...";

    try {
        const res = await fetchAPI('/hostels/owner/my-hostels');
        const hostels = res.data;

        if (hostels.length === 0) {
            container.innerHTML = "You haven't listed any hostels yet.";
            return;
        }

        container.innerHTML = hostels.map(h => `
            <div class="glass-panel card-3d" style="padding: 1.5rem;">
                <h3 style="margin-bottom: 0.5rem; font-size:1.5rem">${h.name}</h3>
                <p style="color:var(--text-muted); font-size:0.9rem;">📍 ${h.address}, ${h.city}</p>
                <div style="margin: 1rem 0; padding: 0.5rem; background: var(--surface); border-radius: 8px;">
                    <p style="font-size: 0.9rem;">Status: <span style="color:${h.isApproved ? 'green' : 'orange'}; font-weight:bold">${h.isApproved ? 'Approved' : 'Pending Approval'}</span></p>
                    <p style="font-size: 0.9rem;">Views: <strong>${h.views}</strong></p>
                </div>
                <div class="action-btns">
                    <button class="btn btn-outline" style="padding: 0.5rem; flex:1; border-color:var(--primary); color:var(--primary)" onclick="editHostel('${h._id}')">Edit</button>
                    <button class="btn btn-outline" style="padding: 0.5rem; flex:1" onclick="deleteHostel('${h._id}')">Delete</button>
                </div>
            </div>
        `).join('');

        gsap.from("#myHostelsContainer > div", { y:20, opacity:0, duration:0.5, stagger:0.1 });
    } catch(err) {
        container.innerHTML = "Error loading hostels.";
    }
}

window.deleteHostel = async function(id) {
    const isConfirmed = await customConfirm("Are you sure you want to delete this listing?");
    if(!isConfirmed) return;
    try {
        await fetchAPI(`/hostels/${id}`, 'DELETE');
        showToast("Listing deleted successfully.", "success");
        loadMyHostels();
    } catch(err) {
        showToast(err.message, "error");
    }
}

// ---- ENQUIRIES LOGIC ----
async function loadOwnerEnquiries() {
    const container = document.getElementById('ownerEnquiriesContainer');
    container.innerHTML = "Loading...";

    try {
        const res = await fetchAPI('/enquiries/owner');
        const enquiries = res.data;

        if (enquiries.length === 0) {
            container.innerHTML = "No student enquiries right now.";
            return;
        }

        container.innerHTML = enquiries.map(eq => `
            <div class="list-item">
                <div style="flex:1">
                    <h4 style="color:var(--primary); font-size: 1.1rem; margin-bottom: 0.5rem;">${eq.hostelId ? eq.hostelId.name : 'Unknown'}</h4>
                    <div style="background: rgba(15, 23, 42, 0.4); padding: 1rem; border-radius: 8px; border-left: 3px solid var(--primary); margin-bottom: 0.8rem;">
                        <p style="font-style: italic; font-size: 0.95rem;">"${eq.message}"</p>
                    </div>
                    ${eq.adminResponse ? `
                        <div style="background: rgba(16, 185, 129, 0.1); padding: 1rem; border-radius: 8px; border-left: 3px solid var(--secondary); margin-bottom: 0.8rem;">
                            <p style="font-size: 0.85rem; color: var(--secondary); font-weight: 600; margin-bottom: 0.2rem;">Official Platform Response:</p>
                            <p style="font-size: 0.95rem;">${eq.adminResponse}</p>
                        </div>
                    ` : ''}
                    <p style="color:var(--text-muted); font-size:0.9rem;">
                        <strong>From:</strong> ${eq.studentId ? eq.studentId.name : 'N/A'} 
                        | <strong>Contact:</strong> 📞 ${eq.studentId ? eq.studentId.phone : 'N/A'}
                    </p>
                </div>
                <div style="text-align:right; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end;">
                    <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
                        <span style="display:block; font-weight:bold; color:${eq.status === 'Pending' ? 'orange' : (eq.status === 'Responded' ? '#10b981' : 'gray')}; background: rgba(255,255,255,0.05); padding: 0.3rem 0.8rem; border-radius: 12px; font-size: 0.85rem;">
                            ${eq.status}
                        </span>
                        <button class="btn btn-outline" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; border-color: rgba(244, 63, 94, 0.5); color: var(--accent);" onclick="deleteOwnerEnquiry('${eq._id}')" title="Clear Enquiry">
                            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                    <div style="margin-top: auto;">
                        ${eq.status === 'Pending' ? 
                            `<button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem" onclick="updateEnquiry('${eq._id}', 'Responded')">Mark Responded</button>` : 
                            `<button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem; border-color: rgba(255,255,255,0.2);" onclick="updateEnquiry('${eq._id}', 'Closed')">Close Tracking</button>`
                        }
                    </div>
                </div>
            </div>
        `).join('');
    } catch(err) {
        container.innerHTML = "Error loading enquiries.";
    }
}

window.updateEnquiry = async function(id, status) {
    try {
        await fetchAPI(`/enquiries/${id}/status`, 'PUT', { status });
        showToast(`Enquiry marked as ${status}.`, "success");
        loadOwnerEnquiries();
    } catch(err) {
        showToast(err.message, "error");
    }
}

window.deleteOwnerEnquiry = async function(id) {
    const isConfirmed = await customConfirm("Are you sure you want to clear this enquiry?");
    if(!isConfirmed) return;
    try {
        await fetchAPI(`/enquiries/${id}`, 'DELETE');
        showToast("Enquiry cleared successfully.", "success");
        loadOwnerEnquiries();
    } catch(err) {
        showToast(err.message, "error");
    }
}

// ---- NOTIFICATIONS LOGIC ----
async function loadNotifications() {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    try {
        const res = await fetchAPI('/profiles/notifications');
        const notifications = res.data;

        const clearBtn = document.getElementById('clearNotifBtn');
        if (clearBtn) clearBtn.style.display = notifications.length > 0 ? 'inline-block' : 'none';

        if (notifications.length === 0) {
            container.innerHTML = '<p class="text-muted">No notifications yet.</p>';
            return;
        }

        container.innerHTML = notifications.map(n => `
            <div class="glass-panel" style="padding: 1rem; border-left: 4px solid ${n.type === 'warning' ? 'var(--accent)' : (n.type === 'success' ? '#10b981' : 'var(--primary)')}; background: var(--surface); margin-bottom: 0.8rem; border-radius: 8px; border-top: 1px solid var(--border); border-right: 1px solid var(--border); border-bottom: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">${new Date(n.createdAt).toLocaleString()}</span>
                    ${!n.isRead ? '<span style="background: var(--primary); width: 8px; height: 8px; border-radius: 50%;"></span>' : ''}
                </div>
                <p style="font-size: 0.95rem; color: var(--text-2); font-weight: 500;">${n.message}</p>
            </div>
        `).join('');

        // Mark as read after a short delay
        setTimeout(markNotificationsRead, 3000);
    } catch (err) {
        console.error("Failed to load notifications:", err);
    }
}

async function markNotificationsRead() {
    try {
        await fetchAPI('/profiles/notifications/read', 'PUT');
    } catch (err) {
        console.error("Failed to mark notifications read:", err);
    }
}

window.clearNotifications = async function() {
    const isConfirmed = await customConfirm("Are you sure you want to clear all your notifications?");
    if(!isConfirmed) return;

    try {
        await fetchAPI('/profiles/notifications', 'DELETE');
        showToast("Notifications cleared successfully.", "success");
        loadNotifications();
    } catch(err) {
        showToast(err.message, "error");
    }
}

// ---- DEACTIVATION LOGIC ----
window.openDeactivateModal = function() {
    document.getElementById('deactivateModal').style.display = 'flex';
};

window.closeDeactivateModal = function() {
    document.getElementById('deactivateModal').style.display = 'none';
};

window.submitDeactivationRequest = async function() {
    const reason = document.getElementById('deactivateReason').value.trim();
    if (!reason) {
        showToast("Please provide a reason for deactivation.", "error");
        return;
    }

    try {
        await fetchAPI('/profiles/request-deactivation', 'POST', { reason });
        showToast("Deactivation request submitted. Admin will review it.", "success");
        closeDeactivateModal();
    } catch (err) {
        showToast(err.message, "error");
    }
};
