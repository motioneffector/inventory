# Grid Placement

Build a Tetris-style inventory where items occupy multiple cells based on their size. Items can be rotated and precisely positioned.

## Prerequisites

Before starting, you should:

- [Understand how containers work](Concept-Containers)
- [Know about item metadata callbacks](Concept-Item-Metadata)

## Overview

We'll create a grid inventory by:

1. Providing a `getItemSize` callback returning `{ width, height }`
2. Creating a container with `mode: 'grid'`, `width`, and `height`
3. Adding items (auto-placed or manually positioned)
4. Enabling rotation for more placement flexibility
5. Querying grid state

## Step 1: Provide the Size Callback

The library needs to know each item's dimensions. Pass a `getItemSize` function when creating the manager.

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemSize: (itemId) => {
    const sizes: Record<string, { width: number; height: number }> = {
      'dagger': { width: 1, height: 2 },
      'sword': { width: 1, height: 4 },
      'shield': { width: 2, height: 2 },
      'potion': { width: 1, height: 1 },
      'bow': { width: 1, height: 3 },
    }
    return sizes[itemId] ?? { width: 1, height: 1 }
  },
})
```

Both `width` and `height` must be positive integers.

## Step 2: Create a Grid Container

Create a container with `mode: 'grid'` and specify dimensions.

```typescript
inventory.createContainer('stash', {
  mode: 'grid',
  width: 10,  // 10 cells wide
  height: 6,  // 6 cells tall
})
```

This creates a 60-cell grid (10 x 6).

## Step 3: Add Items

Use `addItem` for automatic placement or `addItemAt` for precise positioning.

```typescript
// Auto-place: library finds first available spot
inventory.addItem('stash', 'sword', 1)
inventory.addItem('stash', 'potion', 3)

// Manual placement at specific coordinates
inventory.addItemAt('stash', 'shield', { x: 5, y: 0 })
inventory.addItemAt('stash', 'dagger', { x: 8, y: 0 })
```

Coordinates are zero-indexed from the top-left corner.

## Step 4: Enable Rotation

Allow items to rotate 90 degrees for more placement options.

```typescript
inventory.createContainer('stash', {
  mode: 'grid',
  width: 10,
  height: 6,
  allowRotation: true, // Enable rotation
})

// A sword (1x4) can now also fit as (4x1)
inventory.addItemAt('stash', 'sword', { x: 0, y: 0, rotated: true })

// Find all valid placements including rotated positions
const placements = inventory.findPlacements('stash', 'bow')
// Includes both normal and rotated positions
```

## Step 5: Query Grid State

Inspect the grid to see what's where.

```typescript
// Get the full grid state
const grid = inventory.getGrid('stash')
// 2D array where each cell is null or { itemId, quantity, isOrigin }

// Check a specific cell
const cell = grid[0][0] // Row 0, Column 0
if (cell) {
  console.log(`Cell contains ${cell.itemId}, origin: ${cell.isOrigin}`)
}

// Find all valid positions for an item
const placements = inventory.findPlacements('stash', 'shield')
// [{ x: 0, y: 2 }, { x: 2, y: 3, rotated: true }, ...]
```

## Complete Example

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemSize: (id) => {
    const sizes: Record<string, { width: number; height: number }> = {
      'longsword': { width: 1, height: 4 },
      'shield': { width: 2, height: 2 },
      'helmet': { width: 2, height: 2 },
      'potion': { width: 1, height: 1 },
      'ring': { width: 1, height: 1 },
    }
    return sizes[id] ?? { width: 1, height: 1 }
  },
})

// Create a 10x8 stash with rotation
inventory.createContainer('stash', {
  mode: 'grid',
  width: 10,
  height: 8,
  allowRotation: true,
})

// Place items
inventory.addItemAt('stash', 'longsword', { x: 0, y: 0 })
inventory.addItemAt('stash', 'shield', { x: 1, y: 0 })
inventory.addItemAt('stash', 'helmet', { x: 3, y: 0 })
inventory.addItem('stash', 'potion', 5) // Auto-placed

// Visualize the grid
const grid = inventory.getGrid('stash')
for (let y = 0; y < grid.length; y++) {
  let row = ''
  for (let x = 0; x < grid[y].length; x++) {
    const cell = grid[y][x]
    row += cell ? cell.itemId[0].toUpperCase() : '.'
  }
  console.log(row)
}
// Output:
// LSSHH.....
// LSSHH.....
// L.........
// L.........
// PPPPP.....
// ..........
// ..........
// ..........
```

## Variations

### Stacking in Grid Cells

Enable stacking to allow multiple items in the same cell position.

```typescript
inventory.createContainer('stash', {
  mode: 'grid',
  width: 10,
  height: 6,
  allowStacking: true,
  maxStackSize: 99,
})

// Stack potions at the same position
inventory.addItemAt('stash', 'potion', { x: 0, y: 0 }, 50)
inventory.addItemAt('stash', 'potion', { x: 0, y: 0 }, 30) // Same cell

const grid = inventory.getGrid('stash')
console.log(grid[0][0]) // { itemId: 'potion', quantity: 80, isOrigin: true }
```

### Auto-Arrange

Reorganize items to pack them efficiently.

```typescript
// After removing items, the grid may have gaps
inventory.removeItem('stash', 'shield', 1)

// Auto-arrange repacks everything from top-left
inventory.autoArrange('stash')
```

### Checking Before Placing

```typescript
// Check if an item can be added
const canFit = inventory.canAdd('stash', 'longsword', 1)
if (!canFit.canAdd) {
  console.log(`Cannot add: ${canFit.reason}`) // 'no_space'
}

// Find all valid placements
const placements = inventory.findPlacements('stash', 'shield')
if (placements.length === 0) {
  console.log('No room for shield')
} else {
  console.log(`${placements.length} possible positions`)
}
```

## Troubleshooting

### Item Doesn't Fit Even Though Grid Looks Empty

**Symptom:** `addItem` fails with `no_space` but the grid appears to have room.

**Cause:** The item's size doesn't fit in any contiguous empty area.

**Solution:** Use `findPlacements` to see available positions, or check if rotation would help:

```typescript
const placements = inventory.findPlacements('stash', 'large-item')
console.log(`Found ${placements.length} valid positions`)
```

### addItemAt Fails at Empty Position

**Symptom:** Placing at specific coordinates fails even though the cell is empty.

**Cause:** The item extends beyond grid boundaries or overlaps other items.

**Solution:** Ensure the full item footprint fits:

```typescript
// A 2x3 item at (9, 0) in a 10-wide grid would extend to x=10 (out of bounds)
// Place at (8, 0) instead
```

## See Also

- **[Storage Modes](Concept-Storage-Modes)** - Overview of all container modes
- **[Item Metadata](Concept-Item-Metadata)** - More on the `getItemSize` callback
- **[Grid Operations API](API-Grid-Operations)** - Reference for `getGrid`, `findPlacements`, `autoArrange`
