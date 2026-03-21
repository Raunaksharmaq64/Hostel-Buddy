document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Checks
  if (!checkAuth('Student')) return

  const user = JSON.parse(localStorage.getItem('user'))
  document.getElementById('userNameDisplay').textContent = `Hello, ${user.name}`

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
  if (tabId === 'enquiries') loadEnquiries()
  if (tabId === 'profile') loadProfileDetails()
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

    document.getElementById('profileName').value = user.name || ''
    document.getElementById('profilePhone').value = user.phone || ''
    document.getElementById('collegeName').value = user.collegeName || ''
    document.getElementById('fatherPhone').value = user.fatherPhone || ''
    document.getElementById('permanentAddress').value = user.permanentAddress || ''
    if (user.profilePhoto) {
      document.getElementById('profilePreview').src = user.profilePhoto
    }
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
    await fetchAPI('/profiles/student', 'PUT', formData, true)
    showToast('Profile updated successfully!', 'success')
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    btn.textContent = 'Save Profile'
  }
})

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
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <div class="spinner"></div>
                <p style="margin-top: 1rem;">Searching...</p>
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
                <img src="${h.buildingPhotos && h.buildingPhotos.length > 0 ? getOptimizedUrl(h.buildingPhotos[0], 600) : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'}" class="hostel-img" alt="Hostel Room" loading="lazy">
                <div style="padding: 1.25rem;">
                    <h3 class="hostel-title" style="display: flex; justify-content: space-between; align-items: flex-start; gap:.5rem;">
                        ${h.name} 
                        ${h.isVerified ? '<span style="color:var(--success);font-size:.8rem;display:flex;align-items:center;gap:.25rem;background:rgba(16,185,129,.1);padding:.2rem .5rem;border-radius:12px;font-weight:700;"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg> Verified</span>' : ''}
                    </h3>
                    <p style="color:var(--text-muted); font-size: 0.9rem; margin-top:.4rem; line-height:1.4;">📍 ${h.city}, ${h.address}</p>
                    
                    <div style="margin-top: 1rem;">
                        <span style="font-size: .78rem; font-weight: 700; color: var(--text-2); background: var(--surface-3); padding: .25rem .75rem; border-radius: 20px;">
                            🍽️ Food: ${h.foodAvailability ? 'Yes' : 'No'}
                        </span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; border-top: 1px solid var(--border-light); padding-top: 1rem;">
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

