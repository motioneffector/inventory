# Locking API

Item protection operations to prevent removal or transfer.

---

## `lockItem()`

Locks an item, preventing it from being removed or transferred.

**Signature:**

```typescript
function lockItem(
  containerId: ContainerId,
  itemId: ItemId
): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |
| `itemId` | `string` | Yes | ID of the item to lock |

**Returns:** `void`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', { mode: 'unlimited' })
inventory.addItem('bag', 'quest-item', 1)

// Lock the item
inventory.lockItem('bag', 'quest-item')

// Now removal throws
try {
  inventory.removeItem('bag', 'quest-item', 1)
} catch (e) {
  console.log('Cannot remove locked item')
}

// Transfer also throws
try {
  inventory.createContainer('chest', { mode: 'unlimited' })
  inventory.transfer('bag', 'chest', 'quest-item', 1)
} catch (e) {
  console.log('Cannot transfer locked item')
}
```

**Notes:**

- Locking is by item ID, not by stack. All stacks of that item are locked.
- You can still add more of a locked item.
- Locks persist through serialization.

---

## `unlockItem()`

Removes the lock from an item, allowing removal and transfer.

**Signature:**

```typescript
function unlockItem(
  containerId: ContainerId,
  itemId: ItemId
): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |
| `itemId` | `string` | Yes | ID of the item to unlock |

**Returns:** `void`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', { mode: 'unlimited' })
inventory.addItem('bag', 'quest-item', 1)
inventory.lockItem('bag', 'quest-item')

// Quest complete - unlock
inventory.unlockItem('bag', 'quest-item')

// Now removal works
const removed = inventory.removeItem('bag', 'quest-item', 1)
console.log(removed) // 1
```

**Notes:**

- Calling `unlockItem` on an item that isn't locked does nothing (no error).
- You must unlock in the same container where the item is locked.
