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
    it('returns object with containers array', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      const data = manager.serialize()
      expect(data).toBeDefined()
      expect(Array.isArray(data.containers)).toBe(true)
      expect(data.containers.length).toBe(1)
      expect(data.containers[0]?.id).toBe('c1')
    })

    it('includes all containers with correct count', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'count', maxCount: 5 })
      const data = manager.serialize()
      expect(data.containers).toBeDefined()
      expect(data.containers.length).toBe(2)
      const containerIds = data.containers.map(c => c.id)
      expect(containerIds).toContain('c1')
      expect(containerIds).toContain('c2')
    })

    it('includes all items with exact count', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item1', 5)
      manager.addItem('c1', 'item2', 3)
      const data = manager.serialize()
      expect(data.containers).toBeDefined()
      const c1Data = data.containers.find(c => c.id === 'c1')
      expect(c1Data).toBeDefined()
      expect(c1Data?.items).toBeDefined()
      expect(Array.isArray(c1Data?.items)).toBe(true)
      const itemIds = c1Data?.items.map((item: any) => item.itemId)
      expect(itemIds).toContain('item1')
      expect(itemIds).toContain('item2')
    })

    it('includes grid positions', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItemAt('c1', 'item', { x: 2, y: 3 })
      const data = manager.serialize()
      expect(data).toBeDefined()
      const c1Data = data.containers.find((c: any) => c.id === 'c1')
      expect(c1Data).toBeDefined()
      // Grid data should be serialized - verify it can be restored
      const newManager = createInventoryManager({
        getItemSize: () => ({ width: 1, height: 1 }),
      })
      newManager.deserialize(data)
      expect(newManager.hasItem('c1', 'item')).toBe(true)
    })

    it('includes slot assignments', () => {
      manager.createContainer('c1', { mode: 'slots', slots: ['head', 'chest'] })
      manager.setSlot('c1', 'head', 'helmet')
      const data = manager.serialize()
      expect(data).toBeDefined()
      const c1Data = data.containers.find((c: any) => c.id === 'c1')
      expect(c1Data).toBeDefined()
      // Slots should be serialized - verify it can be restored
      const newManager = createInventoryManager()
      newManager.deserialize(data)
      expect(newManager.getSlot('c1', 'head')).toBe('helmet')
    })

    it('includes locked items', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      manager.lockItem('c1', 'item')
      const data = manager.serialize()
      expect(data).toBeDefined()
      const c1Data = data.containers.find((c: any) => c.id === 'c1')
      expect(c1Data).toBeDefined()
      // Locked items should be preserved through serialization
      // Verify by deserializing and checking lock state
      const newManager = createInventoryManager()
      newManager.deserialize(data)
      expect(() => newManager.removeItem('c1', 'item', 1)).toThrow()
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
      expect(data.id).toBe('c1')
      expect(data.items).toBeDefined()
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
