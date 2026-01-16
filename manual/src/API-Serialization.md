# Serialization API

Persistence operations for saving and restoring inventory state.

---

## `serialize()`

Returns a serializable object representing the entire inventory state.

**Signature:**

```typescript
function serialize(): SerializedData
```

**Parameters:** None

**Returns:** `SerializedData` — Plain object suitable for JSON conversion

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('backpack', { mode: 'unlimited' })
inventory.createContainer('equipment', { mode: 'slots', slots: ['head'] })

inventory.addItem('backpack', 'sword', 1)
inventory.addItem('backpack', 'potion', 10)
inventory.setSlot('equipment', 'head', 'helmet')
inventory.lockItem('backpack', 'sword')

// Get serializable data
const data = inventory.serialize()

// Convert to JSON for storage
const json = JSON.stringify(data)
localStorage.setItem('save', json)
```

**Includes:**

- Container configurations (mode, dimensions, etc.)
- All items with quantities
- Grid positions for grid-mode items
- Slot assignments
- Locked item status

**Does NOT include:**

- Callbacks (`getItemWeight`, `getItemSize`, `getItemStackLimit`)
- Event subscriptions
- Manager options (`defaultStackSize`)

---

## `deserialize()`

Restores inventory state from serialized data. Clears existing state first.

**Signature:**

```typescript
function deserialize(data: unknown): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `unknown` | Yes | Previously serialized data |

**Returns:** `void`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

// Load from storage
const json = localStorage.getItem('save')
const savedData = JSON.parse(json)

// Create manager with SAME callbacks as when saved
const inventory = createInventoryManager({
  getItemWeight: (id) => weights[id] ?? 1,
  getItemSize: (id) => sizes[id] ?? { width: 1, height: 1 },
})

// Restore state
inventory.deserialize(savedData)

// Inventory is now restored
console.log(inventory.listContainers())
console.log(inventory.getContents('backpack'))
```

**Throws:**

- `ValidationError` — Invalid data structure
- `ValidationError` — Invalid container/item IDs

**Important:** Create the manager with the same callbacks before deserializing. Grid items need `getItemSize` to restore positions correctly.

---

## `serializeContainer()`

Serializes a single container instead of the entire inventory.

**Signature:**

```typescript
function serializeContainer(containerId: ContainerId): unknown
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the container to serialize |

**Returns:** `unknown` — Serialized container data

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('player-bag', { mode: 'unlimited' })
inventory.createContainer('world-chest', { mode: 'unlimited' })

inventory.addItem('player-bag', 'gold', 100)
inventory.addItem('world-chest', 'treasure', 50)

// Save only the player's bag
const playerData = inventory.serializeContainer('player-bag')
localStorage.setItem('player', JSON.stringify({ containers: [playerData] }))

// Later, restore just that container
const saved = JSON.parse(localStorage.getItem('player'))
const newInventory = createInventoryManager()
newInventory.deserialize(saved)

console.log(newInventory.listContainers()) // ['player-bag']
```

**Throws:**

- `ValidationError` — Container does not exist

---

## Serialized Data Structure

```typescript
type SerializedData = {
  containers: SerializedContainer[]
}

type SerializedContainer = {
  id: string
  config: ContainerConfig
  items: Array<{
    itemId: string
    stacks: Array<{
      quantity: number
      position?: GridPosition
    }>
  }>
  lockedItems: string[]
  slotState?: {
    slots: Array<[string, string | null]>
  }
}
```

---

## Complete Save/Load Example

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

// Game's item data
const itemData = {
  sword: { weight: 5, size: { width: 1, height: 3 } },
  potion: { weight: 0.5, size: { width: 1, height: 1 } },
}

function createManager() {
  return createInventoryManager({
    getItemWeight: (id) => itemData[id]?.weight ?? 1,
    getItemSize: (id) => itemData[id]?.size ?? { width: 1, height: 1 },
  })
}

// Save game
function saveGame(inventory: ReturnType<typeof createManager>) {
  const data = inventory.serialize()
  const json = JSON.stringify(data)
  localStorage.setItem('game-save', json)
  console.log('Game saved!')
}

// Load game
function loadGame(): ReturnType<typeof createManager> | null {
  const json = localStorage.getItem('game-save')
  if (!json) return null

  try {
    const data = JSON.parse(json)
    const inventory = createManager()
    inventory.deserialize(data)
    console.log('Game loaded!')
    return inventory
  } catch (e) {
    console.error('Failed to load:', e)
    return null
  }
}

// Usage
let inventory = loadGame() ?? createManager()

// If fresh start, setup initial state
if (inventory.listContainers().length === 0) {
  inventory.createContainer('backpack', { mode: 'weight', maxWeight: 50 })
  inventory.addItem('backpack', 'potion', 3)
}

// Play...
inventory.addItem('backpack', 'sword', 1)

// Save when done
saveGame(inventory)
```
