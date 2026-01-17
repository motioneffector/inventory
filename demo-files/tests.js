// Import library to ensure it is available (also set by demo.js)
import * as Library from '../dist/index.js'
if (!window.Library) window.Library = Library

// ============================================
// DEMO INTEGRITY TESTS
// These tests verify the demo itself is correctly structured.
// They are IDENTICAL across all @motioneffector demos.
// Do not modify, skip, or weaken these tests.
// ============================================

function registerIntegrityTests() {
  // ─────────────────────────────────────────────
  // STRUCTURAL INTEGRITY
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Library is loaded', () => {
    if (typeof window.Library === 'undefined') {
      throw new Error('window.Library is undefined - library not loaded')
    }
  })

  testRunner.registerTest('[Integrity] Library has exports', () => {
    const exports = Object.keys(window.Library)
    if (exports.length === 0) {
      throw new Error('window.Library has no exports')
    }
  })

  testRunner.registerTest('[Integrity] Test runner exists', () => {
    const runner = document.getElementById('test-runner')
    if (!runner) {
      throw new Error('No element with id="test-runner"')
    }
  })

  testRunner.registerTest('[Integrity] Test runner is first section after header', () => {
    const main = document.querySelector('main')
    if (!main) {
      throw new Error('No <main> element found')
    }
    const firstSection = main.querySelector('section')
    if (!firstSection || firstSection.id !== 'test-runner') {
      throw new Error('Test runner must be the first <section> inside <main>')
    }
  })

  testRunner.registerTest('[Integrity] Run All Tests button exists with correct format', () => {
    const btn = document.getElementById('run-all-tests')
    if (!btn) {
      throw new Error('No button with id="run-all-tests"')
    }
    const text = btn.textContent.trim()
    if (!text.includes('Run All Tests')) {
      throw new Error(`Button text must include "Run All Tests", got: "${text}"`)
    }
    const icon = btn.querySelector('.btn-icon')
    if (!icon || !icon.textContent.includes('▶')) {
      throw new Error('Button must have play icon (▶) in .btn-icon element')
    }
  })

  testRunner.registerTest('[Integrity] At least one exhibit exists', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    if (exhibits.length === 0) {
      throw new Error('No elements with class="exhibit"')
    }
  })

  testRunner.registerTest('[Integrity] All exhibits have unique IDs', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    const ids = new Set()
    exhibits.forEach(ex => {
      if (!ex.id) {
        throw new Error('Exhibit missing id attribute')
      }
      if (ids.has(ex.id)) {
        throw new Error(`Duplicate exhibit id: ${ex.id}`)
      }
      ids.add(ex.id)
    })
  })

  testRunner.registerTest('[Integrity] All exhibits registered for walkthrough', () => {
    const exhibitElements = document.querySelectorAll('.exhibit')
    const registeredCount = testRunner.exhibits.length
    if (registeredCount < exhibitElements.length) {
      throw new Error(
        `Only ${registeredCount} exhibits registered for walkthrough, ` +
        `but ${exhibitElements.length} .exhibit elements exist`
      )
    }
  })

  testRunner.registerTest('[Integrity] CSS loaded from demo-files/', () => {
    const links = document.querySelectorAll('link[rel="stylesheet"]')
    const hasExternal = Array.from(links).some(link =>
      link.href.includes('demo-files/')
    )
    if (!hasExternal) {
      throw new Error('No stylesheet loaded from demo-files/ directory')
    }
  })

  testRunner.registerTest('[Integrity] No inline style tags', () => {
    const styles = document.querySelectorAll('style')
    if (styles.length > 0) {
      throw new Error(`Found ${styles.length} inline <style> tags - extract to demo-files/demo.css`)
    }
  })

  testRunner.registerTest('[Integrity] No inline onclick handlers', () => {
    const withOnclick = document.querySelectorAll('[onclick]')
    if (withOnclick.length > 0) {
      throw new Error(`Found ${withOnclick.length} elements with onclick - use addEventListener`)
    }
  })

  // ─────────────────────────────────────────────
  // NO AUTO-PLAY VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Output areas are empty on load', () => {
    const outputs = document.querySelectorAll('.exhibit-output, .output, [data-output]')
    outputs.forEach(output => {
      // Allow placeholder text but not actual content
      const hasPlaceholder = output.dataset.placeholder ||
        output.classList.contains('placeholder') ||
        output.querySelector('.placeholder')

      const text = output.textContent.trim()
      const children = output.children.length

      // If it has content that isn't a placeholder, that's a violation
      if ((text.length > 50 || children > 1) && !hasPlaceholder) {
        throw new Error(
          `Output area appears pre-populated: "${text.substring(0, 50)}..." - ` +
          `outputs must be empty until user interaction`
        )
      }
    })
  })

  testRunner.registerTest('[Integrity] No setTimeout calls on module load', () => {
    if (window.__suspiciousTimersDetected) {
      throw new Error(
        'Detected setTimeout/setInterval during page load - ' +
        'demos must not auto-run'
      )
    }
  })

  // ─────────────────────────────────────────────
  // REAL LIBRARY VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Library functions are callable', () => {
    const lib = window.Library
    const exports = Object.keys(lib)

    // At least one export must be a function
    const hasFunctions = exports.some(key => typeof lib[key] === 'function')
    if (!hasFunctions) {
      throw new Error('Library exports no callable functions')
    }
  })

  testRunner.registerTest('[Integrity] No mock implementations detected', () => {
    // Check for common mock patterns in window
    const suspicious = [
      'mockParse', 'mockValidate', 'fakeParse', 'fakeValidate',
      'stubParse', 'stubValidate', 'testParse', 'testValidate'
    ]
    suspicious.forEach(name => {
      if (typeof window[name] === 'function') {
        throw new Error(`Detected mock function: window.${name} - use real library`)
      }
    })
  })

  // ─────────────────────────────────────────────
  // VISUAL FEEDBACK VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] CSS includes animation definitions', () => {
    const sheets = document.styleSheets
    let hasAnimations = false

    try {
      for (const sheet of sheets) {
        // Skip cross-origin stylesheets
        if (!sheet.href || sheet.href.includes('demo-files/')) {
          const rules = sheet.cssRules || sheet.rules
          for (const rule of rules) {
            if (rule.type === CSSRule.KEYFRAMES_RULE ||
                (rule.style && (
                  rule.style.animation ||
                  rule.style.transition ||
                  rule.style.animationName
                ))) {
              hasAnimations = true
              break
            }
          }
        }
        if (hasAnimations) break
      }
    } catch (e) {
      // CORS error - assume external sheet has animations
      hasAnimations = true
    }

    if (!hasAnimations) {
      throw new Error('No CSS animations or transitions found - visual feedback required')
    }
  })

  testRunner.registerTest('[Integrity] Interactive elements have hover states', () => {
    const buttons = document.querySelectorAll('button, .btn')
    if (buttons.length === 0) return // No buttons to check

    // Check that enabled buttons have pointer cursor (disabled buttons should have not-allowed)
    const enabledBtn = Array.from(buttons).find(btn => !btn.disabled)
    if (!enabledBtn) return // All buttons are disabled, skip check

    const styles = window.getComputedStyle(enabledBtn)
    if (styles.cursor !== 'pointer') {
      throw new Error('Buttons should have cursor: pointer')
    }
  })

  // ─────────────────────────────────────────────
  // WALKTHROUGH REGISTRATION VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Walkthrough demonstrations are async functions', () => {
    testRunner.exhibits.forEach(exhibit => {
      if (typeof exhibit.demonstrate !== 'function') {
        throw new Error(`Exhibit "${exhibit.name}" has no demonstrate function`)
      }
    })
  })

  testRunner.registerTest('[Integrity] Each exhibit has required elements', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    exhibits.forEach(exhibit => {
      // Must have a title
      const title = exhibit.querySelector('.exhibit-title, h2, h3')
      if (!title) {
        throw new Error(`Exhibit ${exhibit.id} missing title element`)
      }

      // Must have an interactive area
      const interactive = exhibit.querySelector(
        '.exhibit-interactive, .exhibit-content, [data-interactive]'
      )
      if (!interactive) {
        throw new Error(`Exhibit ${exhibit.id} missing interactive area`)
      }
    })
  })
}

