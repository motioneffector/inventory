# @motioneffector/inventory

A flexible TypeScript inventory management system supporting multiple storage paradigms: unlimited lists, weight limits, slot counts, tetris-style grids, equipment slots, or any combination. Perfect for RPGs, survival games, and any application that needs item management.

[![npm version](https://img.shields.io/npm/v/@motioneffector/inventory.svg)](https://www.npmjs.com/package/@motioneffector/inventory)
[![license](https://img.shields.io/npm/l/@motioneffector/inventory.svg)](https://github.com/motioneffector/inventory/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Installation

```bash
npm install @motioneffector/inventory
```

## Quick Start

```typescript
import { createInventoryManager } from '@motioneffector/inventory';

// Create manager with item property callbacks
const inventory = createInventoryManager({
  getItemWeight: (itemId) => items[itemId].weight,
  getItemSize: (itemId) => items[itemId].size,
  getItemStackLimit: (itemId) => items[itemId].stackLimit ?? 99,
});

// Create a weight-limited backpack
inventory.createContainer('backpack', {
  mode: 'weight',
  maxWeight: 50,
  allowStacking: true,
  maxStackSize: 99,
});

// Add items
inventory.addItem('backpack', 'health-potion', 5);
// { success: true, added: 5, overflow: 0 }

// Check capacity
inventory.canAdd('backpack', 'iron-sword', 1);
// { canAdd: true, maxAddable: 1 }
```

## Features

- **Multiple Storage Modes** - Unlimited, count-limited, weight-limited, grid-based, slot-based, or combined modes
- **Smart Stacking** - Configurable item stacking with per-item or global stack limits
- **Grid Inventory** - Tetris-style 2D placement with rotation support and item sizing
- **Equipment Slots** - Named slots with optional filtering (head, weapon, etc.)
- **Container Nesting** - Containers can hold other containers (bags in bags)
- **Item Locking** - Lock items to prevent removal or transfer
- **Transactions** - Group operations with automatic rollback on failure
- **Event System** - Subscribe to inventory changes (add, remove, transfer, etc.)
- **Serialization** - Full JSON save/load support
- **Type Safe** - Complete TypeScript definitions with full type inference
- **Zero Dependencies** - Pure TypeScript with no external runtime dependencies
- **Tree Shakeable** - ESM build optimized for modern bundlers

## Container Modes

### Unlimited

No capacity limits, accepts any items.

```typescript
inventory.createContainer('treasure-hoard', {
  mode: 'unlimited',
  allowStacking: true,
  maxStackSize: 999,
});
```

### Count

Limits the number of item stacks.

```typescript
inventory.createContainer('hotbar', {
  mode: 'count',
  maxCount: 10,
  allowStacking: true,
});
```

### Weight

Tracks total weight with a maximum limit.

```typescript
inventory.createContainer('backpack', {
  mode: 'weight',
  maxWeight: 50,
  allowStacking: true,
});
```

### Grid

2D tetris-style inventory with item placement and rotation.

```typescript
inventory.createContainer('tactical-vest', {
  mode: 'grid',
  width: 8,
  height: 6,
  allowStacking: true,
  maxStackSize: 20,
  allowRotation: true,
});

// Place at specific position
inventory.addItemAt('tactical-vest', 'rifle', 1, { x: 0, y: 0 }, false);

// Find valid placements
const placements = inventory.findPlacements('tactical-vest', 'armor-plate');
// [{ x: 2, y: 1, rotated: false }, { x: 4, y: 3, rotated: true }, ...]
```

### Slots

Named slots, each holds one item (or stack).

```typescript
inventory.createContainer('equipment', {
  mode: 'slots',
  slots: ['head', 'chest', 'legs', 'mainHand', 'offHand'],
  slotFilters: {
    head: (itemId) => itemId.includes('helmet'),
    mainHand: (itemId) => itemId.includes('weapon'),
  },
});

// Equip to specific slot
inventory.setSlot('equipment', 'head', 'iron-helmet');

// Get item in slot
const helmet = inventory.getSlot('equipment', 'head');
// { itemId: 'iron-helmet', quantity: 1 }
```

### Combined

Apply multiple capacity rules simultaneously.

```typescript
inventory.createContainer('realistic-backpack', {
  mode: 'combined',
  rules: [
    { mode: 'weight', maxWeight: 30 },
    { mode: 'count', maxCount: 20 },
  ],
});
```

## API Reference

### createInventoryManager(options?)

Creates a new inventory manager.

**Options:**
- `getItemWeight?: (itemId: string) => number` - Returns item weight (required for weight mode)
- `getItemSize?: (itemId: string) => { width: number, height: number }` - Returns item dimensions (required for grid mode)
- `getItemStackLimit?: (itemId: string) => number` - Returns max stack size for item (optional)
- `defaultStackSize?: number` - Default stack size if not specified (default: 1)

**Returns:** `InventoryManager`

### createContainer(id, config)

Creates a new container with the specified configuration.

```typescript
inventory.createContainer('chest-001', {
  mode: 'count',
  maxCount: 30,
  allowStacking: true,
});
```

**Throws:** `ValidationError` if container ID already exists or config is invalid.

### addItem(containerId, itemId, quantity)

Adds items to a container.

```typescript
const result = inventory.addItem('backpack', 'gold-coin', 100);
// { success: true, added: 100, overflow: 0 }
```

**Returns:** `AddItemResult`
- `success: boolean` - Whether all items were added
- `added: number` - Number of items successfully added
- `overflow: number` - Number of items that couldn't fit
- `reason?: string` - Failure reason ('weight_exceeded', 'count_exceeded', 'no_space', etc.)

### removeItem(containerId, itemId, quantity)

Removes items from a container.

```typescript
const removed = inventory.removeItem('backpack', 'health-potion', 2);
// 2
```

**Returns:** Number of items actually removed.

### transfer(fromId, toId, itemId, quantity)

Transfers items between containers.

```typescript
const result = inventory.transfer('chest', 'backpack', 'arrow', 50);
// { transferred: 50, overflow: 0 }
```

Handles partial transfers automatically - if destination is full, transfers what fits and leaves the rest.

**Returns:** `TransferResult`

### getContents(containerId, deep?)

Gets all items in a container.

```typescript
const items = inventory.getContents('backpack');
// [{ itemId: 'health-potion', quantity: 3 }, { itemId: 'gold-coin', quantity: 150 }]

// Include nested containers
const allItems = inventory.getContents('backpack', true);
```

**Returns:** Array of `ItemEntry` objects.

### hasItem(containerId, itemId)

Checks if a container has an item.

```typescript
if (inventory.hasItem('backpack', 'key-001')) {
  // player has the key
}
```

### getQuantity(containerId, itemId)

Gets total quantity of an item across all stacks.

```typescript
const potionCount = inventory.getQuantity('backpack', 'health-potion');
// 3
```

### canAdd(containerId, itemId, quantity)

Checks if items can be added to a container.

```typescript
const check = inventory.canAdd('backpack', 'heavy-armor', 1);
// { canAdd: false, reason: 'weight_exceeded', maxAddable: 0 }
```

**Returns:** `CanAddResult`
- `canAdd: boolean`
- `reason?: string`
- `maxAddable: number` - Maximum quantity that could fit

### findItem(itemId, deep?)

Finds all containers holding an item.

```typescript
const locations = inventory.findItem('rare-gem');
// [{ containerId: 'chest-001', quantity: 2 }, { containerId: 'backpack', quantity: 1 }]
```

### getTotalWeight(containerId)

Calculates total weight of container contents.

```typescript
const weight = inventory.getTotalWeight('backpack');
// 47.5
```

### getRemainingCapacity(containerId)

Gets remaining capacity by mode type.

```typescript
const remaining = inventory.getRemainingCapacity('backpack');
// For weight mode: { weight: 12.5 }
// For count mode: { count: 5 }
// For grid mode: { cells: 24 }
```

### isEmpty(containerId)

Checks if container is empty.

```typescript
if (inventory.isEmpty('chest-001')) {
  // container has no items
}
```

## Stack Operations

### splitStack(containerId, itemId, stackIndex, amount)

Splits a stack into two.

```typescript
inventory.splitStack('backpack', 'arrow', 0, 10);
// Splits first arrow stack, removing 10 arrows and creating new stack
```

### mergeStacks(containerId, itemId, fromIndex, toIndex)

Merges two stacks of the same item.

```typescript
inventory.mergeStacks('backpack', 'gold-coin', 1, 0);
// Merges second gold stack into first
```

### consolidate(containerId)

Consolidates all stacks of each item type to minimize total stacks.

```typescript
inventory.consolidate('backpack');
// Combines all partial stacks where possible
```

## Grid Operations

### addItemAt(containerId, itemId, quantity, position, rotated?)

Places item at specific grid position.

```typescript
inventory.addItemAt('grid-inv', 'rifle', 1, { x: 2, y: 1 }, false);
```

### findPlacements(containerId, itemId)

Finds all valid positions for an item.

```typescript
const positions = inventory.findPlacements('grid-inv', 'medkit');
// [{ x: 0, y: 0, rotated: false }, { x: 5, y: 2, rotated: true }]
```

### getGrid(containerId)

Gets the full grid state as a 2D array.

```typescript
const grid = inventory.getGrid('grid-inv');
// grid[y][x] = { itemId: 'rifle', quantity: 1, isOrigin: true } | null
```

### autoArrange(containerId)

Optimally repacks grid items to minimize empty space.

```typescript
inventory.autoArrange('grid-inv');
```

## Slot Operations

### setSlot(containerId, slot, itemId, quantity?)

Sets an item in a specific slot.

```typescript
const previous = inventory.setSlot('equipment', 'mainHand', 'iron-sword');
// Returns previously equipped item if any
```

### getSlot(containerId, slot)

Gets the item in a slot.

```typescript
const weapon = inventory.getSlot('equipment', 'mainHand');
// { itemId: 'iron-sword', quantity: 1 } | null
```

### clearSlot(containerId, slot)

Removes item from a slot.

```typescript
inventory.clearSlot('equipment', 'head');
```

### canEquip(containerId, slot, itemId)

Checks if an item can be equipped in a slot (validates slot filters).

```typescript
if (inventory.canEquip('equipment', 'head', 'iron-helmet')) {
  inventory.setSlot('equipment', 'head', 'iron-helmet');
}
```

### getAllSlots(containerId)

Gets all slots and their contents.

```typescript
const slots = inventory.getAllSlots('equipment');
// { head: { itemId: 'iron-helmet', quantity: 1 }, chest: null, ... }
```

## Locking

### lockItem(containerId, itemId)

Locks an item to prevent removal or transfer.

```typescript
inventory.lockItem('equipment', 'cursed-ring');
// Item cannot be removed until unlocked
```

### unlockItem(containerId, itemId)

Unlocks a previously locked item.

```typescript
inventory.unlockItem('equipment', 'cursed-ring');
```

## Transactions

Group multiple operations with automatic rollback on failure.

```typescript
inventory.transaction(() => {
  inventory.removeItem('backpack', 'gold-coin', 100);
  inventory.addItem('merchant-chest', 'gold-coin', 100);
  inventory.addItem('backpack', 'magic-sword', 1);
  // If any operation fails, all changes are rolled back
});
```

## Sorting

### sort(containerId, compareFn?)

Sorts container contents (works with unlimited, count, weight modes).

```typescript
// Sort by item ID
inventory.sort('backpack', (a, b) => a.itemId.localeCompare(b.itemId));

// Sort by quantity
inventory.sort('backpack', (a, b) => b.quantity - a.quantity);
```

## Events

Subscribe to inventory changes.

```typescript
// Item added
inventory.on('itemAdded', ({ containerId, itemId, quantity, newTotal }) => {
  console.log(`Added ${quantity}x ${itemId} to ${containerId}`);
});

// Item removed
inventory.on('itemRemoved', ({ containerId, itemId, quantity, newTotal }) => {
  console.log(`Removed ${quantity}x ${itemId} from ${containerId}`);
});

// Item transferred
inventory.on('itemTransferred', ({ from, to, itemId, quantity }) => {
  console.log(`Transferred ${quantity}x ${itemId} from ${from} to ${to}`);
});

// Container full
inventory.on('containerFull', ({ containerId, itemId, overflow }) => {
  console.log(`Container ${containerId} full, couldn't add ${overflow}x ${itemId}`);
});

// Slot changed (slots mode)
inventory.on('slotChanged', ({ containerId, slot, oldItem, newItem }) => {
  console.log(`Slot ${slot} changed`);
});

// Container removed
inventory.on('containerRemoved', ({ containerId }) => {
  console.log(`Container ${containerId} removed`);
});

// Unsubscribe
const unsubscribe = inventory.on('itemAdded', callback);
unsubscribe();
```

## Serialization

Save and load inventory state as JSON.

```typescript
// Serialize entire inventory
const saveData = inventory.serialize();

// Save to storage
localStorage.setItem('inventory', JSON.stringify(saveData));

// Load from storage
const saveData = JSON.parse(localStorage.getItem('inventory'));
inventory.deserialize(saveData);

// Serialize single container
const containerData = inventory.serializeContainer('backpack');
```

## Nested Containers

Containers can hold other containers (bags in bags).

```typescript
// Create a bag that can be stored in other containers
inventory.createContainer('small-pouch', {
  mode: 'weight',
  maxWeight: 5,
});

// Add the pouch to the backpack
inventory.addItem('backpack', 'small-pouch', 1);

// Items in nested containers count toward parent weight
const totalWeight = inventory.getTotalWeight('backpack'); // Includes pouch contents

// Find items in nested containers
const locations = inventory.findItem('gold-coin', true);
// Searches all levels of nesting
```

## Error Handling

```typescript
import { InventoryError, ValidationError } from '@motioneffector/inventory';

try {
  inventory.addItem('backpack', 'heavy-item', 1);
} catch (e) {
  if (e instanceof ValidationError) {
    // Invalid operation (bad container ID, etc.)
    console.error('Validation error:', e.message);
  } else if (e instanceof InventoryError) {
    // Other inventory errors
    console.error('Inventory error:', e.message);
  }
}
```

Most operations return result objects instead of throwing:

```typescript
const result = inventory.addItem('backpack', 'item', 1);
if (!result.success) {
  console.log(`Failed: ${result.reason}`);
  console.log(`Could add: ${result.maxAddable}`);
}
```

## Demo

[Try the interactive demo](https://motioneffector.github.io/inventory/demo.html)

The demo includes a visual grid inventory with drag-and-drop, item rotation, and a three-tier container system (backpack, storage chest, and player pockets).

## TypeScript Support

Full TypeScript support with complete type definitions and type inference.

```typescript
import type {
  InventoryManager,
  ContainerConfig,
  AddItemResult,
  GridPosition,
} from '@motioneffector/inventory';
```

## Browser Support

Works in all modern browsers (ES2022+). For older browsers, transpile with your build tool (Babel, SWC, etc.).

## License

MIT © [motioneffector](https://github.com/motioneffector)