// ---- DETAILED VIEW LOGIC ----
window.openHostelDetails = async function (id) {
  const modal = document.getElementById('hostelDetailModal')
  if (!modal) {
    // Create modal if it doesn't exist yet (we removed the hardcoded one from HTML in rewrite)
    document.body.insertAdjacentHTML('beforeend', `
            <div id="hostelDetailModal" class="modal-overlay" style="display:none">
                <div class="modal" style="width: 95%; max-width: 1000px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <div id="modalHeader"><h2>Loading details...</h2></div>
                        <button class="modal-close" onclick="closeDetailsModal()">✕</button>
                    </div>
                    <div id="modalBody">
                        <div style="margin-top: 2rem;">
                            <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: var(--text);">🏢 Building & Surroundings</h3>
                            <div id="galleryBuilding" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem;"></div>

                            <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: var(--text);">🛏️ Rooms</h3>
                            <div id="galleryRooms" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem;"></div>

                            <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: var(--text);">🍽️ Dinning / Mess</h3>
                            <div id="galleryMess" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem;"></div>

                            <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: var(--text);">🚿 Washrooms</h3>
                            <div id="galleryBathrooms" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `)
  }

  document.getElementById('hostelDetailModal').style.display = 'flex'

  try {
    const [hostelRes, reviewsRes] = await Promise.all([
      fetchAPI(`/hostels/${id}`),
      fetchAPI(`/reviews/hostel/${id}`)
    ])
    const h = hostelRes.data
    const reviews = reviewsRes.data

    document.getElementById('modalHeader').innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1.5rem; padding-right: 2rem;">
                <div style="flex: 1; min-width: 300px;">
                    <h1 style="font-size: 2rem; font-weight: 900; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text);">
                        ${h.name} 
                        ${h.isVerified ? '<span style="color:var(--success);font-size:.9rem;display:flex;align-items:center;gap:.25rem;background:rgba(16,185,129,.1);padding:.2rem .6rem;border-radius:20px;font-weight:700;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg> Verified</span>' : ''}
                    </h1>
                    <p style="color: var(--text-2); font-size: 1.05rem; margin-bottom: 1.25rem;">📍 ${h.address}, ${h.city}, ${h.state} - ${h.pincode}</p>
                    
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                        <span style="font-size:.85rem; font-weight:600; background:var(--surface-3); padding:.4rem .8rem; border-radius:8px;">🍽️ Food: ${h.foodAvailability ? 'Available' : 'Not Available'}</span>
                        <span style="font-size:.85rem; font-weight:600; background:var(--surface-3); padding:.4rem .8rem; border-radius:8px;">📞 Owner: ${h.ownerId ? h.ownerId.phone : 'N/A'}</span>
                        ${h.googleMapLink ? `<a href="${h.googleMapLink}" target="_blank" style="font-size:.85rem; font-weight:600; background:var(--primary); color:#fff; padding:.4rem .8rem; border-radius:8px; text-decoration:none;">📍 Open in Maps</a>` : ''}
                    </div>
                </div>
                
                <div style="background: var(--surface-3); padding: 1.5rem 2rem; border-radius: var(--radius-lg); border: 1px solid var(--border); text-align: center; min-width: 220px;">
                    <div style="font-size: 2.2rem; font-weight: 900; color: var(--primary); line-height: 1;">₹${h.monthlyPrice}</div>
                    <div style="font-size: .88rem; color: var(--text-muted); font-weight: 600; margin-top: .25rem; text-transform:uppercase;">per month</div>
                    <button class="btn btn-primary" style="width:100%; margin-top:1.25rem;" onclick="openBookingModal('${h._id}', '${h.name.replace(/'/g, "\\'")}')">Send Enquiry</button>
                </div>
            </div>
            <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px dashed var(--border-strong);">
                <h3 style="font-size:1.1rem; color:var(--text); margin-bottom:.5rem;">About this Property</h3>
                <p style="font-size: .95rem; line-height: 1.8; color: var(--text-2); white-space: pre-line;">${h.description}</p>
            </div>
            ${h.rules
? `
            <div style="margin-top: 1.5rem; padding: 1.5rem; background: rgba(249, 115, 22, 0.05); border-radius: var(--radius-lg); border: 1px solid rgba(249, 115, 22, 0.2);">
                <h3 style="font-size:1.1rem; color:var(--accent); margin-bottom:.5rem;">Hostel Rules & Regulations</h3>
                <p style="font-size: .95rem; line-height: 1.8; color: var(--text-2); white-space: pre-line;">${h.rules}</p>
            </div>
            `
: ''}
        `

    const renderGrid = (containerId, imagesArr, emptyMsg) => {
      const container = document.getElementById(containerId)
      if (!imagesArr || imagesArr.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-style: italic; font-size:.9rem; grid-column:1/-1;">${emptyMsg}</p>`
        return
      }
      container.innerHTML = imagesArr.map(imgSrc => `
                <div style="border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); aspect-ratio: 4/3;">
                    <img src="${getOptimizedUrl(imgSrc, 800)}" style="width: 100%; height: 100%; object-fit: cover; transition: var(--transition);" loading="lazy">
                </div>
            `).join('')
    }

    renderGrid('galleryBuilding', h.buildingPhotos, 'No building photos uploaded.')
    renderGrid('galleryRooms', h.roomPhotos, 'No room photos uploaded.')
    renderGrid('galleryMess', h.messPhotos, 'No dining area photos uploaded.')
    renderGrid('galleryBathrooms', h.washroomPhotos, 'No washroom photos uploaded.')

    // Append Reviews Section to modalbody
    const modalBody = document.getElementById('modalBody')
    modalBody.insertAdjacentHTML('beforeend', `
            <div style="margin-top: 3rem; padding-top: 1.5rem; border-top: 1px dashed var(--border-strong);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap:wrap; gap:1rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text);">⭐ Student Reviews (${reviews.length})</h3>
                    <button class="btn btn-outline btn-sm" onclick="openReviewModal('${h._id}')">Write a Review</button>
                </div>
                ${reviews.length > 0
? `
                    <div style="display: grid; gap: 1rem;">
                        ${reviews.map(r => `
                            <div style="background: var(--surface-3); padding: 1.25rem; border-radius: var(--radius); border: 1px solid var(--border);">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; flex-wrap:wrap; gap:.5rem">
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--border-strong); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-2);">
                                            ${r.studentId ? r.studentId.name.charAt(0).toUpperCase() : 'S'}
                                        </div>
                                        <div>
                                            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text);">${r.studentId ? r.studentId.name : 'Student'}</div>
                                            <div style="font-size: 0.75rem; color: var(--text-muted);">${new Date(r.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div style="color: #F59E0B; font-size: 1rem;">
                                        ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                                    </div>
                                </div>
                                <p style="font-size: 0.95rem; color: var(--text-2); line-height: 1.5; margin-top: 0.75rem;">${r.comment}</p>
                            </div>
                        `).join('')}
                    </div>
                `
: '<p style="color: var(--text-muted); font-style: italic; font-size: .95rem;">No reviews yet. Be the first to add one!</p>'}
            </div>
        `)
  } catch (err) {
    document.getElementById('modalHeader').innerHTML = `<p style="color:var(--danger)">Failed to load details: ${err.message}</p>`
  }
}

