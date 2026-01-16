# Stack Operations API

Stack manipulation and organization operations.

---

## `splitStack()`

Splits a portion of one stack into a new stack.

**Signature:**

```typescript
function splitStack(
  containerId: ContainerId,
  itemId: ItemId,
  fromIndex: number,
  count: number
): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |
| `itemId` | `string` | Yes | ID of the item |
| `fromIndex` | `number` | Yes | Index of the stack to split from |
| `count` | `number` | Yes | Number of items to split off |

**Returns:** `void`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', { mode: 'unlimited', allowStacking: true })
inventory.addItem('bag', 'arrow', 50)

// Before: one stack of 50
let stacks = inventory.getStacks('bag', 'arrow')
console.log(stacks) // [{ quantity: 50 }]

// Split 20 into a new stack
inventory.splitStack('bag', 'arrow', 0, 20)

// After: two stacks
stacks = inventory.getStacks('bag', 'arrow')
console.log(stacks) // [{ quantity: 30 }, { quantity: 20 }]
```

**Throws:**

- `ValidationError` — Stack not found
- `ValidationError` — Insufficient quantity in stack

---

## `mergeStacks()`

Merges one stack into another, respecting stack limits.

**Signature:**

```typescript
function mergeStacks(
  containerId: ContainerId,
  itemId: ItemId,
  fromIndex: number,
  toIndex: number
): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |
| `itemId` | `string` | Yes | ID of the item |
| `fromIndex` | `number` | Yes | Index of the source stack |
| `toIndex` | `number` | Yes | Index of the destination stack |

**Returns:** `void`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', {
  mode: 'unlimited',
  allowStacking: true,
  maxStackSize: 99,
})

// Create two stacks
inventory.addItem('bag', 'gem', 30)
inventory.splitStack('bag', 'gem', 0, 10)

let stacks = inventory.getStacks('bag', 'gem')
console.log(stacks) // [{ quantity: 20 }, { quantity: 10 }]

// Merge stack 1 into stack 0
inventory.mergeStacks('bag', 'gem', 1, 0)

stacks = inventory.getStacks('bag', 'gem')
console.log(stacks) // [{ quantity: 30 }]
```

**Throws:**

- `ValidationError` — Stack not found
- `ValidationError` — Invalid index
- `ValidationError` — Cannot merge different items

---

## `consolidate()`

Combines all stacks of all items optimally, minimizing the number of stacks.

**Signature:**

```typescript
function consolidate(containerId: ContainerId): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |

**Returns:** `void`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', {
  mode: 'unlimited',
  allowStacking: true,
  maxStackSize: 50,
})

// Add items in fragments
inventory.addItem('bag', 'arrow', 20)
inventory.addItem('bag', 'arrow', 15)
inventory.addItem('bag', 'arrow', 30)
inventory.addItem('bag', 'arrow', 25)

// Before: 4 stacks (20, 15, 30, 25 = 90 total)
let stacks = inventory.getStacks('bag', 'arrow')
console.log(stacks.length) // 4

// Consolidate
inventory.consolidate('bag')

// After: 2 stacks (50, 40)
stacks = inventory.getStacks('bag', 'arrow')
console.log(stacks.length) // 2
console.log(stacks) // [{ quantity: 50 }, { quantity: 40 }]
```

**Throws:**

- `ValidationError` — Use `autoArrange()` for grid containers

---

## `sort()`

Sorts items in a container using a custom comparison function.

**Signature:**

```typescript
function sort(
  containerId: ContainerId,
  compareFn: (a: ItemEntry, b: ItemEntry) => number
): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container |
| `compareFn` | `function` | Yes | Comparison function (like `Array.sort`) |

**Returns:** `void`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('bag', { mode: 'unlimited' })

inventory.addItem('bag', 'sword', 1)
inventory.addItem('bag', 'apple', 5)
inventory.addItem('bag', 'gold', 100)

// Sort alphabetically by item ID
inventory.sort('bag', (a, b) => a.itemId.localeCompare(b.itemId))

const contents = inventory.getContents('bag')
console.log(contents.map((c) => c.itemId))
// ['apple', 'gold', 'sword']

// Sort by quantity descending
inventory.sort('bag', (a, b) => b.quantity - a.quantity)

const byQty = inventory.getContents('bag')
console.log(byQty.map((c) => `${c.itemId}:${c.quantity}`))
// ['gold:100', 'apple:5', 'sword:1']
```

**Throws:**

- `ValidationError` — Use `autoArrange()` for grid containers
