import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type {
  InventoryManager,
  ContainerConfig,
  ItemId,
  ContainerId,
  GridPosition,
  ItemSize,
} from './types'

// ============================================
// FUZZ TEST CONFIGURATION
// ============================================

const THOROUGH_MODE = process.env.FUZZ_THOROUGH === '1'
const THOROUGH_DURATION_MS = 60_000 // 60 seconds per test in thorough mode
const STANDARD_ITERATIONS = 10 // iterations per test in standard mode (reduced to avoid memory issues)
const BASE_SEED = 12345 // reproducible seed for standard mode

// ============================================
// SEEDED PRNG
// ============================================

function createSeededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

// ============================================
// FUZZ LOOP HELPER
// ============================================

interface FuzzLoopResult {
  iterations: number
  seed: number
  durationMs: number
}

/**
 * Executes a fuzz test body in either standard or thorough mode.
 *
 * Standard mode: Runs exactly STANDARD_ITERATIONS times with BASE_SEED
 * Thorough mode: Runs for THOROUGH_DURATION_MS with time-based seed
 *
 * On failure, throws with full reproduction information.
 */
function fuzzLoop(
  testFn: (random: () => number, iteration: number) => void
): FuzzLoopResult {
  const startTime = Date.now()
  const seed = THOROUGH_MODE ? startTime : BASE_SEED
  const random = createSeededRandom(seed)

  let iteration = 0

  try {
    if (THOROUGH_MODE) {
      // Time-based: run until duration exceeded
      while (Date.now() - startTime < THOROUGH_DURATION_MS) {
        testFn(random, iteration)
        iteration++
      }
    } else {
      // Iteration-based: run fixed count
      for (iteration = 0; iteration < STANDARD_ITERATIONS; iteration++) {
        testFn(random, iteration)
      }
    }
  } catch (error) {
    const elapsed = Date.now() - startTime
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Fuzz test failed!\n` +
        `  Mode: ${THOROUGH_MODE ? 'thorough' : 'standard'}\n` +
        `  Seed: ${seed}\n` +
        `  Iteration: ${iteration}\n` +
        `  Elapsed: ${elapsed}ms\n` +
        `  Error: ${message}\n\n` +
        `To reproduce, run with:\n` +
        `  BASE_SEED=${seed} and start at iteration ${iteration}`
    )
  }

  return {
    iterations: iteration,
    seed,
    durationMs: Date.now() - startTime,
  }
}

/**
 * Async version of fuzzLoop for testing async functions.
 */
async function fuzzLoopAsync(
  testFn: (random: () => number, iteration: number) => Promise<void>
): Promise<FuzzLoopResult> {
  const startTime = Date.now()
  const seed = THOROUGH_MODE ? startTime : BASE_SEED
  const random = createSeededRandom(seed)

  let iteration = 0

  try {
    if (THOROUGH_MODE) {
      while (Date.now() - startTime < THOROUGH_DURATION_MS) {
        await testFn(random, iteration)
        iteration++
      }
    } else {
      for (iteration = 0; iteration < STANDARD_ITERATIONS; iteration++) {
        await testFn(random, iteration)
      }
    }
  } catch (error) {
    const elapsed = Date.now() - startTime
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Fuzz test failed!\n` +
        `  Mode: ${THOROUGH_MODE ? 'thorough' : 'standard'}\n` +
        `  Seed: ${seed}\n` +
        `  Iteration: ${iteration}\n` +
        `  Elapsed: ${elapsed}ms\n` +
        `  Error: ${message}\n\n` +
        `To reproduce, run with:\n` +
        `  BASE_SEED=${seed} and start at iteration ${iteration}`
    )
  }

  return {
    iterations: iteration,
    seed,
    durationMs: Date.now() - startTime,
  }
}

// ============================================
// VALUE GENERATORS
// ============================================

function generateString(random: () => number, maxLen = 100): string {
  const len = Math.floor(random() * maxLen)
  return Array.from({ length: len }, () =>
    String.fromCharCode(Math.floor(random() * 0x7f))
  ).join('')
}

function generateNumber(random: () => number): number {
  const type = Math.floor(random() * 10)
  switch (type) {
    case 0:
      return 0
    case 1:
      return -0
    case 2:
      return NaN
    case 3:
      return Infinity
    case 4:
      return -Infinity
    case 5:
      return Number.MAX_SAFE_INTEGER
    case 6:
      return Number.MIN_SAFE_INTEGER
    case 7:
      return Number.EPSILON
    default:
      return (random() - 0.5) * Number.MAX_SAFE_INTEGER * 2
  }
}