window.closeDetailsModal = function () {
  const m = document.getElementById('hostelDetailModal')
  if (m) m.style.display = 'none'
}

window.openBookingModal = function (id, name) {
  document.getElementById('bookingHostelName').textContent = name
  document.getElementById('bookingMessage').dataset.hostelId = id
  const modal = document.getElementById('bookingModal')
  modal.style.display = 'flex'
  modal.style.zIndex = '1005'
}

window.closeBookingModal = function () {
  document.getElementById('bookingModal').style.display = 'none'
  document.getElementById('bookingMessage').value = ''
}

// ---- REVIEW LOGIC ----
window.openReviewModal = function (hostelId) {
  let reviewModal = document.getElementById('reviewModal')
  if (!reviewModal) {
    document.body.insertAdjacentHTML('beforeend', `
            <div id="reviewModal" class="modal-overlay" style="display:none; z-index: 2000;">
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Write a Review</h2>
                        <button class="modal-close" onclick="closeReviewModal()">✕</button>
                    </div>
                    <input type="hidden" id="reviewHostelId">
                    <div class="form-group" style="margin-top: 1rem;">
                        <label class="form-label">Rating (1-5)</label>
                        <select id="reviewRating" class="form-input" style="cursor: pointer;">
                            <option value="5">⭐⭐⭐⭐⭐ Excellent (5)</option>
                            <option value="4">⭐⭐⭐⭐ Very Good (4)</option>
                            <option value="3">⭐⭐⭐ Good (3)</option>
                            <option value="2">⭐⭐ Fair (2)</option>
                            <option value="1">⭐ Poor (1)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Comment</label>
                        <textarea id="reviewComment" class="form-textarea" rows="4" placeholder="Share your experience..."></textarea>
                    </div>
                    <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" onclick="submitReview()">Submit Review</button>
                </div>
            </div>
        `)
    reviewModal = document.getElementById('reviewModal')
  }
  document.getElementById('reviewHostelId').value = hostelId
  document.getElementById('reviewComment').value = ''
  document.getElementById('reviewRating').value = '5'
  reviewModal.style.display = 'flex'
}

