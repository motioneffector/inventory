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

    it('getTotalWeight works with nested containers', () => {
      manager.createContainer('parent', { mode: 'weight', maxWeight: 100 })
      manager.createContainer('nested-bag', { mode: 'unlimited' })
      manager.addItem('nested-bag', 'item', 5)
      manager.addItem('parent', 'nested-bag', 1)
      const deepWeight = manager.getTotalWeight('parent', { deep: true })
      const shallowWeight = manager.getTotalWeight('parent', { deep: false })
      // Verify shallow weight includes nested-bag container (weight=2)
      expect(shallowWeight).toBe(2)
      // Verify deep weight includes both container and its contents (2 + 5 = 7)
      expect(deepWeight).toBe(7)
      expect(deepWeight).toBeGreaterThan(shallowWeight)
    })
  })

  describe('Deep Option', () => {
    it('getContents with deep returns valid array', () => {
      manager.createContainer('parent', { mode: 'unlimited' })
      manager.createContainer('nested-bag', { mode: 'unlimited' })
      manager.addItem('nested-bag', 'inner-item', 3)
      // Actually nest the container
      manager.addItem('parent', 'nested-bag', 1)
      const contents = manager.getContents('parent', { deep: true })
      expect(contents).toHaveLength(2)
      const itemIds = contents.map((c) => c.itemId)
      // Should contain the nested container
      expect(itemIds).toContain('nested-bag')
      // Should also contain the inner item from deep traversal
      expect(itemIds).toContain('inner-item')
      // Verify the nested container entry
      const nestedBag = contents.find((c) => c.itemId === 'nested-bag')
      expect(nestedBag).toBeDefined()
      expect(nestedBag?.quantity).toBe(1)
      // Verify the inner item from nested container
      const innerItem = contents.find((c) => c.itemId === 'inner-item')
      expect(innerItem).toBeDefined()
      expect(innerItem?.quantity).toBe(3)
    })

    it('findItem with deep option searches containers', () => {
      manager.createContainer('parent', { mode: 'unlimited' })
      manager.createContainer('nested-bag', { mode: 'unlimited' })
      manager.addItem('nested-bag', 'inner-item', 3)
      // Actually nest the container
      manager.addItem('parent', 'nested-bag', 1)
      const results = manager.findItem('inner-item', { deep: true })
      // Should find the item in the nested-bag container - verify exact count
      expect(results).toHaveLength(1)
      const nestedResult = results.find((r) => r.containerId === 'nested-bag')
      expect(nestedResult).toBeDefined()
      expect(nestedResult?.containerId).toBe('nested-bag')
      expect(nestedResult?.quantity).toBe(3)
    })
  })

  describe('Cycle Prevention', () => {
    it('cannot nest container in itself', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      expect(() => manager.addItem('c1', 'c1', 1)).toThrow(/circular|cycle|self/i)
    })

    it('cannot create circular nesting', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'unlimited' })
      manager.addItem('c1', 'c2', 1)
      expect(() => manager.addItem('c2', 'c1', 1)).toThrow(/circular|cycle/i)
    })
  })
})
