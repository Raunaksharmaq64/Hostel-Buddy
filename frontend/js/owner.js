document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Checks
  if (!checkAuth('Owner')) return

  const user = JSON.parse(localStorage.getItem('user'))
  document.getElementById('userNameDisplay').textContent = `Hello, ${user.name}`
  updateSidebarAvatar(user)

  // 2. Load Initial Data
  loadDashboardStats()
  setupFeedbackForm()
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
      avatarEl.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'O'
    }
  }
}

// Tab Navigation Logic
function switchTab (tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'))
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'))

  document.getElementById(tabId).classList.add('active')

  // Only add active to nav item if triggered by an actual click event
  if (window.event && window.event.currentTarget && window.event.currentTarget.classList) {
    window.event.currentTarget.classList.add('active')
  } else {
    // Fallback for programmatic tab switches
    const targetNavBtn = Array.from(document.querySelectorAll('.nav-item')).find(btn => btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`switchTab('${tabId}')`))
    if (targetNavBtn) targetNavBtn.classList.add('active')
  }

  // Load data based on tab
  if (tabId === 'dashboard') loadDashboardStats()
  if (tabId === 'my-hostels') loadMyHostels()
  if (tabId === 'enquiries') loadOwnerEnquiries()
  if (tabId === 'profile') loadOwnerProfile()
  if (tabId === 'feedback') loadCommunityFeedbacks()
}

// ---- DASHBOARD STATS LOGIC ----
async function loadDashboardStats () {
  try {
    const [hostelRes, enqRes] = await Promise.all([
      fetchAPI('/hostels/owner/my-hostels'),
      fetchAPI('/enquiries/owner')
    ])

    document.getElementById('stat-hostels').textContent = hostelRes.count
    document.getElementById('stat-enquiries').textContent = enqRes.count
  } catch (err) {
    console.error('Failed loading stats:', err)
  }
}

// ---- PROFILE LOGIC ----
async function loadOwnerProfile () {
  try {
    const res = await fetchAPI('/auth/me')
    const user = res.data

    if (user.hasUnreadPlatformUpdates && document.getElementById('megaphoneIcon')) {
      const icon = document.getElementById('megaphoneIcon');
      if (!document.getElementById('updatesDot')) {
        icon.innerHTML += '<span id="updatesDot" style="position:absolute; top:4px; right:4px; width:8px; height:8px; background:var(--danger, red); border-radius:50%; box-shadow:0 0 4px var(--danger, red);"></span>';
      }
    }

    document.getElementById('opName').value = user.name || ''
    document.getElementById('opPhone').value = user.phone || ''
    document.getElementById('opAddress').value = user.address || ''
    document.getElementById('opCity').value = user.city || ''
    document.getElementById('opHostelName').value = user.hostelName || ''
    document.getElementById('opDescription').value = user.description || ''
    document.getElementById('opAadhaarNumber').value = user.aadhaarNumber || ''

    const statusEl = document.getElementById('verificationStatusText')
    const vStatus = user.verificationStatus || 'unverified'
    statusEl.textContent = `Status: ${vStatus.charAt(0).toUpperCase() + vStatus.slice(1)}`

    const btnReq = document.getElementById('btnRequestVerification')
    if (vStatus === 'pending') {
      btnReq.style.display = 'none'
      statusEl.style.color = 'orange'
    } else if (vStatus === 'verified') {
      btnReq.style.display = 'none'
      statusEl.style.color = 'green'
    } else if (vStatus === 'rejected') {
      btnReq.textContent = 'Request Again'
      btnReq.style.display = 'inline-block'
      statusEl.style.color = 'red'
    } else {
      btnReq.style.display = 'inline-block'
      btnReq.textContent = 'Request Verification'
      statusEl.style.color = 'var(--text-muted)'
    }

    if (user.profilePhoto) {
      document.getElementById('ownerProfilePreview').src = user.profilePhoto
    }

    // Load Notifications
    loadNotifications()

    // Display Verified Badge next to name if verified
    const nameDisplay = document.getElementById('userNameDisplay')
    if (user.isVerified && !nameDisplay.innerHTML.includes('verified-badge')) {
      nameDisplay.innerHTML = `Hello, ${user.name} <span class="verified-badge" title="Verified Owner"><svg class="verified-icon-svg" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg> Verified</span>`
    }
  } catch (err) {
    console.error(err)
  }
}