// Register integrity tests FIRST
registerIntegrityTests()

// ============================================
// LIBRARY-SPECIFIC TESTS
// ============================================

testRunner.registerTest('creates manager with default options', () => {
  const m = window.Library.createInventoryManager()
  if (!m) throw new Error('Manager not created')
})

testRunner.registerTest('creates unlimited container', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  if (!m.listContainers().includes('test')) throw new Error('Container not found')
})

testRunner.registerTest('adds items to unlimited container', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  const result = m.addItem('test', 'item1', 5)
  if (!result.success) throw new Error('Add failed')
  if (m.getQuantity('test', 'item1') !== 5) throw new Error('Wrong quantity')
})

testRunner.registerTest('removes items from container', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  m.addItem('test', 'item1', 10)
  const removed = m.removeItem('test', 'item1', 3)
  if (removed !== 3) throw new Error('Wrong removed count')
  if (m.getQuantity('test', 'item1') !== 7) throw new Error('Wrong remaining')
})

testRunner.registerTest('creates count-limited container', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'count', maxCount: 5 })
  m.addItem('test', 'item1', 3)
  m.addItem('test', 'item2', 2)
  const result = m.addItem('test', 'item3', 1)
  if (result.success) throw new Error('Should have failed')
  if (result.reason !== 'count_exceeded') throw new Error('Wrong reason')
})

