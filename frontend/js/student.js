document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Checks
    if (!checkAuth('Student')) return;

    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('userNameDisplay').textContent = `Hello, ${user.name}`;

    // 2. Load Initial Data
    loadProfileDetails();
    searchHostels();
});

// Tab Navigation Logic
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');

    // Load data based on tab
    if (tabId === 'discover') searchHostels();
    if (tabId === 'enquiries') loadEnquiries();
    if (tabId === 'profile') loadProfileDetails();
}

// Helper for Cloudinary Image Optimization
function getOptimizedUrl(url, width = 800) {
    if(!url) return '';
    if(url.includes('cloudinary.com') && url.includes('/upload/')) {
        return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
    }
    return url;
}

// ---- PROFILE LOGIC ----
async function loadProfileDetails() {
    try {
        const res = await fetchAPI('/auth/me');
        const user = res.data;
        
        document.getElementById('profileName').value = user.name || '';
        document.getElementById('profilePhone').value = user.phone || '';
        document.getElementById('collegeName').value = user.collegeName || '';
        document.getElementById('fatherPhone').value = user.fatherPhone || '';
        document.getElementById('permanentAddress').value = user.permanentAddress || '';
        if(user.profilePhoto) {
            document.getElementById('profilePreview').src = user.profilePhoto;
        }
    } catch(err) {
        console.error(err);
    }
}

// Local image preview update
document.getElementById('profilePhotoInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('profilePreview').src = event.target.result;
        }
        reader.readAsDataURL(file);
    }
});

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Saving...";
    
    const payload = {
        name: document.getElementById('profileName').value,
        phone: document.getElementById('profilePhone').value,
        collegeName: document.getElementById('collegeName').value,
        fatherPhone: document.getElementById('fatherPhone').value,
        permanentAddress: document.getElementById('permanentAddress').value
    };

    const formData = new FormData();
    Object.keys(payload).forEach(key => formData.append(key, payload[key]));

    const photoInput = document.getElementById('profilePhotoInput');
    if (photoInput.files[0]) {
        formData.append('profilePhoto', photoInput.files[0]);
    }

    try {
        await fetchAPI('/profiles/student', 'PUT', formData, true);
        showToast("Profile updated successfully!", "success");
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.textContent = "Save Profile";
    }
});

// ---- HOSTEL DISCOVERY LOGIC ----
// Search and filter hostels (with debounce for better UX)
let searchTimeout;
async function searchHostels() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const query = document.getElementById('searchInput').value;
        const minPrice = document.getElementById('minPrice').value;
        const maxPrice = document.getElementById('maxPrice').value;
        const verifiedOnly = document.getElementById('verifiedOnly').checked;
        const foodIncluded = document.getElementById('foodIncluded').checked;
        
        const facilities = Array.from(document.querySelectorAll('.facility-filter:checked')).map(cb => cb.value);

        const params = new URLSearchParams();
        if(query) params.append('location', query);
        if(minPrice) params.append('minPrice', minPrice);
        if(maxPrice) params.append('maxPrice', maxPrice);
        if(verifiedOnly) params.append('isVerified', 'true');
        if(foodIncluded) params.append('foodAvailability', 'true');
        if(facilities.length > 0) params.append('facilities', facilities.join(','));

        document.getElementById('hostelsContainer').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid var(--primary); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 1rem;">Searching...</p>
            </div>
        `;

        try {
            const res = await fetchAPI(`/hostels?${params.toString()}`);
            renderHostels(res.data);
            if(res.data.length === 0) {
                document.getElementById('hostelsContainer').innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted); background: rgba(15, 23, 42, 0.5); border-radius: 12px; border: 1px solid var(--glass-border);">
                        <h3 style="margin-bottom: 0.5rem; color: white;">No properties found</h3>
                        <p>Try adjusting your search filters.</p>
                        <button class="btn btn-outline" style="margin-top: 1rem;" onclick="resetFilters()">Clear Filters</button>
                    </div>
                `;
            }
        } catch(err) {
            console.error(err);
            showToast("Failed to fetch hostels", "error");
        }
    }, 300); // 300ms debounce
}

window.resetFilters = function() {
    document.getElementById('searchInput').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('verifiedOnly').checked = false;
    document.getElementById('foodIncluded').checked = false;
    document.querySelectorAll('.facility-filter').forEach(cb => cb.checked = false);
    searchHostels();
};

