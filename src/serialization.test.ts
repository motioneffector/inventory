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
      expect(data.containers).toHaveLength(1)
      expect(data.containers[0]?.id).toBe('c1')
      expect(data.containers[0]?.items).toHaveLength(1)
      expect(data.containers[0]?.items[0]?.itemId).toBe('item')
    })

    it('includes all containers with correct count', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'count', maxCount: 5 })
      const data = manager.serialize()
      expect(data.containers).toHaveLength(2)
      const containerIds = data.containers.map(c => c.id)
      expect(containerIds).toContain('c1')
      expect(containerIds).toContain('c2')
      expect(data.containers[0]?.id).toBe('c1')
      expect(data.containers[1]?.id).toBe('c2')
    })

    it('includes all items with exact count', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item1', 5)
      manager.addItem('c1', 'item2', 3)
      const data = manager.serialize()
      expect(data.containers).toHaveLength(1)
      const c1Data = data.containers.find(c => c.id === 'c1')
      expect(c1Data?.id).toBe('c1')
      expect(c1Data?.items).toHaveLength(2)
      const itemIds = c1Data?.items.map((item: any) => item.itemId)
      expect(itemIds).toContain('item1')
      expect(itemIds).toContain('item2')
    })

    it('includes grid positions', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItemAt('c1', 'item', { x: 2, y: 3 })
      const data = manager.serialize()
      expect(data.containers).toHaveLength(1)
      const c1Data = data.containers.find((c: any) => c.id === 'c1')
      expect(c1Data.id).toBe('c1')
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
      expect(data.containers).toHaveLength(1)
      const c1Data = data.containers.find((c: any) => c.id === 'c1')
      expect(c1Data.id).toBe('c1')
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
      expect(data.containers).toHaveLength(1)
      const c1Data = data.containers.find((c: any) => c.id === 'c1')
      expect(c1Data.id).toBe('c1')
      // Locked items should be preserved through serialization
      // Verify by deserializing and checking lock state
      const newManager = createInventoryManager()
      newManager.deserialize(data)
      expect(() => newManager.removeItem('c1', 'item', 1)).toThrow(/locked/i)
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
      expect(() => newManager.removeItem('c1', 'item', 1)).toThrow(/locked/i)
    })
  })

  describe('serializeContainer()', () => {
    it('serializes single container', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      const data = manager.serializeContainer('c1')
      expect(data.id).toBe('c1')
      expect(data.items).toHaveLength(1)
      expect(data.items[0]?.itemId).toBe('item')
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