testRunner.registerTest('creates weight-limited container', () => {
  const m = window.Library.createInventoryManager({ getItemWeight: () => 2 })
  m.createContainer('test', { mode: 'weight', maxWeight: 10 })
  m.addItem('test', 'item1', 3) // 6 weight
  const result = m.addItem('test', 'item2', 3) // needs 6 more, only 4 available
  if (result.added !== 2) throw new Error('Should add partial: ' + result.added)
})

testRunner.registerTest('creates grid container', () => {
  const m = window.Library.createInventoryManager({ getItemSize: () => ({ width: 1, height: 1 }) })
  m.createContainer('test', { mode: 'grid', width: 5, height: 5 })
  const grid = m.getGrid('test')
  if (grid.length !== 5) throw new Error('Wrong height')
  if (grid[0].length !== 5) throw new Error('Wrong width')
})

testRunner.registerTest('places items in grid', () => {
  const m = window.Library.createInventoryManager({ getItemSize: () => ({ width: 2, height: 2 }) })
  m.createContainer('test', { mode: 'grid', width: 5, height: 5 })
  const result = m.addItemAt('test', 'item1', { x: 0, y: 0, rotated: false })
  if (!result.success) throw new Error('Add failed')
  const grid = m.getGrid('test')
  if (!grid[0][0]) throw new Error('Cell should be occupied')
})

testRunner.registerTest('finds placements in grid', () => {
  const m = window.Library.createInventoryManager({ getItemSize: () => ({ width: 1, height: 1 }) })
  m.createContainer('test', { mode: 'grid', width: 3, height: 3 })
  const placements = m.findPlacements('test', 'item1')
  if (placements.length !== 9) throw new Error('Should find 9 placements')
})

testRunner.registerTest('grid rejects overlapping items', () => {
  const m = window.Library.createInventoryManager({ getItemSize: () => ({ width: 2, height: 2 }) })
  m.createContainer('test', { mode: 'grid', width: 3, height: 3 })
  m.addItemAt('test', 'item1', { x: 0, y: 0, rotated: false })
  const result = m.addItemAt('test', 'item2', { x: 1, y: 1, rotated: false })
  if (result.success) throw new Error('Should reject overlap')
})

testRunner.registerTest('creates slots container', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'slots', slots: ['head', 'chest', 'feet'] })
  const slots = m.getAllSlots('test')
  if (!('head' in slots)) throw new Error('Missing head slot')
})

testRunner.registerTest('equips items to slots', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'slots', slots: ['head'], slotFilters: { head: (id) => id === 'helmet' } })
  const old = m.setSlot('test', 'head', 'helmet')
  if (old !== null) throw new Error('Should return null for empty slot')
  if (m.getSlot('test', 'head') !== 'helmet') throw new Error('Slot not set')
})

testRunner.registerTest('slot filters reject invalid items', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'slots', slots: ['head'], slotFilters: { head: (id) => id === 'helmet' } })
  try {
    m.setSlot('test', 'head', 'sword')
    throw new Error('Should have rejected')
  } catch (e) {
    if (!e.message.includes('cannot be equipped')) throw e
  }
})

