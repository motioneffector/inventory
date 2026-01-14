# Grid Operations API

Spatial operations for grid-mode containers.

---

## `getGrid()`

Returns the 2D grid state showing what occupies each cell.

**Signature:**

```typescript
function getGrid(containerId: ContainerId): GridCell[][]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the grid container |

**Returns:** `GridCell[][]` — 2D array indexed by `[y][x]`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemSize: (id) => {
    if (id === 'shield') return { width: 2, height: 2 }
    return { width: 1, height: 1 }
  },
})

inventory.createContainer('stash', { mode: 'grid', width: 5, height: 5 })
inventory.addItemAt('stash', 'shield', { x: 0, y: 0 })
inventory.addItemAt('stash', 'potion', { x: 3, y: 0 })

const grid = inventory.getGrid('stash')

// Check cell (0, 0) - shield origin
console.log(grid[0][0])
// { itemId: 'shield', quantity: 1, isOrigin: true }

// Check cell (1, 0) - shield extension
console.log(grid[0][1])
// { itemId: 'shield', quantity: 1, isOrigin: false }

// Check cell (3, 0) - potion
console.log(grid[0][3])
// { itemId: 'potion', quantity: 1, isOrigin: true }

// Check empty cell
console.log(grid[3][3])
// null
```

**Throws:**

- `ValidationError` — Container is not in grid mode

---

## `findPlacements()`

Finds all valid positions where an item could be placed.

**Signature:**

```typescript
function findPlacements(
  containerId: ContainerId,
  itemId: ItemId
): FindPlacementResult[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the grid container |
| `itemId` | `string` | Yes | ID of the item to place |

**Returns:** `FindPlacementResult[]` — Array of valid positions

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemSize: (id) => {
    if (id === 'sword') return { width: 1, height: 3 }
    return { width: 1, height: 1 }
  },
})

inventory.createContainer('stash', {
  mode: 'grid',
  width: 5,
  height: 5,
  allowRotation: true,
})

// Find where a sword can go
const placements = inventory.findPlacements('stash', 'sword')
// [
//   { x: 0, y: 0, rotated: false },
//   { x: 1, y: 0, rotated: false },
//   ...
//   { x: 0, y: 0, rotated: true },  // rotated: 3x1 instead of 1x3
//   ...
// ]

// If no room, returns empty array
inventory.createContainer('tiny', { mode: 'grid', width: 2, height: 2 })
const none = inventory.findPlacements('tiny', 'sword')
// []
```

---

## `autoArrange()`

Reorganizes all items in a grid container to pack them efficiently from the top-left.

**Signature:**

```typescript
function autoArrange(containerId: ContainerId): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the grid container |

**Returns:** `void`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemSize: () => ({ width: 1, height: 1 }),
})

inventory.createContainer('stash', { mode: 'grid', width: 5, height: 5 })

// Add items scattered around
inventory.addItemAt('stash', 'gem', { x: 3, y: 3 })
inventory.addItemAt('stash', 'potion', { x: 1, y: 4 })
inventory.addItemAt('stash', 'coin', { x: 4, y: 0 })

// Repack from top-left
inventory.autoArrange('stash')

// Items are now at (0,0), (1,0), (2,0), etc.
const grid = inventory.getGrid('stash')
console.log(grid[0][0]) // First item
console.log(grid[0][1]) // Second item
console.log(grid[0][2]) // Third item
```

**Throws:**

- `ValidationError` — Container is not in grid mode
- `Error` — Items cannot fit after rearrangement (rolls back)

---

## Types

### `GridCell`

```typescript
type GridCell = {
  itemId: string
  quantity: number
  isOrigin: boolean
} | null
```

| Property | Type | Description |
|----------|------|-------------|
| `itemId` | `string` | ID of the item occupying this cell |
| `quantity` | `number` | Stack quantity (same for all cells of multi-cell item) |
| `isOrigin` | `boolean` | True for top-left cell of the item |

Cells are `null` when empty.

### `FindPlacementResult`

```typescript
type FindPlacementResult = {
  x: number
  y: number
  rotated?: boolean
}
```

| Property | Type | Description |
|----------|------|-------------|
| `x` | `number` | Column position (0-indexed) |
| `y` | `number` | Row position (0-indexed) |
| `rotated` | `boolean` | If true, place with swapped dimensions |
