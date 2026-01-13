import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createInventoryManager } from './manager'
import { ValidationError } from './errors'
import type { InventoryManager } from './types'

describe('Container Management', () => {
  let manager: InventoryManager

  beforeEach(() => {
    manager = createInventoryManager()
  })

  describe('createContainer()', () => {
    it('creates container with string id', () => {
      manager.createContainer('test-container', { mode: 'unlimited' })
      expect(manager.listContainers()).toContain('test-container')
    })

    it('creates container with unlimited mode', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      expect(manager.listContainers()).toContain('c1')
    })

    it('creates container with count mode', () => {
      manager.createContainer('c1', { mode: 'count', maxCount: 10 })
      expect(manager.listContainers()).toContain('c1')
    })

    it('creates container with weight mode', () => {
      manager.createContainer('c1', { mode: 'weight', maxWeight: 100 })
      expect(manager.listContainers()).toContain('c1')
    })

    it('creates container with grid mode', () => {
      manager.createContainer('c1', { mode: 'grid', width: 10, height: 6 })
      expect(manager.listContainers()).toContain('c1')
    })

    it('creates container with slots mode', () => {
      manager.createContainer('c1', { mode: 'slots', slots: ['head', 'chest'] })
      expect(manager.listContainers()).toContain('c1')
    })

    it('creates container with combined mode', () => {
      manager.createContainer('c1', {
        mode: 'combined',
        rules: [
          { mode: 'count', maxCount: 10 },
          { mode: 'weight', maxWeight: 50 },
        ],
      })
      expect(manager.listContainers()).toContain('c1')
    })

    it('throws ValidationError for duplicate container id', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      expect(() => manager.createContainer('c1', { mode: 'unlimited' })).toThrow(ValidationError)
    })

    it('throws ValidationError for invalid mode', () => {
      expect(() =>
        manager.createContainer('c1', { mode: 'invalid' } as unknown as any)
      ).toThrow(ValidationError)
    })
  })

  describe('removeContainer()', () => {
    it('removes existing container', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.removeContainer('c1')
      expect(manager.listContainers()).not.toContain('c1')
    })

    it('throws ValidationError for non-existent container', () => {
      expect(() => manager.removeContainer('nonexistent')).toThrow(ValidationError)
    })

    it('fires event on removal', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      const callback = vi.fn()
      manager.on('containerRemoved', callback)
      manager.removeContainer('c1')
      expect(callback).toHaveBeenCalled()
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          containerId: 'c1',
        })
      )
    })

    it('removes container and cleans up items', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.addItem('c1', 'item', 5)
      manager.removeContainer('c1')
      expect(manager.listContainers()).not.toContain('c1')
      // Verify container is actually removed and items are inaccessible
      expect(() => manager.hasItem('c1', 'item')).toThrow(ValidationError)
      expect(() => manager.getQuantity('c1', 'item')).toThrow(ValidationError)
    })
  })

  describe('listContainers()', () => {
    it('returns empty array initially', () => {
      expect(manager.listContainers()).toEqual([])
    })

    it('returns all container ids', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'count', maxCount: 5 })
      manager.createContainer('c3', { mode: 'weight', maxWeight: 10 })
      const containers = manager.listContainers()
      expect(containers).toContain('c1')
      expect(containers).toContain('c2')
      expect(containers).toContain('c3')
    })

    it('does not include removed containers', () => {
      manager.createContainer('c1', { mode: 'unlimited' })
      manager.createContainer('c2', { mode: 'unlimited' })
      manager.removeContainer('c1')
      expect(manager.listContainers()).not.toContain('c1')
      expect(manager.listContainers()).toContain('c2')
    })
  })
})