testRunner.registerTest('transfers items between containers', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('a', { mode: 'unlimited' })
  m.createContainer('b', { mode: 'unlimited' })
  m.addItem('a', 'item1', 10)
  const result = m.transfer('a', 'b', 'item1', 5)
  if (result.transferred !== 5) throw new Error('Wrong transfer count')
  if (m.getQuantity('a', 'item1') !== 5) throw new Error('Wrong source qty')
  if (m.getQuantity('b', 'item1') !== 5) throw new Error('Wrong dest qty')
})

testRunner.registerTest('locks items prevent removal', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  m.addItem('test', 'item1', 5)
  m.lockItem('test', 'item1')
  try {
    m.removeItem('test', 'item1', 1)
    throw new Error('Should have thrown')
  } catch (e) {
    if (!e.message.includes('locked')) throw e
  }
})

testRunner.registerTest('unlocks items allow removal', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  m.addItem('test', 'item1', 5)
  m.lockItem('test', 'item1')
  m.unlockItem('test', 'item1')
  const removed = m.removeItem('test', 'item1', 1)
  if (removed !== 1) throw new Error('Should remove after unlock')
})

testRunner.registerTest('transactions roll back on error', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  m.addItem('test', 'item1', 10)
  try {
    m.transaction(() => {
      m.removeItem('test', 'item1', 5)
      throw new Error('Simulated failure')
    })
  } catch (e) {}
  if (m.getQuantity('test', 'item1') !== 10) throw new Error('Should rollback')
})

testRunner.registerTest('transactions commit on success', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  m.addItem('test', 'item1', 10)
  m.transaction(() => {
    m.removeItem('test', 'item1', 5)
  })
  if (m.getQuantity('test', 'item1') !== 5) throw new Error('Should commit')
})

testRunner.registerTest('serializes and deserializes state', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  m.addItem('test', 'item1', 7)
  const data = m.serialize()
  m.removeContainer('test')
  m.deserialize(data)
  if (m.getQuantity('test', 'item1') !== 7) throw new Error('Should restore')
})

testRunner.registerTest('fires itemAdded events', () => {
  const m = window.Library.createInventoryManager()
  let fired = false
  m.on('itemAdded', (e) => { fired = true })
  m.createContainer('test', { mode: 'unlimited' })
  m.addItem('test', 'item1', 1)
  if (!fired) throw new Error('Event not fired')
})

testRunner.registerTest('fires itemRemoved events', () => {
  const m = window.Library.createInventoryManager()
  let fired = false
  m.on('itemRemoved', (e) => { fired = true })
  m.createContainer('test', { mode: 'unlimited' })
  m.addItem('test', 'item1', 5)
  m.removeItem('test', 'item1', 1)
  if (!fired) throw new Error('Event not fired')
})

testRunner.registerTest('fires containerFull events', () => {
  const m = window.Library.createInventoryManager()
  let fired = false
  m.on('containerFull', (e) => { fired = true })
  m.createContainer('test', { mode: 'count', maxCount: 1 })
  m.addItem('test', 'item1', 1)
  m.addItem('test', 'item2', 1)
  if (!fired) throw new Error('Event not fired')
})

testRunner.registerTest('hasItem returns true for existing items', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  m.addItem('test', 'item1', 1)
  if (!m.hasItem('test', 'item1')) throw new Error('Should have item')
})

testRunner.registerTest('hasItem returns false for missing items', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  if (m.hasItem('test', 'item1')) throw new Error('Should not have item')
})

testRunner.registerTest('isEmpty returns true for empty container', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  if (!m.isEmpty('test')) throw new Error('Should be empty')
})

testRunner.registerTest('isEmpty returns false for non-empty container', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  m.addItem('test', 'item1', 1)
  if (m.isEmpty('test')) throw new Error('Should not be empty')
})

testRunner.registerTest('getContents returns all items', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  m.addItem('test', 'item1', 3)
  m.addItem('test', 'item2', 5)
  const contents = m.getContents('test')
  if (contents.length !== 2) throw new Error('Wrong item count')
})

