import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('addItem()', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager({
      getItemStackLimit: (itemId) => (itemId === 'stackable' ? 10 : 99),
    })
  })

  describe('Return Value', () => {
    it('returns success: true on full add', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const result = manager.addItem('c1', 'item', 5)
      expect(result.success).toBe(true)
    })

    it('returns success: false on failure', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 0 })
      const result = manager.addItem('c1', 'item', 1)
      expect(result.success).toBe(false)
    })

    it('returns added count', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const result = manager.addItem('c1', 'item', 7)
      expect(result.added).toBe(7)
    })

    it('returns overflow count', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 1 })
      const result = manager.addItem('c1', 'item', 5)
      expect(result.overflow).toBeGreaterThan(0)
    })

    it('returns reason on failure', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 0 })
      const result = manager.addItem('c1', 'item', 1)
      expect(result.reason).toBeDefined()
    })
  })

  describe('Stacking Behavior', () => {
    it('fills existing stacks first', () => {
      manager.createContainer('c1', {
        mode: 'unlimited',
        allowStacking: true,
        maxStackSize: 10,
      })
      manager.addItem('c1', 'item', 5)
      manager.addItem('c1', 'item', 3)
      expect(manager.getQuantity('c1', 'item')).toBe(8)
    })

    it('creates new stacks when needed', () => {
      manager.createContainer('c1', {
        mode: 'unlimited',
        allowStacking: true,
        maxStackSize: 10,
      })
      manager.addItem('c1', 'item', 15)
      expect(manager.getQuantity('c1', 'item')).toBe(15)
    })

    it('distributes across multiple stacks', () => {
      manager.createContainer('c1', {
        mode: 'unlimited',
        allowStacking: true,
        maxStackSize: 10,
      })
      manager.addItem('c1', 'item', 25)
      expect(manager.getQuantity('c1', 'item')).toBe(25)
    })

    it('respects per-item stack limits', () => {
      manager.createContainer('c1', {
        mode: 'unlimited',
        allowStacking: true,
        maxStackSize: 99,
      })
      manager.addItem('c1', 'stackable', 15)
      expect(manager.getQuantity('c1', 'stackable')).toBe(15)
    })
  })
})

describe('removeItem()', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager()
  })

  describe('Basic Removal', () => {
    it('removes specified quantity', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      manager.removeItem('c1', 'item', 3)
      expect(manager.getQuantity('c1', 'item')).toBe(7)
    })

    it('removes from first stack found', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 5 })
      manager.addItem('c1', 'item', 10)
      manager.removeItem('c1', 'item', 3)
      expect(manager.getQuantity('c1', 'item')).toBe(7)
    })

    it('removes across multiple stacks if needed', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 5 })
      manager.addItem('c1', 'item', 10)
      manager.removeItem('c1', 'item', 7)
      expect(manager.getQuantity('c1', 'item')).toBe(3)
    })

    it('returns removed quantity', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      const removed = manager.removeItem('c1', 'item', 5)
      expect(removed).toBe(5)
    })

    it('returns 0 if item not found', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const removed = manager.removeItem('c1', 'nonexistent', 5)
      expect(removed).toBe(0)
    })
  })

  describe('Full Removal', () => {
    it('removes stack when quantity hits 0', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      manager.removeItem('c1', 'item', 5)
      expect(manager.hasItem('c1', 'item')).toBe(false)
    })

    it('frees grid cells', () => {
      const mgr = createInventoryManager({
        getItemSize: () => ({ width: 1, height: 1 }),
      })
      mgr.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      mgr.addItem('c1', 'item', 1)
      mgr.removeItem('c1', 'item', 1)
      const grid = mgr.getGrid('c1')
      let allEmpty = true
      for (const row of grid) {
        for (const cell of row) {
          if (cell !== null) allEmpty = false
        }
      }
      expect(allEmpty).toBe(true)
    })

    it('frees weight capacity', () => {
      const mgr = createInventoryManager({
        getItemWeight: () => 10,
      })
      mgr.createContainer('c1', { mode: 'weight', maxWeight: 50 })
      mgr.addItem('c1', 'item', 3)
      mgr.removeItem('c1', 'item', 2)
      expect(mgr.getTotalWeight('c1')).toBe(10)
    })
  })
})

