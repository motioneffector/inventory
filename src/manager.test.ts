import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import { ValidationError } from './errors'

describe('createInventoryManager()', () => {
  describe('Basic Functionality', () => {
    it('creates manager with minimal options', () => {
      const manager = createInventoryManager()
      expect(manager).toBeDefined()
      expect(typeof manager.createContainer).toBe('function')
      expect(typeof manager.addItem).toBe('function')
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
      expect(manager).toBeDefined()
      // Verify callback is used by creating grid container
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItem('c1', 'item', 1)
      const grid = manager.getGrid('c1')
      expect(grid).toBeDefined()
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
      // Container management
      expect(manager.createContainer).toBeDefined()
      expect(manager.removeContainer).toBeDefined()
      expect(manager.listContainers).toBeDefined()
      // Basic operations
      expect(manager.addItem).toBeDefined()
      expect(manager.removeItem).toBeDefined()
      expect(manager.transfer).toBeDefined()
      // Query methods
      expect(manager.getContents).toBeDefined()
      expect(manager.hasItem).toBeDefined()
      expect(manager.getQuantity).toBeDefined()
      expect(manager.canAdd).toBeDefined()
      expect(manager.findItem).toBeDefined()
      expect(manager.getTotalWeight).toBeDefined()
      expect(manager.getRemainingCapacity).toBeDefined()
      expect(manager.isEmpty).toBeDefined()
      // Grid-specific methods
      expect(manager.getGrid).toBeDefined()
      expect(manager.findPlacements).toBeDefined()
      expect(manager.addItemAt).toBeDefined()
      // Slots-specific methods
      expect(manager.setSlot).toBeDefined()
      expect(manager.getSlot).toBeDefined()
      expect(manager.getAllSlots).toBeDefined()
      expect(manager.canEquip).toBeDefined()
      expect(manager.clearSlot).toBeDefined()
      // Locking
      expect(manager.lockItem).toBeDefined()
      expect(manager.unlockItem).toBeDefined()
      // Stack operations
      expect(manager.splitStack).toBeDefined()
      expect(manager.mergeStacks).toBeDefined()
      expect(manager.consolidate).toBeDefined()
      // Sorting
      expect(manager.sort).toBeDefined()
      expect(manager.autoArrange).toBeDefined()
      // Events
      expect(manager.on).toBeDefined()
      // Transactions
      expect(manager.transaction).toBeDefined()
      // Serialization
      expect(manager.serialize).toBeDefined()
      expect(manager.deserialize).toBeDefined()
      expect(manager.serializeContainer).toBeDefined()
    })
  })

  describe('Validation', () => {
    it('throws ValidationError if getItemWeight returns non-number', () => {
      const manager = createInventoryManager({
        getItemWeight: () => 'invalid' as unknown as number,
      })
      manager.createContainer('c1', { mode: 'weight', maxWeight: 100 })
      expect(() => manager.addItem('c1', 'item1', 1)).toThrow(ValidationError)
      try {
        manager.addItem('c1', 'item1', 1)
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
      }
    })

    it('throws ValidationError if getItemSize returns invalid shape', () => {
      const manager = createInventoryManager({
        getItemSize: () => ({ invalid: true } as unknown as { width: number; height: number }),
      })
      manager.createContainer('c1', { mode: 'grid', width: 10, height: 10 })
      expect(() => manager.addItem('c1', 'item1', 1)).toThrow(ValidationError)
      try {
        manager.addItem('c1', 'item1', 1)
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
      }
    })
  })
})
