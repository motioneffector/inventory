# Events API

Reactive subscription system for inventory changes.

---

## `on()`

Subscribes to an inventory event. Returns an unsubscribe function.

**Signature:**

```typescript
function on(event: EventName, callback: EventCallback): () => void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `event` | `string` | Yes | Event name to subscribe to |
| `callback` | `function` | Yes | Function called when event fires |

**Returns:** `() => void` — Call this function to unsubscribe

---

## Event Types

### `itemAdded`

Fires when items are added to a container.

```typescript
inventory.on('itemAdded', (event: ItemAddedEvent) => {
  console.log(`Added ${event.quantity} ${event.itemId} to ${event.containerId}`)
  console.log(`New total: ${event.newTotal}`)
})
```

**Payload:** `ItemAddedEvent`

```typescript
type ItemAddedEvent = {
  containerId: string
  itemId: string
  quantity: number
  newTotal: number
}
```

---

### `itemRemoved`

Fires when items are removed from a container.

```typescript
inventory.on('itemRemoved', (event: ItemRemovedEvent) => {
  console.log(`Removed ${event.quantity} ${event.itemId} from ${event.containerId}`)
  console.log(`Remaining: ${event.newTotal}`)
})
```

**Payload:** `ItemRemovedEvent`

```typescript
type ItemRemovedEvent = {
  containerId: string
  itemId: string
  quantity: number
  newTotal: number
}
```

---

### `itemTransferred`

Fires when items are transferred between containers.

```typescript
inventory.on('itemTransferred', (event: ItemTransferredEvent) => {
  console.log(`Moved ${event.quantity} ${event.itemId} from ${event.from} to ${event.to}`)
})
```

**Payload:** `ItemTransferredEvent`

```typescript
type ItemTransferredEvent = {
  from: string
  to: string
  itemId: string
  quantity: number
}
```

---

### `containerFull`

Fires when an add operation fails due to capacity limits.

```typescript
inventory.on('containerFull', (event: ContainerFullEvent) => {
  showNotification(`Couldn't fit ${event.overflow} ${event.itemId}!`)
})
```

**Payload:** `ContainerFullEvent`

```typescript
type ContainerFullEvent = {
  containerId: string
  itemId: string
  overflow: number
}
```

---

### `slotChanged`

Fires when an equipment slot changes.

```typescript
inventory.on('slotChanged', (event: SlotChangedEvent) => {
  if (event.newItem) {
    updateCharacterModel(event.slot, event.newItem)
  } else {
    clearCharacterSlot(event.slot)
  }
})
```

**Payload:** `SlotChangedEvent`

```typescript
type SlotChangedEvent = {
  containerId: string
  slot: string
  oldItem: string | null
  newItem: string | null
}
```

---

### `containerRemoved`

Fires when a container is destroyed.

```typescript
inventory.on('containerRemoved', (event: ContainerRemovedEvent) => {
  console.log(`Container ${event.containerId} was removed`)
})
```

**Payload:** `ContainerRemovedEvent`

```typescript
type ContainerRemovedEvent = {
  containerId: string
}
```

---

## Complete Example

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

// Subscribe to multiple events
const unsubAdd = inventory.on('itemAdded', (e) => {
  console.log(`+ ${e.quantity} ${e.itemId}`)
})

const unsubRemove = inventory.on('itemRemoved', (e) => {
  console.log(`- ${e.quantity} ${e.itemId}`)
})

const unsubFull = inventory.on('containerFull', (e) => {
  console.log(`! Container full, ${e.overflow} ${e.itemId} overflow`)
})

// Use the inventory
inventory.createContainer('bag', { mode: 'count', maxCount: 3 })
inventory.addItem('bag', 'apple', 1)  // Logs: + 1 apple
inventory.addItem('bag', 'bread', 1)  // Logs: + 1 bread
inventory.addItem('bag', 'water', 1)  // Logs: + 1 water
inventory.addItem('bag', 'gem', 1)    // Logs: ! Container full, 1 gem overflow
inventory.removeItem('bag', 'apple', 1) // Logs: - 1 apple

// Later, clean up
unsubAdd()
unsubRemove()
unsubFull()
```

---

## Notes

- Events fire synchronously during the operation.
- Multiple listeners can subscribe to the same event.
- Events are not preserved through serialization—resubscribe after loading.
- Always call the unsubscribe function when done to prevent memory leaks.
