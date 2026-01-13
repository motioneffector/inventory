import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Locking', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager()
  })

  describe('lockItem()', () => {
    it('locks item in container', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      manager.lockItem('c1', 'item')
      expect(() => manager.removeItem('c1', 'item', 1)).toThrow()
    })

    it('locked item cannot be removed', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      manager.lockItem('c1', 'item')
      expect(() => manager.removeItem('c1', 'item', 1)).toThrow()
    })

    it('locked item cannot be transferred', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      manager.lockItem('c1', 'item')
      expect(() => manager.transfer('c1', 'c2', 'item', 1)).toThrow()
    })
  })

  describe('unlockItem()', () => {
    it('unlocks previously locked item', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      manager.lockItem('c1', 'item')
      manager.unlockItem('c1', 'item')
      const removed = manager.removeItem('c1', 'item', 1)
      expect(removed).toBe(1)
    })

    it('unlocked item can be removed', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      manager.lockItem('c1', 'item')
      manager.unlockItem('c1', 'item')
      const removed = manager.removeItem('c1', 'item', 3)
      expect(removed).toBe(3)
    })
  })
})
