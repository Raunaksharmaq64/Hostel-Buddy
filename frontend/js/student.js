document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Checks
  if (!checkAuth('Student')) return

  const user = JSON.parse(localStorage.getItem('user'))
  document.getElementById('userNameDisplay').textContent = `Hello, ${user.name}`
  updateSidebarAvatar(user)

  // 2. Load Initial Data
  loadProfileDetails()
  searchHostels()
})

// Tab Navigation Logic
function switchTab (tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'))
  document.querySelectorAll('.sidebar-item[id^="nav-"]').forEach(item => item.classList.remove('active'))

  document.getElementById(tabId).classList.add('active')
  const sidebarBtn = document.getElementById('nav-' + tabId)
  if (sidebarBtn) sidebarBtn.classList.add('active')

  // Load data based on tab
  if (tabId === 'discover') searchHostels()
  if (tabId === 'hostels') loadAllHostels()
  if (tabId === 'enquiries') loadEnquiries()
  if (tabId === 'profile') loadProfileDetails()
  if (tabId === 'feedback') loadCommunityFeedbacks()
}

// Helper for Cloudinary Image Optimization
function getOptimizedUrl (url, width = 800) {
  if (!url) return ''
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
  }
  return url
}

// ---- PROFILE LOGIC ----
async function loadProfileDetails () {
  try {
    const res = await fetchAPI('/auth/me')
    const user = res.data

    if (user.hasUnreadPlatformUpdates && document.getElementById('megaphoneIcon')) {
      const icon = document.getElementById('megaphoneIcon');
      if (!document.getElementById('updatesDot')) {
        icon.innerHTML += '<span id="updatesDot" style="position:absolute; top:4px; right:4px; width:8px; height:8px; background:var(--danger, red); border-radius:50%; box-shadow:0 0 4px var(--danger, red);"></span>';
      }
    }

    document.getElementById('profileName').value = user.name || ''
    document.getElementById('profilePhone').value = user.phone || ''
    document.getElementById('collegeName').value = user.collegeName || ''
    document.getElementById('fatherPhone').value = user.fatherPhone || ''
    document.getElementById('permanentAddress').value = user.permanentAddress || ''
    if (user.profilePhoto) {
      document.getElementById('profilePreview').src = user.profilePhoto
    }
    
    // Load Notifications
    loadNotifications()
  } catch (err) {
    console.error(err)
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

// ---- HOSTEL DISCOVERY LOGIC ----
let searchTimeout
async function searchHostels () {
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

function renderHostels (hostels) {
  const container = document.getElementById('hostelsContainer')

  if (hostels.length === 0) return

  try {
    container.innerHTML = hostels.map(h => `
            <div class="hostel-card">
                <div class="hostel-card-img">
                    <img src="${h.thumbnailImage ? getOptimizedUrl(h.thumbnailImage, 600) : (h.buildingPhotos && h.buildingPhotos.length > 0 ? getOptimizedUrl(h.buildingPhotos[0], 600) : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80')}" alt="Hostel Room" loading="lazy">
                </div>
                <div style="padding: 1.25rem;">
                    <h3 class="hostel-title" style="display: flex; justify-content: space-between; align-items: flex-start; gap:.5rem;">
                        ${h.name} 
                        ${h.isVerified ? '<span class="badge-v2 badge-approved" style="font-size:.7rem;padding:.2rem .5rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg> Verified</span>' : ''}
                    </h3>
                    <p style="color:var(--text-muted); font-size: 0.9rem; margin-top:.4rem; line-height:1.4;">📍 ${h.city}, ${h.address}</p>
                    
                    <div style="margin-top: 1rem;">
                        <span class="badge-v2 badge-info" style="font-size:.75rem">
                            🍽️ Food: ${h.foodAvailability ? 'Yes' : 'No'}
                        </span>
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
      opacity: 0,
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
            <div class="hostel-card-img">
                <img src="${h.thumbnailImage ? getOptimizedUrl(h.thumbnailImage, 600) : (h.buildingPhotos && h.buildingPhotos.length > 0 ? getOptimizedUrl(h.buildingPhotos[0], 600) : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80')}" alt="Hostel Room" loading="lazy">
            </div>
            <div style="padding: 1.25rem;">
                <h3 class="hostel-title" style="display: flex; justify-content: space-between; align-items: flex-start; gap:.5rem;">
                    ${h.name} 
                    ${h.isVerified ? '<span class="badge-v2 badge-approved" style="font-size:.7rem;padding:.2rem .5rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg> Verified</span>' : ''}
                </h3>
                <p style="color:var(--text-muted); font-size: 0.9rem; margin-top:.4rem; line-height:1.4;">📍 ${h.city}, ${h.address}</p>
                
                <div style="margin-top: 1rem;">
                    <span class="badge-v2 badge-info" style="font-size:.75rem">
                        🍽️ Food: ${h.foodAvailability ? 'Yes' : 'No'}
                    </span>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                    <span class="hostel-price">₹${h.monthlyPrice}<span style="font-size: 0.9rem; color:var(--text-muted); font-weight:500;">/mo</span></span>
                    <button class="btn btn-outline btn-sm" onclick="openHostelDetails('${h._id}')">Details &rarr;</button>
                </div>
            </div>
        </div>
    `).join('')

    gsap.from('#allHostelsContainer .hostel-card', {
      y: 30, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power2.out'
    })
  } catch (error) {
    container.innerHTML = `<p style="color:var(--danger); grid-column:1/-1;">Error loading properties: ${error.message}</p>`
  }
}


// ---- DETAILED VIEW LOGIC ----
window.openHostelDetails = async function (id) {
  let modal = document.getElementById('hostelDetailModal')
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend', `
            <div id="hostelDetailModal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <div id="modalHeader"><h2>Loading details...</h2></div>
                        <button class="modal-close" onclick="closeDetailsModal()">✕</button>
                    </div>
                    <div id="modalBody" class="modal-body">
                        <!-- Content will be injected here -->
                    </div>
                </div>
            </div>
        `)
    modal = document.getElementById('hostelDetailModal')
  }

  modal.classList.add('active')

  try {
    const [hostelRes, reviewsRes] = await Promise.all([
      fetchAPI(`/hostels/${id}`),
      fetchAPI(`/reviews/hostel/${id}`)
    ])
    const h = hostelRes.data
    const reviews = reviewsRes.data

    document.getElementById('modalHeader').innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1.5rem; width:100%; padding-right:1rem">
                <div style="flex: 1; min-width: 280px;">
                    <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text);">
                        ${h.name} 
                        ${h.isVerified ? '<span class="badge-v2 badge-approved" style="font-size:0.75rem;">Verified</span>' : ''}
                    </h1>
                    <p style="color: var(--text-muted); font-size: 1rem; margin-bottom: 1rem;">📍 ${h.address}, ${h.city}</p>
                    
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="badge-v2 badge-info" style="text-transform:none">🍽️ Food: ${h.foodAvailability ? 'Available' : 'N/A'}</span>
                        <span class="badge-v2 badge-info" style="text-transform:none">📞 Owner: ${h.ownerId ? h.ownerId.phone : 'N/A'}</span>
                    </div>
                </div>
                
                <div style="background: var(--surface-2); padding: 1.25rem; border-radius: var(--radius); border: 1px solid var(--border); text-align: center; min-width: 200px;">
                    <div style="font-size: 2rem; font-weight: 800; color: var(--primary);">₹${h.monthlyPrice}</div>
                    <div style="font-size: 0.75rem; color: var(--text-light); font-weight: 700; text-transform:uppercase;">per month</div>
                    <button class="btn btn-primary" style="width:100%; margin-top:1rem;" onclick="openBookingModal('${h._id}', '${h.name.replace(/'/g, "\\'")}')">Send Enquiry</button>
                </div>
            </div>
        `

    document.getElementById('modalBody').innerHTML = `
        <div style="display:flex; flex-direction:column; gap:2.5rem;">
            <!-- About Section -->
            <section>
                <h3 style="font-size:1.2rem; color:var(--text); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
                    <span style="width:4px; height:18px; background:var(--primary); border-radius:4px;"></span> Description
                </h3>
                <p style="font-size: 1rem; line-height: 1.7; color: var(--text-2); white-space: pre-line; background:var(--surface-2); padding:1.25rem; border-radius:var(--radius); border:1px solid var(--border);">${h.description}</p>
            </section>

            ${h.rules ? `
            <section>
                <h3 style="font-size:1.2rem; color:var(--accent); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
                    <span style="width:4px; height:18px; background:var(--accent); border-radius:4px;"></span> Rules & Policies
                </h3>
                <div class="msg-bubble-warn" style="font-style:normal; border-radius:var(--radius); border:1px solid rgba(249,115,22,0.2); line-height:1.7;">
                    ${h.rules}
                </div>
            </section>
            ` : ''}

            <!-- Image Galleries -->
            <section>
                <h3 style="font-size:1.2rem; color:var(--text); margin-bottom:1rem;">🏢 Exterior & Surroundings</h3>
                <div id="galleryBuilding" class="gallery-grid"></div>

                <h3 style="font-size:1.2rem; color:var(--text); margin-bottom:1rem;">🛏️ Rooms & Interiors</h3>
                <div id="galleryRooms" class="gallery-grid"></div>

                <h3 style="font-size:1.2rem; color:var(--text); margin-bottom:1rem;">🍽️ Dining Area</h3>
                <div id="galleryMess" class="gallery-grid"></div>

                <h3 style="font-size:1.2rem; color:var(--text); margin-bottom:1rem;">🚿 Washrooms</h3>
                <div id="galleryBathrooms" class="gallery-grid"></div>
            </section>

            <!-- Reviews Section -->
            <section style="border-top: 1px solid var(--border); padding-top:2.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap:wrap; gap:1rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text);">⭐ Student Reviews (${reviews.length})</h3>
                    <button class="btn btn-outline btn-sm" onclick="openReviewModal('${h._id}')">Write a Review</button>
                </div>
                ${reviews.length > 0 ? `
                    <div style="display: grid; gap: 1rem;">
                        ${reviews.map(r => `
                            <div class="list-item" style="gap:1rem">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; width:100%; flex-wrap:wrap; gap:.5rem">
                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                        <div class="chat-avatar" style="width:40px;height:40px;font-size:1rem">
                                            ${r.studentId ? r.studentId.name.charAt(0).toUpperCase() : 'S'}
                                        </div>
                                        <div>
                                            <div style="font-weight: 700; font-size: 1rem; color: var(--text);">${r.studentId ? r.studentId.name : 'Student'}</div>
                                            <div style="font-size: 0.75rem; color: var(--text-light);">${new Date(r.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div style="color: #F59E0B; font-size: 1.1rem; border:1px solid var(--border); padding:.2rem .5rem; border-radius:12px; background:var(--surface)">
                                        ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                                    </div>
                                </div>
                                <p class="msg-bubble" style="width:100%; border-radius:var(--radius); background:var(--surface-2); font-style:normal; margin-top:0.5rem">"${r.comment}"</p>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p style="color: var(--text-muted); font-style: italic; background:var(--surface-3); padding:2rem; text-align:center; border-radius:var(--radius); border:1px dashed var(--border);">No reviews yet. Be the first to share your experience!</p>'}
            </section>
        </div>
    `

    const renderGrid = (containerId, imagesArr, emptyMsg) => {
      const container = document.getElementById(containerId)
      if (!imagesArr || imagesArr.length === 0) {
        container.innerHTML = `<p style="color: var(--text-light); font-style: italic; font-size:.9rem; grid-column:1/-1;">${emptyMsg}</p>`
        return
      }
      container.innerHTML = imagesArr.map(imgSrc => `
                <div class="gallery-img-wrap">
                    <img src="${getOptimizedUrl(imgSrc, 800)}" loading="lazy">
                </div>
            `).join('')
    }

    const allBuildingPhotos = h.thumbnailImage && (!h.buildingPhotos || !h.buildingPhotos.includes(h.thumbnailImage)) 
      ? [h.thumbnailImage, ...(h.buildingPhotos || [])] 
      : h.buildingPhotos;

    renderGrid('galleryBuilding', allBuildingPhotos, 'No building photos available.')
    renderGrid('galleryRooms', h.roomPhotos, 'No room photos available.')
    renderGrid('galleryMess', h.messPhotos, 'No dining area photos available.')
    renderGrid('galleryBathrooms', h.washroomPhotos, 'No washroom photos available.')
  } catch (err) {
    document.getElementById('modalHeader').innerHTML = `<p style="color:var(--danger)">Failed to load details: ${err.message}</p>`
  }
}

window.closeDetailsModal = function () {
  const m = document.getElementById('hostelDetailModal')
  if (m) m.classList.remove('active')
}

window.openBookingModal = function (id, name) {
  document.getElementById('bookingHostelName').textContent = name
  document.getElementById('bookingMessage').dataset.hostelId = id
  const modal = document.getElementById('bookingModal')
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
            <div id="reviewModal" class="modal-overlay">
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

async function loadEnquiries () {
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
            <div class="chat-card" style="margin-bottom:1.25rem">
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
                <div class="chat-body">
                    <!-- Student's Message -->
                    <div style="display:flex;flex-direction:column;align-items:flex-end;">
                        <div class="msg-meta">
                            <span>You</span> &middot; <span>${sentDate}</span>
                        </div>
                        <div class="msg-bubble msg-owner">"${eq.message}"</div>
                    </div>

                    <!-- Owner's Reply -->
                    ${eq.ownerReply
? `
                        <div style="display:flex;flex-direction:column;align-items:flex-start;">
                            <div class="msg-meta">
                                <span>🏠 Owner Reply</span>
                            </div>
                            <div class="msg-bubble msg-student">${eq.ownerReply}</div>
                        </div>
                    `
: `
                        <div style="text-align:center;padding:1.25rem;border-radius:var(--radius);background:var(--surface-3);border:1px dashed var(--border);color:var(--text-muted);font-size:0.9rem;">
                            ⏳ Waiting for the owner to reply...
                        </div>
                    `}

                    <!-- Admin Response -->
                    ${eq.adminResponse
? `
                        <div style="display:flex;flex-direction:column;align-items:flex-start;">
                            <div class="msg-meta" style="color:var(--success);font-weight:700;text-transform:uppercase">✅ Platform Response</div>
                            <div class="msg-bubble msg-admin">${eq.adminResponse}</div>
                        </div>
                    `
: ''}
                </div>

                <!-- footer info -->
                <div style="padding:0.75rem 1.25rem;background:var(--surface-2);border-top:1px solid var(--border);font-size:0.8rem;color:var(--text-muted);display:flex;justify-content:space-between;">
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
document.getElementById('feedbackForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.textContent = 'Submitting...';
  
  const rating = document.getElementById('feedbackRating').value;
  const comment = document.getElementById('feedbackComment').value.trim();
  
  try {
    await fetchAPI('/feedback/submit', 'POST', { rating: Number(rating), comment });
    showToast('Thank you! Your feedback has been submitted for review.', 'success');
    document.getElementById('feedbackComment').value = '';
    document.getElementById('feedbackRating').value = '5';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Submit Feedback';
  }
});

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
async function loadNotifications () {
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
            <div class="notif-item ${n.type}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem;">
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${new Date(n.createdAt).toLocaleString()}</span>
                    ${!n.isRead ? '<span style="background: var(--primary); width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 5px var(--primary)"></span>' : ''}
                </div>
                <p style="font-size: 0.95rem; color: var(--text-2); font-weight: 500; line-height: 1.5;">${n.message}</p>
            </div>
        `).join('')

    // Mark as read after a short delay
    setTimeout(markNotificationsRead, 3000)
  } catch (err) {
    console.error('Failed to load notifications:', err)
  }
}

async function markNotificationsRead () {
  try {
    await fetchAPI('/profiles/notifications/read', 'PUT')
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
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// ---- PLATFORM UPDATES ----
window.openPlatformUpdatesModal = function () {
  document.getElementById('updatesModal').classList.add('active')
  loadPlatformUpdates()

  const dot = document.getElementById('updatesDot');
  if (dot) dot.remove();
  fetchAPI('/profiles/updates/read', 'PUT').catch(e => console.error(e));
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

    container.innerHTML = updates.map(u => `
            <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem; border-left:4px solid var(--primary)">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h4 style="font-size:1.05rem; font-weight:700; margin:0; color:var(--text)">${u.title}</h4>
                    <span style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap; margin-left:1rem;">${new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
                <div style="font-size:0.9rem; color:var(--text-2); margin-top:0.6rem; white-space:pre-wrap; line-height:1.5">${u.message}</div>
            </div>
        `).join('')
  } catch (err) {
    console.error('Failed to load updates:', err)
    container.innerHTML = '<p style="color:var(--danger)">Failed to load updates.</p>'
  }
}