// Helper function to render hostels
function renderHostels(hostels) {
    const container = document.getElementById('hostelsContainer');

    if (hostels.length === 0) return;

    try {
        container.innerHTML = hostels.map(h => `
            <div class="hostel-card glass-panel card-3d">
                <img src="${h.buildingPhotos && h.buildingPhotos.length > 0 ? getOptimizedUrl(h.buildingPhotos[0], 600) : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'}" class="hostel-img" alt="Hostel Room" loading="lazy">
                <div>
                    <h3 class="hostel-title" style="display: flex; justify-content: space-between; align-items: center;">
                        ${h.name} 
                        ${h.isVerified ? '<span class="verified-badge" title="Verified Property"><svg class="verified-icon-svg" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg> Verified</span>' : ''}
                    </h3>
                    <p style="color:var(--text-muted); font-size: 0.9rem;">📍 ${h.city}, ${h.address}</p>
                </div>
                <div>
                    <span class="badge">🍽️ Food: ${h.foodAvailability ? 'Yes' : 'No'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                    <span class="hostel-price">₹${h.monthlyPrice}<span style="font-size: 0.9rem; color:var(--text-muted)">/mo</span></span>
                    <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick="openHostelDetails('${h._id}')">View Details</button>
                </div>
            </div>
        `).join('');

        // Trigger GSAP animation for new elements
        gsap.from(".hostel-card", {
            y: 30,
            opacity: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: "power2.out"
        });

    } catch (error) {
        container.innerHTML = `<p style="color:red">Error loading hostels: ${error.message}</p>`;
    }
}

