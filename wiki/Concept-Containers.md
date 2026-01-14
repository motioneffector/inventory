# Containers

Containers are named storage units where items live. Every item in your inventory exists inside exactly one container. You create containers with specific rules, add and remove items, query their contents, and destroy them when no longer needed.

## How It Works

Think of containers as labeled boxes with custom rules. Each box has:

- A unique **ID** (string) to identify it
- A **configuration** that determines what goes in and how
- **Contents** that you add, remove, and query

```
┌─────────────────────────────────┐
│ Container: "backpack"           │
│ Mode: weight (max: 50)          │
├─────────────────────────────────┤
│ sword (1)      - 5 weight       │
│ potion (10)    - 10 weight      │
│ gold (100)     - 1 weight       │
├─────────────────────────────────┤
│ Total: 16 / 50 weight           │
└─────────────────────────────────┘
```

Containers don't know anything about your game's items directly. They store item IDs (strings) and quantities. You teach the manager about item properties through [callbacks](Concept-Item-Metadata).

## Basic Usage

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

// Create a container
inventory.createContainer('backpack', {
  mode: 'unlimited',
})

// Use the container
inventory.addItem('backpack', 'sword', 1)
inventory.getContents('backpack')
inventory.removeItem('backpack', 'sword', 1)

// Destroy the container
inventory.removeContainer('backpack')
```

## Key Points

- **Unique IDs** - Each container must have a unique string ID. Creating a container with an existing ID throws an error.
- **Mode determines behavior** - The `mode` property in the config controls how the container accepts items. See [Storage Modes](Concept-Storage-Modes).
- **Containers can nest** - A container can hold another container as an item, enabling bags-within-bags. See [Nested Containers](Guide-Nested-Containers).
- **IDs are just strings** - Container IDs and item IDs are arbitrary strings. Use whatever naming makes sense for your game.

## Examples

### Multiple Containers

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

// Player inventory
inventory.createContainer('player-backpack', { mode: 'unlimited' })

// Bank storage
inventory.createContainer('bank-vault', { mode: 'count', maxCount: 100 })

// Equipped items
inventory.createContainer('equipment', {
  mode: 'slots',
  slots: ['head', 'chest', 'legs', 'feet', 'mainhand', 'offhand'],
})

// List all containers
const containers = inventory.listContainers()
// ['player-backpack', 'bank-vault', 'equipment']
```

### Checking If Empty

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('chest', { mode: 'unlimited' })

console.log(inventory.isEmpty('chest')) // true

inventory.addItem('chest', 'gem', 1)
console.log(inventory.isEmpty('chest')) // false
```

## Related

- **[Storage Modes](Concept-Storage-Modes)** - The six modes that control container behavior
- **[Nested Containers](Guide-Nested-Containers)** - Using containers as items inside other containers
- **[Container Management API](API-Container-Management)** - Full reference for `createContainer`, `removeContainer`, `listContainers`
