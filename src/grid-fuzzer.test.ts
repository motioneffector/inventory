import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager, GridCell, GridPosition, ItemSize } from './types'

// ============================================================================
// ITEM TEMPLATES
// ============================================================================

interface ItemTemplate {
  id: string
  width: number
  height: number
  weight: number
}

const ITEM_TEMPLATES: ItemTemplate[] = [
  // Small items
  { id: 'tiny', width: 1, height: 1, weight: 1 },

  // Medium items
  { id: 'small-h', width: 1, height: 2, weight: 2 },
  { id: 'small-w', width: 2, height: 1, weight: 2 },
  { id: 'square-2', width: 2, height: 2, weight: 4 },

  // Large items
  { id: 'tall', width: 1, height: 3, weight: 3 },
  { id: 'wide', width: 3, height: 1, weight: 3 },
  { id: 'rect-2x3', width: 2, height: 3, weight: 6 },
  { id: 'rect-3x2', width: 3, height: 2, weight: 6 },
  { id: 'square-3', width: 3, height: 3, weight: 9 },

  // XL items
  { id: 'long', width: 1, height: 4, weight: 4 },
  { id: 'beam', width: 4, height: 1, weight: 4 },
  { id: 'rect-2x4', width: 2, height: 4, weight: 8 },
  { id: 'rect-4x2', width: 4, height: 2, weight: 8 },
  { id: 'square-4', width: 4, height: 4, weight: 16 },

  // Edge case items
  { id: 'ultra-tall', width: 1, height: 6, weight: 6 },
  { id: 'ultra-wide', width: 6, height: 1, weight: 6 },
  { id: 'giant', width: 5, height: 5, weight: 25 },
]

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  next(): number {
    this.state = ((this.state * 1103515245 + 12345) & 0x7fffffff) >>> 0
    return this.state / 0x7fffffff
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  choice<T>(array: T[]): T {
    if (array.length === 0) throw new Error('Cannot choose from empty array')
    return array[this.int(0, array.length - 1)]
  }

  boolean(): boolean {
    return this.next() < 0.5
  }
}

function weightedChoice<T>(rng: SeededRandom, weights: Record<string, number>): T {
  const entries = Object.entries(weights).filter(([_, weight]) => weight > 0)
  if (entries.length === 0) throw new Error('No valid choices')

  const total = entries.reduce((sum, [_, weight]) => sum + weight, 0)
  let rand = rng.next() * total

  for (const [key, weight] of entries) {
    rand -= weight
    if (rand <= 0) return key as T
  }

  return entries[entries.length - 1][0] as T
}

// ============================================================================
// FUZZER OPERATIONS
// ============================================================================

enum FuzzOperation {
  ADD_ITEM = 'addItem',
  ADD_ITEM_AT = 'addItemAt',
  ADD_ITEM_AT_INVALID = 'addItemAtInvalid',
  REMOVE_ITEM = 'removeItem',
  REMOVE_ITEM_FULL = 'removeItemFull',
  TRANSFER_TO_SECOND = 'transferToSecond',
  TRANSFER_FROM_SECOND = 'transferFromSecond',
  CONSOLIDATE = 'consolidate',
  AUTO_ARRANGE = 'autoArrange',
}

interface OperationResult {
  operation: FuzzOperation
  itemId?: string
  quantity?: number
  position?: GridPosition
  result?: unknown
}

interface FuzzState {
  operationHistory: OperationResult[]
  itemInstanceCounter: number
  grid1Items: Map<string, number>
  grid2Items: Map<string, number>
  itemTemplates: Map<string, ItemTemplate>
}

// ============================================================================
// OPERATION SELECTION
// ============================================================================

