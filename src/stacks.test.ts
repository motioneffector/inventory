import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import { ValidationError } from './errors'
import type { InventoryManager } from './types'

describe('Stack Operations', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager()
  })

  describe('splitStack()', () => {
    it('splits stack at index into two stacks', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 10)
      manager.splitStack('c1', 'item', 0, 4)
      const stacks = manager.getStacks('c1', 'item')
      expect(stacks).toHaveLength(2)
      expect(stacks[0]?.quantity).toBe(6)
      expect(stacks[1]?.quantity).toBe(4)
    })

    it('original stack is reduced by split amount', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 10)
      manager.splitStack('c1', 'item', 0, 4)
      const stacks = manager.getStacks('c1', 'item')
      expect(stacks[0]?.quantity).toBe(6)
      expect(manager.getQuantity('c1', 'item')).toBe(10)
    })

    it('new stack created with exact split amount', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 10)
      manager.splitStack('c1', 'item', 0, 4)
      const stacks = manager.getStacks('c1', 'item')
      expect(stacks[1]?.quantity).toBe(4)
      expect(stacks[1]?.itemId).toBe('item')
    })

    it('throws if insufficient quantity', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      expect(() => manager.splitStack('c1', 'item', 0, 10)).toThrow()
      expect(() => manager.splitStack('c1', 'item', 0, 10)).toThrow(ValidationError)
    })
  })

  describe('mergeStacks()', () => {
    it('merges two stacks of same item', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 10)
      manager.splitStack('c1', 'item', 0, 3)
      const stacksBefore = manager.getStacks('c1', 'item')
      expect(stacksBefore).toHaveLength(2)
      manager.mergeStacks('c1', 'item', 1, 0)
      const stacksAfter = manager.getStacks('c1', 'item')
      expect(stacksAfter).toHaveLength(1)
      expect(stacksAfter[0]?.quantity).toBe(10)
    })

    it('respects maxStackSize when merging', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 8)
      manager.addItem('c1', 'item', 5)
      const stacks = manager.getStacks('c1', 'item')
      expect(stacks).toHaveLength(2)
      expect(stacks[0]?.quantity).toBeLessThanOrEqual(10)
      expect(stacks[1]?.quantity).toBeLessThanOrEqual(10)
      expect(manager.getQuantity('c1', 'item')).toBe(13)
    })

    it('leaves remainder in source stack when merge exceeds max', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 8)
      manager.addItem('c1', 'item', 5)
      const stacks = manager.getStacks('c1', 'item')
      expect(stacks).toHaveLength(2)
      expect(stacks[0]?.quantity + stacks[1]?.quantity).toBe(13)
      manager.mergeStacks('c1', 'item', 1, 0)
      const stacksAfter = manager.getStacks('c1', 'item')
      expect(stacksAfter).toHaveLength(2)
      expect(stacksAfter[0]?.quantity).toBe(10)
      expect(stacksAfter[1]?.quantity).toBe(3)
    })

    it('throws for invalid stack indices', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item1', 5)
      manager.addItem('c1', 'item2', 5)
      // Index 1 doesn't exist for item1 (only has 1 stack at index 0)
      expect(() => manager.mergeStacks('c1', 'item1', 0, 1)).toThrow()
      expect(() => manager.mergeStacks('c1', 'item1', 0, 1)).toThrow(ValidationError)
    })
  })

  describe('consolidate()', () => {
    it('combines all stacks of same item', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 3)
      manager.addItem('c1', 'item', 4)
      manager.addItem('c1', 'item', 2)
      manager.consolidate('c1')
      expect(manager.getQuantity('c1', 'item')).toBe(9)
    })

    it('minimizes total stack count', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 3)
      manager.addItem('c1', 'item', 4)
      manager.consolidate('c1')
      expect(manager.getQuantity('c1', 'item')).toBe(7)
    })

    it('respects maxStackSize', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 25)
      manager.consolidate('c1')
      expect(manager.getQuantity('c1', 'item')).toBe(25)
    })
  })

  describe('getStacks()', () => {
    it('returns individual stacks', () => {
      manager.createContainer('c1', {
        mode: 'unlimited',
        allowStacking: true,
        maxStackSize: 10,
      })
      manager.addItem('c1', 'item', 15)

      const stacks = manager.getStacks('c1', 'item')
      expect(stacks).toHaveLength(2)
      expect(stacks[0]?.quantity).toBe(10)
      expect(stacks[1]?.quantity).toBe(5)
    })

    it('verifies splitStack creates two separate stacks', () => {
      manager.createContainer('c1', {
        mode: 'unlimited',
        allowStacking: true,
        maxStackSize: 10,
      })
      manager.addItem('c1', 'item', 10)

      const stacksBefore = manager.getStacks('c1', 'item')
      expect(stacksBefore).toHaveLength(1)
      expect(stacksBefore[0]?.quantity).toBe(10)

      manager.splitStack('c1', 'item', 0, 4)

      const stacksAfter = manager.getStacks('c1', 'item')
      expect(stacksAfter).toHaveLength(2)
      expect(stacksAfter[0]?.quantity).toBe(6)
      expect(stacksAfter[1]?.quantity).toBe(4)
    })

    it('verifies mergeStacks combines stacks respecting maxStackSize', () => {
      manager.createContainer('c1', {
        mode: 'unlimited',
        allowStacking: true,
        maxStackSize: 10,
      })

      // Create 15 items = 2 stacks [10, 5]
      manager.addItem('c1', 'item', 15)

      let stacks = manager.getStacks('c1', 'item')
      expect(stacks).toHaveLength(2)

      // Merge second into first (will hit limit at 10)
      manager.mergeStacks('c1', 'item', 1, 0)

      stacks = manager.getStacks('c1', 'item')
      // After merging: first stack is at max (10), second stack has remainder (5)
      expect(stacks).toHaveLength(2)
      expect(stacks[0]?.quantity).toBe(10)
      expect(stacks[1]?.quantity).toBe(5)
    })

    it('confirms maxStackSize is enforced when adding items', () => {
      manager.createContainer('c1', {
        mode: 'unlimited',
        allowStacking: true,
        maxStackSize: 10,
      })

      manager.addItem('c1', 'item', 25)

      const stacks = manager.getStacks('c1', 'item')
      expect(stacks).toHaveLength(3)
      expect(stacks[0]?.quantity).toBe(10)
      expect(stacks[1]?.quantity).toBe(10)
      expect(stacks[2]?.quantity).toBe(5)

      // Verify no stack exceeds limit
      expect(stacks.every((s) => s.quantity <= 10)).toBe(true)
    })

    it('returns empty array for non-existent item', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const stacks = manager.getStacks('c1', 'nonexistent')
      expect(stacks).toEqual([])
    })

    it('returns a copy to prevent external modification', () => {
      manager.createContainer('c1', {
        mode: 'unlimited',
        allowStacking: true,
        maxStackSize: 20,
      })
      manager.addItem('c1', 'item', 10)

      const stacks1 = manager.getStacks('c1', 'item')
      const stacks2 = manager.getStacks('c1', 'item')

      // Modifying returned array shouldn't affect internal state
      stacks1[0]!.quantity = 999

      expect(stacks2[0]?.quantity).toBe(10)
      expect(manager.getQuantity('c1', 'item')).toBe(10)
    })
  })
})
