import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Transactions', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager()
  })

  describe('transaction()', () => {
    it('groups multiple operations', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.transaction(() => {
        manager.addItem('c1', 'item1', 5)
        manager.addItem('c1', 'item2', 3)
        manager.addItem('c1', 'item3', 7)
      })
      expect(manager.getQuantity('c1', 'item1')).toBe(5)
      expect(manager.getQuantity('c1', 'item2')).toBe(3)
      expect(manager.getQuantity('c1', 'item3')).toBe(7)
    })

    it('commits on success', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.transaction(() => {
        manager.addItem('c1', 'item', 10)
      })
      expect(manager.getQuantity('c1', 'item')).toBe(10)
    })

    it('rolls back on error', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      try {
        manager.transaction(() => {
          manager.addItem('c1', 'item', 3)
          throw new Error('test error')
        })
      } catch (e) {
        // Expected
      }
      expect(manager.getQuantity('c1', 'item')).toBe(5)
    })

    it('no partial state on rollback', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const initialQty = manager.getQuantity('c1', 'item')
      try {
        manager.transaction(() => {
          manager.addItem('c1', 'item1', 10)
          manager.addItem('c1', 'item2', 20)
          throw new Error('rollback')
        })
      } catch (e) {
        // Expected
      }
      expect(manager.getQuantity('c1', 'item1')).toBe(0)
      expect(manager.getQuantity('c1', 'item2')).toBe(0)
    })
  })
})
