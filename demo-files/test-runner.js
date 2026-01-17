// ============================================
// AUTO-PLAY DETECTION
// Wrap setTimeout/setInterval to detect usage during load
// ============================================

(function() {
  const originalSetTimeout = window.setTimeout
  const originalSetInterval = window.setInterval
  let loadComplete = false

  window.__suspiciousTimersDetected = false

  window.setTimeout = function(fn, delay, ...args) {
    if (!loadComplete && delay > 0) {
      console.warn('setTimeout called during page load - potential auto-play violation')
      window.__suspiciousTimersDetected = true
    }
    return originalSetTimeout.call(window, fn, delay, ...args)
  }

  window.setInterval = function(fn, delay, ...args) {
    if (!loadComplete) {
      console.warn('setInterval called during page load - potential auto-play violation')
      window.__suspiciousTimersDetected = true
    }
    return originalSetInterval.call(window, fn, delay, ...args)
  }

  // Mark load as complete after DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Small delay to catch immediate post-load timers
      originalSetTimeout(() => { loadComplete = true }, 100)
    })
  } else {
    originalSetTimeout(() => { loadComplete = true }, 100)
  }
})()

// ============================================
// TEST RUNNER WITH AUTOMATED DEMO
// ============================================

const testRunner = {
  tests: [],
  exhibits: [],  // Array of { name, element, demonstrate: async () => void }
  results: [],

  registerTest(name, fn) {
    this.tests.push({ name, fn })
  },

  registerExhibit(name, element, demonstrateFn) {
    this.exhibits.push({ name, element, demonstrate: demonstrateFn })
  },

  async runAll() {
    const btn = document.getElementById('run-all-tests')
    btn.disabled = true

    // Phase 1: Run tests
    await this.runTests()

    // Check for integrity failures
    const integrityFailed = this.results.some(r =>
      r.name.startsWith('[Integrity]') && !r.passed
    )

    if (integrityFailed) {
      // Skip walkthrough - demo is broken
      const output = document.getElementById('test-output')
      output.innerHTML += `
        <div class="test-item demo-phase">
          <span class="test-icon fail">⚠</span>
          <span class="test-name">Walkthrough skipped - integrity tests failed</span>
        </div>
      `
      btn.disabled = false
      return
    }

    // Brief pause between phases
    await this.delay(500)

    // Phase 2: Demo walkthrough
    await this.runDemoWalkthrough()

    btn.disabled = false
  },

  async runTests() {
    const output = document.getElementById('test-output')
    const progressFill = document.getElementById('progress-fill')
    const progressText = document.getElementById('progress-text')
    const summary = document.getElementById('test-summary')

    output.innerHTML = ''
    summary.classList.add('hidden')
    progressFill.style.width = '0%'
    progressFill.className = 'test-progress-fill'
    this.results = []

    let passed = 0, failed = 0

    for (let i = 0; i < this.tests.length; i++) {
      const test = this.tests[i]
      const progress = ((i + 1) / this.tests.length) * 100

      progressFill.style.width = `${progress}%`
      progressText.textContent = `Running: ${test.name}`

      const isIntegrity = test.name.startsWith('[Integrity]')
      const categoryClass = isIntegrity ? 'integrity-test' : ''

      try {
        await test.fn()
        passed++
        this.results.push({ name: test.name, passed: true })
        output.innerHTML += `
          <div class="test-item" data-category="${isIntegrity ? 'integrity' : 'library'}">
            <span class="test-icon pass">✓</span>
            <span class="test-name ${categoryClass}">${this.escapeHtml(test.name)}</span>
          </div>
        `
      } catch (e) {
        failed++
        this.results.push({ name: test.name, passed: false, error: e.message })
        output.innerHTML += `
          <div class="test-item" data-category="${isIntegrity ? 'integrity' : 'library'}">
            <span class="test-icon fail">✗</span>
            <div>
              <div class="test-name ${categoryClass}">${this.escapeHtml(test.name)}</div>
              <div class="test-error">${this.escapeHtml(e.message)}</div>
            </div>
          </div>
        `
      }

      output.scrollTop = output.scrollHeight
      await this.delay(20)
    }

    progressFill.classList.add(failed === 0 ? 'success' : 'failure')
    progressText.textContent = `Tests complete: ${passed}/${this.tests.length} passed`

    summary.innerHTML = `
      <div class="test-summary-item passed"><span>✓</span> ${passed} passed</div>
      <div class="test-summary-item failed"><span>✗</span> ${failed} failed</div>
    `
    summary.classList.remove('hidden')
  },

  async runDemoWalkthrough() {
    const output = document.getElementById('test-output')
    const progressFill = document.getElementById('progress-fill')
    const progressText = document.getElementById('progress-text')

    // Reset progress bar for walkthrough phase
    progressFill.style.width = '0%'
    progressFill.className = 'test-progress-fill'

    output.innerHTML += `
      <div class="test-item demo-phase">
        <span class="test-icon">🎬</span>
        <span class="test-name">Starting automated demo walkthrough...</span>
      </div>
    `
    output.scrollTop = output.scrollHeight

    for (let i = 0; i < this.exhibits.length; i++) {
      const exhibit = this.exhibits[i]
      const progress = ((i + 1) / this.exhibits.length) * 100

      progressFill.style.width = `${progress}%`
      progressText.textContent = `Demonstrating: ${exhibit.name}`

      // Scroll exhibit into view
      exhibit.element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await this.delay(400)  // Let scroll settle

      // Log to console
      output.innerHTML += `
        <div class="test-item demo-step">
          <span class="test-icon">→</span>
          <span class="test-name">Demonstrating: ${this.escapeHtml(exhibit.name)}</span>
        </div>
      `
      output.scrollTop = output.scrollHeight

      // Execute the demonstration
      try {
        await exhibit.demonstrate()
      } catch (e) {
        output.innerHTML += `
          <div class="test-item">
            <span class="test-icon fail">!</span>
            <span class="test-error">Demo error: ${this.escapeHtml(e.message)}</span>
          </div>
        `
      }

      // Pause between exhibits for human readability
      await this.delay(1000)
    }

    progressFill.classList.add('success')
    progressText.textContent = 'Demo walkthrough complete'

    output.innerHTML += `
      <div class="test-item demo-phase">
        <span class="test-icon">✓</span>
        <span class="test-name">Demo walkthrough complete</span>
      </div>
    `
    output.scrollTop = output.scrollHeight

    // Scroll back to test runner
    await this.delay(500)
    document.getElementById('test-runner').scrollIntoView({ behavior: 'smooth', block: 'start' })
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}

// Export testRunner globally for Playwright tests
window.testRunner = testRunner

// Register button handlers
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('run-all-tests').addEventListener('click', () => testRunner.runAll())
  document.getElementById('reset-page').addEventListener('click', () => window.location.reload())
})
