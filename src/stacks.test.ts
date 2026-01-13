import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Stack Operations', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager()
  })

  describe('splitStack()', () => {
    it('splits stack at index into two', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 10)
      manager.splitStack('c1', 'item', 0, 4)
      expect(manager.getQuantity('c1', 'item')).toBe(10)
    })

    it('original stack reduced', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 10)
      manager.splitStack('c1', 'item', 0, 4)
      expect(manager.getQuantity('c1', 'item')).toBe(10)
    })

    it('new stack created with split amount', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 10)
      manager.splitStack('c1', 'item', 0, 4)
      expect(manager.getQuantity('c1', 'item')).toBe(10)
    })

    it('throws if insufficient quantity', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      expect(() => manager.splitStack('c1', 'item', 0, 10)).toThrow()
    })
  })

  describe('mergeStacks()', () => {
    it('merges two stacks of same item', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 5)
      manager.addItem('c1', 'item', 3)
      manager.mergeStacks('c1', 'item', 0, 1)
      expect(manager.getQuantity('c1', 'item')).toBe(8)
    })

    it('respects maxStackSize', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 8)
      manager.addItem('c1', 'item', 5)
      manager.mergeStacks('c1', 'item', 0, 1)
      expect(manager.getQuantity('c1', 'item')).toBe(13)
    })

    it('leaves remainder in source if over max', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 10 })
      manager.addItem('c1', 'item', 8)
      manager.addItem('c1', 'item', 5)
      manager.mergeStacks('c1', 'item', 0, 1)
      expect(manager.getQuantity('c1', 'item')).toBe(13)
    })

    it('throws if different items', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item1', 5)
      manager.addItem('c1', 'item2', 5)
      expect(() => manager.mergeStacks('c1', 'item1', 0, 1)).toThrow()
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
})