function selectRandomOperation(rng: SeededRandom, state: FuzzState): FuzzOperation {
  const isEmpty1 = state.grid1Items.size === 0
  const isEmpty2 = state.grid2Items.size === 0
  const hasItems1 = !isEmpty1
  const hasItems2 = !isEmpty2

  const weights = {
    [FuzzOperation.ADD_ITEM]: isEmpty1 ? 50 : 30,
    [FuzzOperation.ADD_ITEM_AT]: isEmpty1 ? 50 : 25,
    [FuzzOperation.ADD_ITEM_AT_INVALID]: hasItems1 ? 10 : 5,
    [FuzzOperation.REMOVE_ITEM]: hasItems1 ? 20 : 0,
    [FuzzOperation.REMOVE_ITEM_FULL]: hasItems1 ? 15 : 0,
    [FuzzOperation.TRANSFER_TO_SECOND]: hasItems1 ? 15 : 0,
    [FuzzOperation.TRANSFER_FROM_SECOND]: hasItems2 ? 15 : 0,
    [FuzzOperation.CONSOLIDATE]: hasItems1 ? 5 : 0,
    [FuzzOperation.AUTO_ARRANGE]: hasItems1 ? 10 : 0,
  }

  return weightedChoice<FuzzOperation>(rng, weights)
}

// ============================================================================
// OPERATION EXECUTION
// ============================================================================

function findRandomValidPosition(
  manager: InventoryManager,
  containerId: string,
  template: ItemTemplate,
  rng: SeededRandom
): GridPosition | null {
  const placements = manager.findPlacements(containerId, `temp-${template.id}`)
  if (placements.length === 0) return null
  return rng.choice(placements)
}

function executeOperation(
  manager: InventoryManager,
  operation: FuzzOperation,
  rng: SeededRandom,
  state: FuzzState,
  config: { allowStacking: boolean; allowRotation: boolean; maxStackSize: number }
): OperationResult {
  switch (operation) {
    case FuzzOperation.ADD_ITEM: {
      const template = rng.choice(ITEM_TEMPLATES)
      const itemId = `${template.id}-${state.itemInstanceCounter++}`
      state.itemTemplates.set(itemId, template)

      const quantity = rng.int(1, config.allowStacking ? config.maxStackSize : 1)

      const result = manager.addItem('grid1', itemId, quantity)

      if (result.added > 0) {
        state.grid1Items.set(itemId, (state.grid1Items.get(itemId) || 0) + result.added)
      }

      return { operation, itemId, quantity, result }
    }

    case FuzzOperation.ADD_ITEM_AT: {
      const template = rng.choice(ITEM_TEMPLATES)
      const itemId = `${template.id}-${state.itemInstanceCounter++}`
      state.itemTemplates.set(itemId, template)

      const placements = manager.findPlacements('grid1', itemId)
      if (placements.length === 0) {
        return { operation, itemId, result: { success: false, reason: 'no_space' } }
      }

      const position = rng.choice(placements)
      const quantity = rng.int(1, config.allowStacking ? config.maxStackSize : 1)

      const result = manager.addItemAt('grid1', itemId, position, quantity)

      if (result.added > 0) {
        state.grid1Items.set(itemId, (state.grid1Items.get(itemId) || 0) + result.added)
      }

      return { operation, itemId, quantity, position, result }
    }

    case FuzzOperation.ADD_ITEM_AT_INVALID: {
      const template = rng.choice(ITEM_TEMPLATES)
      const itemId = `${template.id}-${state.itemInstanceCounter++}`
      state.itemTemplates.set(itemId, template)

      // Try invalid position
      const position = { x: rng.int(8, 12), y: rng.int(8, 12), rotated: rng.boolean() }
      const quantity = 1

      const result = manager.addItemAt('grid1', itemId, position, quantity)

      if (result.added > 0) {
        state.grid1Items.set(itemId, (state.grid1Items.get(itemId) || 0) + result.added)
      }

      return { operation, itemId, quantity, position, result }
    }

    case FuzzOperation.REMOVE_ITEM: {
      const items = Array.from(state.grid1Items.entries()).filter(([_, qty]) => qty > 0)
      if (items.length === 0) {
        return { operation, result: { removed: 0 } }
      }

      const [itemId, maxQty] = rng.choice(items)
      const quantity = rng.int(1, Math.max(1, maxQty))

      const removed = manager.removeItem('grid1', itemId, quantity)

      const newQty = (state.grid1Items.get(itemId) || 0) - removed
      if (newQty <= 0) {
        state.grid1Items.delete(itemId)
      } else {
        state.grid1Items.set(itemId, newQty)
      }

      return { operation, itemId, quantity, result: { removed } }
    }

    case FuzzOperation.REMOVE_ITEM_FULL: {
      const items = Array.from(state.grid1Items.keys())
      if (items.length === 0) {
        return { operation, result: { removed: 0 } }
      }

      const itemId = rng.choice(items)
      const quantity = state.grid1Items.get(itemId) || 0

      const removed = manager.removeItem('grid1', itemId, quantity)

      state.grid1Items.delete(itemId)

      return { operation, itemId, quantity, result: { removed } }
    }

    case FuzzOperation.TRANSFER_TO_SECOND: {
      const items = Array.from(state.grid1Items.entries()).filter(([_, qty]) => qty > 0)
      if (items.length === 0) {
        return { operation, result: { transferred: 0 } }
      }

      const [itemId, maxQty] = rng.choice(items)
      const quantity = rng.int(1, Math.max(1, maxQty))

      const result = manager.transfer('grid1', 'grid2', itemId, quantity)

      if (result.transferred > 0) {
        const newGrid1Qty = (state.grid1Items.get(itemId) || 0) - result.transferred
        if (newGrid1Qty <= 0) {
          state.grid1Items.delete(itemId)
        } else {
          state.grid1Items.set(itemId, newGrid1Qty)
        }

        state.grid2Items.set(itemId, (state.grid2Items.get(itemId) || 0) + result.transferred)
      }

      return { operation, itemId, quantity, result }
    }

    case FuzzOperation.TRANSFER_FROM_SECOND: {
      const items = Array.from(state.grid2Items.entries()).filter(([_, qty]) => qty > 0)
      if (items.length === 0) {
        return { operation, result: { transferred: 0 } }
      }

      const [itemId, maxQty] = rng.choice(items)
      const quantity = rng.int(1, Math.max(1, maxQty))

      const result = manager.transfer('grid2', 'grid1', itemId, quantity)

      if (result.transferred > 0) {
        const newGrid2Qty = (state.grid2Items.get(itemId) || 0) - result.transferred
        if (newGrid2Qty <= 0) {
          state.grid2Items.delete(itemId)
        } else {
          state.grid2Items.set(itemId, newGrid2Qty)
        }

        state.grid1Items.set(itemId, (state.grid1Items.get(itemId) || 0) + result.transferred)
      }

      return { operation, itemId, quantity, result }
    }

    case FuzzOperation.CONSOLIDATE: {
      manager.consolidate('grid1')
      return { operation, result: { success: true } }
    }

    case FuzzOperation.AUTO_ARRANGE: {
      manager.autoArrange('grid1')
      return { operation, result: { success: true } }
    }

    default:
      throw new Error(`Unknown operation: ${operation}`)
  }
}

