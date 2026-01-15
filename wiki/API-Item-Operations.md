# Item Operations API

Primary operations for adding, removing, and transferring items between containers.

---

## `addItem()`

Adds items to a container. The library finds an available spot (or fills existing stacks if stacking is enabled).

**Signature:**

```typescript
function addItem(
  containerId: ContainerId,
  itemId: ItemId,
  quantity: number
): AddItemResult
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container to add items to |
| `itemId` | `string` | Yes | ID of the item to add |
| `quantity` | `number` | Yes | Number of items to add |

**Returns:** `AddItemResult`

```typescript
type AddItemResult = {
  success: boolean    // True if all items were added
  added: number       // Number actually added
  overflow: number    // Number that couldn't fit
  reason?: string     // Why it failed (if applicable)
}
```

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', { mode: 'count', maxCount: 5 })

// Add items
const result = inventory.addItem('bag', 'potion', 3)
console.log(result) // { success: true, added: 3, overflow: 0 }

// Try to add more than fits
const result2 = inventory.addItem('bag', 'gem', 10)
console.log(result2) // { success: false, added: 2, overflow: 8, reason: 'count_exceeded' }
```

**Throws:**

- `ValidationError` — Container does not exist
- `ValidationError` — Would create circular nesting

---

## `addItemAt()`

Adds items at a specific grid position. Only works with grid-mode containers.

**Signature:**

```typescript
function addItemAt(
  containerId: ContainerId,
  itemId: ItemId,
  position: GridPosition,
  quantity?: number
): AddItemResult
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the grid container |
| `itemId` | `string` | Yes | ID of the item to add |
| `position` | `GridPosition` | Yes | Position `{ x, y, rotated? }` |
| `quantity` | `number` | No | Number to add. Default: `1` |

**Returns:** `AddItemResult`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemSize: () => ({ width: 2, height: 2 }),
})

inventory.createContainer('stash', { mode: 'grid', width: 10, height: 10 })

// Place at specific position
const result = inventory.addItemAt('stash', 'shield', { x: 0, y: 0 })
console.log(result) // { success: true, added: 1, overflow: 0 }

// Place rotated
const result2 = inventory.addItemAt('stash', 'sword', { x: 5, y: 0, rotated: true })
```

**Throws:**

- `ValidationError` — Container is not in grid mode
- `ValidationError` — Container does not exist

---

## `removeItem()`

Removes items from a container. Returns the actual number removed.

**Signature:**

```typescript
function removeItem(
  containerId: ContainerId,
  itemId: ItemId,
  quantity: number
): number
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |
| `itemId` | `string` | Yes | ID of the item to remove |
| `quantity` | `number` | Yes | Number to remove |

**Returns:** `number` — Actual number removed (may be less than requested)

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', { mode: 'unlimited' })
inventory.addItem('bag', 'gold', 100)

// Remove some
const removed = inventory.removeItem('bag', 'gold', 30)
console.log(removed) // 30

// Try to remove more than exists
const removed2 = inventory.removeItem('bag', 'gold', 200)
console.log(removed2) // 70 (only 70 remained)
```

**Throws:**

- `ValidationError` — Container does not exist
- `ValidationError` — Item is locked

---

## `transfer()`

Moves items from one container to another.

**Signature:**

```typescript
function transfer(
  from: ContainerId,
  to: ContainerId,
  itemId: ItemId,
  quantity: number
): TransferResult
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `from` | `string` | Yes | Source container ID |
| `to` | `string` | Yes | Destination container ID |
| `itemId` | `string` | Yes | ID of the item to transfer |
| `quantity` | `number` | Yes | Number to transfer |

**Returns:** `TransferResult`

```typescript
type TransferResult = {
  transferred: number  // Number successfully moved
  overflow: number     // Number that couldn't move
}
```

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemWeight: () => 1,
})

inventory.createContainer('player', { mode: 'unlimited' })
inventory.createContainer('chest', { mode: 'weight', maxWeight: 10 })
inventory.addItem('player', 'gem', 100)

// Transfer to limited container
const result = inventory.transfer('player', 'chest', 'gem', 50)
console.log(result) // { transferred: 10, overflow: 40 }
```

**Throws:**

- `ValidationError` — Container does not exist
- `ValidationError` — Item is locked in source container

---

## Types

### `GridPosition`

```typescript
type GridPosition = {
  x: number
  y: number
  rotated?: boolean
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `x` | `number` | Yes | Column position (0-indexed) |
| `y` | `number` | Yes | Row position (0-indexed) |
| `rotated` | `boolean` | No | If true, item dimensions are swapped |
