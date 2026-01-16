# Storage Modes

Every container has a mode that controls how it accepts items. The mode is the container's personality—it decides whether an item fits and where it goes.

## How It Works

When you create a container, you specify its mode in the configuration. The mode determines:

- What capacity limits apply (if any)
- How items are organized within the container
- What additional configuration options are available

There are six modes, each serving different gameplay needs.

## The Six Modes

### Unlimited

No restrictions. Items always fit.

```typescript
inventory.createContainer('debug-bag', {
  mode: 'unlimited',
})
```

Use for: Development, creative mode, special containers with no limits.

### Count

Limits the total number of item stacks (not total items).

```typescript
inventory.createContainer('belt', {
  mode: 'count',
  maxCount: 6, // Max 6 different item stacks
})
```

Use for: Quick-access slots, hotbars, limited inventory slots.

### Weight

Limits by total weight. Requires [getItemWeight callback](Concept-Item-Metadata).

```typescript
inventory.createContainer('backpack', {
  mode: 'weight',
  maxWeight: 100,
})
```

Use for: Realistic carry capacity, survival games, encumbrance systems.

### Grid

2D Tetris-style placement. Items occupy cells based on their size. Requires [getItemSize callback](Concept-Item-Metadata).

```typescript
inventory.createContainer('stash', {
  mode: 'grid',
  width: 10,
  height: 6,
  allowRotation: true, // Optional: allow 90-degree rotation
})
```

Use for: Tetris inventories, spatial puzzles, Diablo/Resident Evil style.

### Slots

Named equipment slots with optional type restrictions.

```typescript
inventory.createContainer('equipment', {
  mode: 'slots',
  slots: ['head', 'chest', 'mainhand'],
  slotFilters: {
    head: (itemId) => itemId.includes('helmet'),
    mainhand: (itemId) => itemId.includes('sword') || itemId.includes('axe'),
  },
})
```

Use for: Equipment systems, character gear, crafting stations with specific input slots.

### Combined

Multiple rules that must all pass.

```typescript
inventory.createContainer('special-bag', {
  mode: 'combined',
  rules: [
    { mode: 'count', maxCount: 20 },
    { mode: 'weight', maxWeight: 50 },
  ],
})
```

Use for: Complex restrictions (e.g., max 20 stacks AND max 50 weight).

## Basic Usage

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemWeight: (id) => ({ sword: 5, potion: 1 }[id] ?? 1),
  getItemSize: (id) => ({ sword: { width: 1, height: 3 } }[id] ?? { width: 1, height: 1 }),
})

// Weight-based backpack
inventory.createContainer('backpack', {
  mode: 'weight',
  maxWeight: 50,
})

// Grid-based stash
inventory.createContainer('stash', {
  mode: 'grid',
  width: 8,
  height: 8,
})

// Equipment slots
inventory.createContainer('gear', {
  mode: 'slots',
  slots: ['head', 'chest', 'legs'],
})
```

## Key Points

- **Mode is fixed** - You cannot change a container's mode after creation. Create a new container if you need different rules.
- **Callbacks required for some modes** - Weight mode needs `getItemWeight`, grid mode needs `getItemSize`. These are set on the manager, not the container.
- **Stacking works with most modes** - Add `allowStacking: true` and optionally `maxStackSize` to enable stacking. See [Stacking](Concept-Stacking).
- **Combined validates all rules** - In combined mode, adding an item must pass every rule or it fails.

## Examples

### Checking Remaining Capacity

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemWeight: () => 1,
})

inventory.createContainer('bag', { mode: 'weight', maxWeight: 10 })
inventory.addItem('bag', 'item', 3)

const capacity = inventory.getRemainingCapacity('bag')
// { type: 'weight', remaining: 7 }
```

### Handling Add Failures

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemWeight: () => 5,
})

inventory.createContainer('small-bag', { mode: 'weight', maxWeight: 10 })

const result = inventory.addItem('small-bag', 'brick', 5)
// { success: false, added: 2, overflow: 3, reason: 'weight_exceeded' }
```

## Related

- **[Containers](Concept-Containers)** - The concept that modes configure
- **[Item Metadata](Concept-Item-Metadata)** - Callbacks required for weight and grid modes
- **[Weight-Based Inventories](Guide-Weight-Based-Inventories)** - Detailed guide for weight mode
- **[Grid Placement](Guide-Grid-Placement)** - Detailed guide for grid mode
- **[Equipment Slots](Guide-Equipment-Slots)** - Detailed guide for slots mode