// ============================================================================
// INVARIANT CHECKS
// ============================================================================

interface InvariantCheckResult {
  allPass: boolean
  checks: Record<string, boolean>
  errors: string[]
}

function checkAllInvariants(
  manager: InventoryManager,
  state: FuzzState,
  config: { allowStacking: boolean; allowRotation: boolean; maxStackSize: number }
): InvariantCheckResult {
  const errors: string[] = []
  const checks: Record<string, boolean> = {}

  try {
    const grid1 = manager.getGrid('grid1')
    const grid2 = manager.getGrid('grid2')

    // 1. Grid dimensions correct
    checks.gridDimensionsCorrect =
      grid1.length === 10 && grid1[0].length === 10 && grid2.length === 8 && grid2[0].length === 8
    if (!checks.gridDimensionsCorrect) {
      errors.push(
        `Grid dimensions incorrect: grid1=${grid1.length}x${grid1[0]?.length}, grid2=${grid2.length}x${grid2[0]?.length}`
      )
    }

    // 2. All cells valid
    checks.allCellsValid = validateAllCellsValid(grid1) && validateAllCellsValid(grid2)
    if (!checks.allCellsValid) errors.push('Invalid cells detected in grid')

    // 3. Each item has exactly one origin (per stack)
    checks.allItemsHaveOrigin = validateOrigins(grid1) && validateOrigins(grid2)
    if (!checks.allItemsHaveOrigin) errors.push('Items missing origin cells')

    // 4. Item cells match size
    checks.allItemsCellsMatchSize =
      validateItemSizes(manager, state, grid1) && validateItemSizes(manager, state, grid2)
    if (!checks.allItemsCellsMatchSize) errors.push('Item cell counts do not match item sizes')

    // 5. Positions in bounds
    checks.itemPositionsInBounds =
      validateBounds(grid1, 10, 10) && validateBounds(grid2, 8, 8)
    if (!checks.itemPositionsInBounds) errors.push('Items placed out of bounds')

    // 6. Total quantity matches
    checks.totalQuantityMatches =
      validateQuantities(manager, 'grid1', state.grid1Items) &&
      validateQuantities(manager, 'grid2', state.grid2Items)
    if (!checks.totalQuantityMatches) errors.push('Quantity mismatch between state and manager')

    // 7. Stacks within limits
    checks.stacksWithinLimits =
      validateStackLimits(grid1, config.maxStackSize) &&
      validateStackLimits(grid2, config.maxStackSize)
    if (!checks.stacksWithinLimits)
      errors.push(`Stacks exceed maxStackSize: ${config.maxStackSize}`)

    // 8. No zero quantity stacks
    checks.noZeroQuantityStacks = validateNoZeroStacks(grid1) && validateNoZeroStacks(grid2)
    if (!checks.noZeroQuantityStacks) errors.push('Zero quantity stacks detected')

    // 9. getContents matches grid
    checks.getContentsMatchesGrid =
      validateGetContents(manager, 'grid1', grid1) &&
      validateGetContents(manager, 'grid2', grid2)
    if (!checks.getContentsMatchesGrid) errors.push('getContents() does not match grid state')

    // 10. No items lost
    checks.noItemsLost = validateNoItemsLost(manager, state)
    if (!checks.noItemsLost) errors.push('Items lost during operations')

    // 11. Remaining capacity reasonable
    checks.remainingCapacityReasonable =
      validateRemainingCapacity(manager, 'grid1', grid1) &&
      validateRemainingCapacity(manager, 'grid2', grid2)
    if (!checks.remainingCapacityReasonable) errors.push('Remaining capacity calculation incorrect')

    // 12. isEmpty consistency
    checks.isEmptyConsistent =
      validateIsEmpty(manager, 'grid1', state.grid1Items) &&
      validateIsEmpty(manager, 'grid2', state.grid2Items)
    if (!checks.isEmptyConsistent) errors.push('isEmpty() inconsistent with actual state')
  } catch (e) {
    errors.push(`Exception during invariant check: ${e}`)
    return { allPass: false, checks, errors }
  }

  const allPass = Object.values(checks).every((v) => v)
  return { allPass, checks, errors }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function validateAllCellsValid(grid: GridCell[][]): boolean {
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== null) {
        if (typeof cell.itemId !== 'string') return false
        if (typeof cell.quantity !== 'number') return false
        if (cell.quantity < 0) return false
        if (typeof cell.isOrigin !== 'boolean') return false
      }
    }
  }
  return true
}

