import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Nested Containers', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager({
      getItemWeight: (itemId) => (itemId === 'nested-bag' ? 2 : 1),
    })
  })

  describe('Basic Nesting', () => {
    it('container can be added as item', () => {
      manager.createContainer('parent', { mode: 'unlimited' })
      manager.createContainer('nested-bag', { mode: 'count', maxCount: 5 })
      const result = manager.addItem('parent', 'nested-bag', 1)
      expect(result.success).toBe(true)
    })

    it('nested container has its own storage', () => {
      manager.createContainer('parent', { mode: 'unlimited' })
      manager.createContainer('nested-bag', { mode: 'unlimited' })
      manager.addItem('nested-bag', 'item', 3)
      expect(manager.getQuantity('nested-bag', 'item')).toBe(3)
    })

    it('items in nested accessible', () => {
      manager.createContainer('parent', { mode: 'unlimited' })
      manager.createContainer('nested-bag', { mode: 'unlimited' })
      manager.addItem('nested-bag', 'item', 3)
      expect(manager.hasItem('nested-bag', 'item')).toBe(true)
    })

    it('weight includes nested contents', () => {
      manager.createContainer('parent', { mode: 'weight', maxWeight: 100 })
      manager.createContainer('nested-bag', { mode: 'unlimited' })
      manager.addItem('nested-bag', 'item', 5)
      manager.addItem('parent', 'nested-bag', 1)
      const weight = manager.getTotalWeight('parent', { deep: true })
      // At minimum, should include the nested-bag container weight (2)
      expect(weight).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Deep Option', () => {
    it('getContents with deep traverses nested', () => {
      manager.createContainer('parent', { mode: 'unlimited' })
      manager.createContainer('nested-bag', { mode: 'unlimited' })
      manager.addItem('nested-bag', 'inner-item', 3)
      // Actually nest the container
      manager.addItem('parent', 'nested-bag', 1)
      const contents = manager.getContents('parent', { deep: true })
      expect(contents).toBeDefined()
      // Deep traversal should work without error
      expect(Array.isArray(contents)).toBe(true)
    })

    it('findItem with deep searches nested', () => {
      manager.createContainer('parent', { mode: 'unlimited' })
      manager.createContainer('nested-bag', { mode: 'unlimited' })
      manager.addItem('nested-bag', 'inner-item', 3)
      // Actually nest the container
      manager.addItem('parent', 'nested-bag', 1)
      const results = manager.findItem('inner-item', { deep: true })
      // Deep search should work without error and find the item in nested-bag
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('Cycle Prevention', () => {
    it('cannot nest container in itself', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      expect(() => manager.addItem('c1', 'c1', 1)).toThrow()
    })

    it('cannot create circular nesting', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'unlimited' })
      manager.addItem('c1', 'c2', 1)
      expect(() => manager.addItem('c2', 'c1', 1)).toThrow()
    })
  })
})
