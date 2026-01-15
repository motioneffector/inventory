# Transferring Items

Move items between containers safely. The library handles capacity checks, partial transfers, and locked item restrictions.

## Prerequisites

Before starting, you should:

- [Understand how containers work](Concept-Containers)
- [Know about basic item operations](Your-First-Inventory)

## Overview

We'll transfer items by:

1. Using `transfer(from, to, itemId, quantity)`
2. Handling partial transfers when destination is full
3. Understanding locked item restrictions

## Step 1: Basic Transfer

Use `transfer` to move items from one container to another.

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

inventory.createContainer('backpack', { mode: 'unlimited' })
inventory.createContainer('chest', { mode: 'unlimited' })

// Add items to backpack
inventory.addItem('backpack', 'gold', 100)
inventory.addItem('backpack', 'potion', 10)

// Transfer 50 gold to chest
const result = inventory.transfer('backpack', 'chest', 'gold', 50)
console.log(result) // { transferred: 50, overflow: 0 }

// Check both containers
console.log(inventory.getQuantity('backpack', 'gold')) // 50
console.log(inventory.getQuantity('chest', 'gold'))    // 50
```

## Step 2: Handle Partial Transfers

When the destination can't hold everything, `transfer` moves what fits and reports overflow.

```typescript
const inventory = createInventoryManager({
  getItemWeight: () => 1,
})

inventory.createContainer('backpack', { mode: 'unlimited' })
inventory.createContainer('small-pouch', { mode: 'weight', maxWeight: 10 })

inventory.addItem('backpack', 'coin', 100)

// Try to transfer 100 coins to a 10-weight pouch
const result = inventory.transfer('backpack', 'small-pouch', 'coin', 100)
console.log(result) // { transferred: 10, overflow: 90 }

// 10 moved, 90 stayed in backpack
console.log(inventory.getQuantity('backpack', 'coin'))     // 90
console.log(inventory.getQuantity('small-pouch', 'coin')) // 10
```

## Step 3: Locked Item Restrictions

Locked items cannot be transferred. Attempting to do so throws an error.

```typescript
inventory.createContainer('quest-bag', { mode: 'unlimited' })
inventory.createContainer('chest', { mode: 'unlimited' })

inventory.addItem('quest-bag', 'quest-item', 1)
inventory.lockItem('quest-bag', 'quest-item')

try {
  inventory.transfer('quest-bag', 'chest', 'quest-item', 1)
} catch (e) {
  console.log('Cannot transfer locked items')
}

// Unlock to allow transfer
inventory.unlockItem('quest-bag', 'quest-item')
inventory.transfer('quest-bag', 'chest', 'quest-item', 1) // Now works
```

## Complete Example

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemWeight: (id) => ({ gold: 0.01, potion: 0.5, sword: 5 }[id] ?? 1),
})

// Player inventory (weight-limited)
inventory.createContainer('player', { mode: 'weight', maxWeight: 50 })

// Storage chest (unlimited)
inventory.createContainer('storage', { mode: 'unlimited' })

// Merchant (unlimited)
inventory.createContainer('merchant', { mode: 'unlimited' })

// Setup initial items
inventory.addItem('player', 'gold', 500)
inventory.addItem('player', 'potion', 10)
inventory.addItem('player', 'sword', 2)
inventory.addItem('merchant', 'rare-sword', 1)

// Store excess items
console.log('Before storage:', inventory.getTotalWeight('player'))
inventory.transfer('player', 'storage', 'sword', 1) // Free up 5 weight
console.log('After storage:', inventory.getTotalWeight('player'))

// Buy from merchant (gold for item)
function buyItem(itemId: string, price: number): boolean {
  inventory.transaction(() => {
    const paid = inventory.transfer('player', 'merchant', 'gold', price)
    if (paid.transferred < price) {
      throw new Error('Not enough gold')
    }

    const received = inventory.transfer('merchant', 'player', itemId, 1)
    if (received.transferred === 0) {
      throw new Error('Could not receive item')
    }
  })
  return true
}

try {
  buyItem('rare-sword', 100)
  console.log('Purchase successful!')
} catch (e) {
  console.log('Purchase failed:', e.message)
}
```

## Variations

### Transfer All of an Item

```typescript
function transferAll(from: string, to: string, itemId: string) {
  const quantity = inventory.getQuantity(from, itemId)
  return inventory.transfer(from, to, itemId, quantity)
}
```

### Safe Transfer with Rollback

Use transactions to ensure both containers stay consistent.

```typescript
function safeTransfer(from: string, to: string, itemId: string, quantity: number) {
  inventory.transaction(() => {
    const result = inventory.transfer(from, to, itemId, quantity)
    if (result.overflow > 0) {
      throw new Error(`Could only transfer ${result.transferred} of ${quantity}`)
    }
  })
}
```

### Cross-Mode Transfers

Transfer works between containers of different modes.

```typescript
// From unlimited to grid
inventory.createContainer('bag', { mode: 'unlimited' })
inventory.createContainer('stash', { mode: 'grid', width: 5, height: 5 })

inventory.addItem('bag', 'gem', 10)
inventory.transfer('bag', 'stash', 'gem', 5) // Works if grid has space
```

## Troubleshooting

### Transfer Returns Zero

**Symptom:** `transfer` returns `{ transferred: 0, overflow: N }`.

**Cause:** Either the source doesn't have the item, or the destination is full.

**Solution:** Check source quantity and destination capacity:

```typescript
const available = inventory.getQuantity(source, itemId)
const canFit = inventory.canAdd(destination, itemId, quantity)
```

### Transfer Throws Error

**Symptom:** `transfer` throws instead of returning a result.

**Cause:** The item is locked, or a container doesn't exist.

**Solution:** Check for locks and valid container IDs:

```typescript
// Ensure containers exist
const containers = inventory.listContainers()
if (!containers.includes(source)) {
  console.log('Source container missing')
}
```

## See Also

- **[Item Operations API](API-Item-Operations)** - Reference for `transfer`, `addItem`, `removeItem`
- **[Locking Items](Guide-Locking-Items)** - Preventing item removal/transfer
- **[Using Transactions](Guide-Using-Transactions)** - Atomic operations with rollback
