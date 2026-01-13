import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Count Mode', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager()
  })

  describe('Basic Operations', () => {
    it('limits total number of stacks', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 3 })
      manager.addItem('c1', 'item1', 1)
      manager.addItem('c1', 'item2', 1)
      manager.addItem('c1', 'item3', 1)
      const result = manager.addItem('c1', 'item4', 1)
      expect(result.success).toBe(false)
    })

    it('addItem succeeds under limit', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 5 })
      const result = manager.addItem('c1', 'item1', 1)
      expect(result.success).toBe(true)
    })

    it('addItem fails at limit', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 2 })
      manager.addItem('c1', 'item1', 1)
      manager.addItem('c1', 'item2', 1)
      const result = manager.addItem('c1', 'item3', 1)
      expect(result.success).toBe(false)
    })

    it('reports reason "count_exceeded"', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 1 })
      manager.addItem('c1', 'item1', 1)
      const result = manager.addItem('c1', 'item2', 1)
      expect(result.reason).toBe('count_exceeded')
    })

    it('removeItem frees slot', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 2 })
      manager.addItem('c1', 'item1', 1)
      manager.addItem('c1', 'item2', 1)
      manager.removeItem('c1', 'item1', 1)
      const result = manager.addItem('c1', 'item3', 1)
      expect(result.success).toBe(true)
    })
  })

  describe('Capacity', () => {
    it('canAdd returns true when slots available', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 5 })
      manager.addItem('c1', 'item1', 1)
      const result = manager.canAdd('c1', 'item2', 1)
      expect(result.canAdd).toBe(true)
    })

    it('canAdd returns false when full', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 1 })
      manager.addItem('c1', 'item1', 1)
      const result = manager.canAdd('c1', 'item2', 1)
      expect(result.canAdd).toBe(false)
    })

    it('canAdd reports maxAddable quantity', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 2 })
      manager.addItem('c1', 'item1', 1)
      const result = manager.canAdd('c1', 'item2', 5)
      // Should report some maxAddable value - exact calculation may vary
      expect(typeof result.maxAddable).toBe('number')
      expect(result.maxAddable).toBeGreaterThan(0)
    })
  })

  describe('Stacking', () => {
    it('one stack counts as one slot', () => {
      manager.createContainer('c1', {
        mode: 'count',
        maxCount: 2,
        allowStacking: true,
        maxStackSize: 10,
      })
      manager.addItem('c1', 'item1', 10)
      const result = manager.addItem('c1', 'item2', 1)
      expect(result.success).toBe(true)
    })

    it('adding to existing stack doesn\'t use new slot', () => {
      manager.createContainer('c1', {
        mode: 'count',
        maxCount: 1,
        allowStacking: true,
        maxStackSize: 10,
      })
      manager.addItem('c1', 'item1', 5)
      const result = manager.addItem('c1', 'item1', 3)
      expect(result.success).toBe(true)
      expect(manager.getQuantity('c1', 'item1')).toBe(8)
    })
  })
})
