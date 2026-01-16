# @motioneffector/inventory

An inventory is a collection of containers, each with rules about what goes in and how. You define the rules—capacity limits, item sizes, equipment restrictions—and the library enforces them. Whether you need a simple backpack, a weight-limited carry system, a Tetris-style grid, or named equipment slots, this library provides the building blocks.

## I want to...

| Goal | Where to go |
|------|-------------|
| Get up and running quickly | [Your First Inventory](Your-First-Inventory) |
| Understand how containers work | [Containers](Concept-Containers) |
| Create a weight-limited inventory | [Weight-Based Inventories](Guide-Weight-Based-Inventories) |
| Build a Tetris-style grid | [Grid Placement](Guide-Grid-Placement) |
| Set up equipment slots | [Equipment Slots](Guide-Equipment-Slots) |
| Save/load inventory state | [Serialization](Guide-Serialization) |
| Look up a specific method | [API Reference](API-Container-Management) |

## Key Concepts

### Containers

Containers are named storage units where items live. Each container has a unique ID and a configuration that determines its storage mode and capacity. You create containers, add items to them, query their contents, and optionally nest them inside each other.

### Storage Modes

Every container has a mode that controls how it accepts items. The six modes are: `unlimited` (no limits), `count` (max stacks), `weight` (max weight), `grid` (2D Tetris-style), `slots` (named equipment slots), and `combined` (multiple rules).

### Item Metadata

The library doesn't know your game's items. You teach it through callback functions: `getItemWeight` for weight calculations, `getItemSize` for grid dimensions, and `getItemStackLimit` for per-item stack limits.

## Quick Example

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

// Create a manager with item metadata callbacks
const inventory = createInventoryManager({
  getItemWeight: (id) => ({ sword: 5, potion: 1, gold: 0.01 }[id] ?? 1),
  getItemSize: (id) => ({ sword: { width: 1, height: 3 } }[id] ?? { width: 1, height: 1 }),
})

// Create a weight-limited backpack
inventory.createContainer('backpack', {
  mode: 'weight',
  maxWeight: 50,
})

// Add items
inventory.addItem('backpack', 'sword', 1)   // 5 weight
inventory.addItem('backpack', 'potion', 10) // 10 weight

// Query inventory
const contents = inventory.getContents('backpack')
const remaining = inventory.getRemainingCapacity('backpack') // { type: 'weight', remaining: 35 }
const canFit = inventory.canAdd('backpack', 'potion', 100)   // { canAdd: true, maxAddable: 35 }
```

---

**[Full API Reference →](API-Container-Management)**
