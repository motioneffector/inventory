import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Weight Mode', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager({
      getItemWeight: (itemId) => {
        if (itemId === 'heavy') return 10
        if (itemId === 'light') return 1
        return 5
      },
    })
  })

  describe('Basic Operations', () => {
    it('tracks total weight', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 100 })
      manager.addItem('c1', 'heavy', 2)
      expect(manager.getTotalWeight('c1')).toBe(20)
    })

    it('addItem succeeds under weight limit', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 50 })
      const result = manager.addItem('c1', 'light', 10)
      expect(result.success).toBe(true)
    })

    it('addItem fails when would exceed', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 20 })
      const result = manager.addItem('c1', 'heavy', 3)
      expect(result.success).toBe(false)
    })

    it('reports reason "weight_exceeded"', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 5 })
      const result = manager.addItem('c1', 'heavy', 1)
      expect(result.reason).toBe('weight_exceeded')
    })

    it('calculates weight using getItemWeight', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 100 })
      manager.addItem('c1', 'heavy', 1)
      manager.addItem('c1', 'light', 1)
      expect(manager.getTotalWeight('c1')).toBe(11)
    })
  })

  describe('Partial Add', () => {
    it('adds as many as weight allows', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 25 })
      const result = manager.addItem('c1', 'heavy', 5)
      expect(result.added).toBe(2)
    })

    it('returns overflow count', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 25 })
      const result = manager.addItem('c1', 'heavy', 5)
      expect(result.overflow).toBe(3)
    })

    it('addItem partial success possible', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 25 })
      const result = manager.addItem('c1', 'heavy', 5)
      expect(result.success).toBe(false)
      expect(result.added).toBeGreaterThan(0)
    })
  })

  describe('Queries', () => {
    it('getTotalWeight returns current weight', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 100 })
      manager.addItem('c1', 'heavy', 2)
      manager.addItem('c1', 'light', 5)
      expect(manager.getTotalWeight('c1')).toBe(25)
    })

    it('getRemainingCapacity returns available weight', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 100 })
      manager.addItem('c1', 'heavy', 2)
      const capacity = manager.getRemainingCapacity('c1')
      expect(capacity.type).toBe('weight')
      if (capacity.type === 'weight') {
        expect(capacity.remaining).toBe(80)
      }
    })
  })
})
