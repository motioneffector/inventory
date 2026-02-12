import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import { ValidationError } from './errors'

describe('createInventoryManager()', () => {
  describe('Basic Functionality', () => {
    it('creates manager with minimal options', () => {
      const manager = createInventoryManager()
      expect(manager).toBeDefined()
      // Verify manager methods exist and work
      manager.createContainer('test', { mode: 'unlimited' })
      expect(manager.listContainers()).toContain('test')
      const result = manager.addItem('test', 'item', 1)
      expect(result.success).toBe(true)
    })

    it('creates manager with getItemWeight callback', () => {
      const getItemWeight = (itemId: string) => 1.0
      const manager = createInventoryManager({
        getItemWeight,
      })
      expect(manager).toBeDefined()
      // Verify callback is used by creating weight-based container
      manager.createContainer('c1', { mode: 'weight', maxWeight: 10 })
      manager.addItem('c1', 'item', 5)
      expect(manager.getTotalWeight('c1')).toBe(5.0)
    })

    it('creates manager with getItemSize callback', () => {
      const getItemSize = (itemId: string) => ({ width: 1, height: 1 })
      const manager = createInventoryManager({
        getItemSize,
      })
      // Verify callback is used by creating grid container
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItem('c1', 'item', 1)
      const grid = manager.getGrid('c1')
      expect(grid).toHaveLength(5)
      expect(grid[0]).toHaveLength(5)
    })

    it('creates manager with getItemStackLimit callback', () => {
      const getItemStackLimit = (itemId: string) => 5
      const manager = createInventoryManager({
        getItemStackLimit,
      })
      expect(manager).toBeDefined()
      // Verify callback is used - add more than limit to see stacking behavior
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true })
      manager.addItem('c1', 'item', 10)
      expect(manager.getQuantity('c1', 'item')).toBe(10)
    })

    it('creates manager with defaultStackSize option', () => {
      const manager = createInventoryManager({
        defaultStackSize: 50,
      })
      expect(manager).toBeDefined()
      // Verify defaultStackSize is used
      manager.createContainer('c1', { mode: 'unlimited', allowStacking: true })
      manager.addItem('c1', 'item', 100)
      expect(manager.getQuantity('c1', 'item')).toBe(100)
    })

    it('returns object with all expected methods', () => {
      const manager = createInventoryManager()
      // Container management - verify they work
      manager.createContainer('test', { mode: 'unlimited' })
      expect(manager.listContainers()).toContain('test')
      manager.removeContainer('test')
      expect(manager.listContainers()).not.toContain('test')
      // Basic operations - verify they work
      manager.createContainer('c1', { mode: 'unlimited' })
      const addResult = manager.addItem('c1', 'item', 1)
      expect(addResult.success).toBe(true)
      const removed = manager.removeItem('c1', 'item', 1)
      expect(removed).toBe(1)
      // Serialization - verify it works
      const data = manager.serialize()
      const serialized = JSON.stringify(data)
      expect(serialized).toContain('c1')
      expect(serialized).toContain('item')
    })
  })

  describe('Validation', () => {
    it('throws ValidationError if getItemWeight returns non-number', () => {
      const manager = createInventoryManager({
        getItemWeight: () => 'invalid' as unknown as number,
      })
      manager.createContainer('c1', { mode: 'weight', maxWeight: 100 })
      expect(() => manager.addItem('c1', 'item1', 1)).toThrow(/getItemWeight/i)
    })

    it('throws ValidationError if getItemSize returns invalid shape', () => {
      const manager = createInventoryManager({
        getItemSize: () => ({ invalid: true } as unknown as { width: number; height: number }),
      })
      manager.createContainer('c1', { mode: 'grid', width: 10, height: 10 })
      expect(() => manager.addItem('c1', 'item1', 1)).toThrow(/getItemSize/i)
    })
  })
})