window.closeReviewModal = function () {
  const rm = document.getElementById('reviewModal')
  if (rm) rm.style.display = 'none'
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
  container.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="spinner"></div></div>'

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
      let statusColor = 'var(--text-muted)'
      let statusBg = 'var(--surface-3)'
      let statusDot = '#94a3b8'
      if (eq.status === 'Pending') { statusColor = '#F59E0B'; statusBg = 'rgba(245,158,11,0.12)'; statusDot = '#F59E0B' }
      if (eq.status === 'Responded') { statusColor = 'var(--success)'; statusBg = 'rgba(16,185,129,0.12)'; statusDot = '#10b981' }

      const sentDate = new Date(eq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

      return `
            <div style="
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: var(--radius-lg);
                overflow: hidden;
                box-shadow: var(--shadow-sm);
                transition: box-shadow 0.2s;
                margin-bottom: 0.25rem;
            " onmouseenter="this.style.boxShadow='var(--shadow-md)'" onmouseleave="this.style.boxShadow='var(--shadow-sm)'">

                <!-- Card Header -->
                <div style="
                    display: flex; justify-content: space-between; align-items: center; flex-wrap:wrap; gap:.75rem;
                    padding: 1rem 1.25rem;
                    background: var(--surface-2);
                    border-bottom: 1px solid var(--border);
                ">
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div style="width:40px;height:40px;border-radius:var(--radius);background:linear-gradient(135deg,var(--primary),var(--violet));display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">🏠</div>
                        <div>
                            <div style="font-weight:700;font-size:1rem;color:var(--text);">${eq.hostelId ? eq.hostelId.name : 'Unknown Property'}</div>
                            <div style="font-size:0.78rem;color:var(--text-muted);">Sent on ${sentDate}</div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;">
                        <span style="display:flex;align-items:center;gap:0.4rem;color:${statusColor};background:${statusBg};padding:0.3rem 0.8rem;border-radius:20px;font-size:0.78rem;font-weight:700;">
                            <span style="width:6px;height:6px;border-radius:50%;background:${statusDot};display:inline-block;"></span>
                            ${eq.status}
                        </span>
                        <button onclick="deleteEnquiry('${eq._id}')" style="
                            background: none; border: 1px solid var(--danger); color: var(--danger);
                            border-radius: var(--radius); padding: 0.3rem 0.7rem; cursor: pointer;
                            font-size: 0.78rem; font-weight: 600; transition: all 0.2s;
                            display:flex;align-items:center;gap:.3rem;"
                            onmouseenter="this.style.background='var(--danger)';this.style.color='#fff'"
                            onmouseleave="this.style.background='none';this.style.color='var(--danger)'">
                            🗑 Clear Enquiry
                        </button>
                    </div>
                </div>

                <!-- Conversation Body -->
                <div style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;">

                    <!-- Student's Message (right side / outgoing) -->
                    <div style="display:flex;flex-direction:column;align-items:flex-end;">
                        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.35rem;display:flex;align-items:center;gap:0.3rem;">
                            <span>You</span> <span>·</span> <span>${sentDate}</span>
                        </div>
                        <div style="
                            background: linear-gradient(135deg, var(--primary-dark), var(--primary));
                            color: #fff;
                            padding: 0.9rem 1.1rem;
                            border-radius: 16px 4px 16px 16px;
                            max-width: 85%;
                            font-size: 0.95rem;
                            line-height: 1.6;
                            box-shadow: 0 2px 8px rgba(14,165,233,0.25);
                        ">"${eq.message}"</div>
                    </div>

                    <!-- Owner's Reply (left side / incoming) -->
                    ${eq.ownerReply
? `
                        <div style="display:flex;flex-direction:column;align-items:flex-start;">
                            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.35rem;display:flex;align-items:center;gap:0.3rem;">
                                <span>🏠 Owner</span> <span>·</span> <span>Reply</span>
                            </div>
                            <div style="
                                background: var(--surface-3);
                                border: 1px solid var(--border);
                                padding: 0.9rem 1.1rem;
                                border-radius: 4px 16px 16px 16px;
                                max-width: 85%;
                                font-size: 0.95rem;
                                line-height: 1.6;
                                color: var(--text-2);
                            ">${eq.ownerReply}</div>
                        </div>
                    `
: `
                        <div style="
                            text-align:center;
                            padding: 1rem;
                            border-radius: var(--radius);
                            background: var(--surface-2);
                            border: 1px dashed var(--border);
                            color: var(--text-muted);
                            font-size: 0.87rem;
                        ">
                            ⏳ Waiting for the owner to reply...
                        </div>
                    `}

                    <!-- Admin Response -->
                    ${eq.adminResponse
? `
                        <div style="display:flex;flex-direction:column;align-items:flex-start;">
                            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.35rem;">
                                ✅ Official HostelBuddy Response
                            </div>
                            <div style="
                                background: rgba(16,185,129,0.07);
                                border: 1px solid rgba(16,185,129,0.3);
                                padding: 0.9rem 1.1rem;
                                border-radius: 4px 16px 16px 16px;
                                max-width: 85%;
                                font-size: 0.95rem;
                                line-height: 1.6;
                                color: var(--text-2);
                            ">${eq.adminResponse}</div>
                        </div>
                    `
: ''}

                </div>

                <!-- footer info -->
                <div style="padding: 0.6rem 1.25rem; background: var(--surface-2); border-top: 1px solid var(--border); font-size: 0.78rem; color: var(--text-muted);">
                    📞 Owner Contact: ${eq.ownerId ? eq.ownerId.phone : 'N/A'}
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
  document.getElementById('deactivateModal').style.display = 'flex'
}

window.closeDeactivateModal = function () {
  document.getElementById('deactivateModal').style.display = 'none'
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