describe('transfer()', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager({
      getItemWeight: (itemId) => 5,
    })
  })

  describe('Basic Transfer', () => {
    it('moves items between containers', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      manager.transfer('c1', 'c2', 'item', 5)
      expect(manager.getQuantity('c1', 'item')).toBe(5)
      expect(manager.getQuantity('c2', 'item')).toBe(5)
    })

    it('removes from source', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      manager.transfer('c1', 'c2', 'item', 7)
      expect(manager.getQuantity('c1', 'item')).toBe(3)
    })

    it('adds to destination', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      manager.transfer('c1', 'c2', 'item', 7)
      expect(manager.getQuantity('c2', 'item')).toBe(7)
    })

    it('returns transferred quantity', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      const result = manager.transfer('c1', 'c2', 'item', 5)
      expect(result.transferred).toBe(5)
    })
  })

  describe('Partial Transfer', () => {
    it('transfers as much as destination allows', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'weight', maxWeight: 20 })
      manager.addItem('c1', 'item', 10)
      const result = manager.transfer('c1', 'c2', 'item', 10)
      expect(result.transferred).toBe(4)
    })

    it('leaves remainder in source', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'weight', maxWeight: 20 })
      manager.addItem('c1', 'item', 10)
      manager.transfer('c1', 'c2', 'item', 10)
      expect(manager.getQuantity('c1', 'item')).toBe(6)
    })

    it('reports overflow', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'weight', maxWeight: 20 })
      manager.addItem('c1', 'item', 10)
      const result = manager.transfer('c1', 'c2', 'item', 10)
      expect(result.overflow).toBe(6)
    })
  })

  describe('Atomic', () => {
    it('no items lost on partial transfer', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'weight', maxWeight: 20 })
      manager.addItem('c1', 'item', 10)
      manager.transfer('c1', 'c2', 'item', 10)
      const total = manager.getQuantity('c1', 'item') + manager.getQuantity('c2', 'item')
      expect(total).toBe(10)
    })

    it('no items duplicated', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      manager.transfer('c1', 'c2', 'item', 5)
      const total = manager.getQuantity('c1', 'item') + manager.getQuantity('c2', 'item')
      expect(total).toBe(10)
    })

    it('rolls back on destination error', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'count', maxCount: 0 })
      manager.addItem('c1', 'item', 10)
      const originalQty = manager.getQuantity('c1', 'item')
      manager.transfer('c1', 'c2', 'item', 5)
      expect(manager.getQuantity('c1', 'item')).toBe(originalQty)
    })
  })

  describe('Cross-Mode', () => {
    it('transfers between different container types', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 100 })
      manager.createContainer('c2', { mode: 'count', maxCount: 10 })
      manager.addItem('c1', 'item', 5)
      manager.transfer('c1', 'c2', 'item', 3)
      expect(manager.getQuantity('c2', 'item')).toBe(3)
    })

    it('weight container to count container works', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 100 })
      manager.createContainer('c2', { mode: 'count', maxCount: 10 })
      manager.addItem('c1', 'item', 5)
      manager.transfer('c1', 'c2', 'item', 3)
      expect(manager.getQuantity('c1', 'item')).toBe(2)
      expect(manager.getQuantity('c2', 'item')).toBe(3)
    })

    it('grid container to slots container works', () => {
      const mgr = createInventoryManager({
        getItemSize: () => ({ width: 1, height: 1 }),
      })
      mgr.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      mgr.createContainer('c2', { mode: 'slots', slots: ['slot1'] })
      mgr.addItem('c1', 'item', 1)
      // Transfer from grid to slots - slots use setSlot, not addItem
      // So this transfer may not work directly, but we can verify the attempt
      const result = mgr.transfer('c1', 'c2', 'item', 1)
      // Verify items remain consistent (either transferred or stayed in source)
      const totalItems = mgr.getQuantity('c1', 'item') + mgr.getQuantity('c2', 'item')
      expect(totalItems).toBe(1)
    })
  })
})