// Live preview for profile photo selection
document.getElementById('ownerProfilePhotoInput').addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      document.getElementById('ownerProfilePreview').src = e.target.result
    }
    reader.readAsDataURL(file)
  }
})

// Local image preview update
document.getElementById('ownerProfilePhotoInput').addEventListener('change', function (e) {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = function (event) {
      document.getElementById('ownerProfilePreview').src = event.target.result
    }
    reader.readAsDataURL(file)
  }
})

document.getElementById('ownerProfileForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = e.target.querySelector('button')
  btn.textContent = 'Saving...'

  const payload = {
    name: document.getElementById('opName').value,
    phone: document.getElementById('opPhone').value,
    address: document.getElementById('opAddress').value,
    city: document.getElementById('opCity').value,
    hostelName: document.getElementById('opHostelName').value,
    description: document.getElementById('opDescription').value,
    aadhaarNumber: document.getElementById('opAadhaarNumber').value
  }

  const formData = new FormData()
  Object.keys(payload).forEach(key => formData.append(key, payload[key]))

  const photoInput = document.getElementById('ownerProfilePhotoInput')
  if (photoInput.files[0]) {
    formData.append('profilePhoto', photoInput.files[0])
  }

  try {
    const res = await fetchAPI('/profiles/owner', 'PUT', formData, true)
    showToast('Profile updated successfully!', 'success')
    
    // Update local storage so avatar persists
    if (res.data) {
      const existingUser = JSON.parse(localStorage.getItem('user'))
      const updatedUser = { ...existingUser, ...res.data }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      updateSidebarAvatar(updatedUser)
    }

    // Reload to update the UI including the verification button
    loadOwnerProfile()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    btn.textContent = 'Save Profile'
  }
})

// Request Verification
window.requestVerification = async function () {
  try {
    document.getElementById('btnRequestVerification').textContent = 'Requesting...'
    await fetchAPI('/profiles/owner/request-verification', 'POST')
    showToast('Verification request sent successfully!', 'success')
    loadOwnerProfile()
  } catch (err) {
    showToast(err.message, 'error')
    document.getElementById('btnRequestVerification').textContent = 'Request Verification'
  }
}

// In-memory store for selected images to allow multiple additions and deletions
const selectedImages = {
  thumbnailImage: [],
  buildingPhotos: [],
  roomPhotos: [],
  messPhotos: [],
  washroomPhotos: []
}

// Image compression helper
function compressImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = event => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height *= maxWidth / width))
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width *= maxHeight / height))
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('Canvas is empty'))
            return
          }
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(compressedFile)
        }, 'image/jpeg', quality)
      }
      img.onerror = error => reject(error)
    }
    reader.onerror = error => reject(error)
  })
}

function handleImagePreviews (inputId, previewContainerId, storeKey) {
  document.getElementById(inputId).addEventListener('change', async function (e) {
    const container = document.getElementById(previewContainerId)

    if (this.files) {
      // Disable input while processing to prevent duplicate selections
      this.disabled = true
      
      // Keep track of old text for processing UX
      const fileLabel = this.closest('.form-group') ? this.closest('.form-group').querySelector('label') : null
      const originalLabelText = fileLabel ? fileLabel.innerText : ''
      if (fileLabel) fileLabel.innerText = 'Compressing...'

      const filesArray = Array.from(this.files)
      
      for (const file of filesArray) {
        // Prevent duplicate files based on name (size will change after compression)
        if (!selectedImages[storeKey].some(f => f.name === file.name)) {
          try {
            // Compress the image before adding to store
            const compressedFile = await compressImage(file)
            selectedImages[storeKey].push(compressedFile)

            const reader = new FileReader()
            reader.onload = function (event) {
              const wrapper = document.createElement('div')
              wrapper.className = 'preview-img-wrapper'

              const img = document.createElement('img')
              img.src = event.target.result

              const removeBtn = document.createElement('button')
              removeBtn.innerHTML = '×'
              removeBtn.className = 'preview-remove-btn'

              removeBtn.onclick = (eventClick) => {
                eventClick.preventDefault()
                wrapper.remove()
                selectedImages[storeKey] = selectedImages[storeKey].filter(f => f !== compressedFile)
              }

              wrapper.appendChild(img)
              wrapper.appendChild(removeBtn)
              container.appendChild(wrapper)
            }
            reader.readAsDataURL(compressedFile)
          } catch (err) {
            console.error('Error compressing image:', err)
            showToast('Failed to process image: ' + file.name, 'error')
          }
        }
      }
      
      // Restore input and label
      this.disabled = false
      if (fileLabel) fileLabel.innerText = originalLabelText
    }
    // Reset file input so same file can be selected again if removed
    this.value = ''
  })
}

