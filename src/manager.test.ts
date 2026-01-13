import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import { ValidationError } from './errors'

describe('createInventoryManager()', () => {
  describe('Basic Functionality', () => {
    it('creates manager with minimal options', () => {
      const manager = createInventoryManager()
      expect(manager).toBeDefined()
    })

    it('creates manager with getItemWeight callback', () => {
      const manager = createInventoryManager({
        getItemWeight: (itemId) => 1.0,
      })
      expect(manager).toBeDefined()
    })

    it('creates manager with getItemSize callback', () => {
      const manager = createInventoryManager({
        getItemSize: (itemId) => ({ width: 1, height: 1 }),
      })
      expect(manager).toBeDefined()
    })

    it('creates manager with getItemStackLimit callback', () => {
      const manager = createInventoryManager({
        getItemStackLimit: (itemId) => 99,
      })
      expect(manager).toBeDefined()
    })

    it('creates manager with defaultStackSize option', () => {
      const manager = createInventoryManager({
        defaultStackSize: 50,
      })
      expect(manager).toBeDefined()
    })

    it('returns object with all expected methods', () => {
      const manager = createInventoryManager()
      expect(manager.createContainer).toBeDefined()
      expect(manager.removeContainer).toBeDefined()
      expect(manager.listContainers).toBeDefined()
      expect(manager.addItem).toBeDefined()
      expect(manager.removeItem).toBeDefined()
      expect(manager.transfer).toBeDefined()
      expect(manager.getContents).toBeDefined()
      expect(manager.hasItem).toBeDefined()
      expect(manager.getQuantity).toBeDefined()
      expect(manager.canAdd).toBeDefined()
    })
  })

  describe('Validation', () => {
    it('throws ValidationError if getItemWeight returns non-number', () => {
      const manager = createInventoryManager({
        getItemWeight: () => 'invalid' as unknown as number,
      })
      manager.createContainer('c1', { mode: 'weight', maxWeight: 100 })
      expect(() => manager.addItem('c1', 'item1', 1)).toThrow(ValidationError)
    })

    it('throws ValidationError if getItemSize returns invalid shape', () => {
      const manager = createInventoryManager({
        getItemSize: () => ({ invalid: true } as unknown as { width: number; height: number }),
      })
      manager.createContainer('c1', { mode: 'grid', width: 10, height: 10 })
      expect(() => manager.addItem('c1', 'item1', 1)).toThrow(ValidationError)
    })
  })
})
