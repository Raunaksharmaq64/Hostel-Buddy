document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Checks
  if (!checkAuth('Student')) return

  const user = JSON.parse(localStorage.getItem('user'))
  document.getElementById('userNameDisplay').textContent = `Hello, ${user.name}`
  updateSidebarAvatar(user)

  // 2. Load Initial Data
  loadProfileDetails()
  loadSavedHostelIds()
  searchHostels()
  setupFeedbackForm()
})

// Tab Navigation Logic
window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'))
  document.querySelectorAll('.sidebar-item[id^="nav-"]').forEach(item => item.classList.remove('active'))

  document.getElementById(tabId).classList.add('active')
  const sidebarBtn = document.getElementById('nav-' + tabId)
  if (sidebarBtn) sidebarBtn.classList.add('active')

  // Load data based on tab
  if (tabId === 'discover') searchHostels()
  if (tabId === 'hostels') loadAllHostels()
  if (tabId === 'enquiries') {
    // Hide badge immediately and save count so it doesn't reappear until NEW enquiries
    const badge = document.getElementById('enquiryBadge');
    if (badge) badge.style.display = 'none';
    fetchAPI('/profiles/notifications/unread-count').then(res => {
      window._lastSeenEnquiryCount = res.data.enquiryCount;
      localStorage.setItem('lastSeenEnquiryCount', res.data.enquiryCount);
    }).catch(() => {});

    loadEnquiries().then(() => {
      if (window.currentTargetId) {
        const el = document.getElementById(`enquiry-${window.currentTargetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.boxShadow = '0 0 0 3px var(--accent)';
          setTimeout(() => el.style.boxShadow = '', 3000);
        }
        window.currentTargetId = null;
      }
    });
  }
  if (tabId === 'profile') {
    loadProfileDetails()
    loadNotifications()
    window.refreshBadges()
  }
  if (tabId === 'feedback') loadCommunityFeedbacks()
}

// Helper for Cloudinary Image Optimization
function getOptimizedUrl(url, width = 800) {
  if (!url) return ''
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
  }
  return url
}

// ---- PROFILE LOGIC ----
async function loadProfileDetails() {
  try {
    const res = await fetchAPI('/auth/me')
    const user = res.data

    document.getElementById('profileName').value = user.name || ''
    document.getElementById('profilePhone').value = user.phone || ''
    document.getElementById('collegeName').value = user.collegeName || ''
    document.getElementById('fatherPhone').value = user.fatherPhone || ''
    document.getElementById('permanentAddress').value = user.permanentAddress || ''
    if (user.profilePhoto) {
      document.getElementById('profilePreview').src = user.profilePhoto
    }
  } catch (err) {
    console.error('Failed to load profile:', err)
  }
}

// Local image preview update
document.getElementById('profilePhotoInput').addEventListener('change', function (e) {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = function (event) {
      document.getElementById('profilePreview').src = event.target.result
    }
    reader.readAsDataURL(file)
  }
})

document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = e.target.querySelector('button')
  btn.textContent = 'Saving...'

  const payload = {
    name: document.getElementById('profileName').value,
    phone: document.getElementById('profilePhone').value,
    collegeName: document.getElementById('collegeName').value,
    fatherPhone: document.getElementById('fatherPhone').value,
    permanentAddress: document.getElementById('permanentAddress').value
  }

  const formData = new FormData()
  Object.keys(payload).forEach(key => formData.append(key, payload[key]))

  const photoInput = document.getElementById('profilePhotoInput')
  if (photoInput.files[0]) {
    formData.append('profilePhoto', photoInput.files[0])
  }

  try {
    const res = await fetchAPI('/profiles/student', 'PUT', formData, true)
    showToast('Profile updated successfully!', 'success')

    // Update local storage so avatar persists
    if (res.data) {
      const existingUser = JSON.parse(localStorage.getItem('user'))
      const updatedUser = { ...existingUser, ...res.data }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      updateSidebarAvatar(updatedUser)
    }
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    btn.textContent = 'Save Profile'
  }
})

function updateSidebarAvatar(user) {
  const avatarEl = document.getElementById('sidebarAvatar')
  if (avatarEl) {
    if (user.profilePhoto) {
      avatarEl.style.backgroundImage = `url('${user.profilePhoto}')`
      avatarEl.style.backgroundSize = 'cover'
      avatarEl.style.backgroundPosition = 'center'
      avatarEl.textContent = '' // Clear letter
    } else {
      avatarEl.style.backgroundImage = 'none'
      avatarEl.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'S'
    }
  }
}

// ---- SAVED HOSTELS TRACKING ----
window._savedHostelIds = new Set();

async function loadSavedHostelIds() {
  try {
    const res = await fetchAPI('/hostels/saved/my-list');
    window._savedHostelIds = new Set(res.data.map(h => h._id));
  } catch (e) {
    // Silently fail — save feature is non-critical
  }
}

window.toggleSaveHostel = async function (hostelId, event) {
  if (event) event.stopPropagation();
  try {
    const res = await fetchAPI(`/hostels/${hostelId}/save`, 'PUT');
    const btn = document.querySelector(`[data-save-id="${hostelId}"]`);
    if (res.saved) {
      window._savedHostelIds.add(hostelId);
      if (btn) { btn.classList.add('saved'); btn.textContent = '❤️'; }
      showToast('Hostel saved!', 'success');
    } else {
      window._savedHostelIds.delete(hostelId);
      if (btn) { btn.classList.remove('saved'); btn.textContent = '🤍'; }
      showToast('Hostel unsaved.', 'info');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderStars(rating, count) {
  if (!rating || rating === 0) return '';
  const full = Math.round(rating);
  return `<span class="star-rating" title="${rating.toFixed(1)} / 5 (${count || 0} reviews)">
    ${'<span class="star filled">★</span>'.repeat(full)}${'<span class="star">★</span>'.repeat(5 - full)}
    <span style="font-size:0.75rem;color:var(--text-muted);margin-left:4px">${rating.toFixed(1)}</span>
  </span>`;
}

// ---- HOSTEL DISCOVERY LOGIC ----
let searchTimeout
async function searchHostels() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    const query = document.getElementById('searchInput').value
    const minPrice = document.getElementById('minPrice').value
    const maxPrice = document.getElementById('maxPrice').value
    const verifiedOnly = document.getElementById('verifiedOnly').checked
    const foodIncluded = document.getElementById('foodIncluded').checked

    const facilities = Array.from(document.querySelectorAll('.facility-filter:checked')).map(cb => cb.value)

    const params = new URLSearchParams()
    if (query) params.append('location', query)
    if (minPrice) params.append('minPrice', minPrice)
    if (maxPrice) params.append('maxPrice', maxPrice)
    if (verifiedOnly) params.append('isVerified', 'true')
    if (foodIncluded) params.append('foodAvailability', 'true')
    if (facilities.length > 0) params.append('facilities', facilities.join(','))

    document.getElementById('hostelsContainer').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-muted);">
                <div class="spinner-v2"></div>
                <p style="margin-top: 1.25rem; font-weight: 600;">Searching properties...</p>
            </div>
        `

    try {
      const res = await fetchAPI(`/hostels?${params.toString()}`)
      renderHostels(res.data)
      if (res.data.length === 0) {
        document.getElementById('hostelsContainer').innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted); background: var(--surface-3); border-radius: var(--radius-lg); border: 1px dashed var(--border-strong);">
                        <h3 style="margin-bottom: 0.5rem; color: var(--text);">No properties found</h3>
                        <p>Try adjusting your search filters.</p>
                        <button class="btn btn-outline" style="margin-top: 1rem;" onclick="resetFilters()">Clear Filters</button>
                    </div>
                `
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to fetch hostels', 'error')
    }
  }, 300)
}

window.resetFilters = function () {
  document.getElementById('searchInput').value = ''
  document.getElementById('minPrice').value = ''
  document.getElementById('maxPrice').value = ''
  document.getElementById('verifiedOnly').checked = false
  document.getElementById('foodIncluded').checked = false
  document.querySelectorAll('.facility-filter').forEach(cb => cb.checked = false)
  searchHostels()
}

function renderHostels(hostels) {
  const container = document.getElementById('hostelsContainer')

  if (hostels.length === 0) return

  try {
    container.innerHTML = hostels.map(h => `
            <div class="hostel-card">
                <div class="hostel-card-img" style="position:relative">
                    <img src="${h.thumbnailImage ? getOptimizedUrl(h.thumbnailImage, 600) : (h.buildingPhotos && h.buildingPhotos.length > 0 ? getOptimizedUrl(h.buildingPhotos[0], 600) : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80')}" alt="Hostel Room" loading="lazy">
                    <button class="save-heart ${window._savedHostelIds.has(h._id) ? 'saved' : ''}" data-save-id="${h._id}" onclick="toggleSaveHostel('${h._id}', event)">${window._savedHostelIds.has(h._id) ? '❤️' : '🤍'}</button>
                </div>
                <div style="padding: 1.25rem;">
                    <h3 class="hostel-title" style="display: flex; justify-content: space-between; align-items: flex-start; gap:.5rem;">
                        ${h.name} 
                        ${h.isVerified ? '<span class="badge-v2 badge-approved" style="font-size:.7rem;padding:.2rem .5rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg> Verified</span>' : ''}
                    </h3>
                    <p style="color:var(--text-muted); font-size: 0.9rem; margin-top:.4rem; line-height:1.4;">📍 ${h.city}, ${h.address}</p>
                    
                    <div style="margin-top: 1rem; display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
                        <span class="badge-v2 badge-info" style="font-size:.75rem">
                            🍽️ Food: ${h.foodAvailability ? 'Yes' : 'No'}
                        </span>
                        ${renderStars(h.rating, h.reviewCount)}
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                        <span class="hostel-price">₹${h.monthlyPrice}<span style="font-size: 0.9rem; color:var(--text-muted); font-weight:500;">/mo</span></span>
                        <button class="btn btn-outline btn-sm" onclick="openHostelDetails('${h._id}')">Details &rarr;</button>
                    </div>
                </div>
            </div>
        `).join('')

    gsap.from('.hostel-card', {
      y: 30,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power2.out'
    })
  } catch (error) {
    container.innerHTML = `<p style="color:var(--danger)">Error loading hostels: ${error.message}</p>`
  }
}

async function loadAllHostels() {
  const container = document.getElementById('allHostelsContainer')
  if (!container) return;
  container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-muted);">
          <div class="spinner-v2"></div>
          <p style="margin-top: 1.25rem; font-weight: 600;">Loading premium stays...</p>
      </div>
  `
  try {
    const res = await fetchAPI('/hostels')
    const hostels = res.data;
    if (hostels.length === 0) {
      container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted); background: var(--surface-3); border-radius: var(--radius-lg); border: 1px dashed var(--border-strong);">
              <h3 style="margin-bottom: 0.5rem; color: var(--text);">No properties found</h3>
              <p>There are no hostels listed yet.</p>
          </div>
      `
      return
    }

    container.innerHTML = hostels.map(h => `
        <div class="hostel-card">
            <div class="hostel-card-img" style="position:relative">
                <img src="${h.thumbnailImage ? getOptimizedUrl(h.thumbnailImage, 600) : (h.buildingPhotos && h.buildingPhotos.length > 0 ? getOptimizedUrl(h.buildingPhotos[0], 600) : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80')}" alt="Hostel Room" loading="lazy">
                <button class="save-heart ${window._savedHostelIds.has(h._id) ? 'saved' : ''}" data-save-id="${h._id}" onclick="toggleSaveHostel('${h._id}', event)">${window._savedHostelIds.has(h._id) ? '❤️' : '🤍'}</button>
            </div>
            <div style="padding: 1.25rem;">
                <h3 class="hostel-title" style="display: flex; justify-content: space-between; align-items: flex-start; gap:.5rem;">
                    ${h.name} 
                    ${h.isVerified ? '<span class="badge-v2 badge-approved" style="font-size:.7rem;padding:.2rem .5rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg> Verified</span>' : ''}
                </h3>
                <p style="color:var(--text-muted); font-size: 0.9rem; margin-top:.4rem; line-height:1.4;">📍 ${h.city}, ${h.address}</p>
                
                <div style="margin-top: 1rem; display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
                    <span class="badge-v2 badge-info" style="font-size:.75rem">
                        🍽️ Food: ${h.foodAvailability ? 'Yes' : 'No'}
                    </span>
                    ${renderStars(h.rating, h.reviewCount)}
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                    <span class="hostel-price">₹${h.monthlyPrice}<span style="font-size: 0.9rem; color:var(--text-muted); font-weight:500;">/mo</span></span>
                    <button class="btn btn-outline btn-sm" onclick="openHostelDetails('${h._id}')">Details &rarr;</button>
                </div>
            </div>
        </div>
    `).join('')

    gsap.from('#allHostelsContainer .hostel-card', {
      y: 30, duration: 0.8, stagger: 0.1, ease: 'power2.out'
    })
  } catch (error) {
    container.innerHTML = `<p style="color:var(--danger); grid-column:1/-1;">Error loading properties: ${error.message}</p>`
  }
}


// ---- DETAILED VIEW LOGIC ----
window.openHostelDetails = async function (id) {
  const overlay = document.getElementById('hostelDetailOverlay');
  const modal = document.getElementById('hostelDetailModal');
  
  modal.innerHTML = `<div style="text-align:center;padding:4rem;"><div class="spinner-v2"></div><p style="margin-top:1rem;color:var(--text-muted)">Loading details...</p></div>`;
  overlay.classList.add('active');

  try {
    const [hostelRes, reviewsRes] = await Promise.all([
      fetchAPI(`/hostels/${id}`),
      fetchAPI(`/reviews/hostel/${id}`)
    ]);
    const h = hostelRes.data;
    const reviews = reviewsRes.data;
    const isSaved = window._savedHostelIds.has(h._id);

    // Collect all photos into categories
    const photoCategories = [];
    const allBuilding = h.thumbnailImage && (!h.buildingPhotos || !h.buildingPhotos.includes(h.thumbnailImage))
      ? [h.thumbnailImage, ...(h.buildingPhotos || [])]
      : (h.buildingPhotos || []);
    if (allBuilding.length > 0) photoCategories.push({ label: '🏢 Building', photos: allBuilding });
    if (h.roomPhotos && h.roomPhotos.length > 0) photoCategories.push({ label: '🛏️ Rooms', photos: h.roomPhotos });
    if (h.messPhotos && h.messPhotos.length > 0) photoCategories.push({ label: '🍽️ Mess', photos: h.messPhotos });
    if (h.washroomPhotos && h.washroomPhotos.length > 0) photoCategories.push({ label: '🚿 Washroom', photos: h.washroomPhotos });
    
    const firstPhoto = photoCategories.length > 0 ? photoCategories[0].photos[0] : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=900';
    const avgRating = h.rating ? h.rating.toFixed(1) : null;

    modal.innerHTML = `
      <div class="detail-close">
        <button onclick="closeDetailsModal()">✕</button>
      </div>
      <div class="detail-body">
        <!-- Photo Gallery -->
        <div class="photo-gallery">
          <div class="gallery-main"><img id="detailMainPhoto" src="${getOptimizedUrl(firstPhoto, 900)}" alt="${h.name}"></div>
          ${photoCategories.length > 1 ? `
          <div class="gallery-tabs">
            ${photoCategories.map((cat, i) => `<button class="gallery-tab ${i === 0 ? 'active' : ''}" onclick="switchDetailGallery(${i})">${cat.label}</button>`).join('')}
          </div>` : ''}
          <div class="gallery-thumbs" id="detailThumbs">
            ${(photoCategories[0]?.photos || []).map((p, i) => `<div class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="setDetailPhoto('${getOptimizedUrl(p, 900)}', this)"><img src="${getOptimizedUrl(p, 150)}" alt=""></div>`).join('')}
          </div>
        </div>

        <!-- Title + Price Row -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
          <div style="flex:1; min-width:250px;">
            <h1 style="font-size:1.5rem; font-weight:800; color:var(--text); margin:0; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              ${h.name}
              ${h.isVerified ? '<span class="badge-v2 badge-approved" style="font-size:0.7rem;padding:0.2rem 0.5rem;">✓ Verified</span>' : ''}
            </h1>
            <p style="color:var(--text-muted); font-size:0.95rem; margin-top:0.35rem;">📍 ${h.address}, ${h.city}</p>
            ${avgRating ? `<div style="margin-top:0.5rem;">${renderStars(h.rating, reviews.length)} <span style="font-size:0.8rem;color:var(--text-muted)">(${reviews.length} reviews)</span></div>` : ''}
          </div>
          <div style="text-align:center; background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(14,165,233,0.08)); padding:1.25rem 1.75rem; border-radius:var(--radius-lg); border:1px solid rgba(99,102,241,0.15);">
            <div style="font-size:2rem; font-weight:900; color:var(--text);">₹${h.monthlyPrice}<span style="font-size:0.8rem;color:var(--text-muted);font-weight:500">/mo</span></div>
            <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
              <button class="btn btn-primary btn-sm" onclick="openBookingModal('${h._id}', '${h.name.replace(/'/g, "\\\\'")}')">✉️ Send Enquiry</button>
              <button class="btn btn-outline btn-sm save-heart-btn" onclick="toggleSaveHostel('${h._id}')" data-save-id="${h._id}" style="border-color:${isSaved ? 'var(--danger)' : 'var(--border)'}; color:${isSaved ? 'var(--danger)' : 'var(--text-muted)'}">
                ${isSaved ? '❤️ Saved' : '🤍 Save'}
              </button>
            </div>
          </div>
        </div>

        ${h.googleMapLink ? `<a href="${h.googleMapLink}" target="_blank" style="display:inline-flex; align-items:center; gap:0.4rem; font-size:0.9rem; font-weight:600; color:var(--primary); text-decoration:none; margin-bottom:1.25rem;">🌍 Open in Google Maps ↗</a>` : ''}

        <!-- Description -->
        <div class="detail-section">
          <h3>📝 Description</h3>
          <p style="font-size:0.95rem; line-height:1.7; color:var(--text-2); white-space:pre-line; background:var(--surface); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border);">${h.description}</p>
        </div>

        <!-- Amenities -->
        ${h.amenities && h.amenities.length > 0 ? `
        <div class="detail-section">
          <h3>🏠 Amenities</h3>
          <div class="amenity-grid">
            ${h.amenities.map(a => `<span class="amenity-chip">${a}</span>`).join('')}
          </div>
        </div>` : ''}

        <!-- Room Types -->
        ${h.roomTypes && h.roomTypes.length > 0 ? `
        <div class="detail-section">
          <h3>🛏️ Room Types</h3>
          <div class="amenity-grid">
            ${h.roomTypes.map(r => `<span class="amenity-chip" style="background:rgba(14,165,233,0.1);color:#0ea5e9;border-color:rgba(14,165,233,0.2);">${r}</span>`).join('')}
          </div>
        </div>` : ''}

        <!-- Rules -->
        ${h.rules ? `
        <div class="detail-section">
          <h3>📋 Rules & Policies</h3>
          <div class="msg-bubble-warn" style="font-style:normal; border-radius:var(--radius-md); border:1px solid rgba(249,115,22,0.2); line-height:1.7;">${h.rules}</div>
        </div>` : ''}

        <!-- Owner Info -->
        ${h.ownerId ? `
        <div class="detail-section">
          <h3>👤 Managed By</h3>
          <div class="owner-info-card">
            <div class="owner-avatar">
              ${h.ownerId.profilePhoto ? `<img src="${h.ownerId.profilePhoto}" alt="${h.ownerId.name}">` : h.ownerId.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight:700; color:var(--text);">${h.ownerId.name} ${h.ownerId.isVerified ? '<span style="color:#10b981;font-size:0.75rem;">✓ Verified Owner</span>' : ''}</div>
              ${h.ownerId.phone ? `<div style="font-size:0.85rem; color:var(--text-muted);">📞 ${h.ownerId.phone}</div>` : ''}
              ${h.ownerId.email ? `<div style="font-size:0.85rem; color:var(--text-muted);">✉️ ${h.ownerId.email}</div>` : ''}
            </div>
          </div>
        </div>` : ''}

        <!-- Reviews -->
        <div class="detail-section">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.75rem;">
            <h3 style="margin-bottom:0;">⭐ Student Reviews (${reviews.length})</h3>
            <button class="btn btn-outline btn-sm" onclick="openReviewModal('${h._id}')">Write a Review</button>
          </div>
          ${reviews.length > 0 ? reviews.map(r => `
            <div class="review-card">
              <div class="review-header">
                <div class="review-avatar">
                  ${r.studentId?.profilePhoto ? `<img src="${r.studentId.profilePhoto}">` : (r.studentId?.name?.charAt(0).toUpperCase() || 'S')}
                </div>
                <div class="review-meta">
                  <div class="review-name">${r.studentId?.name || 'Student'}</div>
                  <div class="review-date">${new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
                <span class="star-rating" style="font-size:0.95rem;">
                  ${'<span class="star filled">★</span>'.repeat(r.rating)}${'<span class="star">★</span>'.repeat(5 - r.rating)}
                </span>
              </div>
              <p class="review-text">"${r.comment}"</p>
            </div>
          `).join('') : '<p style="color:var(--text-muted); font-style:italic; background:var(--surface); padding:1.5rem; text-align:center; border-radius:var(--radius-md); border:1px dashed var(--border);">No reviews yet. Be the first to share your experience!</p>'}
        </div>
      </div>
    `;

    // Store photo categories for gallery tab switching
    window._detailPhotoCategories = photoCategories;

  } catch (err) {
    modal.innerHTML = `<div style="padding:2rem;text-align:center;"><p style="color:var(--danger)">Failed to load details: ${err.message}</p><button class="btn btn-outline btn-sm" onclick="closeDetailsModal()" style="margin-top:1rem;">Close</button></div>`;
  }
}

window.closeDetailsModal = function () {
  const overlay = document.getElementById('hostelDetailOverlay');
  if (overlay) overlay.classList.remove('active');
}

// Gallery tab switching
window.switchDetailGallery = function (catIndex) {
  const cats = window._detailPhotoCategories;
  if (!cats || !cats[catIndex]) return;
  
  // Update tab active state
  document.querySelectorAll('.gallery-tab').forEach((t, i) => {
    t.classList.toggle('active', i === catIndex);
  });
  
  // Update thumbs
  const thumbsContainer = document.getElementById('detailThumbs');
  const photos = cats[catIndex].photos;
  thumbsContainer.innerHTML = photos.map((p, i) => 
    `<div class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="setDetailPhoto('${getOptimizedUrl(p, 900)}', this)"><img src="${getOptimizedUrl(p, 150)}" alt=""></div>`
  ).join('');
  
  // Show first photo of category
  document.getElementById('detailMainPhoto').src = getOptimizedUrl(photos[0], 900);
}

window.setDetailPhoto = function (url, thumbEl) {
  document.getElementById('detailMainPhoto').src = url;
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  if (thumbEl) thumbEl.classList.add('active');
}

window.openBookingModal = function (id, name) {
  document.getElementById('bookingHostelName').textContent = name
  document.getElementById('bookingMessage').dataset.hostelId = id
  const modal = document.getElementById('bookingModal')
  // OVERRIDE z-index to push OVER hostelDetailOverlay (z-index 9999)
  modal.style.zIndex = '10001';
  modal.classList.add('active')
}

window.closeBookingModal = function () {
  document.getElementById('bookingModal').classList.remove('active')
  document.getElementById('bookingMessage').value = ''
}

// ---- REVIEW LOGIC ----
window.openReviewModal = function (hostelId) {
  let reviewModal = document.getElementById('reviewModal')
  if (!reviewModal) {
    document.body.insertAdjacentHTML('beforeend', `
            <div id="reviewModal" class="modal-overlay" style="z-index:10001">
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Write a Review</h2>
                        <button class="modal-close" onclick="closeReviewModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="reviewHostelId">
                        <div class="form-group">
                            <label class="form-label">Rating Experience</label>
                            <select id="reviewRating" class="form-input" style="cursor: pointer;">
                                <option value="5">⭐⭐⭐⭐⭐ Excellent (5)</option>
                                <option value="4">⭐⭐⭐⭐ Very Good (4)</option>
                                <option value="3">⭐⭐⭐ Average (3)</option>
                                <option value="2">⭐⭐ Fair (2)</option>
                                <option value="1">⭐ Poor (1)</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-top:1.5rem">
                            <label class="form-label">Your Comment</label>
                            <textarea id="reviewComment" class="form-input" rows="4" placeholder="How was your stay?"></textarea>
                        </div>
                        <button class="btn btn-primary" style="width: 100%; margin-top: 2rem;" onclick="submitReview()">Submit Review</button>
                    </div>
                </div>
            </div>
        `)
    reviewModal = document.getElementById('reviewModal')
  }
  document.getElementById('reviewHostelId').value = hostelId
  document.getElementById('reviewComment').value = ''
  document.getElementById('reviewRating').value = '5'
  reviewModal.classList.add('active')
}

window.closeReviewModal = function () {
  const rm = document.getElementById('reviewModal')
  if (rm) rm.classList.remove('active')
}

window.submitReview = async function () {
  const hostelId = document.getElementById('reviewHostelId').value
  const rating = document.getElementById('reviewRating').value
  const comment = document.getElementById('reviewComment').value.trim()

  if (!comment) {
    showToast('Please write a comment.', 'error'); return
  }

  try {
    await fetchAPI('/reviews', 'POST', { hostelId, rating: Number(rating), comment })
    showToast('Review submitted successfully!', 'success')
    closeReviewModal()
    openHostelDetails(hostelId)
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// ---- ENQUIRY LOGIC ----
window.submitEnquiry = async function () {
  const msgInput = document.getElementById('bookingMessage')
  const hostelId = msgInput.dataset.hostelId
  const msg = msgInput.value.trim()

  if (!msg) {
    showToast('Please enter a message for your enquiry.', 'error')
    return
  }

  try {
    await fetchAPI('/enquiries', 'POST', { hostelId, message: msg })
    showToast("Enquiry sent successfully! Track it in the 'My Enquiries' tab.", 'success')
    closeBookingModal()
    // Switch to enquiries tab to show the new enquiry
    switchTab('enquiries')
  } catch (err) {
    showToast('Failed to send enquiry: ' + err.message, 'error')
  }
}

async function loadEnquiries() {
  const container = document.getElementById('enquiriesContainer')
  container.innerHTML = '<div style="text-align:center;padding:3rem;"><div class="spinner-v2"></div></div>'

  try {
    const res = await fetchAPI('/enquiries/student')
    const enquiries = res.data

    if (enquiries.length === 0) {
      container.innerHTML = `
                <div style="text-align:center;padding:4rem 2rem;color:var(--text-muted);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                    <p style="font-size: 1.1rem; font-weight: 600; color: var(--text);">No enquiries yet</p>
                    <p style="font-size: 0.9rem; margin-top: 0.4rem;">Browse hostels and send your first enquiry!</p>
                </div>`
      return
    }

    container.innerHTML = enquiries.map(eq => {
      let statusClass = 'badge-pending'
      if (eq.status === 'Responded') { statusClass = 'badge-approved' }

      const sentDate = new Date(eq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

      return `
            <div class="chat-card" id="enquiry-${eq._id}" style="margin-bottom:1.25rem">
                ${eq.status === 'Closed' ? '<div class="closed-banner">⚠️ This conversation is closed and will be automatically removed after 30 days.</div>' : ''}
                <!-- Card Header -->
                <div class="chat-header">
                    <div style="display:flex;align-items:center;gap:1rem;">
                        <div class="chat-avatar">🏠</div>
                        <div>
                            <div style="font-weight:700;font-size:1.05rem;color:var(--text);">${eq.hostelId ? eq.hostelId.name : 'Unknown Property'}</div>
                            <div style="font-size:0.8rem;color:var(--text-muted);">Sent on ${sentDate}</div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <span class="badge-v2 ${statusClass}">${eq.status}</span>
                        <button class="btn btn-outline btn-sm" style="border-color:var(--danger);color:var(--danger)" onclick="deleteEnquiry('${eq._id}')">
                            Clear
                        </button>
                    </div>
                </div>

                <!-- Conversation Body -->
                <div class="chat-body" style="max-height: 350px; overflow-y: auto; padding-bottom: 1rem;">
                    ${(() => {
          let messagesHtml = '';
          if (eq.messages && eq.messages.length > 0) {
            messagesHtml = eq.messages.map(m => {
              const isMe = m.senderModel === 'Student';
              const pDate = new Date(m.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
              if (isMe) {
                return `
                                        <div style="display:flex;flex-direction:column;align-items:flex-end;">
                                            <div class="msg-meta"><span>You</span> &middot; <span>${pDate}</span></div>
                                            <div class="msg-bubble msg-owner">${m.text}</div>
                                        </div>
                                    `;
              } else {
                const senderLabel = m.senderModel === 'Admin' ? '✅ Platform' : '🏠 Host';
                return `
                                        <div style="display:flex;flex-direction:column;align-items:flex-start;">
                                            <div class="msg-meta"><span>${senderLabel}</span> &middot; <span>${pDate}</span></div>
                                            <div class="msg-bubble msg-student">${m.text}</div>
                                        </div>
                                    `;
              }
            }).join('');
          } else {
            // legacy fallback
            messagesHtml = `
                                <div style="display:flex;flex-direction:column;align-items:flex-end;">
                                    <div class="msg-meta"><span>You</span> &middot; <span>${sentDate}</span></div>
                                    <div class="msg-bubble msg-owner">"${eq.message}"</div>
                                </div>
                            `;
            if (eq.ownerReply) {
              messagesHtml += `
                                    <div style="display:flex;flex-direction:column;align-items:flex-start;">
                                        <div class="msg-meta"><span>🏠 Owner Reply</span></div>
                                        <div class="msg-bubble msg-student">${eq.ownerReply}</div>
                                    </div>
                                `;
            } else {
              messagesHtml += `
                                    <div style="text-align:center;padding:1.25rem;border-radius:var(--radius);background:var(--surface-3);border:1px dashed var(--border);color:var(--text-muted);font-size:0.9rem;">
                                        ⏳ Waiting for the owner to reply...
                                    </div>
                                `;
            }
          }

          if (eq.adminResponse) {
            messagesHtml += `
                                <div style="display:flex;flex-direction:column;align-items:flex-start;">
                                    <div class="msg-meta" style="color:var(--success);font-weight:700;text-transform:uppercase">✅ Platform Response</div>
                                    <div class="msg-bubble msg-admin">${eq.adminResponse}</div>
                                </div>
                            `;
          }
          return messagesHtml;
        })()}
                </div>

                <!-- Chat Input Footer -->
                <div style="padding: 1rem 1.25rem; background: var(--surface); border-top: 1px solid var(--border); display: flex; gap: 0.5rem; align-items: center;">
                    <input type="text" id="replyInput_${eq._id}" class="form-input" placeholder="Type a message..." style="flex: 1; padding: 0.6rem; margin-bottom: 0;">
                    <button class="btn btn-primary btn-sm" style="padding: 0.6rem 1.2rem;" onclick="sendEnquiryMessage('${eq._id}')">Send</button>
                </div>

                <!-- footer info -->
                <div style="padding:0.6rem 1.25rem;background:var(--surface-2);border-top:1px solid var(--border);font-size:0.8rem;color:var(--text-muted);display:flex;justify-content:space-between;">
                    <span>📞 Owner Contact: <strong>${eq.ownerId ? eq.ownerId.phone : 'N/A'}</strong></span>
                </div>
            </div>
            `
    }).join('')
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);padding:1rem;">Failed to load enquiries: ${err.message}</p>`
  }
}

// ---- DEACTIVATION LOGIC ----

window.sendEnquiryMessage = async function (id) {
  const input = document.getElementById(`replyInput_${id}`)
  const text = input.value.trim()

  if (!text) return

  try {
    input.disabled = true;
    await fetchAPI(`/enquiries/${id}/message`, 'POST', { text })
    input.value = ''
    loadEnquiries() // reload thread
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    input.disabled = false;
  }
}

window.openDeactivateModal = function () {
  document.getElementById('deactivateModal').classList.add('active')
}

window.closeDeactivateModal = function () {
  document.getElementById('deactivateModal').classList.remove('active')
}

window.submitDeactivationRequest = async function () {
  const reason = document.getElementById('deactivateReason').value.trim()
  if (!reason) {
    showToast('Please provide a reason for deactivation.', 'error')
    return
  }

  try {
    await fetchAPI('/profiles/request-deactivation', 'POST', { reason })
    showToast('Deactivation request submitted. An admin will review it soon.', 'success')
    closeDeactivateModal()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

window.deleteEnquiry = async function (id) {
  const isConfirmed = await customConfirm('Are you sure you want to clear this enquiry?')
  if (!isConfirmed) return
  try {
    await fetchAPI(`/enquiries/${id}`, 'DELETE')
    showToast('Enquiry cleared successfully.', 'success')
    loadEnquiries()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// ---- PLATFORM FEEDBACK LOGIC ----
function setupFeedbackForm() {
  document.getElementById('feedbackForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = 'Submitting...';

    const rating = document.getElementById('feedbackRating').value;
    const comment = document.getElementById('feedbackComment').value.trim();

    try {
      await fetchAPI('/feedback/submit', 'POST', { rating: Number(rating), comment });
      showToast('Thank you! Your feedback has been submitted for review.', 'success');
      document.getElementById('feedbackComment').value = '';
      document.getElementById('feedbackRating').value = '5';
    } catch (err) {
      showToast(err.message === 'Failed to fetch' ? 'Unable to reach server. Please try again.' : err.message, 'error');
    } finally {
      btn.textContent = originalText;
    }
  });
}

async function loadCommunityFeedbacks() {
  const container = document.getElementById('communityFeedbacksContainer');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="spinner"></div></div>';

  try {
    const res = await fetchAPI('/feedback/public');
    const feedbacks = res.data;

    if (feedbacks.length === 0) {
      container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);background:var(--surface-2);border-radius:var(--radius);border:1px dashed var(--border);">No community reviews yet. Be the first to share your experience!</div>';
      return;
    }

    container.innerHTML = feedbacks.map(f => `
      <div class="list-item" style="flex-direction:column;align-items:stretch;gap:1.25rem">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem">
          <div style="display:flex;align-items:center;gap:1rem;">
            <img src="${f.userId?.profilePhoto || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png'}" 
                 style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--border);">
            <div>
              <div style="font-weight:700;font-size:1.05rem;color:var(--text);">${f.userId?.name || 'User'}</div>
              <div class="badge-v2 badge-info" style="font-size:0.75rem;margin-top:0.2rem">${f.role}</div>
            </div>
          </div>
          <div style="color:#F59E0B;font-size:1.1rem;display:flex;gap:2px;">
            ${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}
          </div>
        </div>
        <p class="msg-bubble" style="font-style:italic;max-width:100%;background:var(--surface-2)">"${f.comment}"</p>
        <div style="font-size:0.8rem;color:var(--text-light);text-align:right;">
          Submitted: ${new Date(f.createdAt).toLocaleDateString()}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger)">Failed to load feedbacks.</p>`;
  }
}

// ---- NOTIFICATIONS LOGIC ----
async function loadNotifications() {
  const container = document.getElementById('notificationsContainer')
  if (!container) return
  try {
    const res = await fetchAPI('/profiles/notifications')
    const notifications = res.data

    const clearBtn = document.getElementById('clearNotifBtn')
    if (clearBtn) clearBtn.style.display = notifications.length > 0 ? 'inline-block' : 'none'

    if (notifications.length === 0) {
      container.innerHTML = '<p class="text-muted">No notifications yet.</p>'
      return
    }

    container.innerHTML = notifications.map(n => `
            <div class="notif-item ${n.type} ${n.targetTab ? 'clickable' : ''}" 
                 ${n.targetTab ? `onclick="window.currentTargetId='${n.targetId || ''}'; switchTab('${n.targetTab}');"` : ''}
                 style="cursor: ${n.targetTab ? 'pointer' : 'default'}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem;">
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${new Date(n.createdAt).toLocaleString()}</span>
                    ${!n.isRead ? '<span style="background: var(--primary); width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 5px var(--primary)"></span>' : ''}
                </div>
                <p style="font-size: 0.95rem; color: var(--text-2); font-weight: 500; line-height: 1.5;">${n.message}</p>
                ${n.targetTab ? '<div style="font-size:0.75rem;color:var(--primary);margin-top:0.4rem;font-weight:600;">Click to view →</div>' : ''}
            </div>
        `).join('')

    // Mark as read after a short delay
    setTimeout(markNotificationsRead, 3000)
  } catch (err) {
    console.error('Failed to load notifications:', err)
  }
}

async function markNotificationsRead() {
  try {
    await fetchAPI('/profiles/notifications/read', 'PUT')
    window.refreshBadges()
  } catch (err) {
    console.error('Failed to mark notifications read:', err)
  }
}

window.clearNotifications = async function () {
  const isConfirmed = await customConfirm('Are you sure you want to clear all your notifications?')
  if (!isConfirmed) return

  try {
    await fetchAPI('/profiles/notifications', 'DELETE')
    showToast('Notifications cleared successfully.', 'success')
    loadNotifications()
    window.refreshBadges()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// ---- PLATFORM UPDATES ----
window.openPlatformUpdatesModal = function () {
  document.getElementById('updatesModal').classList.add('active')
  loadPlatformUpdates()

  // Hide the badge dot and mark updates as read
  const badge = document.getElementById('updatesBadge');
  if (badge) badge.style.display = 'none';
  fetchAPI('/profiles/updates/read', 'PUT').then(() => window.refreshBadges()).catch(e => console.error(e));
}

window.closePlatformUpdatesModal = function () {
  document.getElementById('updatesModal').classList.remove('active')
}

async function loadPlatformUpdates() {
  const container = document.getElementById('platformUpdatesContainer')
  if (!container) return
  container.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="spinner"></div></div>'

  try {
    const res = await fetchAPI('/profiles/updates')
    const updates = res.data

    if (updates.length === 0) {
      container.innerHTML = '<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">No new platform updates.</div>'
      return
    }

    const dismissBtn = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:1rem;">
        <button onclick="dismissAllUpdates()" class="btn btn-outline btn-sm" style="border-color:var(--text-muted);color:var(--text-muted);font-size:0.8rem;">
          ✕ Dismiss All
        </button>
      </div>`

    container.innerHTML = dismissBtn + updates.map(u => `
            <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem; border-left:4px solid var(--primary)">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h4 style="font-size:1.05rem; font-weight:700; margin:0; color:var(--text)">${u.title}</h4>
                    <span style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap; margin-left:1rem;">${new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
                <div style="font-size:0.9rem; color:var(--text-2); margin-top:0.6rem; white-space:pre-wrap; line-height:1.5">${u.message}</div>
            </div>
        `).join('')
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger)">Failed to load updates.</p>'
  }
}

window.dismissAllUpdates = async function () {
  try {
    await fetchAPI('/profiles/updates/read', 'PUT')
    const container = document.getElementById('platformUpdatesContainer')
    if (container) {
      container.innerHTML = '<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">All updates dismissed. New updates will appear here.</div>'
    }
    const badge = document.getElementById('updatesBadge')
    if (badge) badge.style.display = 'none'
    window.refreshBadges()
    showToast('Updates dismissed.', 'success')
  } catch (err) {
    showToast('Failed to dismiss updates.', 'error')
  }
}

