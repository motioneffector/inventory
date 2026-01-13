import { describe, it, expect, beforeEach } from 'vitest'
import { createInventoryManager } from './manager'
import type { InventoryManager } from './types'

describe('Slots Mode', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager()
  })

  describe('Basic Operations', () => {
    it('creates defined slots', () => {
      manager.createContainer('c1', { mode: 'slots', slots: ['head', 'chest', 'legs'] })
      const slots = manager.getAllSlots('c1')
      expect(Object.keys(slots)).toContain('head')
      expect(Object.keys(slots)).toContain('chest')
      expect(Object.keys(slots)).toContain('legs')
    })

    it('setSlot places item in slot', () => {
      manager.createContainer('c1', { mode: 'slots', slots: ['head'] })
      manager.setSlot('c1', 'head', 'helmet')
      expect(manager.getSlot('c1', 'head')).toBe('helmet')
    })

    it('setSlot returns previous item', () => {
      manager.createContainer('c1', { mode: 'slots', slots: ['head'] })
      manager.setSlot('c1', 'head', 'helmet1')
      const oldItem = manager.setSlot('c1', 'head', 'helmet2')
      expect(oldItem).toBe('helmet1')
    })

    it('getSlot returns item in slot', () => {
      manager.createContainer('c1', { mode: 'slots', slots: ['head'] })
      manager.setSlot('c1', 'head', 'helmet')
      expect(manager.getSlot('c1', 'head')).toBe('helmet')
    })

    it('getSlot returns null for empty slot', () => {
      manager.createContainer('c1', { mode: 'slots', slots: ['head'] })
      expect(manager.getSlot('c1', 'head')).toBe(null)
    })

    it('getAllSlots returns all slots', () => {
      manager.createContainer('c1', { mode: 'slots', slots: ['head', 'chest'] })
      manager.setSlot('c1', 'head', 'helmet')
      const slots = manager.getAllSlots('c1')
      expect(slots.head).toBe('helmet')
      expect(slots.chest).toBe(null)
    })
  })

  describe('Slot Filters', () => {
    it('slotFilters validates item for slot', () => {
      manager.createContainer('c1', {
        mode: 'slots',
        slots: ['head'],
        slotFilters: {
          head: (itemId) => itemId.includes('helmet'),
        },
      })
      manager.setSlot('c1', 'head', 'iron-helmet')
      expect(manager.getSlot('c1', 'head')).toBe('iron-helmet')
    })

    it('setSlot fails if filter rejects', () => {
      manager.createContainer('c1', {
        mode: 'slots',
        slots: ['head'],
        slotFilters: {
          head: (itemId) => itemId.includes('helmet'),
        },
      })
      expect(() => manager.setSlot('c1', 'head', 'sword')).toThrow()
    })

    it('reports reason "slot_filter_failed"', () => {
      manager.createContainer('c1', {
        mode: 'slots',
        slots: ['head'],
        slotFilters: {
          head: (itemId) => itemId.includes('helmet'),
        },
      })
      const result = manager.canEquip('c1', 'head', 'sword')
      expect(result.reason).toBe('slot_filter_failed')
    })

    it('canEquip checks filter', () => {
      manager.createContainer('c1', {
        mode: 'slots',
        slots: ['head'],
        slotFilters: {
          head: (itemId) => itemId.includes('helmet'),
        },
      })
      const result = manager.canEquip('c1', 'head', 'iron-helmet')
      expect(result.canAdd).toBe(true)
    })
  })

  describe('Clearing Slots', () => {
    it('setSlot with null clears slot', () => {
      manager.createContainer('c1', { mode: 'slots', slots: ['head'] })
      manager.setSlot('c1', 'head', 'helmet')
      manager.setSlot('c1', 'head', null)
      expect(manager.getSlot('c1', 'head')).toBe(null)
    })

    it('clearSlot removes item', () => {
      manager.createContainer('c1', { mode: 'slots', slots: ['head'] })
      manager.setSlot('c1', 'head', 'helmet')
      manager.clearSlot('c1', 'head')
      expect(manager.getSlot('c1', 'head')).toBe(null)
    })
  })
})
