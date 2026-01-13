import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Events', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager()
  })

  describe('itemAdded', () => {
    it('fires when item added', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const callback = vi.fn()
      manager.on('itemAdded', callback)
      manager.addItem('c1', 'item', 5)
      expect(callback).toHaveBeenCalled()
    })

    it('includes containerId, itemId, quantity, newTotal', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const callback = vi.fn()
      manager.on('itemAdded', callback)
      manager.addItem('c1', 'item', 5)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          containerId: 'c1',
          itemId: 'item',
          quantity: 5,
          newTotal: 5,
        })
      )
    })
  })

  describe('itemRemoved', () => {
    it('fires when item removed', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      const callback = vi.fn()
      manager.on('itemRemoved', callback)
      manager.removeItem('c1', 'item', 3)
      expect(callback).toHaveBeenCalled()
    })

    it('includes containerId, itemId, quantity, newTotal', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      const callback = vi.fn()
      manager.on('itemRemoved', callback)
      manager.removeItem('c1', 'item', 3)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          containerId: 'c1',
          itemId: 'item',
          quantity: 3,
          newTotal: 7,
        })
      )
    })
  })

  describe('itemTransferred', () => {
    it('fires on transfer', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      const callback = vi.fn()
      manager.on('itemTransferred', callback)
      manager.transfer('c1', 'c2', 'item', 5)
      expect(callback).toHaveBeenCalled()
    })

    it('includes from, to, itemId, quantity', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 10)
      const callback = vi.fn()
      manager.on('itemTransferred', callback)
      manager.transfer('c1', 'c2', 'item', 5)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'c1',
          to: 'c2',
          itemId: 'item',
          quantity: 5,
        })
      )
    })
  })

  describe('containerFull', () => {
    it('fires when add fails due to capacity', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 0 })
      const callback = vi.fn()
      manager.on('containerFull', callback)
      manager.addItem('c1', 'item', 5)
      expect(callback).toHaveBeenCalled()
    })

    it('includes containerId, itemId, overflow', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 0 })
      const callback = vi.fn()
      manager.on('containerFull', callback)
      manager.addItem('c1', 'item', 5)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          containerId: 'c1',
          itemId: 'item',
          overflow: 5,
        })
      )
    })
  })

  describe('slotChanged', () => {
    it('fires on slot mode changes', () => {
      manager.createContainer('c1', { mode: 'slots', slots: ['head'] })
      const callback = vi.fn()
      manager.on('slotChanged', callback)
      manager.setSlot('c1', 'head', 'helmet')
      expect(callback).toHaveBeenCalled()
    })

    it('includes containerId, slot, oldItem, newItem', () => {
      manager.createContainer('c1', { mode: 'slots', slots: ['head'] })
      const callback = vi.fn()
      manager.on('slotChanged', callback)
      manager.setSlot('c1', 'head', 'helmet')
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          containerId: 'c1',
          slot: 'head',
          oldItem: null,
          newItem: 'helmet',
        })
      )
    })
  })

  describe('Subscription', () => {
    it('on returns unsubscribe function', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const callback = vi.fn()
      const unsubscribe = manager.on('itemAdded', callback)
      expect(typeof unsubscribe).toBe('function')
    })

    it('unsubscribe stops events', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const callback = vi.fn()
      const unsubscribe = manager.on('itemAdded', callback)
      manager.addItem('c1', 'item', 1)
      unsubscribe()
      manager.addItem('c1', 'item', 1)
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
})
