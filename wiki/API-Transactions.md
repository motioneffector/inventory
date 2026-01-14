# Transactions API

Atomic operation wrapper for grouped inventory changes.

---

## `transaction()`

Wraps multiple operations in an atomic unit. If any operation throws, all changes roll back.

**Signature:**

```typescript
function transaction(fn: () => void): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `fn` | `() => void` | Yes | Function containing inventory operations |

**Returns:** `void`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('player', { mode: 'unlimited' })
inventory.createContainer('shop', { mode: 'unlimited' })
inventory.addItem('player', 'gold', 100)
inventory.addItem('shop', 'sword', 1)

// Successful transaction
inventory.transaction(() => {
  inventory.removeItem('player', 'gold', 50)
  inventory.addItem('player', 'sword', 1)
  inventory.removeItem('shop', 'sword', 1)
  inventory.addItem('shop', 'gold', 50)
})

// Both containers updated
console.log(inventory.getQuantity('player', 'gold'))  // 50
console.log(inventory.getQuantity('player', 'sword')) // 1
```

---

## Rollback on Error

Any error inside the transaction triggers a complete rollback.

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', { mode: 'unlimited' })
inventory.addItem('bag', 'gem', 10)

try {
  inventory.transaction(() => {
    inventory.removeItem('bag', 'gem', 5)
    // Simulate failure
    throw new Error('Something went wrong')
  })
} catch (e) {
  console.log('Transaction failed:', e.message)
}

// Rollback occurred - still have 10 gems
console.log(inventory.getQuantity('bag', 'gem')) // 10
```

---

## Validation Pattern

Check operation results and throw to trigger rollback.

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('player', { mode: 'weight', maxWeight: 20 })
inventory.createContainer('shop', { mode: 'unlimited' })
inventory.addItem('player', 'gold', 100)
inventory.addItem('shop', 'heavy-armor', 1)

function buyItem(itemId: string, price: number): boolean {
  try {
    inventory.transaction(() => {
      // Check gold
      const paid = inventory.removeItem('player', 'gold', price)
      if (paid < price) {
        throw new Error(`Need ${price} gold, only have ${paid}`)
      }

      // Check item fits
      const result = inventory.addItem('player', itemId, 1)
      if (!result.success) {
        throw new Error(`Cannot carry ${itemId}: ${result.reason}`)
      }

      // Remove from shop
      inventory.removeItem('shop', itemId, 1)
    })
    return true
  } catch (e) {
    console.log('Purchase failed:', e.message)
    return false
  }
}

buyItem('heavy-armor', 50) // May fail if too heavy
```

---

## Important Notes

### Synchronous Only

Transactions are synchronous. Async operations inside the callback will not be rolled back.

```typescript
// WRONG - async won't roll back properly
inventory.transaction(async () => {
  await someAsyncOperation()
  inventory.addItem('bag', 'item', 1)
})

// RIGHT - prepare data first
const data = await someAsyncOperation()
inventory.transaction(() => {
  inventory.addItem('bag', data.itemId, 1)
})
```

### No Nested Transactions

The library doesn't support nested transactions. An inner `transaction()` call is part of the outer one.

```typescript
inventory.transaction(() => {
  inventory.addItem('bag', 'item1', 1)

  // This is NOT a separate transaction
  inventory.transaction(() => {
    inventory.addItem('bag', 'item2', 1)
    throw new Error('fail')
  })
  // Outer transaction also fails - both items rolled back
})
```

### Events Still Fire

Events fire during the transaction even if it later rolls back. Design your event handlers accordingly.

```typescript
let log: string[] = []

inventory.on('itemAdded', (e) => {
  log.push(`added ${e.itemId}`)
})

try {
  inventory.transaction(() => {
    inventory.addItem('bag', 'item', 1) // Event fires here
    throw new Error('rollback')
  })
} catch {}

console.log(log) // ['added item'] - event fired even though rolled back
```
