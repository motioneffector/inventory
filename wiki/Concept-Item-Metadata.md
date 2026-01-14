# Item Metadata

The library doesn't know about your game's items. It stores item IDs (strings) and quantities, but has no idea what a "sword" weighs or how big a "shield" is. You teach it through callback functions.

## How It Works

When you create the inventory manager, you pass callback functions that the library calls whenever it needs item information:

```
Your Game                    Inventory Library
─────────                    ─────────────────
Item Database                     │
  sword: { weight: 5 }           │
  potion: { weight: 1 }    ───►  getItemWeight('sword') → 5
  shield: { w: 2, h: 2 }   ───►  getItemSize('shield') → { width: 2, height: 2 }
```

This design keeps the library decoupled from your game's data structures. You control how item properties are looked up.

## Basic Usage

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

// Your game's item data (however you structure it)
const items = {
  sword: { weight: 5, size: { w: 1, h: 3 }, maxStack: 1 },
  potion: { weight: 1, size: { w: 1, h: 1 }, maxStack: 20 },
  gold: { weight: 0.01, size: { w: 1, h: 1 }, maxStack: 9999 },
}

// Create manager with callbacks
const inventory = createInventoryManager({
  getItemWeight: (id) => items[id]?.weight ?? 1,
  getItemSize: (id) => items[id]?.size ?? { w: 1, h: 1 },
  getItemStackLimit: (id) => items[id]?.maxStack ?? 99,
})
```

## The Three Callbacks

### getItemWeight

Returns the weight of an item. Required for `weight` mode containers.

```typescript
getItemWeight: (itemId: string) => number
```

Must return a positive number. Zero weight is not allowed.

### getItemSize

Returns the dimensions of an item for grid placement. Required for `grid` mode containers.

```typescript
getItemSize: (itemId: string) => { width: number; height: number }
```

Both `width` and `height` must be positive integers.

### getItemStackLimit

Returns the maximum stack size for an item. Optional—defaults to `defaultStackSize` or 99.

```typescript
getItemStackLimit: (itemId: string) => number
```

## Key Points

- **Callbacks are called on demand** - The library calls your callbacks whenever it needs the data, not upfront. Keep them fast.
- **Return consistent values** - If `getItemWeight('sword')` returns 5 once, it should always return 5. Changing values mid-game can cause inconsistencies.
- **Handle unknown items** - Your callbacks receive any string. Return sensible defaults for unknown items.
- **defaultStackSize fallback** - If you don't provide `getItemStackLimit`, items use `defaultStackSize` (default: 99).

## Examples

### Using a Database Lookup

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

// Imagine this comes from a JSON file or database
const itemDatabase = new Map([
  ['iron-sword', { weight: 8, width: 1, height: 4 }],
  ['health-potion', { weight: 0.5, width: 1, height: 1 }],
  ['tower-shield', { weight: 15, width: 2, height: 3 }],
])

const inventory = createInventoryManager({
  getItemWeight: (id) => itemDatabase.get(id)?.weight ?? 1,
  getItemSize: (id) => {
    const item = itemDatabase.get(id)
    return item ? { width: item.width, height: item.height } : { width: 1, height: 1 }
  },
})
```

### Using Class Instances

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

class Item {
  constructor(
    public id: string,
    public weight: number,
    public width: number,
    public height: number
  ) {}
}

const itemRegistry = new Map<string, Item>()
itemRegistry.set('sword', new Item('sword', 5, 1, 3))

const inventory = createInventoryManager({
  getItemWeight: (id) => itemRegistry.get(id)?.weight ?? 1,
  getItemSize: (id) => {
    const item = itemRegistry.get(id)
    return { width: item?.width ?? 1, height: item?.height ?? 1 }
  },
})
```

### Different Stack Limits Per Item Type

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemStackLimit: (id) => {
    if (id.includes('weapon') || id.includes('armor')) return 1 // No stacking
    if (id === 'gold') return 9999
    if (id.includes('potion')) return 20
    return 99 // Default
  },
  defaultStackSize: 99,
})
```

## Related

- **[Storage Modes](Concept-Storage-Modes)** - Modes that require these callbacks
- **[Weight-Based Inventories](Guide-Weight-Based-Inventories)** - Uses `getItemWeight`
- **[Grid Placement](Guide-Grid-Placement)** - Uses `getItemSize`
- **[Stacking](Concept-Stacking)** - Uses `getItemStackLimit`
