# Stacking

Stacking lets multiple units of the same item share a single slot or cell. Instead of 99 individual "gold" entries, you have one stack of 99 gold.

## How It Works

By default, containers don't stack items—each `addItem` call creates a new entry. Enable stacking with `allowStacking: true` in the container config.

```
Without Stacking:          With Stacking:
┌─────────────────┐        ┌─────────────────┐
│ potion (1)      │        │ potion (5)      │
│ potion (1)      │        └─────────────────┘
│ potion (1)      │
│ potion (1)      │
│ potion (1)      │
└─────────────────┘
```

When stacking is enabled:
1. Adding items fills existing stacks first
2. New stacks are created only when existing ones are full
3. Stack size is limited by `maxStackSize` or `getItemStackLimit`

## Basic Usage

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemStackLimit: (id) => (id === 'gold' ? 9999 : 99),
})

inventory.createContainer('backpack', {
  mode: 'unlimited',
  allowStacking: true,
  maxStackSize: 99, // Optional: override per-container
})

// These all go into one stack
inventory.addItem('backpack', 'potion', 10)
inventory.addItem('backpack', 'potion', 5)
inventory.addItem('backpack', 'potion', 3)

// One entry with quantity 18
const contents = inventory.getContents('backpack')
// [{ itemId: 'potion', quantity: 18 }]
```

## Key Points

- **Enable per-container** - Each container decides independently whether to stack. A `count` mode container might stack; a `slots` mode container wouldn't.
- **Stack limits apply per stack** - If `maxStackSize` is 99, adding 150 potions creates two stacks (99 + 51).
- **Two ways to set limits** - Container's `maxStackSize` and manager's `getItemStackLimit`. The lower value wins.
- **Grid stacking** - In grid mode with stacking, items stack at the same cell position. Adding to a different position creates a new stack.

## Stack Manipulation

The library provides methods for splitting and merging stacks.

### Viewing Stacks

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', { mode: 'unlimited', allowStacking: true, maxStackSize: 50 })

inventory.addItem('bag', 'arrow', 120) // Creates 3 stacks: 50, 50, 20

const stacks = inventory.getStacks('bag', 'arrow')
// [{ itemId: 'arrow', quantity: 50 }, { itemId: 'arrow', quantity: 50 }, { itemId: 'arrow', quantity: 20 }]
```

### Splitting Stacks

```typescript
// Split 30 arrows from the first stack into a new stack
inventory.splitStack('bag', 'arrow', 0, 30)

const stacks = inventory.getStacks('bag', 'arrow')
// [{ quantity: 20 }, { quantity: 50 }, { quantity: 20 }, { quantity: 30 }]
```

### Merging Stacks

```typescript
// Merge stack at index 3 into stack at index 0
inventory.mergeStacks('bag', 'arrow', 3, 0)
```

### Consolidating

```typescript
// Combine all stacks of all items optimally
inventory.consolidate('bag')
```

## Examples

### No Stacking (Equipment)

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

inventory.createContainer('equipment', {
  mode: 'slots',
  slots: ['mainhand', 'offhand'],
  // Note: no allowStacking - slots don't stack
})
```

### Limited Stacking (Consumables)

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemStackLimit: (id) => {
    if (id.includes('potion')) return 20
    if (id === 'arrow') return 99
    return 1 // Weapons don't stack
  },
})

inventory.createContainer('backpack', {
  mode: 'count',
  maxCount: 20,
  allowStacking: true,
})
```

### Grid Stacking

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemSize: () => ({ width: 1, height: 1 }),
})

inventory.createContainer('stash', {
  mode: 'grid',
  width: 5,
  height: 5,
  allowStacking: true,
  maxStackSize: 99,
})

// Stack at position (0, 0)
inventory.addItemAt('stash', 'gem', { x: 0, y: 0 }, 50)
inventory.addItemAt('stash', 'gem', { x: 0, y: 0 }, 30) // Adds to same stack

// Separate stack at position (1, 0)
inventory.addItemAt('stash', 'gem', { x: 1, y: 0 }, 25)
```

## Related

- **[Item Metadata](Concept-Item-Metadata)** - Setting per-item stack limits with `getItemStackLimit`
- **[Stack Operations API](API-Stack-Operations)** - Full reference for `splitStack`, `mergeStacks`, `consolidate`, `sort`
- **[Grid Placement](Guide-Grid-Placement)** - Stacking behavior in grid mode
