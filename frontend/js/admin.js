document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Checks
  if (!checkAuth('Admin')) return

  // 2. Load Initial Data
  loadAnalytics()
})

// Tab Navigation Logic
function switchTab (tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'))
  document.querySelectorAll('.sidebar-item[id^="nav-"]').forEach(item => item.classList.remove('active'))

  document.getElementById(tabId).classList.add('active')
  const sidebarBtn = document.getElementById('nav-' + tabId)
  if (sidebarBtn) sidebarBtn.classList.add('active')

  if (tabId === 'analytics') loadAnalytics()
  if (tabId === 'verifications') loadVerifications()
  if (tabId === 'students') loadUsers('Student')
  if (tabId === 'owners') loadUsers('Owner')
  if (tabId === 'listings') loadListings()
  if (tabId === 'enquiries') loadEnquiries()
  if (tabId === 'reviews') loadReviews()
  if (tabId === 'system-requests') loadDeactivations()
  if (tabId === 'platform-feedback') loadPlatformFeedbacks()
  if (tabId === 'platform-updates') loadPlatformUpdates()
}

// Spinner helper
const spinner = '<div style="text-align:center;padding:2.5rem;color:var(--text-muted)"><div class="spinner-v2"></div><p style="margin-top:1rem;font-size:0.95rem;font-weight:600;">Loading...</p></div>'

// ---- ANALYTICS ----
async function loadAnalytics () {
  const container = document.getElementById('statsContainer')
  try {
    const res = await fetchAPI('/admin/analytics')
    const d = res.data

    const stats = [
      { label: 'Total Students', value: d.users.students, color: 'var(--primary)' },
      { label: 'Total Owners', value: d.users.owners, color: 'var(--violet)' },
      { label: 'Total Properties', value: d.hostels.total, color: 'var(--accent-dark)' },
      { label: 'Approved Properties', value: d.hostels.active, color: '#059669' },
      { label: 'Total Enquiries', value: d.enquiries, color: '#D97706' }
    ]

    container.innerHTML = stats.map(s => `
            <div class="stat-card-v2">
                <h3>${s.label}</h3>
                <h1 style="color:${s.color}">${s.value}</h1>
            </div>
        `).join('')

    // Removed gsap from stat-card-v2 to guarantee visibility
    
    // Render Most Viewed
    const popContainer = document.getElementById('mostViewedContainer')
    if (d.mostViewedHostels && d.mostViewedHostels.length > 0) {
      popContainer.innerHTML = d.mostViewedHostels.map((h, i) => `
                <div class="list-item">
                    <div style="display:flex; align-items:center; gap: 1.25rem;">
                        <span style="font-size: 1.5rem; font-weight: 900; color: var(--text-light); width: 40px; text-align: center;">#${i + 1}</span>
                        <div>
                            <h4>${h.name}</h4>
                            <p>Total Views: <strong style="color: var(--primary);">${h.views}</strong></p>
                        </div>
                    </div>
                </div>
            `).join('')
    } else {
      popContainer.innerHTML = '<div class="panel" style="text-align:center;color:var(--text-muted);padding:2rem;">No property data available.</div>'
    }
  } catch (err) {
    container.innerHTML = `<div class="panel" style="text-align:center;color:var(--danger)">Error loading analytics: ${err.message}</div>`
    document.getElementById('mostViewedContainer').innerHTML = ''
  }
}

