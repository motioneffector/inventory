# Weight-Based Inventories

Create an inventory with carry capacity limits. Items have weight, and the container enforces a maximum total weight.

## Prerequisites

Before starting, you should:

- [Understand how containers work](Concept-Containers)
- [Know about item metadata callbacks](Concept-Item-Metadata)

## Overview

We'll create a weight-limited backpack by:

1. Providing a `getItemWeight` callback to the manager
2. Creating a container with `mode: 'weight'` and `maxWeight`
3. Adding items (the library auto-enforces the weight limit)
4. Querying remaining capacity

## Step 1: Provide the Weight Callback

The library needs to know how much each item weighs. Pass a `getItemWeight` function when creating the manager.

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemWeight: (itemId) => {
    const weights: Record<string, number> = {
      'iron-sword': 8,
      'health-potion': 0.5,
      'gold-coin': 0.01,
      'tower-shield': 15,
    }
    return weights[itemId] ?? 1 // Default weight of 1
  },
})
```

The callback receives the item ID and must return a positive number. Zero weight is not allowed.

## Step 2: Create a Weight Container

Create a container with `mode: 'weight'` and specify the maximum weight.

```typescript
inventory.createContainer('backpack', {
  mode: 'weight',
  maxWeight: 50, // Can hold up to 50 weight units
})
```

## Step 3: Add Items

Add items normally. The library calculates total weight and rejects items that would exceed the limit.

```typescript
// Add a sword (8 weight) - success
const result1 = inventory.addItem('backpack', 'iron-sword', 1)
console.log(result1) // { success: true, added: 1, overflow: 0 }

// Add 10 potions (0.5 each = 5 weight) - success
const result2 = inventory.addItem('backpack', 'health-potion', 10)
console.log(result2) // { success: true, added: 10, overflow: 0 }

// Current weight: 8 + 5 = 13

// Try to add 100 potions (50 weight) - partial success
const result3 = inventory.addItem('backpack', 'health-potion', 100)
console.log(result3)
// { success: false, added: 74, overflow: 26, reason: 'weight_exceeded' }
// Added 74 (37 weight), couldn't fit 26 more
```

## Step 4: Query Remaining Capacity

Check how much weight capacity remains, or ask if specific items can fit.

```typescript
// Get remaining capacity
const capacity = inventory.getRemainingCapacity('backpack')
// { type: 'weight', remaining: 0 } (full after adding 74 more potions)

// Check if more items can fit
const canFit = inventory.canAdd('backpack', 'gold-coin', 1000)
// { canAdd: true, maxAddable: 0 } (no room)

// Get total weight
const weight = inventory.getTotalWeight('backpack')
// 50
```

## Complete Example

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

// Item weights for our game
const itemWeights: Record<string, number> = {
  'iron-sword': 8,
  'steel-sword': 10,
  'health-potion': 0.5,
  'mana-potion': 0.5,
  'gold-coin': 0.01,
  'iron-ore': 2,
  'dragon-scale': 5,
}

const inventory = createInventoryManager({
  getItemWeight: (id) => itemWeights[id] ?? 1,
})

// Create a 50-weight backpack
inventory.createContainer('backpack', {
  mode: 'weight',
  maxWeight: 50,
})

// Equip for adventure
inventory.addItem('backpack', 'iron-sword', 1)     // 8 weight
inventory.addItem('backpack', 'health-potion', 10) // 5 weight
inventory.addItem('backpack', 'gold-coin', 100)    // 1 weight

console.log(inventory.getTotalWeight('backpack')) // 14
console.log(inventory.getRemainingCapacity('backpack'))
// { type: 'weight', remaining: 36 }

// Can we carry 20 iron ore?
const check = inventory.canAdd('backpack', 'iron-ore', 20)
// { canAdd: true, maxAddable: 18 } (36 / 2 = 18 max)
```

## Variations

### Fractional Weights

Weight can be any positive number, including decimals.

```typescript
const inventory = createInventoryManager({
  getItemWeight: (id) => {
    if (id === 'feather') return 0.001
    if (id === 'boulder') return 500
    return 1
  },
})
```

### Weight with Stacking

Combine weight limits with item stacking. Each stack's weight is `itemWeight * quantity`.

```typescript
inventory.createContainer('pouch', {
  mode: 'weight',
  maxWeight: 10,
  allowStacking: true,
  maxStackSize: 99,
})

// Add 20 potions (0.5 weight each = 10 total) as one stack
inventory.addItem('pouch', 'health-potion', 20)
```

### Different Capacity Containers

```typescript
// Small pouch for quick access
inventory.createContainer('belt-pouch', {
  mode: 'weight',
  maxWeight: 5,
})

// Large backpack for general storage
inventory.createContainer('backpack', {
  mode: 'weight',
  maxWeight: 50,
})

// Cart for bulk transport
inventory.createContainer('cart', {
  mode: 'weight',
  maxWeight: 500,
})
```

## Troubleshooting

### Weight Always Returns Wrong Value

**Symptom:** `getTotalWeight` returns unexpected numbers.

**Cause:** Your `getItemWeight` callback returns inconsistent values or the wrong type.

**Solution:** Ensure the callback always returns a positive number for any item ID:

```typescript
getItemWeight: (id) => {
  const weight = myItemDatabase[id]?.weight
  if (typeof weight !== 'number' || weight <= 0) {
    console.warn(`Unknown or invalid weight for ${id}, using default`)
    return 1
  }
  return weight
}
```

### Items Rejected Unexpectedly

**Symptom:** `addItem` fails even when you think there's room.

**Cause:** Weight calculation includes all items. Check actual remaining capacity.

**Solution:** Use `getRemainingCapacity` to see exact remaining weight before adding.

## See Also

- **[Storage Modes](Concept-Storage-Modes)** - Overview of all container modes
- **[Item Metadata](Concept-Item-Metadata)** - More on the `getItemWeight` callback
- **[Querying API](API-Querying)** - Reference for `getTotalWeight`, `getRemainingCapacity`, `canAdd`
