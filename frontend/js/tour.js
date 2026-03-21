/* ============================================================
   HOSTELBUDDY — PREMIUM ONBOARDING TOUR ENGINE (tour.js)
   ============================================================ */

window.HostelTour = (function () {
  let steps = []
  let current = 0
  let tourKey = ''

  // ── DOM Refs ──────────────────────────────────────────────
  const $ = id => document.getElementById(id)

  // ── Inject DOM if not present ─────────────────────────────
  function injectDOM () {
    if ($('tourOverlay')) return
    document.body.insertAdjacentHTML('beforeend', `
      <!-- 4 dark panels forming the spotlight cutout -->
      <div id="tourOverlay">
        <div class="tour-panel" id="tpTop"></div>
        <div class="tour-panel" id="tpBottom"></div>
        <div class="tour-panel" id="tpLeft"></div>
        <div class="tour-panel" id="tpRight"></div>
      </div>
      <div id="tourSpotlight"></div>

      <!-- Tooltip card -->
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

      <!-- Replay button -->
      <button id="tourReplayBtn" onclick="HostelTour.restart()">
        🗺 Take Tour Again
      </button>

      <!-- Welcome modal -->
      <div id="tourWelcome" style="display:none;">
        <div id="tourWelcomeCard">
          <span id="tourWelcomeEmoji">🎉</span>
          <div id="tourWelcomeTitle">Welcome to <span>HostelBuddy!</span></div>
          <div id="tourWelcomeDesc" id="tourWelcomeDesc"></div>
          <div class="tour-welcome-btns">
            <button class="tour-welcome-start" onclick="HostelTour.startSteps()">🚀 Start Guided Tour</button>
            <button class="tour-welcome-skip"  onclick="HostelTour.skip()">I'll explore on my own</button>
          </div>
        </div>
      </div>
    `)
  }

  // ── Welcome Modal ─────────────────────────────────────────
  function showWelcome (desc) {
    $('tourWelcomeDesc').textContent = desc
    const w = $('tourWelcome')
    w.style.display = 'flex'
    requestAnimationFrame(() => w.classList.add('show'))
  }

  function hideWelcome () {
    const w = $('tourWelcome')
    w.classList.remove('show')
    setTimeout(() => w.style.display = 'none', 400)
  }

  // ── Spotlight ─────────────────────────────────────────────
  function updateSpotlight (el) {
    const pad = 10
    const r = el.getBoundingClientRect()
    const sp = $('tourSpotlight')
    const ov = $('tourOverlay')

    const top = r.top - pad
    const left = r.left - pad
    const width = r.width + pad * 2
    const height = r.height + pad * 2
    const bottom = r.bottom + pad
    const right = r.right + pad

    // Position spotlight cutout
    sp.style.top = top + 'px'
    sp.style.left = left + 'px'
    sp.style.width = width + 'px'
    sp.style.height = height + 'px'

    // Position dark panels around it
    $('tpTop').style.cssText = `top:0;left:0;right:0;height:${top}px`
    $('tpBottom').style.cssText = `top:${bottom}px;left:0;right:0;bottom:0`
    $('tpLeft').style.cssText = `top:${top}px;left:0;width:${left}px;height:${height}px`
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

  // ── Tooltip Positioning ────────────────────────────────────
  function positionTooltip (el) {
    const tt = $('tourTooltip')
    const pad = 18
    const r = el.getBoundingClientRect()
    const tw = tt.offsetWidth || 340
    const th = tt.offsetHeight || 220
    const vw = window.innerWidth
    const vh = window.innerHeight

    let top, left, arrow

    // Try below first
    if (r.bottom + th + pad < vh) {
      top = r.bottom + pad
      left = Math.min(r.left, vw - tw - 12)
      arrow = 'top'
    }
    // Try above
    else if (r.top - th - pad > 0) {
      top = r.top - th - pad
      left = Math.min(r.left, vw - tw - 12)
      arrow = 'bottom'
    }
    // Try right
    else if (r.right + tw + pad < vw) {
      top = Math.max(r.top, 12)
      left = r.right + pad
      arrow = 'left'
    }
    // Try left
    else if (r.left - tw - pad > 0) {
      top = Math.max(r.top, 12)
      left = r.left - tw - pad
      arrow = 'right'
    }
    // Fallback: center
    else {
      top = (vh - th) / 2
      left = (vw - tw) / 2
      arrow = 'center'
    }

    left = Math.max(12, left)
    top = Math.max(12, top)

    tt.style.top = top + 'px'
    tt.style.left = left + 'px'
    tt.setAttribute('data-arrow', arrow)
  }

  // ── Render step ───────────────────────────────────────────
  function renderStep (index) {
    const step = steps[index]
    const tt = $('tourTooltip')
    const total = steps.length

    // Find target element
    const el = step.selector ? document.querySelector(step.selector) : null

    // Fallback: if element not visible, scroll sidebar tab into view
    if (el && step.clickBefore) {
      document.querySelector(step.clickBefore)?.click?.()
      setTimeout(() => _renderStep(step, el, index, total), 300)
    } else {
      _renderStep(step, el, index, total)
    }
  }

  function _renderStep (step, el, index, total) {
    const tt = $('tourTooltip')

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
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => {
          updateSpotlight(el)
          positionTooltip(el)
          tt.classList.remove('entering')
        }, 200)
      } else {
        // No target — center the tooltip
        hideSpotlight()
        tt.style.top = '50%'
        tt.style.left = '50%'
        tt.style.transform = 'translate(-50%,-50%)'
        tt.setAttribute('data-arrow', 'center')
        tt.classList.remove('entering')
      }
    }, 280)
  }

  // ── Public API ─────────────────────────────────────────────
  function init (config) {
    tourKey = config.key || 'tour_done'
    steps = config.steps || []
    current = 0

    injectDOM()

    // Inject CSS if not already
    if (!document.querySelector('link[href*="tour.css"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'css/tour.css'
      document.head.appendChild(link)
    }

    // Show replay button always (visible after tour finishes or if already done)
    if (localStorage.getItem(tourKey)) {
      setTimeout(() => $('tourReplayBtn')?.classList.add('visible'), 1000)
      return
    }

    // First time — show welcome modal after small delay
    setTimeout(() => {
      showWelcome(config.welcomeDesc || 'Let us show you around in just a minute!')
    }, 1200)
  }

  function startSteps () {
    hideWelcome()
    current = 0
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

    // Confetti burst on finish
    if (current === steps.length - 1) launchConfetti()
  }

  function restart () {
    localStorage.removeItem(tourKey)
    $('tourReplayBtn')?.classList.remove('visible')
    current = 0
    startSteps()
  }

  // ── Mini confetti ─────────────────────────────────────────
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
  window.addEventListener('resize', () => {
    const tt = $('tourTooltip')
    if (!tt || tt.style.display === 'none') return
    const step = steps[current]
    const el = step?.selector ? document.querySelector(step.selector) : null
    if (el) { updateSpotlight(el); positionTooltip(el) }
  })

  return { init, startSteps, next, prev, skip, restart, finish }
})()
