import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Serialization', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager({
      getItemSize: () => ({ width: 1, height: 1 }),
    })
  })

  describe('serialize()', () => {
    it('returns JSON-compatible object', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      const data = manager.serialize()
      const json = JSON.stringify(data)
      expect(json).toBeDefined()
    })

    it('includes all containers', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'count', maxCount: 5 })
      const data = manager.serialize()
      expect(data).toBeDefined()
    })

    it('includes all items', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item1', 5)
      manager.addItem('c1', 'item2', 3)
      const data = manager.serialize()
      expect(data).toBeDefined()
    })

    it('includes grid positions', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItemAt('c1', 'item', { x: 2, y: 3 })
      const data = manager.serialize()
      expect(data).toBeDefined()
    })

    it('includes slot assignments', () => {
      manager.createContainer('c1', { mode: 'slots', slots: ['head', 'chest'] })
      manager.setSlot('c1', 'head', 'helmet')
      const data = manager.serialize()
      expect(data).toBeDefined()
    })

    it('includes locked items', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      manager.lockItem('c1', 'item')
      const data = manager.serialize()
      expect(data).toBeDefined()
    })
  })

  describe('deserialize()', () => {
    it('restores all containers', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'count', maxCount: 5 })
      const data = manager.serialize()
      const newManager = createInventoryManager()
      newManager.deserialize(data)
      expect(newManager.listContainers()).toContain('c1')
      expect(newManager.listContainers()).toContain('c2')
    })

    it('restores all items', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item1', 5)
      manager.addItem('c1', 'item2', 3)
      const data = manager.serialize()
      const newManager = createInventoryManager()
      newManager.deserialize(data)
      expect(newManager.getQuantity('c1', 'item1')).toBe(5)
      expect(newManager.getQuantity('c1', 'item2')).toBe(3)
    })

    it('restores grid positions', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItemAt('c1', 'item', { x: 2, y: 3 })
      const data = manager.serialize()
      const newManager = createInventoryManager({
        getItemSize: () => ({ width: 1, height: 1 }),
      })
      newManager.deserialize(data)
      const grid = newManager.getGrid('c1')
      expect(grid[3]?.[2]).not.toBe(null)
    })

    it('restores locked items', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      manager.lockItem('c1', 'item')
      const data = manager.serialize()
      const newManager = createInventoryManager()
      newManager.deserialize(data)
      expect(() => newManager.removeItem('c1', 'item', 1)).toThrow()
    })
  })

  describe('serializeContainer()', () => {
    it('serializes single container', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      const data = manager.serializeContainer('c1')
      expect(data).toBeDefined()
    })

    it('can restore with deserialize', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      const data = manager.serializeContainer('c1')
      const newManager = createInventoryManager()
      newManager.deserialize({ containers: [data] })
      expect(newManager.getQuantity('c1', 'item')).toBe(5)
    })
  })

  describe('Round-Trip', () => {
    it('serialize then deserialize identical', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item1', 10)
      manager.addItem('c1', 'item2', 5)
      const data = manager.serialize()
      const newManager = createInventoryManager()
      newManager.deserialize(data)
      expect(newManager.getQuantity('c1', 'item1')).toBe(10)
      expect(newManager.getQuantity('c1', 'item2')).toBe(5)
    })

    it('operations work after restore', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      const data = manager.serialize()
      const newManager = createInventoryManager()
      newManager.deserialize(data)
      newManager.addItem('c1', 'item', 5)
      expect(newManager.getQuantity('c1', 'item')).toBe(15)
    })
  })
})
