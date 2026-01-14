// Security regression tests for inventory system
import { describe, it, expect } from 'vitest'
import { createInventoryManager } from './manager'

describe('Security: prototype pollution prevention', () => {
  it('rejects __proto__ as slot name in getAllSlots', () => {
    const manager = createInventoryManager()
    manager.createContainer('equipment', {
      mode: 'slots',
      slots: ['head', 'chest', '__proto__'],
    })

    const slots = manager.getAllSlots('equipment')

    // __proto__ should be filtered out
    expect(slots).not.toHaveProperty('__proto__')
    expect(slots.head).toBe(null)
    expect(slots.chest).toBe(null)
  })

  it('rejects constructor as slot name in getAllSlots', () => {
    const manager = createInventoryManager()
    manager.createContainer('equipment', {
      mode: 'slots',
      slots: ['head', 'constructor'],
    })

    const slots = manager.getAllSlots('equipment')

    expect(slots).not.toHaveProperty('constructor')
    expect(slots.head).toBe(null)
  })

  it('rejects prototype as slot name in getAllSlots', () => {
    const manager = createInventoryManager()
    manager.createContainer('equipment', {
      mode: 'slots',
      slots: ['head', 'prototype'],
    })

    const slots = manager.getAllSlots('equipment')

    expect(slots).not.toHaveProperty('prototype')
    expect(slots.head).toBe(null)
  })

  it('rejects __proto__ as container ID in deserialization', () => {
    const manager = createInventoryManager()
    const malicious = {
      containers: [
        {
          id: '__proto__',
          config: { mode: 'unlimited' },
          items: [],
          lockedItems: [],
        },
      ],
    }

    expect(() => manager.deserialize(malicious)).toThrow('Invalid or dangerous container ID')
  })

  it('rejects constructor as container ID in deserialization', () => {
    const manager = createInventoryManager()
    const malicious = {
      containers: [
        {
          id: 'constructor',
          config: { mode: 'unlimited' },
          items: [],
          lockedItems: [],
        },
      ],
    }

    expect(() => manager.deserialize(malicious)).toThrow('Invalid or dangerous container ID')
  })

  it('rejects __proto__ as item ID in deserialization', () => {
    const manager = createInventoryManager()
    const malicious = {
      containers: [
        {
          id: 'backpack',
          config: { mode: 'unlimited' },
          items: [
            {
              itemId: '__proto__',
              stacks: [{ quantity: 1 }],
            },
          ],
          lockedItems: [],
        },
      ],
    }

    expect(() => manager.deserialize(malicious)).toThrow('Invalid or dangerous item ID')
  })

  it('rejects __proto__ as slot name in deserialization', () => {
    const manager = createInventoryManager()
    const malicious = {
      containers: [
        {
          id: 'equipment',
          config: { mode: 'slots', slots: ['__proto__'] },
          items: [],
          lockedItems: [],
          slotState: {
            slots: [['__proto__', 'sword']],
          },
        },
      ],
    }

    expect(() => manager.deserialize(malicious)).toThrow('Invalid or dangerous slot name')
  })

  it('rejects __proto__ as locked item ID in deserialization', () => {
    const manager = createInventoryManager()
    const malicious = {
      containers: [
        {
          id: 'backpack',
          config: { mode: 'unlimited' },
          items: [],
          lockedItems: ['__proto__'],
        },
      ],
    }

    expect(() => manager.deserialize(malicious)).toThrow('Invalid or dangerous locked item ID')
  })
})

describe('Security: integer overflow and memory exhaustion prevention', () => {
  it('rejects negative grid dimensions', () => {
    const manager = createInventoryManager()

    expect(() => {
      manager.createContainer('grid', {
        mode: 'grid',
        width: -1,
        height: 10,
      })
    }).toThrow('Grid dimensions must be positive')
  })

  it('rejects zero grid dimensions', () => {
    const manager = createInventoryManager()

    expect(() => {
      manager.createContainer('grid', {
        mode: 'grid',
        width: 0,
        height: 10,
      })
    }).toThrow('Grid dimensions must be positive')
  })

  it('rejects excessively large grid width', () => {
    const manager = createInventoryManager()

    expect(() => {
      manager.createContainer('grid', {
        mode: 'grid',
        width: 100000,
        height: 10,
      })
    }).toThrow('Grid dimensions cannot exceed 10000')
  })

  it('rejects excessively large grid height', () => {
    const manager = createInventoryManager()

    expect(() => {
      manager.createContainer('grid', {
        mode: 'grid',
        width: 10,
        height: 100000,
      })
    }).toThrow('Grid dimensions cannot exceed 10000')
  })

  it('rejects grid with too many total cells', () => {
    const manager = createInventoryManager()

    expect(() => {
      manager.createContainer('grid', {
        mode: 'grid',
        width: 5000,
        height: 5000,
      })
    }).toThrow('Grid cannot exceed 1000000 total cells')
  })

  it('accepts valid large grid', () => {
    const manager = createInventoryManager()

    // Should not throw
    manager.createContainer('grid', {
      mode: 'grid',
      width: 1000,
      height: 1000,
    })

    expect(manager.listContainers()).toContain('grid')
  })
})

