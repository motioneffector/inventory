import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Grid Mode', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager({
      getItemSize: (itemId) => {
        if (itemId === 'small') return { width: 1, height: 1 }
        if (itemId === 'large') return { width: 2, height: 2 }
        if (itemId === 'tall') return { width: 1, height: 3 }
        if (itemId === 'wide') return { width: 3, height: 1 }
        return { width: 1, height: 1 }
      },
    })
  })

  describe('Basic Operations', () => {
    it('creates grid with width and height', () => {
      manager.createContainer('c1', { mode: 'grid', width: 10, height: 6 })
      const grid = manager.getGrid('c1')
      expect(grid).toHaveLength(6)
      expect(grid[0]).toHaveLength(10)
    })

    it('addItem places in first available spot', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      const result = manager.addItem('c1', 'small', 1)
      expect(result.success).toBe(true)
    })

    it('addItem fails when no space', () => {
      manager.createContainer('c1', { mode: 'grid', width: 2, height: 2 })
      manager.addItem('c1', 'large', 1)
      const result = manager.addItem('c1', 'small', 1)
      expect(result.success).toBe(false)
    })

    it('reports reason "no_space"', () => {
      manager.createContainer('c1', { mode: 'grid', width: 1, height: 1 })
      manager.addItem('c1', 'small', 1)
      const result = manager.addItem('c1', 'small', 1)
      expect(result.reason).toBe('no_space')
    })
  })

  describe('Item Sizes', () => {
    it('uses getItemSize for dimensions', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItem('c1', 'large', 1)
      const grid = manager.getGrid('c1')
      let occupiedCells = 0
      for (const row of grid) {
        for (const cell of row) {
          if (cell !== null) occupiedCells++
        }
      }
      expect(occupiedCells).toBe(4)
    })

    it('2x2 item occupies 4 cells', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItem('c1', 'large', 1)
      const grid = manager.getGrid('c1')
      let occupiedCells = 0
      for (const row of grid) {
        for (const cell of row) {
          if (cell !== null) occupiedCells++
        }
      }
      expect(occupiedCells).toBe(4)
    })

    it('items cannot overlap', () => {
      manager.createContainer('c1', { mode: 'grid', width: 3, height: 3 })
      manager.addItemAt('c1', 'large', { x: 0, y: 0 })
      const result = manager.addItemAt('c1', 'small', { x: 1, y: 1 })
      expect(result.success).toBe(false)
    })
  })

  describe('Positioning', () => {
    it('addItemAt places at specific position', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      const result = manager.addItemAt('c1', 'small', { x: 2, y: 3 })
      expect(result.success).toBe(true)
    })

    it('addItemAt fails if position occupied', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItemAt('c1', 'small', { x: 2, y: 2 })
      const result = manager.addItemAt('c1', 'small', { x: 2, y: 2 })
      expect(result.success).toBe(false)
    })

    it('addItemAt fails if item doesn\'t fit', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      const result = manager.addItemAt('c1', 'large', { x: 4, y: 4 })
      expect(result.success).toBe(false)
    })

    it('validates position bounds', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      const result = manager.addItemAt('c1', 'small', { x: 10, y: 10 })
      expect(result.success).toBe(false)
    })
  })

  describe('Rotation', () => {
    it('allowRotation: true enables rotation', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5, allowRotation: true })
      const placements = manager.findPlacements('c1', 'tall')
      const hasRotated = placements.some((p) => p.rotated)
      expect(hasRotated).toBe(true)
    })

    it('rotated item has swapped dimensions', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5, allowRotation: true })
      const result = manager.addItemAt('c1', 'tall', { x: 0, y: 0, rotated: true })
      expect(result.success).toBe(true)
    })

    it('addItem tries rotated fit', () => {
      manager.createContainer('c1', { mode: 'grid', width: 3, height: 1, allowRotation: true })
      const result = manager.addItem('c1', 'tall', 1)
      expect(result.success).toBe(true)
    })

    it('addItemAt accepts rotated option', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5, allowRotation: true })
      const result = manager.addItemAt('c1', 'wide', { x: 0, y: 0, rotated: true })
      expect(result.success).toBe(true)
    })
  })

  describe('Grid State', () => {
    it('getGrid returns 2D array', () => {
      manager.createContainer('c1', { mode: 'grid', width: 3, height: 4 })
      const grid = manager.getGrid('c1')
      expect(Array.isArray(grid)).toBe(true)
      expect(grid).toHaveLength(4)
      expect(grid[0]).toHaveLength(3)
    })

    it('empty cells are null', () => {
      manager.createContainer('c1', { mode: 'grid', width: 3, height: 3 })
      const grid = manager.getGrid('c1')
      expect(grid[0]?.[0]).toBe(null)
    })

    it('occupied cells have itemId', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItem('c1', 'small', 1)
      const grid = manager.getGrid('c1')
      let foundItem = false
      for (const row of grid) {
        for (const cell of row) {
          if (cell !== null && cell.itemId === 'small') {
            foundItem = true
          }
        }
      }
      expect(foundItem).toBe(true)
    })

    it('occupied cells have quantity', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItem('c1', 'small', 1)
      const grid = manager.getGrid('c1')
      let foundQuantity = false
      for (const row of grid) {
        for (const cell of row) {
          if (cell !== null && typeof cell.quantity === 'number') {
            foundQuantity = true
          }
        }
      }
      expect(foundQuantity).toBe(true)
    })

    it('occupied cells indicate isOrigin', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItem('c1', 'large', 1)
      const grid = manager.getGrid('c1')
      let foundOrigin = false
      for (const row of grid) {
        for (const cell of row) {
          if (cell !== null && cell.isOrigin === true) {
            foundOrigin = true
          }
        }
      }
      expect(foundOrigin).toBe(true)
    })

    it('multi-cell items share itemId', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItem('c1', 'large', 1)
      const grid = manager.getGrid('c1')
      const itemIds = new Set<string>()
      for (const row of grid) {
        for (const cell of row) {
          if (cell !== null) {
            itemIds.add(cell.itemId)
          }
        }
      }
      expect(itemIds.size).toBe(1)
    })
  })

  describe('Finding Placements', () => {
    it('findPlacements returns valid positions', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      const placements = manager.findPlacements('c1', 'small')
      expect(placements.length).toBeGreaterThan(0)
    })

    it('includes rotation variants', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5, allowRotation: true })
      const placements = manager.findPlacements('c1', 'tall')
      const hasRotated = placements.some((p) => p.rotated)
      expect(hasRotated).toBe(true)
    })

    it('returns empty array if no fit', () => {
      manager.createContainer('c1', { mode: 'grid', width: 2, height: 2 })
      manager.addItem('c1', 'large', 1)
      const placements = manager.findPlacements('c1', 'small')
      expect(placements).toEqual([])
    })
  })

  describe('Stacking in Grid', () => {
    it('stacks on same cell when allowed', () => {
      manager.createContainer('c1', {
        mode: 'grid',
        width: 5,
        height: 5,
        allowStacking: true,
        maxStackSize: 10,
      })
      manager.addItemAt('c1', 'small', { x: 0, y: 0 }, 5)
      const result = manager.addItemAt('c1', 'small', { x: 0, y: 0 }, 3)
      expect(result.success).toBe(true)
    })

    it('respects maxStackSize per cell', () => {
      manager.createContainer('c1', {
        mode: 'grid',
        width: 5,
        height: 5,
        allowStacking: true,
        maxStackSize: 10,
      })
      manager.addItemAt('c1', 'small', { x: 0, y: 0 }, 10)
      const result = manager.addItemAt('c1', 'small', { x: 0, y: 0 }, 1)
      expect(result.success).toBe(false)
    })
  })
})