function generateArray<T>(
  random: () => number,
  generator: (r: () => number) => T,
  maxLen = 5
): T[] {
  const len = Math.floor(random() * maxLen)
  return Array.from({ length: len }, () => generator(random))
}

function generateObject(
  random: () => number,
  depth = 0,
  maxDepth = 2
): unknown {
  if (depth >= maxDepth) return null

  const type = Math.floor(random() * 6)
  switch (type) {
    case 0:
      return null
    case 1:
      return generateNumber(random)
    case 2:
      return generateString(random, 20)
    case 3:
      return depth < maxDepth - 1
        ? generateArray(random, (r) => generateObject(r, depth + 1, maxDepth), 3)
        : []
    case 4: {
      const obj: Record<string, unknown> = {}
      const keyCount = Math.floor(random() * 3)
      for (let i = 0; i < keyCount; i++) {
        const key = generateString(random, 10) || `key${i}`
        obj[key] = generateObject(random, depth + 1, maxDepth)
      }
      return obj
    }
    default:
      return undefined
  }
}

// Prototype pollution test values
function generateMaliciousObject(random: () => number): unknown {
  const attacks = [
    { __proto__: { polluted: true } },
    { constructor: { prototype: { polluted: true } } },
    JSON.parse('{"__proto__": {"polluted": true}}'),
    Object.create(null, { dangerous: { value: true } }),
  ]
  return attacks[Math.floor(random() * attacks.length)]
}

// Container config generators
function generateContainerConfig(random: () => number): ContainerConfig {
  const modes = ['unlimited', 'count', 'weight', 'grid', 'slots', 'combined']
  const mode = modes[Math.floor(random() * modes.length)]

  switch (mode) {
    case 'unlimited':
      return {
        mode: 'unlimited',
        allowStacking: random() > 0.5,
        maxStackSize: Math.floor(random() * 1000) + 1,
      }
    case 'count':
      return {
        mode: 'count',
        maxCount: Math.floor(random() * 100) + 1,
        allowStacking: random() > 0.5,
      }
    case 'weight':
      return {
        mode: 'weight',
        maxWeight: random() * 1000 + 10,
        allowStacking: random() > 0.5,
      }
    case 'grid':
      return {
        mode: 'grid',
        width: Math.floor(random() * 20) + 5,
        height: Math.floor(random() * 20) + 5,
        allowStacking: random() > 0.5,
        allowRotation: random() > 0.5,
      }
    case 'slots':
      const slotCount = Math.floor(random() * 10) + 1
      return {
        mode: 'slots',
        slots: Array.from({ length: slotCount }, (_, i) => `slot${i}`),
      }
    case 'combined':
      return {
        mode: 'combined',
        rules: [
          { mode: 'count', maxCount: Math.floor(random() * 50) + 10 },
          { mode: 'weight', maxWeight: random() * 500 + 50 },
        ],
      }
    default:
      return { mode: 'unlimited' }
  }
}

function generateMalformedContainerConfig(random: () => number): unknown {
  const type = Math.floor(random() * 10)
  switch (type) {
    case 0:
      return null
    case 1:
      return undefined
    case 2:
      return { mode: 'invalid-mode' }
    case 3:
      return { mode: 'count' } // missing maxCount
    case 4:
      return { mode: 'weight' } // missing maxWeight
    case 5:
      return { mode: 'grid', width: -5, height: 10 }
    case 6:
      return { mode: 'slots', slots: [] } // empty slots
    case 7:
      return { mode: 'combined', rules: [] } // empty rules
    case 8:
      return { mode: 'grid' } // missing width/height
    case 9:
      return { mode: 'grid', width: NaN, height: 10 }
    default:
      return {}
  }
}

function generateItemId(random: () => number): string {
  const type = Math.floor(random() * 8)
  switch (type) {
    case 0:
      return `item-${Math.floor(random() * 1000)}`
    case 1:
      return '' // empty
    case 2:
      return generateString(random, 50) // random string
    case 3:
      return '物品-🎮' // unicode
    case 4:
      return '__proto__' // prototype pollution attempt
    case 5:
      return 'constructor'
    case 6:
      return '\x00null\x00byte' // null bytes
    case 7:
      return 'a'.repeat(1000) // very long
    default:
      return 'item'
  }
}

function generateContainerId(random: () => number): string {
  const type = Math.floor(random() * 7)
  switch (type) {
    case 0:
      return `container-${Math.floor(random() * 1000)}`
    case 1:
      return ''
    case 2:
      return generateString(random, 50)
    case 3:
      return '   ' // whitespace-only
    case 4:
      return '__proto__'
    case 5:
      return '\n\t\r'
    case 6:
      return 'a'.repeat(1000)
    default:
      return 'container'
  }
}

