import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Combined Mode', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager({
      getItemWeight: (itemId) => (itemId === 'heavy' ? 10 : 1),
    })
  })

  describe('Multiple Rules', () => {
    it('checks all rules in order', () => {
      manager.createContainer('c1', {
        mode: 'combined',
        rules: [
          { mode: 'count', maxCount: 5 },
          { mode: 'weight', maxWeight: 50 },
        ],
      })
      const result = manager.addItem('c1', 'item', 1)
      expect(result.success).toBe(true)
    })

    it('fails if any rule fails', () => {
      manager.createContainer('c1', {
        mode: 'combined',
        rules: [
          { mode: 'count', maxCount: 1 },
          { mode: 'weight', maxWeight: 100 },
        ],
      })
      manager.addItem('c1', 'item1', 1)
      const result = manager.addItem('c1', 'item2', 1)
      expect(result.success).toBe(false)
    })

    it('reports first failure reason', () => {
      manager.createContainer('c1', {
        mode: 'combined',
        rules: [
          { mode: 'count', maxCount: 1 },
          { mode: 'weight', maxWeight: 100 },
        ],
      })
      manager.addItem('c1', 'item1', 1)
      const result = manager.addItem('c1', 'item2', 1)
      expect(result.reason).toBe('count_exceeded')
    })

    it('weight + count combination works', () => {
      manager.createContainer('c1', {
        mode: 'combined',
        rules: [
          { mode: 'weight', maxWeight: 50 },
          { mode: 'count', maxCount: 10 },
        ],
      })
      manager.addItem('c1', 'heavy', 4)
      const result = manager.addItem('c1', 'heavy', 2)
      expect(result.success).toBe(false)
      expect(result.reason).toBe('weight_exceeded')
    })

    it('grid + weight combination works', () => {
      const mgr = createInventoryManager({
        getItemWeight: (itemId) => 5,
        getItemSize: (itemId) => ({ width: 1, height: 1 }),
      })
      mgr.createContainer('c1', {
        mode: 'combined',
        rules: [
          { mode: 'grid', width: 2, height: 2 },
          { mode: 'weight', maxWeight: 15 },
        ],
      })
      mgr.addItem('c1', 'item', 3)
      const result = mgr.addItem('c1', 'item', 1)
      expect(result.success).toBe(false)
    })
  })
})