// Attach preview listeners
handleImagePreviews('hThumbnailImage', 'previewThumbnail', 'thumbnailImage')
handleImagePreviews('hBuildingImages', 'previewBuilding', 'buildingPhotos')
handleImagePreviews('hRoomImages', 'previewRooms', 'roomPhotos')
handleImagePreviews('hMessImages', 'previewMess', 'messPhotos')
handleImagePreviews('hBathroomImages', 'previewBathrooms', 'washroomPhotos')

let editingHostelId = null

// ---- HOSTEL CREATION LOGIC ----
document.getElementById('hostelForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = e.target.querySelector('button')
  btn.textContent = 'Uploading (This may take a while)...'

  const formData = new FormData()
  formData.append('name', document.getElementById('hName').value)
  formData.append('monthlyPrice', document.getElementById('hPrice').value)
  formData.append('dailyPrice', document.getElementById('hDaily').value || 0)
  formData.append('depositAmount', document.getElementById('hDeposit').value)
  formData.append('description', document.getElementById('hDesc').value)
  formData.append('address', document.getElementById('hAddress').value)
  formData.append('city', document.getElementById('hCity').value)
  formData.append('state', document.getElementById('hState').value)
  formData.append('pincode', document.getElementById('hPincode').value)
  formData.append('foodAvailability', document.getElementById('hFood').value)
  formData.append('foodDetails', document.getElementById('hFoodDetails').value)
  formData.append('rules', document.getElementById('hRules').value)

  // Location & Keywords
  const googleMapLink = document.getElementById('hGoogleMapLink').value
  if (googleMapLink) {
    formData.append('googleMapLink', googleMapLink)
  }

  const keywordsVal = document.getElementById('hKeywords').value
  const keywordsArray = keywordsVal ? keywordsVal.split(',').map(k => k.trim()).filter(k => k) : []
  formData.append('keywords', JSON.stringify(keywordsArray))

  // Append Categorized Images from in-memory store
  const appendFiles = (storeKey, fieldName) => {
    const files = selectedImages[storeKey]
    for (let i = 0; i < files.length; i++) {
      formData.append(fieldName, files[i])
    }
  }

  appendFiles('thumbnailImage', 'thumbnailImage')
  appendFiles('buildingPhotos', 'buildingPhotos')
  appendFiles('roomPhotos', 'roomPhotos')
  appendFiles('messPhotos', 'messPhotos')
  appendFiles('washroomPhotos', 'washroomPhotos')

  const progressContainer = document.getElementById('uploadProgressContainer')
  const progressBar = document.getElementById('uploadProgressBar')
  const progressText = document.getElementById('uploadProgressText')

  const xhrWithProgress = (urlPath, method, formDataObj) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open(method, `${API_URL}${urlPath}`, true)
      
      const token = localStorage.getItem('token')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          progressBar.style.width = percent + '%'
          if (percent === 100) {
            progressText.textContent = '100% - Processing on server... Please wait.'
            progressBar.style.background = 'var(--warning, #f59e0b)' // Switch color to indicate processing stage
          } else {
            progressText.textContent = percent + '%'
            progressBar.style.background = 'var(--primary)'
          }
        }
      }
      
      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300) resolve(res)
          else reject(new Error(res.message || 'Error occurred'))
        } catch (err) {
          reject(new Error('Failed to parse response'))
        }
      }
      
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.send(formDataObj)
    })
  }

  try {
    if (progressContainer) progressContainer.style.display = 'block'
    if (progressBar) progressBar.style.width = '0%'
    if (progressText) progressText.textContent = '0%'

    if (editingHostelId) {
      await xhrWithProgress(`/hostels/${editingHostelId}`, 'PUT', formData)
      showToast('Listing updated successfully!', 'success')
      cancelHostelEdit()
    } else {
      await xhrWithProgress('/hostels', 'POST', formData)
      showToast('Listing created! Awaiting admin approval.', 'success')
      e.target.reset()
      Object.keys(selectedImages).forEach(key => selectedImages[key] = []);
      ['previewThumbnail', 'previewBuilding', 'previewRooms', 'previewMess', 'previewBathrooms'].forEach(id => {
        document.getElementById(id).innerHTML = ''
      })
    }
  } catch (err) {
    showToast('Failed to save listing: ' + err.message, 'error')
  } finally {
    if (progressContainer) progressContainer.style.display = 'none'
    if (btn) btn.textContent = editingHostelId ? 'Update Listing' : 'Create Listing'
  }
})

