# Events & Transactions

Events notify you when inventory changes happen. Transactions group operations into atomic units that roll back on failure.

## Events

### How Events Work

Subscribe to events with `manager.on(eventName, callback)`. Your callback runs whenever that event fires. The `on` method returns an unsubscribe function.

```
addItem('backpack', 'sword', 1)
         │
         ▼
    ┌─────────────────┐
    │ 'itemAdded'     │────► Your callback({ containerId, itemId, quantity, newTotal })
    │ event fires     │
    └─────────────────┘
```

### Basic Usage

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('backpack', { mode: 'unlimited' })

// Subscribe to item additions
const unsubscribe = inventory.on('itemAdded', (event) => {
  console.log(`Added ${event.quantity} ${event.itemId} to ${event.containerId}`)
  console.log(`New total: ${event.newTotal}`)
})

inventory.addItem('backpack', 'sword', 1)
// Logs: "Added 1 sword to backpack"
// Logs: "New total: 1"

// Later, stop listening
unsubscribe()
```

### Available Events

| Event | When it fires | Payload |
|-------|---------------|---------|
| `itemAdded` | Item added to container | `{ containerId, itemId, quantity, newTotal }` |
| `itemRemoved` | Item removed from container | `{ containerId, itemId, quantity, newTotal }` |
| `itemTransferred` | Item moved between containers | `{ from, to, itemId, quantity }` |
| `containerFull` | Add failed due to capacity | `{ containerId, itemId, overflow }` |
| `slotChanged` | Equipment slot changed | `{ containerId, slot, oldItem, newItem }` |
| `containerRemoved` | Container destroyed | `{ containerId }` |

### Event Examples

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

// React to inventory full
inventory.on('containerFull', (event) => {
  showNotification(`Cannot add ${event.overflow} more ${event.itemId}!`)
})

// React to equipment changes
inventory.on('slotChanged', (event) => {
  if (event.newItem) {
    updateCharacterModel(event.slot, event.newItem)
  }
})

// Log all removals
inventory.on('itemRemoved', (event) => {
  analytics.track('item_removed', {
    item: event.itemId,
    quantity: event.quantity,
  })
})
```

## Transactions

### How Transactions Work

Wrap operations in `transaction(() => { ... })`. If any operation throws an error, all changes roll back to the state before the transaction started.

```
transaction(() => {
  removeItem('backpack', 'gold', 100)  ─┐
  addItem('shop', 'sword', 1)          ─┤ All succeed or all fail
  removeItem('shop', 'sword', 1)       ─┤
  addItem('backpack', 'sword', 1)      ─┘
})
```

### Basic Usage

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('player', { mode: 'unlimited' })
inventory.createContainer('chest', { mode: 'unlimited' })
inventory.addItem('player', 'gold', 100)

// Successful transaction
inventory.transaction(() => {
  inventory.removeItem('player', 'gold', 50)
  inventory.addItem('chest', 'gold', 50)
})
// Both changes applied

// Failed transaction
try {
  inventory.transaction(() => {
    inventory.removeItem('player', 'gold', 25)
    inventory.addItem('chest', 'gold', 25)
    throw new Error('Changed my mind!') // Simulated failure
  })
} catch (e) {
  // Transaction rolled back
}

// Player still has 50 gold (not 25)
console.log(inventory.getQuantity('player', 'gold')) // 50
```

### When to Use Transactions

Use transactions when you have multiple operations that must all succeed or all fail:

- **Trading** - Remove gold, add item; both must work
- **Crafting** - Remove materials, add result; don't lose materials if crafting fails
- **Moving items** - Remove from source, add to destination; don't duplicate or lose items

### Transaction Example: Safe Trade

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('player', { mode: 'weight', maxWeight: 50 })
inventory.createContainer('merchant', { mode: 'unlimited' })
inventory.addItem('player', 'gold', 100)
inventory.addItem('merchant', 'rare-sword', 1)

function buyItem(itemId: string, price: number): boolean {
  try {
    inventory.transaction(() => {
      // Remove gold from player
      const removed = inventory.removeItem('player', 'gold', price)
      if (removed < price) {
        throw new Error('Not enough gold')
      }

      // Add item to player
      const result = inventory.addItem('player', itemId, 1)
      if (!result.success) {
        throw new Error('Inventory full')
      }

      // Remove item from merchant
      inventory.removeItem('merchant', itemId, 1)
    })
    return true
  } catch (e) {
    // Transaction rolled back - gold stays, item stays with merchant
    return false
  }
}
```

## Key Points

- **Events fire immediately** - Callbacks run synchronously when the action happens, not queued.
- **Unsubscribe to avoid leaks** - Keep the unsubscribe function and call it when you no longer need the listener.
- **Transactions are synchronous** - The callback runs immediately; async operations inside won't roll back properly.
- **Rollback is complete** - On failure, the entire inventory state reverts to pre-transaction.

## Related

- **[Events API](API-Events)** - Full reference for `on()` and event types
- **[Transactions API](API-Transactions)** - Full reference for `transaction()`
- **[Using Transactions Guide](Guide-Using-Transactions)** - Practical patterns for atomic operations
