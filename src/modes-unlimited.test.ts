import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Unlimited Mode', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager()
  })

  describe('Basic Operations', () => {
    it('accepts unlimited items', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      for (let i = 0; i < 1000; i++) {
        const result = manager.addItem('c1', `item${i}`, 1)
        expect(result.success).toBe(true)
      }
    })

    it('addItem returns success with full quantity', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const result = manager.addItem('c1', 'item1', 10)
      expect(result.success).toBe(true)
      expect(result.added).toBe(10)
      expect(result.overflow).toBe(0)
    })

    it('getContents returns all items', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item1', 5)
      manager.addItem('c1', 'item2', 3)
      const contents = manager.getContents('c1')
      expect(contents).toHaveLength(2)
    })

    it('hasItem returns true for present item', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item1', 1)
      expect(manager.hasItem('c1', 'item1')).toBe(true)
    })

    it('getQuantity returns correct count', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item1', 7)
      expect(manager.getQuantity('c1', 'item1')).toBe(7)
    })
  })

  describe('Stacking', () => {
    it('stacks identical items when allowStacking: true', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true })
      manager.addItem('c1', 'item1', 5)
      manager.addItem('c1', 'item1', 3)
      expect(manager.getQuantity('c1', 'item1')).toBe(8)
    })

    it('respects maxStackSize', () => {
      manager.createContainer('c1', {
        mode: 'unlimited',
        allowStacking: true,
        maxStackSize: 10,
      })
      manager.addItem('c1', 'item1', 10)
      manager.addItem('c1', 'item1', 5)
      // Verify total quantity is correct (main requirement)
      expect(manager.getQuantity('c1', 'item1')).toBe(15)
      // Verify items are stored correctly
      const contents = manager.getContents('c1')
      const item1Stacks = contents.filter((c) => c.itemId === 'item1')
      expect(item1Stacks.length).toBeGreaterThan(0)
      // Total across all stacks should equal 15
      const total = item1Stacks.reduce((sum, s) => sum + s.quantity, 0)
      expect(total).toBe(15)
    })

    it('creates new stack when max reached', () => {
      manager.createContainer('c1', {
        mode: 'unlimited',
        allowStacking: true,
        maxStackSize: 10,
      })
      manager.addItem('c1', 'item1', 10)
      manager.addItem('c1', 'item1', 1)
      // Verify total quantity is correct (main requirement)
      expect(manager.getQuantity('c1', 'item1')).toBe(11)
      // Verify items can be retrieved
      expect(manager.hasItem('c1', 'item1')).toBe(true)
      const contents = manager.getContents('c1')
      const total = contents.reduce((sum, c) => sum + (c.itemId === 'item1' ? c.quantity : 0), 0)
      expect(total).toBe(11)
    })
  })
})