function validateOrigins(grid: GridCell[][]): boolean {
  // Collect all unique item instances (by checking grid positions)
  const itemInstances = new Set<string>()

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = grid[y][x]
      if (cell?.isOrigin) {
        // Use position as unique identifier for this item instance
        itemInstances.add(`${cell.itemId}-${x}-${y}`)
      }
    }
  }

  // Verify each origin has associated cells
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = grid[y][x]
      if (!cell) continue

      if (!cell.isOrigin) {
        // Non-origin cells should belong to an origin
        let foundOrigin = false
        for (let oy = 0; oy < grid.length; oy++) {
          for (let ox = 0; ox < grid[oy].length; ox++) {
            const originCell = grid[oy][ox]
            if (originCell?.itemId === cell.itemId && originCell?.isOrigin) {
              foundOrigin = true
              break
            }
          }
          if (foundOrigin) break
        }
        if (!foundOrigin) return false
      }
    }
  }

  return true
}

function validateItemSizes(
  manager: InventoryManager,
  state: FuzzState,
  grid: GridCell[][]
): boolean {
  // Group cells by itemId and origin position
  const itemGroups = new Map<string, GridCell[][]>()

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = grid[y][x]
      if (!cell) continue

      const key = cell.itemId
      if (!itemGroups.has(key)) {
        itemGroups.set(key, [])
      }

      // Find which group this cell belongs to
      let addedToGroup = false
      for (const group of itemGroups.get(key)!) {
        // Check if this cell is adjacent to any cell in the group
        const isAdjacent = group.some((groupCell) => {
          const gx = grid.findIndex((row) => row.includes(groupCell))
          const gy = grid[gx]?.indexOf(groupCell)
          return Math.abs(x - (gy ?? -99)) <= 1 && Math.abs(y - gx) <= 1
        })

        if (isAdjacent || group.length === 0) {
          group.push(cell)
          addedToGroup = true
          break
        }
      }

      if (!addedToGroup) {
        itemGroups.get(key)!.push([cell])
      }
    }
  }

  // For each item, verify size matches
  for (const [itemId, _groups] of itemGroups) {
    const template = state.itemTemplates.get(itemId)
    if (!template) continue

    // Count total cells for this item
    let totalCells = 0
    for (const row of grid) {
      for (const cell of row) {
        if (cell?.itemId === itemId) totalCells++
      }
    }

    // Each instance should occupy width * height cells
    const expectedCellsPerInstance = template.width * template.height

    // Total cells should be a multiple of expected cells per instance
    if (totalCells % expectedCellsPerInstance !== 0) {
      return false
    }
  }

  return true
}