testRunner.registerTest('getRemainingCapacity for count mode', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'count', maxCount: 10 })
  m.addItem('test', 'item1', 3)
  const cap = m.getRemainingCapacity('test')
  if (cap.remaining !== 7) throw new Error('Wrong capacity')
})

testRunner.registerTest('getRemainingCapacity for weight mode', () => {
  const m = window.Library.createInventoryManager({ getItemWeight: () => 2 })
  m.createContainer('test', { mode: 'weight', maxWeight: 20 })
  m.addItem('test', 'item1', 3)
  const cap = m.getRemainingCapacity('test')
  if (cap.remaining !== 14) throw new Error('Wrong capacity: ' + cap.remaining)
})

testRunner.registerTest('canAdd returns correct maxAddable', () => {
  const m = window.Library.createInventoryManager({ getItemWeight: () => 5 })
  m.createContainer('test', { mode: 'weight', maxWeight: 20 })
  const result = m.canAdd('test', 'item1', 10)
  if (result.maxAddable !== 4) throw new Error('Wrong maxAddable')
})

testRunner.registerTest('findItem locates items across containers', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('a', { mode: 'unlimited' })
  m.createContainer('b', { mode: 'unlimited' })
  m.addItem('a', 'item1', 5)
  m.addItem('b', 'item1', 3)
  const found = m.findItem('item1')
  if (found.length !== 2) throw new Error('Should find in both')
})

testRunner.registerTest('autoArrange repacks grid items', () => {
  const m = window.Library.createInventoryManager({ getItemSize: () => ({ width: 1, height: 1 }) })
  m.createContainer('test', { mode: 'grid', width: 3, height: 3 })
  m.addItemAt('test', 'item1', { x: 2, y: 2, rotated: false })
  m.autoArrange('test')
  const grid = m.getGrid('test')
  if (!grid[0][0] || grid[0][0].itemId !== 'item1') throw new Error('Should move to 0,0')
})

testRunner.registerTest('sort orders items alphabetically', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  m.addItem('test', 'zebra', 1)
  m.addItem('test', 'apple', 1)
  m.addItem('test', 'mango', 1)
  m.sort('test', (a, b) => a.itemId.localeCompare(b.itemId))
  const contents = m.getContents('test')
  if (contents[0].itemId !== 'apple') throw new Error('Should be sorted')
})

testRunner.registerTest('consolidate merges stacks', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited', allowStacking: true })
  m.addItem('test', 'item1', 3)
  m.addItem('test', 'item1', 5)
  m.consolidate('test')
  const stacks = m.getStacks('test', 'item1')
  if (stacks.length !== 1) throw new Error('Should consolidate to 1 stack')
  if (stacks[0].quantity !== 8) throw new Error('Wrong total quantity')
})

testRunner.registerTest('throws on duplicate container', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  try {
    m.createContainer('test', { mode: 'unlimited' })
    throw new Error('Should throw')
  } catch (e) {
    if (!e.message.includes('already exists')) throw e
  }
})

testRunner.registerTest('throws on non-existent container', () => {
  const m = window.Library.createInventoryManager()
  try {
    m.addItem('nonexistent', 'item', 1)
    throw new Error('Should throw')
  } catch (e) {
    if (!e.message.includes('does not exist')) throw e
  }
})

testRunner.registerTest('removeContainer deletes container', () => {
  const m = window.Library.createInventoryManager()
  m.createContainer('test', { mode: 'unlimited' })
  m.removeContainer('test')
  if (m.listContainers().includes('test')) throw new Error('Should be removed')
})

testRunner.registerTest('grid rotation finds more placements', () => {
  const m = window.Library.createInventoryManager({ getItemSize: (id) => id === 'tall' ? { width: 1, height: 3 } : { width: 1, height: 1 } })
  m.createContainer('test', { mode: 'grid', width: 3, height: 1, allowRotation: true })
  const placements = m.findPlacements('test', 'tall')
  if (placements.length === 0) throw new Error('Should find rotated placement')
  if (!placements.some(p => p.rotated)) throw new Error('Should include rotated')
})

// ============================================
// EXHIBIT WALKTHROUGH REGISTRATIONS
// ============================================

// These will be set up in demo.js once exhibits are initialized
// The demo.js file will call these after DOM is ready
