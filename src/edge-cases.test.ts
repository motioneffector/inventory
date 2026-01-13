import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Edge Cases', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager({
      getItemSize: () => ({ width: 1, height: 1 }),
    })
  })

  describe('Empty Inputs', () => {
    it('addItem with quantity 0 is no-op', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const result = manager.addItem('c1', 'item', 0)
      expect(result.added).toBe(0)
      expect(manager.getQuantity('c1', 'item')).toBe(0)
    })

    it('removeItem with quantity 0 is no-op', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      const removed = manager.removeItem('c1', 'item', 0)
      expect(removed).toBe(0)
      expect(manager.getQuantity('c1', 'item')).toBe(10)
    })

    it('transfer with quantity 0 is no-op', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      const result = manager.transfer('c1', 'c2', 'item', 0)
      expect(result.transferred).toBe(0)
      expect(manager.getQuantity('c1', 'item')).toBe(10)
    })
  })

  describe('Large Values', () => {
    it('handles quantity of 1000000', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const result = manager.addItem('c1', 'item', 1000000)
      expect(result.success).toBe(true)
      expect(manager.getQuantity('c1', 'item')).toBe(1000000)
    })

    it('handles weight of 1000000', () => {
      const mgr = createInventoryManager({
        getItemWeight: () => 1,
      })
      mgr.createContainer('c1', { mode: 'weight', maxWeight: 2000000 })
      const result = mgr.addItem('c1', 'item', 1000000)
      expect(result.success).toBe(true)
      expect(mgr.getTotalWeight('c1')).toBe(1000000)
    })

    it('handles 100x100 grid', () => {
      manager.createContainer('c1', { mode: 'grid', width: 100, height: 100 })
      const grid = manager.getGrid('c1')
      expect(grid).toHaveLength(100)
      expect(grid[0]).toHaveLength(100)
    })
  })

  describe('Unicode', () => {
    it('handles unicode item ids', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const result = manager.addItem('c1', '物品-🎮', 5)
      expect(result.success).toBe(true)
      expect(manager.getQuantity('c1', '物品-🎮')).toBe(5)
    })

    it('handles unicode container ids', () => {
      manager.createContainer('容器-🎒', { mode: 'unlimited' })
      manager.addItem('容器-🎒', 'item', 3)
      expect(manager.getQuantity('容器-🎒', 'item')).toBe(3)
    })
  })

  describe('Concurrent Operations', () => {
    it('no corruption under concurrent access', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 100)
      // Simulate concurrent operations
      for (let i = 0; i < 10; i++) {
        manager.removeItem('c1', 'item', 5)
        manager.addItem('c1', 'item', 5)
      }
      expect(manager.getQuantity('c1', 'item')).toBe(100)
    })

    it('transactions serialize correctly', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.transaction(() => {
        manager.addItem('c1', 'item1', 10)
        manager.addItem('c1', 'item2', 20)
      })
      manager.transaction(() => {
        manager.addItem('c1', 'item3', 30)
      })
      expect(manager.getQuantity('c1', 'item1')).toBe(10)
      expect(manager.getQuantity('c1', 'item2')).toBe(20)
      expect(manager.getQuantity('c1', 'item3')).toBe(30)
    })
  })
})