function validateBounds(grid: GridCell[][], width: number, height: number): boolean {
  return grid.length === height && grid.every((row) => row.length === width)
}

function validateQuantities(
  manager: InventoryManager,
  containerId: string,
  expectedItems: Map<string, number>
): boolean {
  // Check all expected items
  for (const [itemId, expectedQty] of expectedItems) {
    const actualQty = manager.getQuantity(containerId, itemId)
    if (actualQty !== expectedQty) {
      return false
    }
  }

  // Check no extra items
  const contents = manager.getContents(containerId)
  for (const item of contents) {
    if (!expectedItems.has(item.itemId)) {
      return false
    }
  }

  return true
}

function validateStackLimits(grid: GridCell[][], maxStackSize: number): boolean {
  for (const row of grid) {
    for (const cell of row) {
      if (cell && cell.quantity > maxStackSize) {
        return false
      }
    }
  }
  return true
}

function validateNoZeroStacks(grid: GridCell[][]): boolean {
  for (const row of grid) {
    for (const cell of row) {
      if (cell && cell.quantity <= 0) {
        return false
      }
    }
  }
  return true
}

function validateGetContents(
  manager: InventoryManager,
  containerId: string,
  grid: GridCell[][]
): boolean {
  const contents = manager.getContents(containerId)
  const gridItems = new Map<string, number>()

  // Count items in grid (only origins to avoid double counting)
  for (const row of grid) {
    for (const cell of row) {
      if (cell?.isOrigin) {
        gridItems.set(cell.itemId, (gridItems.get(cell.itemId) || 0) + cell.quantity)
      }
    }
  }

  // Compare with contents
  if (contents.length !== gridItems.size) return false

  for (const item of contents) {
    if (gridItems.get(item.itemId) !== item.quantity) {
      return false
    }
  }

  return true
}

function validateNoItemsLost(manager: InventoryManager, state: FuzzState): boolean {
  const totalExpected = new Map<string, number>()

  // Sum across both grids
  for (const [itemId, qty] of state.grid1Items) {
    totalExpected.set(itemId, (totalExpected.get(itemId) || 0) + qty)
  }
  for (const [itemId, qty] of state.grid2Items) {
    totalExpected.set(itemId, (totalExpected.get(itemId) || 0) + qty)
  }

  // Check actual quantities
  for (const [itemId, expectedQty] of totalExpected) {
    const actualQty =
      manager.getQuantity('grid1', itemId) + manager.getQuantity('grid2', itemId)
    if (actualQty !== expectedQty) {
      return false
    }
  }

  return true
}

function validateRemainingCapacity(
  manager: InventoryManager,
  containerId: string,
  grid: GridCell[][]
): boolean {
  const capacity = manager.getRemainingCapacity(containerId)
  if (capacity.type !== 'cells') return false

  // Count empty cells
  let emptyCells = 0
  for (const row of grid) {
    for (const cell of row) {
      if (cell === null) emptyCells++
    }
  }

  return capacity.remaining === emptyCells
}

