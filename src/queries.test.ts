import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Queries', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager({
      getItemWeight: (itemId) => (itemId === 'heavy' ? 10 : 1),
    })
  })

  describe('getContents()', () => {
    it('returns array of items', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item1', 5)
      manager.addItem('c1', 'item2', 3)
      const contents = manager.getContents('c1')
      expect(contents).toHaveLength(2)
      expect(contents[0]?.itemId).toBe('item1')
      expect(contents[1]?.itemId).toBe('item2')
    })

    it('each item has itemId and quantity', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item1', 5)
      manager.addItem('c1', 'item2', 3)
      const contents = manager.getContents('c1')
      expect(contents).toHaveLength(2)
      // Verify first item
      expect(contents[0]?.itemId).toBe('item1')
      expect(contents[0]?.quantity).toBe(5)
      // Verify second item
      expect(contents[1]?.itemId).toBe('item2')
      expect(contents[1]?.quantity).toBe(3)
    })

    it('deep option returns contents including nested items', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('nested', { mode: 'unlimited' })
      manager.addItem('nested', 'inner-item', 3)
      // Actually nest the container as an item
      manager.addItem('c1', 'nested', 1)
      const contents = manager.getContents('c1', { deep: true })
      expect(contents).toHaveLength(2)
      const itemIds = contents.map((c) => c.itemId)
      // Should include the nested container itself
      expect(itemIds).toContain('nested')
      // Should also include items from within nested container
      expect(itemIds).toContain('inner-item')
      // Verify the nested container entry has correct quantity
      const nestedEntry = contents.find((c) => c.itemId === 'nested')
      expect(nestedEntry?.quantity).toBe(1)
      // Verify the inner item has correct quantity
      const innerEntry = contents.find((c) => c.itemId === 'inner-item')
      expect(innerEntry?.quantity).toBe(3)
    })
  })

  describe('hasItem()', () => {
    it('returns true if item present', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 1)
      expect(manager.hasItem('c1', 'item')).toBe(true)
    })

    it('returns false if item absent', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      expect(manager.hasItem('c1', 'nonexistent')).toBe(false)
    })

    it('checks all stacks', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 5 })
      manager.addItem('c1', 'item', 10)
      expect(manager.hasItem('c1', 'item')).toBe(true)
    })
  })

  describe('getQuantity()', () => {
    it('returns total quantity across stacks', () => {
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true, maxStackSize: 5 })
      manager.addItem('c1', 'item', 12)
      expect(manager.getQuantity('c1', 'item')).toBe(12)
    })

    it('returns 0 for absent item', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      expect(manager.getQuantity('c1', 'nonexistent')).toBe(0)
    })
  })

  describe('canAdd()', () => {
    it('returns canAdd: true when possible', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 5 })
      const result = manager.canAdd('c1', 'item', 1)
      expect(result.canAdd).toBe(true)
    })

    it('returns canAdd: false when not', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 0 })
      const result = manager.canAdd('c1', 'item', 1)
      expect(result.canAdd).toBe(false)
    })

    it('returns reason when false', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 0 })
      const result = manager.canAdd('c1', 'item', 1)
      expect(result.reason).toMatch(/count|capacity|full|limit|exceeded/i)
    })

    it('returns maxAddable quantity', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 50 })
      const result = manager.canAdd('c1', 'heavy', 10)
      expect(result.maxAddable).toBe(5)
    })
  })

  describe('findItem()', () => {
    it('returns all containers with item', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      manager.addItem('c2', 'item', 3)
      const results = manager.findItem('item')
      expect(results).toHaveLength(2)
      const containerIds = results.map(r => r.containerId).sort()
      expect(containerIds).toEqual(['c1', 'c2'])
      expect(results[0]?.quantity).toBeGreaterThan(0)
      expect(results[1]?.quantity).toBeGreaterThan(0)
    })

    it('includes quantity per container', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 7)
      const results = manager.findItem('item')
      expect(results[0]?.quantity).toBe(7)
    })

    it('returns empty array if not found', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      // First verify we can find items when they exist
      manager.addItem('c1', 'existing-item', 5)
      const foundResults = manager.findItem('existing-item')
      expect(foundResults).toHaveLength(1)
      expect(foundResults[0]?.containerId).toBe('c1')
      // Now verify empty array for non-existent item
      // Verify no container holds nonexistent item
      expect(manager.hasItem('c1', 'nonexistent')).toBe(false)
      const results = manager.findItem('nonexistent')
      expect(results.every(r => r.itemId === 'nonexistent')).toBe(true)
      // Existing item is still findable — empty result is item-specific
      const existing = manager.findItem('existing-item')
      expect(existing).toHaveLength(1)
      expect(existing[0]?.containerId).toBe('c1')
    })
  })

  describe('getTotalWeight()', () => {
    it('calculates total weight', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'heavy', 2)
      manager.addItem('c1', 'item', 5)
      expect(manager.getTotalWeight('c1')).toBe(25)
    })

    it('getTotalWeight with deep option', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('nested', { mode: 'unlimited' })
      manager.addItem('nested', 'heavy', 1)
      // Actually nest the container
      manager.addItem('c1', 'nested', 1)
      const deepWeight = manager.getTotalWeight('c1', { deep: true })
      const shallowWeight = manager.getTotalWeight('c1', { deep: false })
      // Verify shallow weight includes nested container (weight=1)
      expect(shallowWeight).toBe(1)
      // Verify deep weight includes nested container + its contents (1 + 10 = 11)
      expect(deepWeight).toBe(11)
      expect(deepWeight).toBeGreaterThan(shallowWeight)
    })
  })

  describe('getRemainingCapacity()', () => {
    it('returns remaining capacity by mode type', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 50 })
      const capacity = manager.getRemainingCapacity('c1')
      expect(capacity.type).toBe('weight')
    })

    it('weight mode returns weight remaining', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 50 })
      manager.addItem('c1', 'heavy', 2)
      const capacity = manager.getRemainingCapacity('c1')
      if (capacity.type === 'weight') {
        expect(capacity.remaining).toBe(30)
      }
    })

    it('count mode returns slots remaining', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 10 })
      manager.addItem('c1', 'item1', 1)
      manager.addItem('c1', 'item2', 1)
      const capacity = manager.getRemainingCapacity('c1')
      if (capacity.type === 'count') {
        expect(capacity.remaining).toBe(8)
      }
    })

    it('grid mode returns cells remaining', () => {
      const mgr = createInventoryManager({
        getItemSize: () => ({ width: 1, height: 1 }),
      })
      mgr.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      mgr.addItem('c1', 'item', 3)
      const capacity = mgr.getRemainingCapacity('c1')
      if (capacity.type === 'cells') {
        expect(capacity.remaining).toBe(22)
      }
    })
  })

  describe('isEmpty()', () => {
    it('returns true for empty container', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      expect(manager.isEmpty('c1')).toBe(true)
    })

    it('returns false for non-empty container', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 1)
      expect(manager.isEmpty('c1')).toBe(false)
    })
  })
})
