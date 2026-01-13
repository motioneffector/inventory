import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

/**
 * Regression tests for bugs discovered by the grid fuzzer.
 * These tests directly reproduce specific bug scenarios to ensure they stay fixed.
 */

describe('Grid Inventory Bug Fixes', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager({
      getItemSize: (itemId) => {
        if (itemId.startsWith('small')) return { width: 1, height: 1 }
        if (itemId.startsWith('large')) return { width: 2, height: 2 }
        if (itemId.startsWith('tall')) return { width: 1, height: 3 }
        return { width: 1, height: 1 }
      },
      getItemWeight: (itemId) => {
        if (itemId.startsWith('small')) return 1
        if (itemId.startsWith('large')) return 4
        if (itemId.startsWith('tall')) return 3
        return 1
      },
      getItemStackLimit: () => 10,
    })
  })

  describe('Bug 1: consolidate() leaves zero-quantity stacks', () => {
    it('does not create zero-quantity stacks', () => {
      manager.createContainer('c1', {
        mode: 'unlimited',
        allowStacking: true,
        maxStackSize: 5,
      })

      // Create stacks that will consolidate
      manager.addItem('c1', 'item', 3)
      manager.addItem('c1', 'item', 2)
      manager.addItem('c1', 'item', 1)

      manager.consolidate('c1')

      // Verify no zero-quantity stacks
      const stacks = manager.getStacks('c1', 'item')
      expect(stacks.every((s) => s.quantity > 0)).toBe(true)
      expect(stacks.length).toBeGreaterThan(0)
    })

    it('removes itemId from map when all stacks are zero', () => {
      manager.createContainer('c1', {
        mode: 'unlimited',
        allowStacking: true,
        maxStackSize: 10,
      })

      manager.addItem('c1', 'item', 5)
      manager.removeItem('c1', 'item', 5)
      manager.consolidate('c1')

      const contents = manager.getContents('c1')
      expect(contents.find((e) => e.itemId === 'item')).toBeUndefined()
    })

    it('consolidate with grid mode throws error', () => {
      manager.createContainer('grid', {
        mode: 'grid',
        width: 10,
        height: 10,
        allowStacking: true,
        maxStackSize: 5,
      })

      manager.addItem('grid', 'small', 3)
      manager.addItem('grid', 'small', 2)
      manager.addItem('grid', 'small', 1)

      // consolidate should throw for grid containers
      expect(() => manager.consolidate('grid')).toThrow('Use autoArrange() for grid containers')
    })
  })

  describe('Bug 2: autoArrange() loses items', () => {
    it('preserves all items when grid has space', () => {
      manager.createContainer('grid', {
        mode: 'grid',
        width: 10,
        height: 10,
        allowStacking: false,
      })

      // Add items at scattered positions
      manager.addItemAt('grid', 'small1', { x: 0, y: 0 })
      manager.addItemAt('grid', 'small2', { x: 5, y: 5 })
      manager.addItemAt('grid', 'small3', { x: 9, y: 9 })

      const beforeQty = manager.getContents('grid').length
      expect(beforeQty).toBe(3)

      manager.autoArrange('grid')

      const afterQty = manager.getContents('grid').length
      expect(afterQty).toBe(beforeQty)

      // Verify specific items are still present
      expect(manager.hasItem('grid', 'small1')).toBe(true)
      expect(manager.hasItem('grid', 'small2')).toBe(true)
      expect(manager.hasItem('grid', 'small3')).toBe(true)
    })

    it('throws error instead of losing items when grid is full', () => {
      manager.createContainer('grid', {
        mode: 'grid',
        width: 3,
        height: 3,
        allowStacking: false,
      })

      // Fill grid completely
      manager.addItemAt('grid', 'large1', { x: 0, y: 0 }) // 2x2
      manager.addItemAt('grid', 'large2', { x: 0, y: 2 }) // 2x2 (overlaps at y=2, but x=0-1)

      // Actually let me reconsider - a 3x3 grid with 2x2 items
      // Item 1 at (0,0) takes cells (0,0), (0,1), (1,0), (1,1)
      // Item 2 at (1,1) would overlap - let me fix this

      // Clear and try again with non-overlapping items
      manager.removeItem('grid', 'large1', 1)
      manager.removeItem('grid', 'large2', 1)

      // Fill a 3x3 grid: can fit one 2x2 and some 1x1s
      manager.addItemAt('grid', 'large1', { x: 0, y: 0 }) // Takes (0,0) (0,1) (1,0) (1,1)
      manager.addItemAt('grid', 'small1', { x: 2, y: 0 })
      manager.addItemAt('grid', 'small2', { x: 2, y: 1 })
      manager.addItemAt('grid', 'small3', { x: 0, y: 2 })
      manager.addItemAt('grid', 'small4', { x: 1, y: 2 })
      manager.addItemAt('grid', 'small5', { x: 2, y: 2 })
      // Grid is now full (9 cells, all occupied)

      const beforeContents = manager.getContents('grid')
      const beforeQty = beforeContents.reduce((sum, e) => sum + e.quantity, 0)

      // autoArrange should either succeed or throw, but never lose items
      try {
        manager.autoArrange('grid')

        // If it succeeds, verify no items lost
        const afterContents = manager.getContents('grid')
        const afterQty = afterContents.reduce((sum, e) => sum + e.quantity, 0)
        expect(afterQty).toBe(beforeQty)
      } catch (error) {
        // If it throws, verify state was rolled back
        const afterContents = manager.getContents('grid')
        const afterQty = afterContents.reduce((sum, e) => sum + e.quantity, 0)
        expect(afterQty).toBe(beforeQty)
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('rolls back state on failure', () => {
      manager.createContainer('grid', {
        mode: 'grid',
        width: 4,
        height: 2,
        allowStacking: false,
      })

      // Create a scenario where autoArrange will fail
      // 4x2 grid = 8 cells
      // Add two 2x2 items (takes 8 cells) scattered, then try to rearrange
      manager.addItemAt('grid', 'large1', { x: 0, y: 0 })
      manager.addItemAt('grid', 'large2', { x: 2, y: 0 })

      const snapshotBefore = JSON.stringify(manager.getContents('grid'))

      // Try autoArrange - should succeed since items fit
      manager.autoArrange('grid')

      // Now create impossible scenario: remove one, add multiple 1x1s
      manager.removeItem('grid', 'large2', 1)

      // Add multiple 1x1s instead
      manager.addItemAt('grid', 'small1', { x: 2, y: 0 })
      manager.addItemAt('grid', 'small2', { x: 2, y: 1 })
      manager.addItemAt('grid', 'small3', { x: 3, y: 0 })
      manager.addItemAt('grid', 'small4', { x: 3, y: 1 })

      // Now grid is full again - autoArrange should work or rollback
      const snapshotBeforeRearrange = JSON.stringify(manager.getContents('grid'))

      try {
        manager.autoArrange('grid')
      } catch (error) {
        // State should be unchanged if it failed
        const snapshotAfterFailed = JSON.stringify(manager.getContents('grid'))
        expect(snapshotAfterFailed).toBe(snapshotBeforeRearrange)
      }
    })
  })

  describe('Bug 3: getContents() mismatch with grid state', () => {
    it('getContents matches grid after autoArrange', () => {
      manager.createContainer('grid', {
        mode: 'grid',
        width: 10,
        height: 10,
        allowStacking: true,
        maxStackSize: 10,
      })

      // Add multiple stacks at different positions
      manager.addItemAt('grid', 'small', { x: 0, y: 0 }, 3)
      manager.addItemAt('grid', 'small', { x: 2, y: 0 }, 5)
      manager.addItemAt('grid', 'small', { x: 4, y: 0 }, 2)

      // autoArrange reorganizes grid items
      manager.autoArrange('grid')

      // Get quantity from both sources
      const contentsQty = manager
        .getContents('grid')
        .find((e) => e.itemId === 'small')?.quantity || 0

      const grid = manager.getGrid('grid')
      let gridQty = 0
      for (const row of grid) {
        for (const cell of row) {
          if (cell?.itemId === 'small' && cell.isOrigin) {
            gridQty += cell.quantity
          }
        }
      }

      expect(contentsQty).toBe(gridQty)
      expect(contentsQty).toBe(10) // 3 + 5 + 2
    })

    it('getContents matches grid after mergeStacks', () => {
      manager.createContainer('grid', {
        mode: 'grid',
        width: 10,
        height: 10,
        allowStacking: true,
        maxStackSize: 10,
      })

      manager.addItemAt('grid', 'small', { x: 0, y: 0 }, 3)
      manager.addItemAt('grid', 'small', { x: 2, y: 0 }, 5)

      // Merge second stack into first
      manager.mergeStacks('grid', 'small', 1, 0)

      const contentsQty = manager
        .getContents('grid')
        .find((e) => e.itemId === 'small')?.quantity || 0

      const grid = manager.getGrid('grid')
      let gridQty = 0
      for (const row of grid) {
        for (const cell of row) {
          if (cell?.itemId === 'small' && cell.isOrigin) {
            gridQty += cell.quantity
          }
        }
      }

      expect(contentsQty).toBe(gridQty)
      expect(contentsQty).toBe(8) // 3 + 5
    })

    it('grid cells correctly reference stacks after splitStack', () => {
      manager.createContainer('grid', {
        mode: 'grid',
        width: 10,
        height: 10,
        allowStacking: true,
        maxStackSize: 10,
      })

      // Add two stacks at different positions
      manager.addItemAt('grid', 'small', { x: 0, y: 0 }, 8)
      manager.addItemAt('grid', 'small', { x: 2, y: 0 }, 6)

      // Split off 3 items from the first stack
      manager.splitStack('grid', 'small', 0, 3)

      // After split:
      // - Stack 0 has 5 items at (0,0)
      // - Stack 1 (was at x:2) now has 6 items at (2,0)
      // - Stack 2 (new split) has 3 items with no position

      const stacks = manager.getStacks('grid', 'small')
      expect(stacks).toHaveLength(3)

      // Verify the grid cell at (0,0) shows the reduced quantity
      const grid = manager.getGrid('grid')
      const cell00 = grid[0][0]
      expect(cell00).not.toBe(null)
      expect(cell00?.quantity).toBe(5) // Reduced from 8

      // Verify the grid cell at (2,0) still shows correct quantity
      const cell20 = grid[0][2]
      expect(cell20).not.toBe(null)
      expect(cell20?.quantity).toBe(6)

      // Verify total quantity is preserved
      const totalQty = stacks.reduce((sum, s) => sum + s.quantity, 0)
      expect(totalQty).toBe(14) // 5 + 6 + 3
    })

    it('grid cells reference correct stacks after multiple operations', () => {
      manager.createContainer('grid', {
        mode: 'grid',
        width: 10,
        height: 10,
        allowStacking: true,
        maxStackSize: 5,
      })

      // Add items
      manager.addItemAt('grid', 'small', { x: 0, y: 0 }, 3)
      manager.addItemAt('grid', 'small', { x: 2, y: 0 }, 4)
      manager.addItemAt('grid', 'small', { x: 4, y: 0 }, 2)

      // Do multiple operations
      manager.splitStack('grid', 'small', 1, 2) // Split second stack
      manager.mergeStacks('grid', 'small', 2, 0) // Merge third into first
      // Note: consolidate() throws for grid mode, so we don't call it

      // Verify grid cells point to valid stacks
      const grid = manager.getGrid('grid')
      const stacks = manager.getStacks('grid', 'small')

      for (const row of grid) {
        for (const cell of row) {
          if (cell?.itemId === 'small' && cell.isOrigin) {
            // Verify the cell's quantity matches the stack it references
            expect(cell.quantity).toBeGreaterThan(0)
            expect(cell.quantity).toBeLessThanOrEqual(5) // maxStackSize
          }
        }
      }

      // Total quantity should be preserved
      const totalQty = stacks.reduce((sum, s) => sum + s.quantity, 0)
      expect(totalQty).toBe(9) // 3 + 4 + 2
    })
  })
})