function validateIsEmpty(
  manager: InventoryManager,
  containerId: string,
  expectedItems: Map<string, number>
): boolean {
  const isEmpty = manager.isEmpty(containerId)
  const shouldBeEmpty = expectedItems.size === 0

  return isEmpty === shouldBeEmpty
}

// ============================================================================
// FAILURE REPORTING
// ============================================================================

function reportFuzzerFailure(
  history: OperationResult[],
  invariants: InvariantCheckResult,
  failureIndex: number,
  seed: number
): void {
  console.error('\n' + '='.repeat(80))
  console.error('FUZZER FAILURE DETECTED')
  console.error('='.repeat(80))
  console.error(`Failed at operation ${failureIndex}`)
  console.error(`Seed: ${seed}`)
  console.error('')

  console.error('Failed invariants:')
  for (const [check, passed] of Object.entries(invariants.checks)) {
    if (!passed) {
      console.error(`  ✗ ${check}`)
    }
  }

  if (invariants.errors.length > 0) {
    console.error('\nErrors:')
    for (const error of invariants.errors) {
      console.error(`  - ${error}`)
    }
  }

  console.error('\nOperation history (last 20):')
  const start = Math.max(0, failureIndex - 19)
  for (let i = start; i <= failureIndex; i++) {
    const op = history[i]
    const marker = i === failureIndex ? ' ← FAILED HERE' : ''
    console.error(`  ${i.toString().padStart(4)}: ${formatOperation(op)}${marker}`)
  }

  console.error('\nTo reproduce:')
  console.error(`  - Use seed: ${seed}`)
  console.error(`  - Run ${failureIndex + 1} operations`)
  console.error('='.repeat(80))
}

function formatOperation(op: OperationResult): string {
  let str = op.operation
  if (op.itemId) str += ` itemId=${op.itemId}`
  if (op.quantity) str += ` qty=${op.quantity}`
  if (op.position) str += ` pos=(${op.position.x},${op.position.y}${op.position.rotated ? ',rot' : ''})`
  return str
}

// ============================================================================
// MAIN FUZZER TESTS
// ============================================================================

