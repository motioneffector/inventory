# Querying API

Read-only operations for inspecting inventory state.

---

## `getContents()`

Returns all items in a container.

**Signature:**

```typescript
function getContents(
  containerId: ContainerId,
  options?: { deep?: boolean }
): ContainerContents
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |
| `options.deep` | `boolean` | No | Include nested container contents. Default: `false` |

**Returns:** `ContainerContents` — Array of `ItemEntry` objects

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('backpack', { mode: 'unlimited' })
inventory.createContainer('pouch', { mode: 'unlimited' })

inventory.addItem('backpack', 'pouch', 1)
inventory.addItem('backpack', 'sword', 1)
inventory.addItem('pouch', 'gem', 5)

// Shallow
const shallow = inventory.getContents('backpack')
// [{ itemId: 'pouch', quantity: 1 }, { itemId: 'sword', quantity: 1 }]

// Deep - includes pouch contents
const deep = inventory.getContents('backpack', { deep: true })
// [{ itemId: 'pouch', quantity: 1 }, { itemId: 'sword', quantity: 1 }, { itemId: 'gem', quantity: 5 }]
```

---

## `getStacks()`

Returns individual stack information for a specific item.

**Signature:**

```typescript
function getStacks(
  containerId: ContainerId,
  itemId: ItemId
): ItemStack[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |
| `itemId` | `string` | Yes | ID of the item |

**Returns:** `ItemStack[]` — Array of stack objects

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', { mode: 'unlimited', allowStacking: true, maxStackSize: 50 })
inventory.addItem('bag', 'arrow', 120) // Creates 3 stacks: 50, 50, 20

const stacks = inventory.getStacks('bag', 'arrow')
// [{ itemId: 'arrow', quantity: 50 }, { itemId: 'arrow', quantity: 50 }, { itemId: 'arrow', quantity: 20 }]
```

---

## `hasItem()`

Checks if a container has any of the specified item.

**Signature:**

```typescript
function hasItem(
  containerId: ContainerId,
  itemId: ItemId
): boolean
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |
| `itemId` | `string` | Yes | ID of the item to check |

**Returns:** `boolean` — True if item exists in container

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', { mode: 'unlimited' })
inventory.addItem('bag', 'sword', 1)

console.log(inventory.hasItem('bag', 'sword'))  // true
console.log(inventory.hasItem('bag', 'shield')) // false
```

---

## `getQuantity()`

Returns the total quantity of an item in a container.

**Signature:**

```typescript
function getQuantity(
  containerId: ContainerId,
  itemId: ItemId
): number
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |
| `itemId` | `string` | Yes | ID of the item |

**Returns:** `number` — Total quantity (sum of all stacks)

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', { mode: 'unlimited' })
inventory.addItem('bag', 'gold', 100)
inventory.addItem('bag', 'gold', 50)

console.log(inventory.getQuantity('bag', 'gold')) // 150
console.log(inventory.getQuantity('bag', 'silver')) // 0
```

---

## `canAdd()`

Checks if items can be added and returns how many would fit.

**Signature:**

```typescript
function canAdd(
  containerId: ContainerId,
  itemId: ItemId,
  quantity: number
): CanAddResult
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |
| `itemId` | `string` | Yes | ID of the item |
| `quantity` | `number` | Yes | Number you want to add |

**Returns:** `CanAddResult`

```typescript
type CanAddResult = {
  canAdd: boolean     // True if at least one can be added
  maxAddable: number  // Maximum that would fit
  reason?: string     // Why it can't be added (if applicable)
}
```

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemWeight: () => 5,
})

inventory.createContainer('bag', { mode: 'weight', maxWeight: 50 })
inventory.addItem('bag', 'item', 5) // 25 weight used

const result = inventory.canAdd('bag', 'item', 10)
console.log(result) // { canAdd: true, maxAddable: 5 }
```

---

## `findItem()`

Searches all containers for an item.

**Signature:**

```typescript
function findItem(
  itemId: ItemId,
  options?: { deep?: boolean }
): FindItemResult[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `itemId` | `string` | Yes | ID of the item to find |
| `options.deep` | `boolean` | No | Search nested containers. Default: `false` |

**Returns:** `FindItemResult[]`

```typescript
type FindItemResult = {
  containerId: string
  quantity: number
}
```

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('backpack', { mode: 'unlimited' })
inventory.createContainer('chest', { mode: 'unlimited' })
inventory.addItem('backpack', 'gold', 50)
inventory.addItem('chest', 'gold', 100)

const locations = inventory.findItem('gold')
// [{ containerId: 'backpack', quantity: 50 }, { containerId: 'chest', quantity: 100 }]
```

---

## `getTotalWeight()`

Calculates total weight of items in a container.

**Signature:**

```typescript
function getTotalWeight(
  containerId: ContainerId,
  options?: { deep?: boolean }
): number
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |
| `options.deep` | `boolean` | No | Include nested container contents. Default: `false` |

**Returns:** `number` — Total weight

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemWeight: (id) => (id === 'sword' ? 5 : 1),
})

inventory.createContainer('bag', { mode: 'unlimited' })
inventory.addItem('bag', 'sword', 2)  // 10 weight
inventory.addItem('bag', 'potion', 5) // 5 weight

console.log(inventory.getTotalWeight('bag')) // 15
```

---

## `getRemainingCapacity()`

Returns remaining capacity information for a container.

**Signature:**

```typescript
function getRemainingCapacity(containerId: ContainerId): RemainingCapacity
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |

**Returns:** `RemainingCapacity` — Varies by container mode

```typescript
type RemainingCapacity =
  | { type: 'unlimited' }
  | { type: 'count'; remaining: number }
  | { type: 'weight'; remaining: number }
  | { type: 'cells'; remaining: number }
  | { type: 'slots'; empty: string[] }
```

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

inventory.createContainer('bag', { mode: 'count', maxCount: 10 })
inventory.addItem('bag', 'item', 3)

const capacity = inventory.getRemainingCapacity('bag')
// { type: 'count', remaining: 7 }
```

---

## `isEmpty()`

Checks if a container has no items.

**Signature:**

```typescript
function isEmpty(containerId: ContainerId): boolean
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |

**Returns:** `boolean` — True if container has no items

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', { mode: 'unlimited' })

console.log(inventory.isEmpty('bag')) // true

inventory.addItem('bag', 'item', 1)
console.log(inventory.isEmpty('bag')) // false
```

---

## Types

### `ItemEntry`

```typescript
type ItemEntry = {
  itemId: string
  quantity: number
  position?: GridPosition
  slot?: string
}
```

### `ItemStack`

```typescript
type ItemStack = {
  itemId: string
  quantity: number
  position?: GridPosition
}
```
