# Serialization

Save and restore inventory state for persistence. The library provides built-in serialization that captures containers, items, positions, and locks.

## Prerequisites

Before starting, you should:

- [Have a working inventory setup](Your-First-Inventory)

## Overview

We'll save and restore inventories by:

1. Calling `serialize()` to get a serializable object
2. Storing the data as JSON
3. Calling `deserialize(data)` to restore
4. Using `serializeContainer()` for single-container snapshots

## Step 1: Serialize the Inventory

Call `serialize()` to get a plain JavaScript object representing the entire inventory state.

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

inventory.createContainer('backpack', { mode: 'unlimited' })
inventory.addItem('backpack', 'sword', 1)
inventory.addItem('backpack', 'potion', 5)

// Get serializable data
const data = inventory.serialize()
console.log(data)
// { containers: [{ id: 'backpack', config: {...}, items: [...], lockedItems: [] }] }
```

## Step 2: Store as JSON

Convert to JSON for storage in files, localStorage, or databases.

```typescript
// Convert to JSON string
const jsonString = JSON.stringify(data)

// Store it (examples)
localStorage.setItem('inventory', jsonString)
// or: fs.writeFileSync('save.json', jsonString)
// or: await db.save('player_inventory', jsonString)
```

## Step 3: Restore the Inventory

Parse the JSON and call `deserialize()` to restore the state.

```typescript
// Load from storage
const jsonString = localStorage.getItem('inventory')
const savedData = JSON.parse(jsonString)

// Create a fresh manager with the SAME callbacks
const inventory = createInventoryManager({
  getItemWeight: (id) => itemWeights[id] ?? 1,
  getItemSize: (id) => itemSizes[id] ?? { width: 1, height: 1 },
})

// Restore state
inventory.deserialize(savedData)

// Continue using the inventory
console.log(inventory.getContents('backpack'))
```

## Step 4: Serialize Single Container

Use `serializeContainer()` when you only need one container's data.

```typescript
// Serialize just the backpack
const backpackData = inventory.serializeContainer('backpack')

// Later, restore using deserialize with containers array
const newManager = createInventoryManager()
newManager.deserialize({ containers: [backpackData] })
```

## Complete Example

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

// Item data (would come from your game's database)
const itemData = {
  sword: { weight: 5, size: { width: 1, height: 3 } },
  shield: { weight: 8, size: { width: 2, height: 2 } },
  potion: { weight: 0.5, size: { width: 1, height: 1 } },
}

function createManager() {
  return createInventoryManager({
    getItemWeight: (id) => itemData[id]?.weight ?? 1,
    getItemSize: (id) => itemData[id]?.size ?? { width: 1, height: 1 },
  })
}

// --- SAVE ---
function saveGame() {
  const data = inventory.serialize()
  localStorage.setItem('save', JSON.stringify(data))
  console.log('Game saved!')
}

// --- LOAD ---
function loadGame(): boolean {
  const saved = localStorage.getItem('save')
  if (!saved) return false

  const data = JSON.parse(saved)
  inventory = createManager()
  inventory.deserialize(data)
  console.log('Game loaded!')
  return true
}

// --- USAGE ---
let inventory = createManager()

// Try to load, or start fresh
if (!loadGame()) {
  // New game setup
  inventory.createContainer('backpack', { mode: 'weight', maxWeight: 50 })
  inventory.createContainer('equipment', {
    mode: 'slots',
    slots: ['head', 'chest', 'mainhand'],
  })
}

// Play the game...
inventory.addItem('backpack', 'potion', 3)
inventory.setSlot('equipment', 'mainhand', 'sword')

// Save progress
saveGame()
```

## What Gets Serialized

The serialized data includes:

- **Container configs** - Mode, dimensions, slots, max values
- **Items** - Item IDs, quantities, stack positions
- **Grid positions** - Where items are placed in grid containers
- **Slot assignments** - Which items are in which slots
- **Locked items** - Which items are locked

## What Doesn't Get Serialized

- **Callbacks** - `getItemWeight`, `getItemSize`, `getItemStackLimit` are not stored
- **Event listeners** - Subscriptions must be re-attached after load
- **Manager options** - `defaultStackSize` and other options must be re-provided

## Variations

### Selective Restoration

Load specific containers without clearing others.

```typescript
// This clears all existing containers before restoring
inventory.deserialize(savedData)

// To preserve existing containers, manually recreate only what you need
const saved = JSON.parse(localStorage.getItem('character-inventory'))
for (const containerData of saved.containers) {
  if (containerData.id.startsWith('character-')) {
    // Remove old version if exists
    try { inventory.removeContainer(containerData.id) } catch {}
    // Restore from save
    inventory.deserialize({ containers: [containerData] })
  }
}
```

### Version Migration

Handle save format changes between game versions.

```typescript
function deserializeWithMigration(data: any) {
  // Check version
  if (!data.version || data.version < 2) {
    // Migrate old format
    data = migrateV1ToV2(data)
  }

  inventory.deserialize(data)
}

function migrateV1ToV2(oldData: any) {
  // Transform old format to new format
  return {
    containers: oldData.containers.map((c) => ({
      ...c,
      // Add new required fields
      lockedItems: c.lockedItems ?? [],
    })),
  }
}
```

## Troubleshooting

### Deserialization Fails

**Symptom:** `deserialize` throws an error about invalid data.

**Cause:** The data structure doesn't match expected format, or contains invalid values.

**Solution:** Validate the data before deserializing:

```typescript
try {
  inventory.deserialize(data)
} catch (e) {
  console.error('Failed to load save:', e.message)
  // Fall back to fresh inventory
}
```

### Items Missing After Load

**Symptom:** Containers exist but items are missing or have wrong quantities.

**Cause:** Grid items need `getItemSize` callback to restore positions correctly.

**Solution:** Ensure the manager is created with the same callbacks before deserializing:

```typescript
// WRONG: deserialize first, add callbacks later
const inventory = createInventoryManager()
inventory.deserialize(data) // Grid items may fail

// RIGHT: callbacks before deserialize
const inventory = createInventoryManager({
  getItemSize: (id) => sizes[id],
})
inventory.deserialize(data) // Works correctly
```

## See Also

- **[Serialization API](API-Serialization)** - Reference for `serialize`, `deserialize`, `serializeContainer`
- **[Events](Concept-Events-And-Transactions)** - Re-attaching listeners after load