window.editHostel = async function (id) {
  try {
    const res = await fetchAPI(`/hostels/${id}`)
    const h = res.data

    editingHostelId = id

    document.getElementById('hName').value = h.name
    document.getElementById('hPrice').value = h.monthlyPrice
    document.getElementById('hDaily').value = h.dailyPrice || ''
    document.getElementById('hDeposit').value = h.depositAmount
    document.getElementById('hDesc').value = h.description
    document.getElementById('hAddress').value = h.address
    document.getElementById('hCity').value = h.city
    document.getElementById('hState').value = h.state
    document.getElementById('hPincode').value = h.pincode
    document.getElementById('hFood').value = h.foodAvailability.toString()
    document.getElementById('hFoodDetails').value = h.foodDetails || ''
    document.getElementById('hRules').value = h.rules || ''
    document.getElementById('hGoogleMapLink').value = h.googleMapLink || ''
    document.getElementById('hKeywords').value = h.keywords ? h.keywords.join(', ') : ''

    // Reset previews
    Object.keys(selectedImages).forEach(key => selectedImages[key] = []);
    ['previewThumbnail', 'previewBuilding', 'previewRooms', 'previewMess', 'previewBathrooms'].forEach(gridId => {
      document.getElementById(gridId).innerHTML = ''
    })

    // Change UI text
    const titleEl = document.querySelector('#add-hostel h2')
    if (titleEl) titleEl.textContent = 'Edit Listing'

    const submitBtn = document.getElementById('submitHostelBtn')
    if (submitBtn) submitBtn.textContent = 'Update Listing'

    const cancelBtn = document.getElementById('cancelEditBtn')
    if (cancelBtn) cancelBtn.style.display = 'block'

    // Switch tab
    switchTab('add-hostel')
  } catch (err) {
    showToast('Error loading hostel details: ' + err.message, 'error')
  }
}

window.cancelHostelEdit = function () {
  editingHostelId = null
  document.getElementById('hostelForm').reset()
  Object.keys(selectedImages).forEach(key => selectedImages[key] = []);
  ['previewThumbnail', 'previewBuilding', 'previewRooms', 'previewMess', 'previewBathrooms'].forEach(gridId => {
    document.getElementById(gridId).innerHTML = ''
  })

  const titleEl = document.querySelector('#add-hostel h2')
  if (titleEl) titleEl.textContent = 'Add New Listing'

  const submitBtn = document.getElementById('submitHostelBtn')
  if (submitBtn) submitBtn.textContent = 'Create Listing'

  const cancelBtn = document.getElementById('cancelEditBtn')
  if (cancelBtn) cancelBtn.style.display = 'none'

  switchTab('my-hostels')
  loadMyHostels()
}

