# @motioneffector/inventory

A flexible, type-safe inventory system supporting multiple storage paradigms for games and interactive applications.

[![npm version](https://img.shields.io/npm/v/@motioneffector/inventory.svg)](https://www.npmjs.com/package/@motioneffector/inventory)
[![license](https://img.shields.io/npm/l/@motioneffector/inventory.svg)](https://github.com/motioneffector/inventory/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**[Try the interactive demo →](https://motioneffector.github.io/inventory/)**

## Features

- **Multiple Storage Modes** - Unlimited, count-based, weight-based, grid-based, and slot-based inventories
- **Grid Placement** - Tetris-style item placement with rotation support
- **Smart Stacking** - Configurable stack limits per item type
- **Equipment Slots** - Named slots with custom filter functions
- **Nested Containers** - Items can be containers themselves
- **Transaction Support** - Atomic operations with automatic rollback
- **Event System** - React to inventory changes in real-time
- **Deep Queries** - Search across nested container hierarchies
- **Item Locking** - Prevent removal of quest or equipped items
- **Serialization** - Full save/load support for persistence

[Read the full manual →](https://motioneffector.github.io/inventory/manual/)

## Quick Start

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

// Create manager with item metadata
const inventory = createInventoryManager({
  getItemWeight: (id) => ({ sword: 5, potion: 1 }[id] ?? 1),
  getItemSize: (id) => ({ sword: { width: 1, height: 3 } }[id] ?? { width: 1, height: 1 }),
  defaultStackSize: 99
})

// Create a grid-based backpack (4x4 Tetris-style)
inventory.createContainer('backpack', {
  mode: 'grid',
  width: 4,
  height: 4,
  allowRotation: true
})

// Add items
inventory.addItem('backpack', 'sword', 1)
inventory.addItem('backpack', 'potion', 5)

// Query inventory
const contents = inventory.getContents('backpack')
const canFit = inventory.canAdd('backpack', 'shield', 1)
```

## Testing & Validation

- **Comprehensive test suite** - 375 unit tests covering core functionality
- **Fuzz tested** - Randomized input testing to catch edge cases
- **Strict TypeScript** - Full type coverage with no `any` types
- **Zero dependencies** - No supply chain risk

## License

MIT © [motioneffector](https://github.com/motioneffector)
