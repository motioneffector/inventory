# Using Transactions

Perform atomic operations that roll back on failure. Transactions ensure multiple inventory changes either all succeed or all fail together.

## Prerequisites

Before starting, you should:

- [Know basic inventory operations](Your-First-Inventory)
- [Understand events and transactions concept](Concept-Events-And-Transactions)

## Overview

We'll use transactions by:

1. Wrapping operations in `transaction(() => { ... })`
2. Throwing errors to trigger rollback
3. Understanding what gets rolled back

## Step 1: Wrap Operations in Transaction

Any operations inside the callback run atomically.

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

inventory.createContainer('player', { mode: 'unlimited' })
inventory.createContainer('shop', { mode: 'unlimited' })
inventory.addItem('player', 'gold', 100)
inventory.addItem('shop', 'sword', 1)

// All operations succeed or fail together
inventory.transaction(() => {
  inventory.removeItem('player', 'gold', 50)
  inventory.addItem('player', 'sword', 1)
  inventory.removeItem('shop', 'sword', 1)
  inventory.addItem('shop', 'gold', 50)
})

console.log(inventory.getQuantity('player', 'gold'))  // 50
console.log(inventory.getQuantity('player', 'sword')) // 1
```

## Step 2: Trigger Rollback with Errors

Throw any error inside the transaction to roll back all changes.

```typescript
inventory.createContainer('bag', { mode: 'unlimited' })
inventory.addItem('bag', 'gem', 10)

try {
  inventory.transaction(() => {
    inventory.removeItem('bag', 'gem', 5)
    // Some condition fails
    if (true) {
      throw new Error('Transaction cancelled')
    }
    inventory.addItem('bag', 'processed-gem', 5)
  })
} catch (e) {
  console.log('Transaction failed:', e.message)
}

// Rollback occurred - still have 10 gems
console.log(inventory.getQuantity('bag', 'gem')) // 10
```

## Step 3: Check Results Before Committing

Validate operation results and throw if something went wrong.

```typescript
function safePurchase(itemId: string, price: number) {
  inventory.transaction(() => {
    // Remove gold
    const goldRemoved = inventory.removeItem('player', 'gold', price)
    if (goldRemoved < price) {
      throw new Error(`Need ${price} gold, only have ${goldRemoved}`)
    }

    // Add item
    const result = inventory.addItem('player', itemId, 1)
    if (!result.success) {
      throw new Error(`Cannot add ${itemId}: ${result.reason}`)
    }

    // Remove from shop
    const shopRemoved = inventory.removeItem('shop', itemId, 1)
    if (shopRemoved === 0) {
      throw new Error(`${itemId} not in stock`)
    }
  })
}
```

## Complete Example

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemWeight: (id) => {
    if (id === 'gold') return 0.01
    if (id.includes('potion')) return 0.5
    if (id.includes('sword')) return 5
    return 1
  },
})

// Setup game state
inventory.createContainer('player', { mode: 'weight', maxWeight: 30 })
inventory.createContainer('merchant', { mode: 'unlimited' })
inventory.createContainer('craftingTable', { mode: 'unlimited' })

inventory.addItem('player', 'gold', 200)
inventory.addItem('player', 'iron-ore', 5)
inventory.addItem('merchant', 'health-potion', 20)
inventory.addItem('merchant', 'steel-sword', 1)

// --- BUYING ---
function buy(item: string, price: number): boolean {
  try {
    inventory.transaction(() => {
      const paid = inventory.removeItem('player', 'gold', price)
      if (paid < price) throw new Error('Not enough gold')

      const result = inventory.addItem('player', item, 1)
      if (!result.success) throw new Error('Inventory full')

      inventory.removeItem('merchant', item, 1)
    })
    console.log(`Bought ${item} for ${price} gold`)
    return true
  } catch (e) {
    console.log(`Failed to buy ${item}: ${e.message}`)
    return false
  }
}

// --- CRAFTING ---
function craft(materials: Record<string, number>, result: string): boolean {
  try {
    inventory.transaction(() => {
      // Remove all materials
      for (const [material, count] of Object.entries(materials)) {
        const removed = inventory.removeItem('player', material, count)
        if (removed < count) {
          throw new Error(`Need ${count} ${material}, only have ${removed}`)
        }
      }

      // Add crafted item
      const addResult = inventory.addItem('player', result, 1)
      if (!addResult.success) {
        throw new Error('No room for crafted item')
      }
    })
    console.log(`Crafted ${result}`)
    return true
  } catch (e) {
    console.log(`Crafting failed: ${e.message}`)
    return false
  }
}

// Test purchases
buy('health-potion', 10) // Success
buy('steel-sword', 50)   // Success if weight allows

// Test crafting
craft({ 'iron-ore': 3 }, 'iron-ingot')
```

## Variations

### Nested Transactions

Transactions can't be nested—the outer transaction encompasses everything.

```typescript
inventory.transaction(() => {
  inventory.addItem('bag', 'item1', 1)

  // This is NOT a separate transaction
  // It's part of the outer transaction
  inventory.transaction(() => {
    inventory.addItem('bag', 'item2', 1)
    throw new Error('Inner error')
  })

  // This line never runs - outer transaction rolls back too
  inventory.addItem('bag', 'item3', 1)
})
// Both item1 and item2 are rolled back
```

### Conditional Commits

```typescript
function tradeIfProfitable(selling: string, buying: string, ratio: number) {
  inventory.transaction(() => {
    const sellCount = inventory.getQuantity('player', selling)
    const sellPrice = sellCount * getPrice(selling)
    const buyPrice = getPrice(buying)

    if (sellPrice < buyPrice * ratio) {
      throw new Error('Not profitable enough')
    }

    inventory.removeItem('player', selling, sellCount)
    inventory.addItem('player', buying, Math.floor(sellPrice / buyPrice))
  })
}
```

### Logging Within Transactions

Logs still execute even if transaction rolls back.

```typescript
inventory.transaction(() => {
  console.log('Starting transaction') // Always logs

  inventory.addItem('bag', 'item', 1)
  console.log('Added item') // Logs even if rolled back

  throw new Error('Oops')
})
// Console shows both log messages, but item wasn't added
```

## Troubleshooting

### Changes Persist After Error

**Symptom:** Operations outside the transaction callback aren't rolled back.

**Cause:** Only operations inside `transaction(() => { ... })` are atomic.

**Solution:** Move all related operations inside the transaction:

```typescript
// WRONG: preparation outside transaction
inventory.addItem('temp', 'item', 1) // Not rolled back
inventory.transaction(() => {
  throw new Error('fail')
})

// RIGHT: everything inside
inventory.transaction(() => {
  inventory.addItem('temp', 'item', 1) // Rolled back on error
  throw new Error('fail')
})
```

### Async Operations Don't Roll Back

**Symptom:** Operations in async callbacks aren't rolled back.

**Cause:** Transactions are synchronous. Async operations complete after the transaction.

**Solution:** Don't use async/await inside transactions:

```typescript
// WRONG: async inside transaction
inventory.transaction(async () => {
  await someAsyncOperation() // Transaction completes before this
  inventory.addItem('bag', 'item', 1)
})

// RIGHT: prepare data first, then use transaction
const data = await someAsyncOperation()
inventory.transaction(() => {
  inventory.addItem('bag', data.itemId, 1)
})
```

## See Also

- **[Events & Transactions](Concept-Events-And-Transactions)** - Conceptual overview
- **[Transactions API](API-Transactions)** - Reference for `transaction()`
- **[Transferring Items](Guide-Transferring-Items)** - Common use case for transactions