// ---- MY HOSTELS LOGIC ----
async function loadMyHostels () {
  const container = document.getElementById('myHostelsContainer')
  container.innerHTML = '<div style="text-align:center;padding:2.5rem;"><div class="spinner-v2"></div></div>'

  try {
    const res = await fetchAPI('/hostels/owner/my-hostels')
    const hostels = res.data

    if (hostels.length === 0) {
      container.innerHTML = "You haven't listed any hostels yet."
      return
    }

    container.innerHTML = hostels.map(h => `
            <div class="hostel-manage-card">
                <div class="hostel-manage-card-body">
                    <h3 style="margin-bottom:0.5rem">${h.name}</h3>
                    <p style="color:var(--text-muted);font-size:0.9rem">📍 ${h.address}, ${h.city}</p>
                    <div class="info-box" style="margin:1.25rem 0">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-size:0.9rem;font-weight:600">Status:</span>
                            <span class="badge-v2 ${h.isApproved ? 'badge-approved' : 'badge-pending'}" style="font-size:0.75rem">
                                ${h.isApproved ? 'Approved' : 'Pending Approval'}
                            </span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.5rem">
                            <span style="font-size:0.9rem;font-weight:600">Total Views:</span>
                            <span style="font-weight:700;color:var(--primary)">👁️ ${h.views}</span>
                        </div>
                    </div>
                    <div class="action-btns">
                        <button class="btn btn-outline btn-sm" style="flex:1" onclick="editHostel('${h._id}')">Edit Listing</button>
                        <button class="btn btn-outline btn-sm" style="flex:1;border-color:var(--danger);color:var(--danger)" onclick="deleteHostel('${h._id}')">Delete</button>
                    </div>
                </div>
            </div>
        `).join('')

    gsap.from('#myHostelsContainer > div', { y: 20, opacity: 0, duration: 0.5, stagger: 0.1 })
  } catch (err) {
    container.innerHTML = 'Error loading hostels.'
  }
}

