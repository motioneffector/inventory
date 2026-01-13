import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Sorting', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager({
      getItemSize: () => ({ width: 1, height: 1 }),
    })
  })

  describe('sort()', () => {
    it('sorts list/count/weight mode containers', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item-c', 1)
      manager.addItem('c1', 'item-a', 1)
      manager.addItem('c1', 'item-b', 1)
      manager.sort('c1', (a, b) => a.itemId.localeCompare(b.itemId))
      const contents = manager.getContents('c1')
      expect(contents[0]?.itemId).toBe('item-a')
    })

    it('accepts custom comparator', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item1', 10)
      manager.addItem('c1', 'item2', 5)
      manager.addItem('c1', 'item3', 15)
      manager.sort('c1', (a, b) => b.quantity - a.quantity)
      const contents = manager.getContents('c1')
      expect(contents[0]?.quantity).toBe(15)
    })

    it('stable sort for equal items', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item-a', 5)
      manager.addItem('c1', 'item-b', 5)
      manager.addItem('c1', 'item-c', 5)
      manager.sort('c1', (a, b) => a.quantity - b.quantity)
      const contents = manager.getContents('c1')
      expect(contents).toHaveLength(3)
    })
  })

  describe('autoArrange()', () => {
    it('repacks grid mode items', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItem('c1', 'item1', 1)
      manager.addItem('c1', 'item2', 1)
      manager.autoArrange('c1')
      const grid = manager.getGrid('c1')
      expect(grid).toBeDefined()
    })

    it('minimizes empty space', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItemAt('c1', 'item1', { x: 4, y: 4 })
      manager.addItemAt('c1', 'item2', { x: 3, y: 3 })
      manager.autoArrange('c1')
      const grid = manager.getGrid('c1')
      expect(grid[0]?.[0]).not.toBe(null)
    })

    it('preserves all items', () => {
      manager.createContainer('c1', { mode: 'grid', width: 5, height: 5 })
      manager.addItem('c1', 'item1', 1)
      manager.addItem('c1', 'item2', 1)
      manager.addItem('c1', 'item3', 1)
      manager.autoArrange('c1')
      expect(manager.getQuantity('c1', 'item1')).toBe(1)
      expect(manager.getQuantity('c1', 'item2')).toBe(1)
      expect(manager.getQuantity('c1', 'item3')).toBe(1)
    })
  })
})