// ---- VERIFICATIONS ----
async function loadVerifications () {
  const container = document.getElementById('verificationsContainer')
  container.innerHTML = spinner

  try {
    const res = await fetchAPI('/admin/verifications')
    const verifications = res.data

    if (verifications.length === 0) {
      container.innerHTML = '<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">✅ No pending verification requests.</div>'
      return
    }

    container.innerHTML = verifications.map(u => `
            <div class="list-item" style="border-left-color:var(--success)">
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.4rem">
                        <h4>${u.name}</h4>
                        <span class="badge-v2 badge-info">Owner</span>
                    </div>
                    <p>✉️ ${u.email} &nbsp;|&nbsp; 📞 ${u.phone}</p>
                    <div class="info-box">
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">
                            <div><small>Property Name</small><strong>${u.hostelName || 'N/A'}</strong></div>
                            <div><small>Aadhaar Number</small><strong style="font-family:monospace">${u.aadhaarNumber || 'N/A'}</strong></div>
                            <div style="grid-column:1/-1"><small>Location</small><strong>📍 ${u.address || ''}, ${u.city || ''}</strong></div>
                        </div>
                    </div>
                </div>
                <div class="action-btns">
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
        `).join('')
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger)">Failed to load verifications.</p>'
  }
}

window.handleVerification = async function (id, status) {
  console.log('handleVerification triggered for:', id, status);
  const isConfirmed = await customConfirm(`Are you sure you want to mark this request as ${status}?`);
  if (!isConfirmed) {
    console.log('Verification cancelled by user');
    return;
  }
  console.log('Verification confirmed, sending API request...');
  try {
    await fetchAPI(`/admin/verifications/${id}`, 'PUT', { status })
    showToast(`Request marked as ${status}.`, 'success')
    loadVerifications()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// ---- USERS (STUDENTS/OWNERS) ----
async function loadUsers (role) {
  const container = document.getElementById(role.toLowerCase() + 'sContainer')
  container.innerHTML = spinner

  try {
    const res = await fetchAPI(`/admin/users?role=${role}`)
    const users = res.data

    if (users.length === 0) {
      container.innerHTML = `<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">No ${role.toLowerCase()}s found.</div>`
      return
    }

    container.innerHTML = users.map(u => `
            <div class="list-item">
                <div style="display:flex;align-items:center;gap:1.25rem;flex:1">
                    <img src="${u.profilePhoto || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png'}"
                        style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2.5px solid var(--border);flex-shrink:0" loading="lazy">
                    <div>
                        <h4 style="display:flex;align-items:center;gap:.6rem">
                            ${u.name}
                            ${u.isVerified ? '<span class="badge-v2 badge-approved" style="font-size:.7rem">✔ Verified</span>' : ''}
                        </h4>
                        <p>✉️ ${u.email} &nbsp;|&nbsp; 📞 ${u.phone}</p>
                        <small>Joined: ${new Date(u.createdAt).toLocaleDateString()}</small>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger)" onclick="deleteUser('${u._id}', '${role}')">Remove</button>
            </div>
        `).join('')
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger)">Failed to load users.</p>'
  }
}

window.deleteUser = async function (id, role) {
  const isConfirmed = await customConfirm(`Are you sure you want to completely remove this ${role}? This is irreversible.`)
  if (!isConfirmed) return
  try {
    await fetchAPI(`/admin/users/${id}`, 'DELETE')
    showToast('User removed successfully.', 'success')
    loadUsers(role)
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// ---- LISTINGS ----
async function loadListings () {
  const container = document.getElementById('hostelsContainer')
  if (!container) return
  container.innerHTML = spinner

  try {
    const res = await fetchAPI('/admin/hostels')
    const hostels = res.data

    if (hostels.length === 0) {
      container.innerHTML = '<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">No listings found.</div>'
      return
    }

    container.innerHTML = hostels.map(h => `
            <div class="list-item" style="border-left-color:${h.isApproved ? 'var(--success)' : '#F59E0B'}">
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.4rem">
                        <h4>${h.name}</h4>
                        ${h.isApproved
                            ? '<span class="badge-v2 badge-approved">✅ Approved</span>'
                            : '<span class="badge-v2 badge-pending">⏳ Pending</span>'
                        }
                    </div>
                    <p>📍 ${h.address}, ${h.city}</p>
                    <div style="display:flex;gap:1.5rem;font-size:0.92rem;color:var(--text-muted);flex-wrap:wrap;margin-top:0.6rem;">
                        <span><strong style="color:var(--text)">Owner:</strong> ${h.ownerId ? h.ownerId.name : 'Unknown'}</span>
                        <span><strong style="color:var(--text)">Contact:</strong> 📞 ${h.ownerId ? h.ownerId.phone : 'N/A'}</span>
                        <span><strong style="color:var(--text)">Views:</strong> 👁️ ${h.views || 0}</span>
                    </div>
                    ${h.rules
? `
                    <div class="info-box" style="background: rgba(249, 115, 22, 0.05); border-color: rgba(249, 115, 22, 0.2);">
                        <small style="color: var(--accent);">Hostel Rules</small>
                        <div style="font-size:0.92rem;color:var(--text-2);white-space:pre-wrap;margin-top:0.4rem;">${h.rules}</div>
                    </div>
                    `
: ''}
                </div>
                <div class="action-btns">
                    ${h.isApproved
                        ? `<button class="btn btn-sm btn-outline" style="border-color:#F59E0B;color:#B45309" onclick="toggleApproval('${h._id}', false)">Revoke</button>`
                        : `<button class="btn btn-sm btn-outline" style="border-color:var(--success);color:#059669" onclick="toggleApproval('${h._id}', true)">Approve ✔</button>`
                    }
                    <button class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger)" onclick="deleteAdminHostel('${h._id}')">Delete</button>
                </div>
            </div>
        `).join('')
  } catch (err) {
    console.error('loadListings Error:', err)
    container.innerHTML = '<p style="color:var(--danger)">Failed to load listings.</p>'
  }
}

window.toggleApproval = async function (id, isApproved) {
  try {
    await fetchAPI(`/admin/hostels/${id}/approve`, 'PUT', { isApproved })
    showToast(`Listing ${isApproved ? 'approved' : 'revoked'}.`, 'success')
    loadListings()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

window.deleteAdminHostel = async function (id) {
  const isConfirmed = await customConfirm('Are you sure you want to delete this listing?')
  if (!isConfirmed) return
  try {
    await fetchAPI(`/hostels/${id}`, 'DELETE')
    showToast('Listing deleted successfully.', 'success')
    loadListings()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// ---- ENQUIRIES MANAGEMENT ----
async function loadEnquiries () {
  const container = document.getElementById('enquiriesContainer')
  if (!container) return
  container.innerHTML = spinner

  try {
    const res = await fetchAPI('/admin/enquiries')
    const eq = res.data

    if (eq.length === 0) {
      container.innerHTML = '<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">No enquiries found in the system.</div>'
      return
    }

    container.innerHTML = eq.map(e => `
            <div class="list-item" style="flex-direction:column;align-items:stretch;border-left-color:var(--primary)">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem">
                    <div>
                        <h4>Hostel: <span style="color:var(--primary)">${e.hostelId ? e.hostelId.name : 'Unknown Property'}</span></h4>
                        <p><strong>From:</strong> ${e.studentId ? e.studentId.name : 'Unknown'} (${e.studentId ? e.studentId.phone : 'No phone'})</p>
                        <p><strong>To Owner:</strong> ${e.ownerId ? e.ownerId.name : 'Unknown Owner'} (${e.ownerId ? e.ownerId.phone : 'No phone'})</p>
                    </div>
                    <span class="badge-v2 ${e.status === 'Pending' ? 'badge-pending' : 'badge-approved'}">${e.status}</span>
                </div>

                <div class="msg-bubble" style="margin-top:1rem">"${e.message}"</div>

                ${e.adminResponse
? `
                    <div class="msg-bubble msg-bubble-success" style="margin-top:0.75rem">
                        <p style="font-size:0.8rem;font-weight:700;color:var(--success);margin-bottom:0.4rem;text-transform:uppercase;">Platform Response:</p>
                        <p>${e.adminResponse}</p>
                    </div>
                `
: `
                    <div style="display:flex;gap:0.75rem;margin-top:1rem;flex-wrap:wrap;">
                        <input type="text" id="replyInput_${e._id}" class="form-input" placeholder="Type official response..." style="flex:1;min-width:200px;">
                        <button class="btn btn-primary btn-sm" onclick="replyEnquiry('${e._id}')">Submit Reply</button>
                    </div>
                `}
                <div style="font-size:0.8rem;color:var(--text-light);text-align:right;margin-top:0.75rem">
                    Submitted: ${new Date(e.createdAt).toLocaleDateString()}
                </div>
            </div>
        `).join('')
  } catch (err) {
    console.error('loadEnquiries Error:', err)
    container.innerHTML = '<p style="color:var(--danger)">Failed to load enquiries.</p>'
  }
}

window.replyEnquiry = async function (enquiryId) {
  const replyInput = document.getElementById(`replyInput_${enquiryId}`)
  const responseText = replyInput ? replyInput.value.trim() : ''

  if (!responseText) { showToast('Please type a response before submitting.', 'error'); return }

  try {
    await fetchAPI(`/admin/enquiries/${enquiryId}/respond`, 'PUT', { responseText })
    showToast('Official response submitted successfully!', 'success')
    loadEnquiries()
  } catch (err) {
    showToast('Error submitting response: ' + err.message, 'error')
  }
}

// ---- REVIEWS MANAGEMENT ----
async function loadReviews () {
  const container = document.getElementById('reviewsContainer')
  if (!container) return
  container.innerHTML = spinner

  try {
    const res = await fetchAPI('/reviews')
    const revs = res.data

    if (revs.length === 0) {
      container.innerHTML = '<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">No reviews submitted yet.</div>'
      return
    }

    container.innerHTML = revs.map(r => `
            <div class="list-item" style="flex-direction:column;align-items:stretch;border-left-color:var(--accent)">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1.5rem">
                    <div>
                        <h4>Hostel: <span style="color:var(--accent)">${r.hostelId ? r.hostelId.name : 'Unknown Property'}</span></h4>
                        <p><strong>From:</strong> ${r.studentId ? r.studentId.name : 'Unknown Student'}</p>
                        <div style="color: #F59E0B; font-size: 1.1rem; margin-top: 0.5rem; display:flex; gap:2px;">
                            ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} <span style="color:var(--text-muted);font-size:.85rem;margin-left:.5rem;font-weight:600;">${r.rating}/5</span>
                        </div>
                    </div>
                </div>

                <div class="msg-bubble" style="margin-top:1rem">"${r.comment}"</div>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem;flex-wrap:wrap;gap:1rem;">
                    <div style="font-size:0.8rem;color:var(--text-light)">
                        Submitted: ${new Date(r.createdAt).toLocaleDateString()}
                    </div>
                    <button class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger)" onclick="deleteReview('${r._id}')">Delete Review</button>
                </div>
            </div>
        `).join('')
  } catch (err) {
    console.error('loadReviews Error:', err)
    container.innerHTML = '<p style="color:var(--danger)">Failed to load reviews.</p>'
  }
}

window.deleteReview = async function (id) {
  const isConfirmed = await customConfirm('Are you sure you want to delete this review FOREVER?')
  if (!isConfirmed) return
  try {
    await fetchAPI(`/reviews/${id}`, 'DELETE')
    showToast('Review deleted successfully.', 'success')
    loadReviews()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// ---- DEACTIVATION MANAGEMENT ----
async function loadDeactivations () {
  const container = document.getElementById('deactivationsContainer')
  container.innerHTML = spinner

  try {
    const res = await fetchAPI('/admin/deactivations')
    const requests = res.data

    if (requests.length === 0) {
      container.innerHTML = '<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">✅ No pending deactivation requests.</div>'
      return
    }

    container.innerHTML = requests.map(r => `
            <div class="list-item" style="border-left-color:var(--danger)">
                <div style="flex:1">
                    <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.4rem">
                        <h4>${r.name}</h4>
                        <span class="badge-v2 badge-info">${r.role}</span>
                    </div>
                    <p>✉️ ${r.email} &nbsp;|&nbsp; 📞 ${r.phone}</p>
                    <div class="msg-bubble msg-bubble-warn" style="margin-top:1rem">
                        <p style="font-size:0.8rem;font-weight:700;color:var(--accent);margin-bottom:0.4rem;text-transform:uppercase">Reason for Deactivation:</p>
                        <p>${r.deactivationReason}</p>
                    </div>
                </div>
                <div class="action-btns">
                    <button class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger)" onclick="handleDeactivation('${r._id}', 'approve')">Approve & Delete</button>
                    <button class="btn btn-outline btn-sm" onclick="handleDeactivation('${r._id}', 'reject')">Reject</button>
                </div>
            </div>
        `).join('')
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger)">Failed to load deactivation requests.</p>'
  }
}

window.handleDeactivation = async function (id, action) {
  const isConfirmed = await customConfirm(`Are you sure you want to ${action} this deactivation request?`)
  if (!isConfirmed) return

  try {
    await fetchAPI(`/admin/deactivations/${id}`, 'PUT', { action })
    showToast(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`, 'success')
    loadDeactivations()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// ---- PLATFORM FEEDBACK MANAGEMENT ----
async function loadPlatformFeedbacks() {
  const container = document.getElementById('platformFeedbacksContainer');
  if (!container) return;
  container.innerHTML = spinner;

  try {
    const res = await fetchAPI('/feedback/admin');
    const feedbacks = res.data;

    if (feedbacks.length === 0) {
      container.innerHTML = '<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">No platform feedbacks submitted yet.</div>';
      return;
    }

    container.innerHTML = feedbacks.map(f => `
      <div class="list-item" style="flex-direction:column;align-items:stretch;border-left-color:${f.isApproved ? 'var(--success)' : '#F59E0B'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1.5rem">
              <div>
                  <h4 style="display:flex;align-items:center;gap:.75rem">
                      From: <span style="color:var(--primary)">${f.userId ? f.userId.name : 'Unknown User'}</span> 
                      <span class="badge-v2 badge-info" style="font-size:0.7rem">${f.role}</span>
                  </h4>
                  <div style="color: #F59E0B; font-size: 1.1rem; margin-top: 0.5rem; display:flex; gap:2px;">
                      ${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)} <span style="color:var(--text-muted);font-size:.85rem;margin-left:.5rem;font-weight:600;">${f.rating}/5</span>
                  </div>
              </div>
              <span class="badge-v2 ${f.isApproved ? 'badge-approved' : 'badge-pending'}">
                  ${f.isApproved ? '✅ Approved Publicly' : '⏳ Pending Review'}
              </span>
          </div>

          <div class="msg-bubble" style="margin-top:1rem">"${f.comment}"</div>

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem;flex-wrap:wrap;gap:1rem;">
              <div style="font-size:0.8rem;color:var(--text-light)">
                  Submitted: ${new Date(f.createdAt).toLocaleDateString()}
              </div>
              <div class="action-btns">
                  ${f.isApproved
                      ? `<button class="btn btn-sm btn-outline" style="border-color:#F59E0B;color:#B45309" onclick="togglePlatformFeedbackStatus('${f._id}', false)">Hide/Revoke</button>`
                      : `<button class="btn btn-sm btn-outline" style="border-color:var(--success);color:#059669" onclick="togglePlatformFeedbackStatus('${f._id}', true)">Approve Publicly</button>`
                  }
                  <button class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger)" onclick="deletePlatformFeedback('${f._id}')">Delete</button>
              </div>
          </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('loadPlatformFeedbacks Error:', err);
    container.innerHTML = '<p style="color:var(--danger)">Failed to load platform feedbacks.</p>';
  }
}

window.togglePlatformFeedbackStatus = async function (id, isApproved) {
  try {
    await fetchAPI(`/feedback/admin/${id}`, 'PUT', { isApproved });
    showToast(`Feedback ${isApproved ? 'approved for public display' : 'hidden from public'}.`, 'success');
    loadPlatformFeedbacks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.deletePlatformFeedback = async function (id) {
  const isConfirmed = await customConfirm('Are you sure you want to delete this feedback forever?');
  if (!isConfirmed) return;
  try {
    await fetchAPI(`/feedback/admin/${id}`, 'DELETE');
    showToast('Feedback deleted successfully.', 'success');
    loadPlatformFeedbacks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---- NOTIFICATION MODAL ----
let currentNotifyUserId = null

window.openNotifyModal = function (userId) {
  currentNotifyUserId = userId
  document.getElementById('notifyModal').classList.add('active')
}

window.closeNotifyModal = function () {
  currentNotifyUserId = null
  document.getElementById('notifyModal').classList.remove('active')
  document.getElementById('notifyMessage').value = ''
}

window.submitNotification = async function () {
  const message = document.getElementById('notifyMessage').value.trim()
  const type = document.getElementById('notifyType').value
  if (!message) { showToast('Please enter a message.', 'error'); return }
  try {
    await fetchAPI(`/admin/notify-owner/${currentNotifyUserId}`, 'POST', { message, type })
    showToast('Notification sent to owner successfully!', 'success')
    closeNotifyModal()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

// ---- PLATFORM UPDATES MANAGEMENT ----
async function loadPlatformUpdates() {
  const container = document.getElementById('platformUpdatesListContainer');
  if (!container) return;
  container.innerHTML = spinner;

  try {
    const res = await fetchAPI('/admin/updates');
    const updates = res.data;

    if (updates.length === 0) {
      container.innerHTML = '<div class="panel" style="text-align:center;color:var(--text-muted);padding:2.5rem">No platform updates created yet.</div>';
      return;
    }

    container.innerHTML = updates.map(u => `
      <div class="list-item" style="flex-direction:column;align-items:stretch;border-left-color:var(--primary)">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1.5rem">
              <h4 style="font-size:1.05rem;font-weight:700;">${u.title}</h4>
              <span class="badge-v2 badge-info" style="font-size:0.75rem">Target: ${u.targetRole}</span>
          </div>

          <div class="msg-bubble" style="margin-top:1rem;background:var(--surface-2);white-space:pre-wrap;">${u.message}</div>

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem;flex-wrap:wrap;gap:1rem;">
              <div style="font-size:0.8rem;color:var(--text-light)">
                  Published: ${new Date(u.createdAt).toLocaleString()}
              </div>
              <button class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger)" onclick="deletePlatformUpdate('${u._id}')">Delete Update</button>
          </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('loadPlatformUpdates Error:', err);
    container.innerHTML = '<p style="color:var(--danger)">Failed to load platform updates.</p>';
  }
}

window.deletePlatformUpdate = async function (id) {
  const isConfirmed = await customConfirm('Are you sure you want to delete this update? It will be removed from all user dashboards.');
  if (!isConfirmed) return;
  try {
    await fetchAPI(`/admin/updates/${id}`, 'DELETE');
    showToast('Update deleted successfully.', 'success');
    loadPlatformUpdates();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

document.addEventListener('DOMContentLoaded', () => {
    const createUpdateForm = document.getElementById('createUpdateForm');
    if (createUpdateForm) {
        createUpdateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = createUpdateForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Broadcasting...';
            btn.disabled = true;

            const title = document.getElementById('updateTitle').value;
            const message = document.getElementById('updateMessage').value;
            const targetRole = document.getElementById('updateRole').value;

            try {
                await fetchAPI('/admin/updates', 'POST', { title, message, targetRole });
                showToast('Platform update broadcast successfully!', 'success');
                createUpdateForm.reset();
                loadPlatformUpdates();
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }
});