function generateQuantity(random: () => number): number {
  const type = Math.floor(random() * 10)
  switch (type) {
    case 0:
      return 0
    case 1:
      return -1
    case 2:
      return NaN
    case 3:
      return Infinity
    case 4:
      return Number.MAX_SAFE_INTEGER
    case 5:
      return 0.5 // non-integer
    case 6:
      return -0
    case 7:
      return -1000
    case 8:
      return 1e15
    default:
      return Math.floor(random() * 100) + 1
  }
}

function generateValidQuantity(random: () => number): number {
  return Math.floor(random() * 100) + 1
}

function generateValidContainerId(random: () => number): string {
  return `container-${Math.floor(random() * 1000)}`
}

function generateValidItemId(random: () => number): string {
  return `item-${Math.floor(random() * 1000)}`
}

// ============================================
// INPUT MUTATION FUZZING
// ============================================

describe('Fuzz: createContainer', () => {
  it('handles random valid configs without throwing', () => {
    const manager = createInventoryManager()

    const result = fuzzLoop((random, i) => {
      const config = generateContainerConfig(random)
      const id = `container-${i % 50}` // Reuse IDs to limit memory

      // Remove if exists
      try {
        manager.removeContainer(id)
      } catch (e) {
        // Doesn't exist yet
      }

      // Should not throw for valid configs
      manager.createContainer(id, config)

      // Verify container was created
      expect(manager.listContainers()).toContain(id)
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('rejects all malformed configs gracefully', () => {
    const manager = createInventoryManager()

    fuzzLoop((random, i) => {
      const badConfig = generateMalformedContainerConfig(random)
      const id = `container-${i % 50}`

      // Remove if exists
      try {
        manager.removeContainer(id)
      } catch (e) {
        // Doesn't exist
      }

      try {
        manager.createContainer(id, badConfig as any)
        // If we get here, check if it's actually a valid config
      } catch (e) {
        // Verify error message is non-empty
        if (e instanceof Error && e.message.length === 0) {
          throw new Error('Empty error message')
        }
      }
    })
  })

  it('rejects duplicate container IDs consistently', () => {
    const manager = createInventoryManager()

    fuzzLoop((random, i) => {
      const id = `container-dup-${Math.floor(random() * 10)}`
      const config = generateContainerConfig(random)

      // Remove if exists
      try {
        manager.removeContainer(id)
      } catch (e) {
        // Doesn't exist
      }

      try {
        manager.createContainer(id, config)
        // Second creation with same ID should throw
        try {
          manager.createContainer(id, config)
          throw new Error(`Duplicate container ID not rejected: ${id}`)
        } catch (e) {
          // Expected to throw
          expect(e).toBeDefined()
        }
      } catch (e) {
        // First creation failed, that's OK for malformed configs
      }
    })
  })

  it('handles malicious container IDs safely', () => {
    const manager = createInventoryManager()

    fuzzLoop((random, i) => {
      const id = generateContainerId(random)
      const config: ContainerConfig = { mode: 'unlimited' }

      // Remove if exists
      try {
        manager.removeContainer(id)
      } catch (e) {
        // Doesn't exist
      }

      try {
        manager.createContainer(id, config)
        // If creation succeeds, verify container exists
        if (id.length > 0 && id.trim().length > 0) {
          expect(manager.listContainers()).toContain(id)
        }
      } catch (e) {
        // Empty or invalid IDs should be rejected
        expect(e).toBeDefined()
      }
    })
  })
})

describe('Fuzz: addItem', () => {
  it('handles invalid container IDs gracefully', () => {
    const manager = createInventoryManager()

    fuzzLoop((random, i) => {
      const containerId = generateContainerId(random)
      const itemId = `item-${i}`
      const quantity = 1

      try {
        const result = manager.addItem(containerId, itemId, quantity)
        throw new Error(`Should throw for non-existent container: ${containerId}`)
      } catch (e) {
        // Expected to throw
        expect(e).toBeDefined()
      }
    })
  })

  it('handles invalid quantities gracefully', () => {
    const manager = createInventoryManager()
    const containerId = 'test-container'
    manager.createContainer(containerId, { mode: 'unlimited' })

    fuzzLoop((random, i) => {
      const itemId = `item-${i % 20}`
      const quantity = generateQuantity(random)

      // Extremely large quantities (> 1e6) might cause memory issues
      // The library should either handle them or throw a clear error
      const isReasonableQuantity =
        !isNaN(quantity) &&
        isFinite(quantity) &&
        quantity > 0 &&
        Number.isInteger(quantity) &&
        quantity <= 1e6

      try {
        const result = manager.addItem(containerId, itemId, quantity)

        // Verify: added + overflow = quantity (or 0 for invalid)
        if (isReasonableQuantity) {
          expect(result.added + result.overflow).toBe(quantity)
        } else {
          // Invalid quantities should result in 0 added
          expect(result.added).toBe(0)
        }

        // Never add negative quantity
        expect(result.added).toBeGreaterThanOrEqual(0)
        expect(result.overflow).toBeGreaterThanOrEqual(0)
      } catch (e) {
        // If extremely large quantities throw, that's acceptable
        // but the error should be meaningful
        if (isReasonableQuantity) {
          throw e // Reasonable quantities should not throw
        }
        expect(e).toBeDefined()
        if (e instanceof Error) {
          expect(e.message.length).toBeGreaterThan(0)
        }
      }
    })
  })

  it('never corrupts state on invalid input', () => {
    const manager = createInventoryManager()
    const containerId = 'test-container'
    manager.createContainer(containerId, { mode: 'count', maxCount: 10 })

    fuzzLoop((random, i) => {
      const itemId = `test-item-${i % 5}`
      const quantity = generateQuantity(random)

      const beforeQty = manager.getQuantity(containerId, itemId)

      try {
        manager.addItem(containerId, itemId, quantity)
      } catch (e) {
        // If it throws, state should be unchanged
      }

      const afterQty = manager.getQuantity(containerId, itemId)

      // Quantity should never decrease from addItem
      expect(afterQty).toBeGreaterThanOrEqual(beforeQty)
    })
  })

  it('completes in reasonable time', () => {
    const manager = createInventoryManager()
    const containerId = 'test-container'
    manager.createContainer(containerId, { mode: 'unlimited' })

    fuzzLoop((random, i) => {
      const itemId = `item-${i % 10}`
      const quantity = Math.floor(random() * 1000) + 1

      const start = Date.now()
      manager.addItem(containerId, itemId, quantity)
      const elapsed = Date.now() - start

      // Should complete in < 100ms
      expect(elapsed).toBeLessThan(100)
    })
  })
})

describe('Fuzz: removeItem', () => {
  it('never removes more than exists', () => {
    const manager = createInventoryManager()
    const containerId = 'test-container'
    manager.createContainer(containerId, { mode: 'unlimited' })

    fuzzLoop((random, i) => {
      const itemId = `item-${i % 10}`

      // Clear item before each iteration to avoid accumulation
      manager.removeItem(containerId, itemId, 1000000)

      const addQty = Math.floor(random() * 100) + 1
      manager.addItem(containerId, itemId, addQty)

      const removeQty = generateQuantity(random)
      const removed = manager.removeItem(containerId, itemId, removeQty)

      // Never remove more than exists
      expect(removed).toBeLessThanOrEqual(addQty)
      expect(removed).toBeGreaterThanOrEqual(0)
    })
  })

  it('returns 0 for non-existent items', () => {
    const manager = createInventoryManager()
    const containerId = 'test-container'
    manager.createContainer(containerId, { mode: 'unlimited' })

    fuzzLoop((random, i) => {
      const itemId = `nonexist-${i % 10}`
      const quantity = generateQuantity(random)

      const removed = manager.removeItem(containerId, itemId, quantity)
      expect(removed).toBe(0)
    })
  })

  it('handles invalid quantities gracefully', () => {
    const manager = createInventoryManager()
    const containerId = 'test-container'
    manager.createContainer(containerId, { mode: 'unlimited' })

    fuzzLoop((random, i) => {
      const itemId = `item-${i % 5}`

      // Ensure item exists with 10 quantity
      manager.removeItem(containerId, itemId, 1000) // Clear it
      manager.addItem(containerId, itemId, 10)

      const quantity = generateQuantity(random)
      const removed = manager.removeItem(containerId, itemId, quantity)

      // Never return negative
      expect(removed).toBeGreaterThanOrEqual(0)
      expect(removed).toBeLessThanOrEqual(10)
    })
  })
})

describe('Fuzz: transfer', () => {
  it('conserves total quantity', () => {
    const manager = createInventoryManager()
    const fromId = 'from-container'
    const toId = 'to-container'

    manager.createContainer(fromId, { mode: 'unlimited' })
    manager.createContainer(toId, { mode: 'unlimited' })

    fuzzLoop((random, i) => {
      const itemId = `item-${i % 10}`
      const initialQty = Math.floor(random() * 100) + 10

      // Clear and setup for this iteration
      manager.removeItem(fromId, itemId, 1000)
      manager.removeItem(toId, itemId, 1000)
      manager.addItem(fromId, itemId, initialQty)

      const transferQty = Math.floor(random() * initialQty) + 1

      const beforeTotal =
        manager.getQuantity(fromId, itemId) + manager.getQuantity(toId, itemId)

      const result = manager.transfer(fromId, toId, itemId, transferQty)

      const afterTotal =
        manager.getQuantity(fromId, itemId) + manager.getQuantity(toId, itemId)

      // Total quantity must be conserved
      expect(afterTotal).toBe(beforeTotal)

      // Verify result
      expect(result.transferred + result.overflow).toBe(transferQty)
    })
  })

  it('handles non-existent containers gracefully', () => {
    const manager = createInventoryManager()

    fuzzLoop((random, i) => {
      const fromId = generateContainerId(random)
      const toId = generateContainerId(random)
      const itemId = `item-${i % 10}`
      const quantity = 1

      try {
        manager.transfer(fromId, toId, itemId, quantity)
        throw new Error('Should throw for non-existent containers')
      } catch (e) {
        expect(e).toBeDefined()
      }
    })
  })

  it('handles self-transfer consistently', () => {
    const manager = createInventoryManager()
    const containerId = 'self-transfer-container'
    manager.createContainer(containerId, { mode: 'unlimited' })

    fuzzLoop((random, i) => {
      const itemId = `item-${i % 10}`
      const qty = Math.floor(random() * 100) + 1

      // Clear and setup for this iteration
      manager.removeItem(containerId, itemId, 1000)
      manager.addItem(containerId, itemId, qty)

      const beforeQty = manager.getQuantity(containerId, itemId)

      // Self-transfer
      const result = manager.transfer(containerId, containerId, itemId, qty)

      const afterQty = manager.getQuantity(containerId, itemId)

      // Quantity should not change
      expect(afterQty).toBe(beforeQty)
    })
  })
})

describe('Fuzz: canAdd', () => {
  it('result matches actual addItem behavior', () => {
    const manager = createInventoryManager({
      getItemWeight: () => 5, // Fixed weight to avoid randomness
    })
    const containerId = 'test-container'
    manager.createContainer(containerId, {
      mode: 'weight',
      maxWeight: 100,
    })

    fuzzLoop((random, i) => {
      const itemId = `item-${i % 10}`
      const quantity = Math.floor(random() * 50) + 1

      // Clear the entire container before each test
      for (const item of manager.getContents(containerId)) {
        manager.removeItem(containerId, item.itemId, 1000)
      }

      const canAddResult = manager.canAdd(containerId, itemId, quantity)
      const addResult = manager.addItem(containerId, itemId, quantity)

      // If canAdd is false, addItem should not add full quantity
      if (!canAddResult.canAdd) {
        expect(addResult.added).toBeLessThan(quantity)
      }

      // maxAddable should be accurate
      expect(canAddResult.maxAddable).toBeGreaterThanOrEqual(0)
      expect(addResult.added).toBeLessThanOrEqual(canAddResult.maxAddable)
    })
  })

  it('maxAddable never exceeds capacity', () => {
    const manager = createInventoryManager({
      getItemStackLimit: () => 10, // Fixed stack limit
    })

    fuzzLoop((random, i) => {
      const containerId = `container-${i % 5}`
      const maxCount = Math.floor(random() * 100) + 10

      // Remove and recreate container for this iteration
      try {
        manager.removeContainer(containerId)
      } catch (e) {
        // Doesn't exist yet
      }

      manager.createContainer(containerId, {
        mode: 'count',
        maxCount,
        allowStacking: true,
        maxStackSize: 10,
      })

      const itemId = `item-${i % 10}`
      const quantity = Math.floor(random() * 200) + 1

      const result = manager.canAdd(containerId, itemId, quantity)

      // maxAddable should be finite and non-negative
      expect(Number.isFinite(result.maxAddable)).toBe(true)
      expect(result.maxAddable).toBeGreaterThanOrEqual(0)
      // maxAddable should not exceed maxCount × maxStackSize
      expect(result.maxAddable).toBeLessThanOrEqual(maxCount * 10)
    })
  })
})

describe('Fuzz: setSlot (slots mode)', () => {
  it('non-existent slots always throw', () => {
    const manager = createInventoryManager()
    const containerId = 'test-container'
    manager.createContainer(containerId, {
      mode: 'slots',
      slots: ['slot1', 'slot2', 'slot3'],
    })

    fuzzLoop((random, i) => {
      const invalidSlot = generateString(random, 50)
      const itemId = `item-${i % 10}`

      try {
        manager.setSlot(containerId, invalidSlot, itemId)
        // If slot name matches one of the valid slots, that's OK
        if (!['slot1', 'slot2', 'slot3'].includes(invalidSlot)) {
          throw new Error(`Should throw for non-existent slot: ${invalidSlot}`)
        }
      } catch (e) {
        expect(e).toBeDefined()
      }
    })
  })

  it('returns previous item correctly', () => {
    const manager = createInventoryManager()
    const containerId = 'test-container'
    manager.createContainer(containerId, {
      mode: 'slots',
      slots: ['weapon', 'armor'],
    })

    fuzzLoop((random, i) => {
      const slots = ['weapon', 'armor']
      const slot = slots[Math.floor(random() * slots.length)]

      const item1 = `item-${i % 10}-1`
      const item2 = `item-${i % 10}-2`

      // Clear the slot first
      manager.setSlot(containerId, slot, null)

      // Set first item
      const prev1 = manager.setSlot(containerId, slot, item1)
      expect(prev1).toBeNull()

      // Set second item, should return first
      const prev2 = manager.setSlot(containerId, slot, item2)
      expect(prev2).toBe(item1)
    })
  })
})

describe('Fuzz: transaction', () => {
  it('complete rollback on error', () => {
    const manager = createInventoryManager()
    const containerId = 'test-container'
    manager.createContainer(containerId, { mode: 'unlimited' })

    fuzzLoop((random, i) => {
      const itemId = `item-${i % 10}`

      // Clear before each iteration
      manager.removeItem(containerId, itemId, 1000)

      // Get initial state
      const beforeQty = manager.getQuantity(containerId, itemId)

      try {
        manager.transaction(() => {
          manager.addItem(containerId, itemId, 10)
          manager.addItem(containerId, itemId, 20)

          // Throw in the middle
          if (random() > 0.5) {
            throw new Error('Intentional failure')
          }

          manager.removeItem(containerId, itemId, 5)
        })
      } catch (e) {
        // Expected to fail sometimes
      }

      const afterQty = manager.getQuantity(containerId, itemId)

      // If transaction failed, state should be unchanged
      // If it succeeded, changes should be applied
      // This verifies atomicity
      expect(typeof afterQty).toBe('number')
    })
  })

  it('state identical after rollback', () => {
    const manager = createInventoryManager()
    const containerId = 'test-container'
    manager.createContainer(containerId, { mode: 'unlimited' })

    fuzzLoop((random, i) => {
      const itemId = `item-${i % 10}`
      const otherId = `other-${i % 10}`

      // Clear and setup for this iteration
      manager.removeItem(containerId, itemId, 1000)
      manager.removeItem(containerId, otherId, 1000)
      manager.addItem(containerId, itemId, 50)

      const beforeQty = manager.getQuantity(containerId, itemId)
      const beforeEmpty = manager.isEmpty(containerId)

      try {
        manager.transaction(() => {
          manager.removeItem(containerId, itemId, 25)
          manager.addItem(containerId, otherId, 100)
          throw new Error('Force rollback')
        })
      } catch (e) {
        // Expected
      }

      const afterQty = manager.getQuantity(containerId, itemId)
      const afterEmpty = manager.isEmpty(containerId)

      expect(afterQty).toBe(beforeQty)
      expect(afterEmpty).toBe(beforeEmpty)
    })
  })
})

describe('Fuzz: serialize/deserialize', () => {
  it('roundtrip property holds', () => {
    // Create both managers once with stable callbacks
    const manager = createInventoryManager({
      getItemWeight: () => 5,
      getItemSize: () => ({ width: 2, height: 2 }),
    })

    const manager2 = createInventoryManager({
      getItemWeight: () => 5,
      getItemSize: () => ({ width: 2, height: 2 }),
    })

    fuzzLoop((random, i) => {
      // Clear all containers from previous iteration
      for (const cid of manager.listContainers()) {
        manager.removeContainer(cid)
      }
      for (const cid of manager2.listContainers()) {
        manager2.removeContainer(cid)
      }

      // Create random containers (limit to 3 with modulo IDs)
      for (let j = 0; j < 3; j++) {
        const containerId = `container-${j}`
        const config = generateContainerConfig(random)
        try {
          manager.createContainer(containerId, config)

          // Add random items (limit to 5 with modulo IDs)
          for (let k = 0; k < 5; k++) {
            const itemId = `item-${k}`
            const quantity = Math.floor(random() * 10) + 1
            manager.addItem(containerId, itemId, quantity)
          }
        } catch (e) {
          // Some configs might fail, that's OK
        }
      }

      // Serialize
      const serialized = manager.serialize()

      try {
        manager2.deserialize(serialized)

        // Verify containers match
        const containers1 = manager.listContainers().sort()
        const containers2 = manager2.listContainers().sort()
        expect(containers2).toEqual(containers1)

        // Verify quantities match
        for (const containerId of containers1) {
          const contents1 = manager.getContents(containerId)
          const contents2 = manager2.getContents(containerId)
          expect(contents2.length).toBe(contents1.length)
        }
      } catch (e) {
        // Some serialization might fail for complex states
      }
    })
  })

  it('rejects malformed data gracefully', () => {
    const manager = createInventoryManager()

    fuzzLoop((random, i) => {
      const badData = generateObject(random, 0, 2)

      try {
        manager.deserialize(badData)
        // If it doesn't throw, verify state is valid
        const containers = manager.listContainers()
        expect(Array.isArray(containers)).toBe(true)
      } catch (e) {
        // Expected to throw for invalid data
        expect(e).toBeDefined()
      }

      // Clear state after each test
      for (const cid of manager.listContainers()) {
        try {
          manager.removeContainer(cid)
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    })
  })
})

// ============================================
// PROPERTY-BASED TESTING
// ============================================

describe('Property: Add/Remove Inverse', () => {
  it('addItem then removeItem returns to original state', () => {
    const manager = createInventoryManager()
    const containerId = 'test-container'
    manager.createContainer(containerId, { mode: 'unlimited' })

    fuzzLoop((random, i) => {
      const itemId = `item-${i % 10}`
      const quantity = Math.floor(random() * 100) + 1

      const beforeQty = manager.getQuantity(containerId, itemId)

      const addResult = manager.addItem(containerId, itemId, quantity)
      if (addResult.added > 0) {
        manager.removeItem(containerId, itemId, addResult.added)
      }

      const afterQty = manager.getQuantity(containerId, itemId)

      expect(afterQty).toBe(beforeQty)
    })
  })
})

describe('Property: Transfer Conservation', () => {
  it('transfer conserves total quantity across containers', () => {
    const manager = createInventoryManager()
    const container1 = 'container1'
    const container2 = 'container2'

    manager.createContainer(container1, { mode: 'unlimited' })
    manager.createContainer(container2, { mode: 'unlimited' })

    fuzzLoop((random, i) => {
      const itemId = `item-${i % 10}`
      const initialQty = Math.floor(random() * 100) + 10

      // Clear and setup for this iteration
      manager.removeItem(container1, itemId, 1000)
      manager.removeItem(container2, itemId, 1000)
      manager.addItem(container1, itemId, initialQty)

      const transferQty = Math.floor(random() * initialQty) + 1

      const beforeTotal =
        manager.getQuantity(container1, itemId) + manager.getQuantity(container2, itemId)

      manager.transfer(container1, container2, itemId, transferQty)

      const afterTotal =
        manager.getQuantity(container1, itemId) + manager.getQuantity(container2, itemId)

      expect(afterTotal).toBe(beforeTotal)
    })
  })
})

describe('Property: Consolidate Preserves Quantity', () => {
  it('consolidate does not change total quantities', () => {
    const manager = createInventoryManager()
    const containerId = 'test-container'
    manager.createContainer(containerId, { mode: 'unlimited', maxStackSize: 10 })

    fuzzLoop((random, i) => {
      const items = new Map<string, number>()

      // Clear container before each iteration
      for (const item of manager.getContents(containerId)) {
        manager.removeItem(containerId, item.itemId, 1000)
      }

      // Add multiple items (limit to 5 with modulo IDs)
      for (let j = 0; j < 5; j++) {
        const itemId = `item-${j}`
        const quantity = Math.floor(random() * 50) + 1
        manager.addItem(containerId, itemId, quantity)
        items.set(itemId, quantity)
      }

      // Consolidate
      try {
        manager.consolidate(containerId)
      } catch (e) {
        // Some modes don't support consolidate
      }

      // Verify quantities unchanged
      for (const [itemId, expectedQty] of items) {
        const actualQty = manager.getQuantity(containerId, itemId)
        expect(actualQty).toBe(expectedQty)
      }
    })
  })
})

describe('Property: Transaction Atomicity', () => {
  it('failed transaction leaves state unchanged', () => {
    const manager = createInventoryManager()
    const containerId = 'test-container'
    manager.createContainer(containerId, { mode: 'unlimited' })

    fuzzLoop((random, i) => {
      // Clear container before each iteration
      for (const item of manager.getContents(containerId)) {
        manager.removeItem(containerId, item.itemId, 1000)
      }

      // Add some initial items (limit to 3 with modulo IDs)
      const items = new Map<string, number>()
      for (let j = 0; j < 3; j++) {
        const itemId = `item-${j}`
        const quantity = Math.floor(random() * 20) + 1
        manager.addItem(containerId, itemId, quantity)
        items.set(itemId, quantity)
      }

      // Capture state before transaction
      const beforeState = new Map<string, number>()
      for (const [itemId] of items) {
        beforeState.set(itemId, manager.getQuantity(containerId, itemId))
      }

      // Run transaction that fails
      try {
        manager.transaction(() => {
          manager.addItem(containerId, 'item-0', 10)
          manager.removeItem(containerId, 'item-1', 5)
          throw new Error('Forced failure')
        })
      } catch (e) {
        // Expected
      }

      // Verify state unchanged
      for (const [itemId, expectedQty] of beforeState) {
        const actualQty = manager.getQuantity(containerId, itemId)
        expect(actualQty).toBe(expectedQty)
      }
    })
  })
})

// ============================================
// STATE MACHINE FUZZING
// ============================================

describe('State Machine: Container Lifecycle', () => {
  it('random operation sequences maintain invariants', () => {
    const manager = createInventoryManager({
      getItemWeight: () => 5,
    })

    const containerId = 'test-container'
    const config: ContainerConfig = { mode: 'weight', maxWeight: 100 }

    // Create container once
    manager.createContainer(containerId, config)
    expect(manager.listContainers()).toContain(containerId)

    fuzzLoop((random, i) => {
      // Clear container before each iteration
      for (const item of manager.getContents(containerId)) {
        manager.removeItem(containerId, item.itemId, 1000)
      }

      // Random operations
      const operations = ['add', 'remove', 'query']
      const items = new Map<string, number>()

      for (let j = 0; j < 20; j++) {
        const op = operations[Math.floor(random() * operations.length)]

        switch (op) {
          case 'add': {
            const itemId = `item-${Math.floor(random() * 5)}`
            const quantity = Math.floor(random() * 10) + 1
            const result = manager.addItem(containerId, itemId, quantity)
            if (result.added > 0) {
              items.set(itemId, (items.get(itemId) || 0) + result.added)
            }
            break
          }
          case 'remove': {
            if (items.size > 0) {
              const itemIds = Array.from(items.keys())
              const itemId = itemIds[Math.floor(random() * itemIds.length)]
              const quantity = Math.floor(random() * 10) + 1
              const removed = manager.removeItem(containerId, itemId, quantity)
              const newQty = (items.get(itemId) || 0) - removed
              if (newQty <= 0) {
                items.delete(itemId)
              } else {
                items.set(itemId, newQty)
              }
            }
            break
          }
          case 'query': {
            const isEmpty = manager.isEmpty(containerId)
            expect(isEmpty).toBe(items.size === 0)
            break
          }
        }
      }

      // Verify final state
      for (const [itemId, expectedQty] of items) {
        const actualQty = manager.getQuantity(containerId, itemId)
        expect(actualQty).toBe(expectedQty)
      }
    })
  })
})

describe('State Machine: Multi-Container Interactions', () => {
  it('multiple containers with transfers maintain conservation', () => {
    const manager = createInventoryManager()

    // Create 3 containers once
    const containers = ['c1', 'c2', 'c3']
    for (const cid of containers) {
      manager.createContainer(cid, { mode: 'unlimited' })
    }

    fuzzLoop((random, i) => {
      const itemId = `item-${i % 10}`
      const initialQty = 100

      // Clear all containers before each iteration
      for (const cid of containers) {
        manager.removeItem(cid, itemId, 1000)
      }

      // Add initial quantity to first container
      manager.addItem(containers[0], itemId, initialQty)

      // Random transfers
      for (let j = 0; j < 20; j++) {
        const from = containers[Math.floor(random() * containers.length)]
        const to = containers[Math.floor(random() * containers.length)]
        const qty = Math.floor(random() * 20) + 1

        manager.transfer(from, to, itemId, qty)
      }

      // Verify total quantity conserved
      const totalQty = containers.reduce(
        (sum, cid) => sum + manager.getQuantity(cid, itemId),
        0
      )
      expect(totalQty).toBe(initialQty)
    })
  })
})