// ---- DETAILED VIEW LOGIC ----
window.openHostelDetails = async function(id) {
    const modal = document.getElementById('hostelDetailModal');
    // Basic loading state
    document.getElementById('modalHeader').innerHTML = "<h2>Loading details...</h2>";
    ['galleryBuilding', 'galleryRooms', 'galleryMess', 'galleryBathrooms'].forEach(grid => document.getElementById(grid).innerHTML = '');
    
    modal.style.display = 'block';

    try {
        const res = await fetchAPI(`/hostels/${id}`);
        const h = res.data;

        // Populate Header
        document.getElementById('modalHeader').innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        ${h.name} 
                        ${h.isVerified ? '<span class="verified-badge" title="Verified Property" style="font-size: 1rem;"><svg class="verified-icon-svg" style="width:16px;height:16px;" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg> Verified</span>' : ''}
                    </h1>
                    <p style="color: var(--text-muted); font-size: 1.1rem; margin-bottom: 1rem;">📍 ${h.address}, ${h.city}, ${h.state} - ${h.pincode}</p>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="badge">🍽️ Food: ${h.foodAvailability ? 'Available' : 'Not Available'}</span>
                        <span class="badge" style="display:flex; align-items:center; gap:0.4rem;">
                            📞 Owner: ${h.ownerId ? h.ownerId.phone : 'N/A'}
                            ${h.ownerId && h.ownerId.isVerified ? '<span class="verified-badge" title="Verified Owner" style="font-size:0.75rem; padding:0.1rem 0.4rem; display:flex; align-items:center; gap:0.2rem;"><svg class="verified-icon-svg" style="width:10px;height:10px;" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg> Verified</span>' : ''}
                        </span>
                        ${h.googleMapLink ? `<a href="${h.googleMapLink}" target="_blank" class="badge" style="background:var(--secondary); color:#fff; text-decoration:none; display:flex; align-items:center; gap:0.3rem;"><svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Go There</a>` : ''}
                    </div>
                </div>
                <div style="text-align: right; background: rgba(99, 102, 241, 0.1); padding: 1.5rem; border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.3);">
                    <div style="font-size: 2.5rem; font-weight: 800; color: var(--primary);">₹${h.monthlyPrice}<span style="font-size: 1rem; color: var(--text-muted); font-weight: 500;">/month</span></div>
                    
                    <!-- Inline Enquiry Form -->
                    <div style="margin-top: 1.5rem; text-align: left; background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: 12px; border: 1px solid var(--glass-border);">
                        <label style="display: block; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">Send Enquiry</label>
                        <textarea id="enquiryMsg_${h._id}" class="form-textarea" rows="2" placeholder="Hi, I am interested..." style="margin-bottom: 0.8rem;"></textarea>
                        <button class="btn btn-primary" style="width: 100%;" onclick="sendEnquiry('${h._id}')">Submit Enquiry</button>
                    </div>
                </div>
            </div>
            <p style="margin-top: 1.5rem; font-size: 1.1rem; line-height: 1.8; color: var(--text-main);">${h.description}</p>
        `;

        // Helper to render grids
        const renderGrid = (containerId, imagesArr, emptyMsg) => {
            const container = document.getElementById(containerId);
            if (!imagesArr || imagesArr.length === 0) {
                container.innerHTML = `<p style="color: var(--text-muted); font-style: italic;">${emptyMsg}</p>`;
                return;
            }
            container.innerHTML = imagesArr.map(imgSrc => `
                <div style="border-radius: 12px; overflow: hidden; border: 1px solid var(--glass-border); aspect-ratio: 4/3;">
                    <img src="${getOptimizedUrl(imgSrc, 800)}" style="width: 100%; height: 100%; object-fit: cover; transition: var(--transition);" class="gallery-img-hover" loading="lazy">
                </div>
            `).join('');
        };

        renderGrid('galleryBuilding', h.buildingPhotos, "No building photos uploaded.");
        renderGrid('galleryRooms', h.roomPhotos, "No room photos uploaded.");
        renderGrid('galleryMess', h.messPhotos, "No mess area photos uploaded.");
        renderGrid('galleryBathrooms', h.washroomPhotos, "No washroom photos uploaded.");

    } catch (err) {
        document.getElementById('modalHeader').innerHTML = `<p style="color:red">Failed to load details: ${err.message}</p>`;
    }
}

window.closeDetailsModal = function() {
    document.getElementById('hostelDetailModal').style.display = 'none';
}

// ---- ENQUIRY LOGIC ----
window.sendEnquiry = async function(hostelId) {
    const msgInput = document.getElementById(`enquiryMsg_${hostelId}`);
    const msg = msgInput ? msgInput.value.trim() : '';
    
    if (!msg) {
        showToast("Please enter a message for your enquiry.", "error");
        return;
    }

    try {
        await fetchAPI('/enquiries', 'POST', { hostelId, message: msg });
        showToast("Enquiry sent successfully! Track it in the 'My Enquiries' tab.", "success");
        if(msgInput) msgInput.value = ''; // clear input
    } catch(err) {
        showToast("Failed to send enquiry: " + err.message, "error");
    }
};

async function loadEnquiries() {
    const container = document.getElementById('enquiriesContainer');
    container.innerHTML = "Loading...";

    try {
        const res = await fetchAPI('/enquiries/student');
        const enquiries = res.data;

        if(enquiries.length === 0) {
            container.innerHTML = "You haven't sent any enquiries yet.";
            return;
        }

        container.innerHTML = enquiries.map(eq => {
            const statusColor = eq.status === 'Pending' ? 'orange' : (eq.status === 'Responded' ? 'green' : 'gray');
            return `
            <div style="border-bottom: 1px solid var(--glass-border); padding: 1.5rem 0;">
                <h4 style="font-size: 1.1rem; color: var(--primary); margin-bottom: 0.5rem;">${eq.hostelId ? eq.hostelId.name : 'Unknown Hostel'}</h4>
                <div style="background: rgba(15, 23, 42, 0.4); padding: 1rem; border-radius: 8px; border-left: 3px solid var(--primary); margin-bottom: 0.8rem;">
                    <p style="font-style: italic; font-size: 0.95rem;">"${eq.message}"</p>
                </div>
                ${eq.adminResponse ? `
                    <div style="background: rgba(16, 185, 129, 0.1); padding: 1rem; border-radius: 8px; border-left: 3px solid var(--secondary); margin-bottom: 0.8rem;">
                        <p style="font-size: 0.85rem; color: var(--secondary); font-weight: 600; margin-bottom: 0.2rem;">Official Platform Response:</p>
                        <p style="font-size: 0.95rem;">${eq.adminResponse}</p>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                    <small style="color: var(--text-muted);">Owner Contact: ${eq.ownerId ? eq.ownerId.phone : 'N/A'}</small>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span style="color: ${statusColor}; font-weight: bold; background: rgba(255,255,255,0.05); padding: 0.3rem 0.8rem; border-radius: 12px; font-size: 0.85rem;">
                            ${eq.status}
                        </span>
                        <button class="btn btn-outline" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; border-color: rgba(244, 63, 94, 0.5); color: var(--accent);" onclick="deleteEnquiry('${eq._id}')" title="Clear Enquiry">
                            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            </div>

            `;
        }).join('');
    } catch(err) {
        container.innerHTML = "Failed to load enquiries.";
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
        showToast("Deactivation request submitted. An admin will review it soon.", "success");
        closeDeactivateModal();
    } catch (err) {
        showToast(err.message, "error");
    }
};

window.deleteEnquiry = async function(id) {
    const isConfirmed = await customConfirm("Are you sure you want to clear this enquiry?");
    if(!isConfirmed) return;
    try {
        await fetchAPI(`/enquiries/${id}`, 'DELETE');
        showToast("Enquiry cleared successfully.", "success");
        loadEnquiries();
    } catch(err) {
        showToast(err.message, "error");
    }
}