describe('Grid Inventory Fuzzer', () => {
  const configurations = [
    { allowStacking: false, allowRotation: false, maxStackSize: 1 },
    { allowStacking: false, allowRotation: true, maxStackSize: 1 },
    { allowStacking: true, allowRotation: false, maxStackSize: 5 },
    { allowStacking: true, allowRotation: false, maxStackSize: 99 },
    { allowStacking: true, allowRotation: true, maxStackSize: 5 },
    { allowStacking: true, allowRotation: true, maxStackSize: 99 },
  ]

  for (const config of configurations) {
    describe(`Config: stacking=${config.allowStacking}, rotation=${config.allowRotation}, maxStack=${config.maxStackSize}`, () => {
      it('fuzzer: maintains invariants under 500 random operations', () => {
        const SEED = 12345
        const OPERATIONS_COUNT = 500
        const rng = new SeededRandom(SEED)

        // Setup
        const manager = createInventoryManager({
          getItemSize: (itemId): ItemSize => {
            const templateId = itemId.substring(0, itemId.lastIndexOf('-'))
            const template = ITEM_TEMPLATES.find((t) => t.id === templateId)
            if (!template) return { width: 1, height: 1 }
            return { width: template.width, height: template.height }
          },
          getItemWeight: (itemId): number => {
            const templateId = itemId.substring(0, itemId.lastIndexOf('-'))
            const template = ITEM_TEMPLATES.find((t) => t.id === templateId)
            return template?.weight || 1
          },
          getItemStackLimit: () => config.maxStackSize,
        })

        manager.createContainer('grid1', {
          mode: 'grid',
          width: 10,
          height: 10,
          allowStacking: config.allowStacking,
          allowRotation: config.allowRotation,
          maxStackSize: config.maxStackSize,
        })

        manager.createContainer('grid2', {
          mode: 'grid',
          width: 8,
          height: 8,
          allowStacking: config.allowStacking,
          allowRotation: config.allowRotation,
          maxStackSize: config.maxStackSize,
        })

        // Track state
        const state: FuzzState = {
          operationHistory: [],
          itemInstanceCounter: 0,
          grid1Items: new Map(),
          grid2Items: new Map(),
          itemTemplates: new Map(),
        }

        // Execute random operations
        for (let i = 0; i < OPERATIONS_COUNT; i++) {
          const operation = selectRandomOperation(rng, state)
          const result = executeOperation(manager, operation, rng, state, config)

          state.operationHistory.push(result)

          // Check invariants after each operation
          const invariants = checkAllInvariants(manager, state, config)

          if (!invariants.allPass) {
            reportFuzzerFailure(state.operationHistory, invariants, i, SEED)
            expect(invariants.allPass).toBe(true)
          }
        }

        // Final validation
        expect(state.operationHistory.length).toBe(OPERATIONS_COUNT)
      })
    })
  }

  // Additional stress tests
  describe('Stress Tests', () => {
    it('fuzzer: handles mostly small items (1x1)', () => {
      const SEED = 54321
      const OPERATIONS_COUNT = 300
      const rng = new SeededRandom(SEED)

      const manager = createInventoryManager({
        getItemSize: () => ({ width: 1, height: 1 }),
        getItemWeight: () => 1,
        getItemStackLimit: () => 10,
      })

      manager.createContainer('grid1', {
        mode: 'grid',
        width: 10,
        height: 10,
        allowStacking: true,
        maxStackSize: 10,
      })

      manager.createContainer('grid2', {
        mode: 'grid',
        width: 8,
        height: 8,
        allowStacking: true,
        maxStackSize: 10,
      })

      const state: FuzzState = {
        operationHistory: [],
        itemInstanceCounter: 0,
        grid1Items: new Map(),
        grid2Items: new Map(),
        itemTemplates: new Map(),
      }

      // Fill with small items
      for (let i = 0; i < OPERATIONS_COUNT; i++) {
        const operation = selectRandomOperation(rng, state)
        const result = executeOperation(
          manager,
          operation,
          rng,
          state,
          { allowStacking: true, allowRotation: false, maxStackSize: 10 }
        )

        state.operationHistory.push(result)

        const invariants = checkAllInvariants(manager, state, {
          allowStacking: true,
          allowRotation: false,
          maxStackSize: 10,
        })

        if (!invariants.allPass) {
          reportFuzzerFailure(state.operationHistory, invariants, i, SEED)
          expect(invariants.allPass).toBe(true)
        }
      }

      expect(state.operationHistory.length).toBe(OPERATIONS_COUNT)
    })

    it('fuzzer: handles rapid add/remove cycles', () => {
      const SEED = 99999
      const CYCLES = 100
      const rng = new SeededRandom(SEED)

      const manager = createInventoryManager({
        getItemSize: () => ({ width: 2, height: 2 }),
        getItemWeight: () => 4,
        getItemStackLimit: () => 1,
      })

      manager.createContainer('grid1', {
        mode: 'grid',
        width: 10,
        height: 10,
        allowStacking: false,
        maxStackSize: 1,
      })

      manager.createContainer('grid2', {
        mode: 'grid',
        width: 8,
        height: 8,
        allowStacking: false,
        maxStackSize: 1,
      })

      const state: FuzzState = {
        operationHistory: [],
        itemInstanceCounter: 0,
        grid1Items: new Map(),
        grid2Items: new Map(),
        itemTemplates: new Map(),
      }

      // Rapid add/remove
      for (let i = 0; i < CYCLES; i++) {
        // Add
        const addOp = executeOperation(
          manager,
          FuzzOperation.ADD_ITEM,
          rng,
          state,
          { allowStacking: false, allowRotation: false, maxStackSize: 1 }
        )
        state.operationHistory.push(addOp)

        // Remove
        if (state.grid1Items.size > 0) {
          const removeOp = executeOperation(
            manager,
            FuzzOperation.REMOVE_ITEM,
            rng,
            state,
            { allowStacking: false, allowRotation: false, maxStackSize: 1 }
          )
          state.operationHistory.push(removeOp)
        }

        const invariants = checkAllInvariants(manager, state, {
          allowStacking: false,
          allowRotation: false,
          maxStackSize: 1,
        })

        if (!invariants.allPass) {
          reportFuzzerFailure(state.operationHistory, invariants, i, SEED)
          expect(invariants.allPass).toBe(true)
        }
      }

      expect(state.operationHistory.length).toBeGreaterThan(0)
    })
  })
})