window.deleteHostel = async function (id) {
  const isConfirmed = await customConfirm('Are you sure you want to delete this listing?')
  if (!isConfirmed) return
  try {
    await fetchAPI(`/hostels/${id}`, 'DELETE')
    showToast('Listing deleted successfully.', 'success')
    loadMyHostels()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// ---- ENQUIRIES LOGIC ----
async function loadOwnerEnquiries () {
  const container = document.getElementById('ownerEnquiriesContainer')
  container.innerHTML = '<div style="text-align:center;padding:3rem;"><div class="spinner-v2"></div></div>'

  try {
    const res = await fetchAPI('/enquiries/owner')
    const enquiries = res.data

    if (enquiries.length === 0) {
      container.innerHTML = `
                <div style="text-align:center;padding:4rem 2rem;color:var(--text-muted);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                    <p style="font-size: 1.1rem; font-weight: 600; color: var(--text);">No enquiries yet</p>
                    <p style="font-size: 0.9rem; margin-top: 0.4rem;">When students enquire about your hostels, they'll appear here.</p>
                </div>`
      return
    }

    // Clear All button banner
    const clearAllBanner = `
            <div style="display:flex;justify-content:flex-end;margin-bottom:1.25rem;">
                <button onclick="clearAllOwnerEnquiries()" class="btn btn-outline btn-sm" style="border-color:var(--danger);color:var(--danger)">
                    🗑 Clear All Enquiries
                </button>
            </div>`

    container.innerHTML = clearAllBanner + enquiries.map(eq => {
      const sentDate = new Date(eq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      let statusClass = 'badge-pending'
      if (eq.status === 'Responded') { statusClass = 'badge-approved' }

      return `
            <div class="chat-card" style="margin-bottom:1.25rem">
                <!-- Card Header -->
                <div class="chat-header">
                    <div style="display:flex;align-items:center;gap:1rem;">
                        <div class="chat-avatar">
                            ${eq.studentId ? eq.studentId.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                            <div style="font-weight:700;font-size:1.05rem;color:var(--text);">${eq.studentId ? eq.studentId.name : 'Unknown Student'}</div>
                            <div style="font-size:0.8rem;color:var(--text-muted);display:flex;gap:0.75rem;align-items:center;">
                                <span>📞 ${eq.studentId ? eq.studentId.phone : 'N/A'}</span>
                                <span style="opacity:0.5">|</span>
                                <span style="color:var(--primary);font-weight:600">🏠 ${eq.hostelId ? eq.hostelId.name : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <span class="badge-v2 ${statusClass}">${eq.status}</span>
                        <button class="btn btn-outline btn-sm" style="border-color:var(--danger);color:var(--danger)" onclick="deleteOwnerEnquiry('${eq._id}')">
                            Clear
                        </button>
                    </div>
                </div>

                <!-- Conversation Body -->
                <div class="chat-body">
                    <!-- Student's Message -->
                    <div style="display:flex;flex-direction:column;align-items:flex-start;">
                        <div class="msg-meta">
                            <span>👤 ${eq.studentId ? eq.studentId.name : 'Student'}</span> &middot; <span>${sentDate}</span>
                        </div>
                        <div class="msg-bubble msg-student">"${eq.message}"</div>
                    </div>

                    <!-- Official Admin Response if any -->
                    ${eq.adminResponse
? `
                        <div style="display:flex;flex-direction:column;align-items:flex-start;">
                            <div class="msg-meta" style="color:var(--success);font-weight:700;text-transform:uppercase">✅ Platform Response</div>
                            <div class="msg-bubble msg-admin">${eq.adminResponse}</div>
                        </div>
                    `
: ''}

                    <!-- Owner's Reply OR Reply Form -->
                    ${eq.ownerReply
? `
                        <div style="display:flex;flex-direction:column;align-items:flex-end;">
                            <div class="msg-meta">Your Reply</div>
                            <div class="msg-bubble msg-owner">${eq.ownerReply}</div>
                        </div>
                    `
: `
                        <div style="border-top: 1px dashed var(--border); padding-top:1.25rem; display:flex; flex-direction:column; gap:0.75rem;">
                            <p style="font-size:0.8rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Reply to Student</p>
                            <textarea id="replyInput_${eq._id}" class="form-textarea" rows="2" placeholder="Write your reply..."></textarea>
                            <div style="display:flex;justify-content:flex-end;">
                                <button class="btn btn-primary btn-sm" onclick="submitEnquiryReply('${eq._id}')">Send Reply ➤</button>
                            </div>
                        </div>
                    `}
                </div>
            </div>
            `
    }).join('')
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);padding:1rem;">Error loading enquiries: ${err.message}</p>`
  }
}

window.submitEnquiryReply = async function (id) {
  const replyInput = document.getElementById(`replyInput_${id}`)
  const ownerReply = replyInput ? replyInput.value.trim() : ''
  if (!ownerReply) { showToast('Please type a reply.', 'error'); return }

  try {
    await fetchAPI(`/enquiries/${id}/reply`, 'PUT', { ownerReply })
    showToast('Reply sent successfully.', 'success')
    loadOwnerEnquiries()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

window.updateEnquiry = async function (id, status) {
  try {
    await fetchAPI(`/enquiries/${id}/status`, 'PUT', { status })
    showToast(`Enquiry marked as ${status}.`, 'success')
    loadOwnerEnquiries()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

window.deleteOwnerEnquiry = async function (id) {
  const isConfirmed = await customConfirm('Are you sure you want to clear this enquiry?')
  if (!isConfirmed) return
  try {
    await fetchAPI(`/enquiries/${id}`, 'DELETE')
    showToast('Enquiry cleared.', 'success')
    loadOwnerEnquiries()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

window.clearAllOwnerEnquiries = async function () {
  const isConfirmed = await customConfirm('Are you sure you want to clear ALL enquiries? This cannot be undone.')
  if (!isConfirmed) return
  try {
    const res = await fetchAPI('/enquiries/owner')
    const enquiries = res.data
    await Promise.all(enquiries.map(eq => fetchAPI(`/enquiries/${eq._id}`, 'DELETE')))
    showToast(`All ${enquiries.length} enquiries cleared.`, 'success')
    loadOwnerEnquiries()
  } catch (err) {
    showToast('Failed to clear all enquiries: ' + err.message, 'error')
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
    showToast('Deactivation request submitted. Admin will review it.', 'success')
    closeDeactivateModal()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// ---- PLATFORM FEEDBACK LOGIC ----
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
                 style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--primary-light);">
            <div>
              <div style="font-weight:700;font-size:1.05rem;color:var(--text);">${f.userId?.name || 'User'}</div>
              <div class="badge-v2 badge-info" style="font-size:0.7rem;margin-top:0.2rem">${f.role}</div>
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
            <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem; border-left:4px solid var(--accent)">
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