describe('Security: division by zero prevention', () => {
  it('rejects zero item weight', () => {
    const manager = createInventoryManager({
      getItemWeight: () => 0,
    })

    manager.createContainer('backpack', {
      mode: 'weight',
      maxWeight: 100,
    })

    expect(() => {
      manager.addItem('backpack', 'item1', 1)
    }).toThrow('getItemWeight must return a positive number')
  })

  it('rejects negative item weight', () => {
    const manager = createInventoryManager({
      getItemWeight: () => -5,
    })

    manager.createContainer('backpack', {
      mode: 'weight',
      maxWeight: 100,
    })

    expect(() => {
      manager.addItem('backpack', 'item1', 1)
    }).toThrow('getItemWeight must return a valid non-negative number')
  })

  it('rejects NaN item weight', () => {
    const manager = createInventoryManager({
      getItemWeight: () => NaN,
    })

    manager.createContainer('backpack', {
      mode: 'weight',
      maxWeight: 100,
    })

    expect(() => {
      manager.addItem('backpack', 'item1', 1)
    }).toThrow('getItemWeight must return a valid non-negative number')
  })

  it('accepts positive item weight', () => {
    const manager = createInventoryManager({
      getItemWeight: () => 5,
    })

    manager.createContainer('backpack', {
      mode: 'weight',
      maxWeight: 100,
    })

    const result = manager.addItem('backpack', 'item1', 1)
    expect(result.success).toBe(true)
  })
})

describe('Security: unsafe deserialization prevention', () => {
  it('rejects non-object data', () => {
    const manager = createInventoryManager()

    expect(() => manager.deserialize(null)).toThrow('Invalid serialized data: must be an object')
    expect(() => manager.deserialize(undefined)).toThrow('Invalid serialized data: must be an object')
    expect(() => manager.deserialize('string')).toThrow('Invalid serialized data: must be an object')
    expect(() => manager.deserialize(123)).toThrow('Invalid serialized data: must be an object')
  })

  it('rejects data without containers array', () => {
    const manager = createInventoryManager()

    expect(() => manager.deserialize({})).toThrow('Invalid serialized data: containers must be an array')
    expect(() => manager.deserialize({ containers: null })).toThrow('Invalid serialized data: containers must be an array')
    expect(() => manager.deserialize({ containers: 'not array' })).toThrow('Invalid serialized data: containers must be an array')
  })

  it('rejects invalid container data', () => {
    const manager = createInventoryManager()

    expect(() => {
      manager.deserialize({
        containers: [null],
      })
    }).toThrow('Invalid container data in serialized data')

    expect(() => {
      manager.deserialize({
        containers: ['string'],
      })
    }).toThrow('Invalid container data in serialized data')
  })

  it('rejects invalid container ID', () => {
    const manager = createInventoryManager()

    expect(() => {
      manager.deserialize({
        containers: [
          {
            id: 123,
            config: { mode: 'unlimited' },
            items: [],
            lockedItems: [],
          },
        ],
      })
    }).toThrow('Invalid or dangerous container ID')
  })

  it('rejects invalid item data', () => {
    const manager = createInventoryManager()

    expect(() => {
      manager.deserialize({
        containers: [
          {
            id: 'backpack',
            config: { mode: 'unlimited' },
            items: [null],
            lockedItems: [],
          },
        ],
      })
    }).toThrow('Invalid item data in serialized data')
  })

  it('rejects invalid item ID', () => {
    const manager = createInventoryManager()

    expect(() => {
      manager.deserialize({
        containers: [
          {
            id: 'backpack',
            config: { mode: 'unlimited' },
            items: [
              {
                itemId: 123,
                stacks: [],
              },
            ],
            lockedItems: [],
          },
        ],
      })
    }).toThrow('Invalid or dangerous item ID')
  })

  it('rejects invalid stacks data', () => {
    const manager = createInventoryManager()

    expect(() => {
      manager.deserialize({
        containers: [
          {
            id: 'backpack',
            config: { mode: 'unlimited' },
            items: [
              {
                itemId: 'item1',
                stacks: null,
              },
            ],
            lockedItems: [],
          },
        ],
      })
    }).toThrow('Invalid stacks data in serialized data')
  })

  it('rejects invalid stack quantity', () => {
    const manager = createInventoryManager()

    expect(() => {
      manager.deserialize({
        containers: [
          {
            id: 'backpack',
            config: { mode: 'unlimited' },
            items: [
              {
                itemId: 'item1',
                stacks: [{ quantity: -1 }],
              },
            ],
            lockedItems: [],
          },
        ],
      })
    }).toThrow('Invalid stack quantity in serialized data')

    expect(() => {
      manager.deserialize({
        containers: [
          {
            id: 'backpack',
            config: { mode: 'unlimited' },
            items: [
              {
                itemId: 'item1',
                stacks: [{ quantity: 'not a number' }],
              },
            ],
            lockedItems: [],
          },
        ],
      })
    }).toThrow('Invalid stack quantity in serialized data')
  })

  it('accepts valid serialized data', () => {
    const manager = createInventoryManager()
    manager.createContainer('backpack', {
      mode: 'unlimited',
    })
    manager.addItem('backpack', 'item1', 5)

    const serialized = manager.serialize()
    const manager2 = createInventoryManager()

    // Should not throw
    manager2.deserialize(serialized)

    expect(manager2.getQuantity('backpack', 'item1')).toBe(5)
  })
})

describe('Security: input validation edge cases', () => {
  it('handles empty string IDs safely', () => {
    const manager = createInventoryManager()

    // Empty string IDs should work (though not recommended)
    manager.createContainer('', { mode: 'unlimited' })
    expect(manager.listContainers()).toContain('')
  })

  it('handles unicode in IDs safely', () => {
    const manager = createInventoryManager()

    // Unicode should be handled safely
    manager.createContainer('🎒', { mode: 'unlimited' })
    manager.addItem('🎒', '⚔️', 1)

    expect(manager.getQuantity('🎒', '⚔️')).toBe(1)
  })

  it('handles very long IDs safely', () => {
    const manager = createInventoryManager()

    const longId = 'a'.repeat(10000)
    manager.createContainer(longId, { mode: 'unlimited' })
    manager.addItem(longId, 'item1', 1)

    expect(manager.getQuantity(longId, 'item1')).toBe(1)
  })
})
