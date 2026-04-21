/* ============================================================
   HOSTELBUDDY — PREMIUM ONBOARDING TOUR ENGINE v2.0
   Fixed: positioning, sidebar scroll, dark mode, restart,
          keyboard ESC, mobile safety, edge clipping
   ============================================================ */

window.HostelTour = (function () {
  let steps = []
  let current = 0
  let tourKey = ''
  let _firstTab = '' // remember which tab was active before tour

  const $ = id => document.getElementById(id)

  // ── Inject DOM ──────────────────────────────────────────
  function injectDOM () {
    if ($('tourOverlay')) return
    document.body.insertAdjacentHTML('beforeend', `
      <div id="tourOverlay">
        <div class="tour-panel" id="tpTop"></div>
        <div class="tour-panel" id="tpBottom"></div>
        <div class="tour-panel" id="tpLeft"></div>
        <div class="tour-panel" id="tpRight"></div>
      </div>
      <div id="tourSpotlight"></div>

      <div id="tourTooltip" style="display:none;">
        <div id="tourBadge"><span id="tourIcon"></span> GUIDED TOUR</div>
        <div id="tourTitle"></div>
        <div id="tourDesc"></div>
        <div id="tourDots"></div>
        <div id="tourButtons">
          <button class="tour-btn-skip"  onclick="HostelTour.skip()">Skip Tour</button>
          <button class="tour-btn-back"  id="tourBackBtn" onclick="HostelTour.prev()">← Back</button>
          <button class="tour-btn-next"  id="tourNextBtn" onclick="HostelTour.next()">
            <span id="tourNextLabel">Next</span> <span id="tourNextArrow">→</span>
          </button>
        </div>
        <div id="tourCounter"></div>
      </div>

      <button id="tourReplayBtn" onclick="HostelTour.restart()">
        🗺 Take Tour Again
      </button>

      <div id="tourWelcome" style="display:none;">
        <div id="tourWelcomeCard">
          <span id="tourWelcomeEmoji">🎉</span>
          <div id="tourWelcomeTitle">Welcome to <span>HostelBuddy!</span></div>
          <div id="tourWelcomeDesc"></div>
          <div class="tour-welcome-btns">
            <button class="tour-welcome-start" onclick="HostelTour.startSteps()">🚀 Start Guided Tour</button>
            <button class="tour-welcome-skip"  onclick="HostelTour.skip()">I'll explore on my own</button>
          </div>
        </div>
      </div>
    `)

    // ESC key to skip tour
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const tt = $('tourTooltip')
        const tw = $('tourWelcome')
        if ((tt && tt.style.display !== 'none') || (tw && tw.style.display !== 'none')) {
          HostelTour.skip()
        }
      }
    })
  }

  // ── Welcome Modal ──────────────────────────────────────
  function showWelcome (desc) {
    $('tourWelcomeDesc').textContent = desc
    const w = $('tourWelcome')
    w.style.display = 'flex'
    requestAnimationFrame(() => w.classList.add('show'))
  }

  function hideWelcome () {
    const w = $('tourWelcome')
    if (!w) return
    w.classList.remove('show')
    setTimeout(() => w.style.display = 'none', 400)
  }

  // ── Spotlight ──────────────────────────────────────────
  function updateSpotlight (el) {
    const pad = 10
    const r = el.getBoundingClientRect()
    const sp = $('tourSpotlight')
    const ov = $('tourOverlay')
    if (!sp || !ov) return

    const top = r.top - pad
    const left = r.left - pad
    const width = r.width + pad * 2
    const height = r.height + pad * 2
    const bottom = r.bottom + pad
    const right = r.right + pad

    sp.style.top = top + 'px'
    sp.style.left = left + 'px'
    sp.style.width = width + 'px'
    sp.style.height = height + 'px'

    $('tpTop').style.cssText = `top:0;left:0;right:0;height:${Math.max(0, top)}px`
    $('tpBottom').style.cssText = `top:${bottom}px;left:0;right:0;bottom:0`
    $('tpLeft').style.cssText = `top:${top}px;left:0;width:${Math.max(0, left)}px;height:${height}px`
    $('tpRight').style.cssText = `top:${top}px;left:${right}px;right:0;height:${height}px`

    ov.classList.add('active')
    sp.style.display = 'block'
  }

  function hideSpotlight () {
    const ov = $('tourOverlay')
    const sp = $('tourSpotlight')
    if (ov) ov.classList.remove('active')
    if (sp) sp.style.display = 'none';
    ['tpTop', 'tpBottom', 'tpLeft', 'tpRight'].forEach(id => {
      const el = $(id)
      if (el) el.style.cssText = ''
    })
  }

  // ── Tooltip Positioning (improved edge-safe) ───────────
  function positionTooltip (el) {
    const tt = $('tourTooltip')
    if (!tt) return
    const pad = 16
    const r = el.getBoundingClientRect()
    const tw = tt.offsetWidth || 340
    const th = tt.offsetHeight || 240
    const vw = window.innerWidth
    const vh = window.innerHeight

    let top, left, arrow

    // Reset any centering transform
    tt.style.transform = ''

    // Try to the right of the element first (best for sidebar items)
    if (r.right + tw + pad < vw && r.top + th < vh) {
      top = Math.max(12, r.top)
      left = r.right + pad
      arrow = 'left'
    }
    // Try below
    else if (r.bottom + th + pad < vh) {
      top = r.bottom + pad
      left = Math.max(12, Math.min(r.left, vw - tw - 16))
      arrow = 'top'
    }
    // Try above
    else if (r.top - th - pad > 0) {
      top = r.top - th - pad
      left = Math.max(12, Math.min(r.left, vw - tw - 16))
      arrow = 'bottom'
    }
    // Try to the left
    else if (r.left - tw - pad > 0) {
      top = Math.max(12, r.top)
      left = r.left - tw - pad
      arrow = 'right'
    }
    // Fallback: center of screen
    else {
      top = Math.max(16, (vh - th) / 2)
      left = Math.max(16, (vw - tw) / 2)
      arrow = 'center'
    }

    // Safety clamp
    left = Math.max(12, Math.min(left, vw - tw - 12))
    top = Math.max(12, Math.min(top, vh - th - 12))

    tt.style.top = top + 'px'
    tt.style.left = left + 'px'
    tt.setAttribute('data-arrow', arrow)
  }

  // ── Render step ────────────────────────────────────────
  function renderStep (index) {
    const step = steps[index]
    const tt = $('tourTooltip')
    if (!tt) return

    // If there's a clickBefore action (switch tab), do it first
    if (step.clickBefore) {
      const clickTarget = document.querySelector(step.clickBefore)
      if (clickTarget) clickTarget.click()
    }

    // Wait for tab switch animation + re-render to finish
    const delay = step.clickBefore ? 450 : 50
    setTimeout(() => _renderStep(step, index), delay)
  }

  function _renderStep (step, index) {
    const tt = $('tourTooltip')
    const total = steps.length
    if (!tt) return

    // Find target element fresh (after tab switch)
    const el = step.selector ? document.querySelector(step.selector) : null

    // Animate out
    tt.classList.add('entering')

    setTimeout(() => {
      // Fill content
      $('tourIcon').textContent = step.icon || '✨'
      $('tourTitle').textContent = step.title || ''
      $('tourDesc').textContent = step.desc || ''
      $('tourCounter').textContent = `Step ${index + 1} of ${total}`

      // Progress dots
      $('tourDots').innerHTML = Array.from({ length: total }, (_, i) =>
        `<div class="tour-dot ${i === index ? 'active' : ''}"></div>`
      ).join('')

      // Back button visibility
      $('tourBackBtn').style.display = index === 0 ? 'none' : ''

      // Next button label
      const isLast = index === total - 1
      $('tourNextLabel').textContent = isLast ? 'Finish' : 'Next'
      $('tourNextArrow').textContent = isLast ? '🎉' : '→'

      // Show tooltip
      tt.style.display = 'block'

      // Spotlight + position
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        setTimeout(() => {
          updateSpotlight(el)
          positionTooltip(el)
          tt.classList.remove('entering')
        }, 250)
      } else {
        // No target — center the tooltip
        hideSpotlight()
        const vw = window.innerWidth
        const vh = window.innerHeight
        const tw = tt.offsetWidth || 340
        const th = tt.offsetHeight || 240
        tt.style.top = Math.max(16, (vh - th) / 2) + 'px'
        tt.style.left = Math.max(16, (vw - tw) / 2) + 'px'
        tt.style.transform = ''
        tt.setAttribute('data-arrow', 'center')
        tt.classList.remove('entering')
      }
    }, 200)
  }

  // ── Public API ─────────────────────────────────────────
  function init (config) {
    tourKey = config.key || 'tour_done'
    steps = config.steps || []
    current = 0

    injectDOM()

    // Show replay button always after tour finishes
    if (localStorage.getItem(tourKey)) {
      setTimeout(() => $('tourReplayBtn')?.classList.add('visible'), 1000)
      return
    }

    // First time — show welcome modal
    setTimeout(() => {
      showWelcome(config.welcomeDesc || 'Let us show you around in just a minute!')
    }, 1200)
  }

  function startSteps () {
    hideWelcome()
    current = 0

    // Remember current active tab so we can restore
    const active = document.querySelector('.tab-content.active')
    _firstTab = active ? active.id : ''

    renderStep(current)
  }

  function next () {
    if (current < steps.length - 1) {
      current++
      renderStep(current)
    } else {
      finish()
    }
  }

  function prev () {
    if (current > 0) {
      current--
      renderStep(current)
    }
  }

  function skip () {
    hideWelcome()
    finish()
  }

  function finish () {
    localStorage.setItem(tourKey, 'true')
    hideSpotlight()
    const tt = $('tourTooltip')
    if (tt) { tt.classList.add('entering'); setTimeout(() => tt.style.display = 'none', 320) }
    const ov = $('tourOverlay')
    if (ov) ov.classList.remove('active')
    setTimeout(() => $('tourReplayBtn')?.classList.add('visible'), 600)

    // Return to dashboard/discover tab after tour finishes
    if (_firstTab && typeof window.switchTab === 'function') {
      window.switchTab(_firstTab)
    }

    // Confetti on finish
    if (current === steps.length - 1) launchConfetti()
  }

  function restart () {
    localStorage.removeItem(tourKey)
    $('tourReplayBtn')?.classList.remove('visible')

    // Reset back to first tab
    const firstStep = steps[0]
    if (firstStep && firstStep.clickBefore) {
      const el = document.querySelector(firstStep.clickBefore)
      if (el) el.click()
    } else if (_firstTab && typeof window.switchTab === 'function') {
      window.switchTab(_firstTab)
    } else if (typeof window.switchTab === 'function') {
      // Fallback: try dashboard or discover
      const dashTab = document.getElementById('dashboard') || document.getElementById('discover')
      if (dashTab) window.switchTab(dashTab.id)
    }

    current = 0
    setTimeout(() => renderStep(current), 300)
  }

  // ── Mini confetti ──────────────────────────────────────
  function launchConfetti () {
    const colors = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#ec4899']
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div')
      el.style.cssText = `
        position:fixed; z-index:9999; pointer-events:none;
        width:${5 + Math.random() * 6}px; height:${5 + Math.random() * 6}px;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        left:${20 + Math.random() * 60}%;
        top:${20 + Math.random() * 30}%;
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        opacity:1;
      `
      document.body.appendChild(el)
      const dx = (Math.random() - 0.5) * 400
      const dy = -(100 + Math.random() * 300)
      const rot = Math.random() * 720
      el.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px,${dy + 400}px) rotate(${rot}deg)`, opacity: 0 }
      ], { duration: 1200 + Math.random() * 800, easing: 'cubic-bezier(.25,.46,.45,.94)', fill: 'forwards' })
      setTimeout(() => el.remove(), 2200)
    }
  }

  // Handle window resize — reposition
  let _resizeTimer
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer)
    _resizeTimer = setTimeout(() => {
      const tt = $('tourTooltip')
      if (!tt || tt.style.display === 'none') return
      const step = steps[current]
      const el = step?.selector ? document.querySelector(step.selector) : null
      if (el) { updateSpotlight(el); positionTooltip(el) }
    }, 150)
  })

  return { init, startSteps, next, prev, skip, restart, finish }
})()
