# Locking Items

Prevent removal of quest items, equipped gear, or other protected items. Locked items cannot be removed or transferred until unlocked.

## Prerequisites

Before starting, you should:

- [Know basic container operations](Your-First-Inventory)

## Overview

We'll lock items by:

1. Calling `lockItem(containerId, itemId)` to protect an item
2. Observing that locked items throw on remove/transfer attempts
3. Calling `unlockItem()` to release the protection

## Step 1: Lock an Item

Use `lockItem` to prevent an item from being removed.

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

inventory.createContainer('backpack', { mode: 'unlimited' })
inventory.addItem('backpack', 'quest-scroll', 1)

// Lock the quest item
inventory.lockItem('backpack', 'quest-scroll')
```

## Step 2: Locked Items Can't Be Removed

Attempting to remove or transfer a locked item throws an error.

```typescript
// Try to remove - throws error
try {
  inventory.removeItem('backpack', 'quest-scroll', 1)
} catch (e) {
  console.log('Cannot remove locked item')
}

// Try to transfer - also throws
try {
  inventory.transfer('backpack', 'chest', 'quest-scroll', 1)
} catch (e) {
  console.log('Cannot transfer locked item')
}

// Item is still there
console.log(inventory.hasItem('backpack', 'quest-scroll')) // true
```

## Step 3: Unlock to Allow Removal

Call `unlockItem` when it's safe to remove the item.

```typescript
// Quest complete - unlock the item
inventory.unlockItem('backpack', 'quest-scroll')

// Now removal works
inventory.removeItem('backpack', 'quest-scroll', 1)
console.log(inventory.hasItem('backpack', 'quest-scroll')) // false
```

## Complete Example

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

// Setup containers
inventory.createContainer('inventory', { mode: 'unlimited' })
inventory.createContainer('equipment', {
  mode: 'slots',
  slots: ['mainhand', 'offhand', 'armor'],
})
inventory.createContainer('questLog', { mode: 'unlimited' })

// Add items
inventory.addItem('inventory', 'gold', 100)
inventory.addItem('inventory', 'healing-potion', 10)
inventory.setSlot('equipment', 'mainhand', 'legendary-sword')
inventory.addItem('questLog', 'ancient-map', 1)
inventory.addItem('questLog', 'kings-letter', 1)

// Lock quest items (can't be dropped/sold)
inventory.lockItem('questLog', 'ancient-map')
inventory.lockItem('questLog', 'kings-letter')

// Lock equipped weapon (can't be sold while equipped)
inventory.lockItem('equipment', 'legendary-sword')

// Selling gold works fine
inventory.removeItem('inventory', 'gold', 50)
console.log('Sold 50 gold')

// Selling quest item fails
try {
  inventory.removeItem('questLog', 'ancient-map', 1)
} catch (e) {
  console.log('Cannot sell quest item!')
}

// Selling equipped weapon fails
try {
  inventory.removeItem('equipment', 'legendary-sword', 1)
} catch (e) {
  console.log('Cannot sell equipped weapon!')
}

// Complete quest
function completeQuest(questItem: string) {
  inventory.unlockItem('questLog', questItem)
  inventory.removeItem('questLog', questItem, 1)
  console.log(`Quest complete! ${questItem} removed.`)
}

// Unequip weapon
function unequip(slot: string) {
  const item = inventory.getSlot('equipment', slot)
  if (item) {
    inventory.unlockItem('equipment', item)
    inventory.clearSlot('equipment', slot)
    inventory.addItem('inventory', item, 1)
    console.log(`Unequipped ${item}`)
  }
}

completeQuest('ancient-map')
unequip('mainhand')
```

## Variations

### Quest Items

Lock items that are part of active quests.

```typescript
function startQuest(questId: string, requiredItems: string[]) {
  for (const item of requiredItems) {
    // Find the item
    const locations = inventory.findItem(item)
    if (locations.length > 0) {
      // Lock it so player can't drop/sell it
      inventory.lockItem(locations[0].containerId, item)
    }
  }
}

function completeQuest(questId: string, requiredItems: string[]) {
  for (const item of requiredItems) {
    const locations = inventory.findItem(item)
    if (locations.length > 0) {
      inventory.unlockItem(locations[0].containerId, item)
      // Optionally consume the item
      inventory.removeItem(locations[0].containerId, item, 1)
    }
  }
}
```

### Equipment Locking

Prevent selling/dropping equipped items.

```typescript
function equip(slot: string, itemId: string) {
  // Unlock old item
  const oldItem = inventory.getSlot('equipment', slot)
  if (oldItem) {
    inventory.unlockItem('equipment', oldItem)
  }

  // Equip and lock new item
  inventory.setSlot('equipment', slot, itemId)
  inventory.lockItem('equipment', itemId)
}

function unequip(slot: string) {
  const item = inventory.getSlot('equipment', slot)
  if (item) {
    inventory.unlockItem('equipment', item)
    inventory.clearSlot('equipment', slot)
  }
}
```

### Check If Item Is Locked

The library doesn't expose a direct "isLocked" method, but you can try to remove and catch.

```typescript
function isLocked(containerId: string, itemId: string): boolean {
  try {
    inventory.transaction(() => {
      inventory.removeItem(containerId, itemId, 1)
      throw new Error('rollback') // Always rollback
    })
  } catch (e) {
    if (e.message.includes('locked')) {
      return true
    }
  }
  return false
}
```

## Troubleshooting

### Lock Doesn't Prevent Adding More

**Symptom:** You can still add more of a locked item.

**Cause:** Locking only prevents removal, not addition.

**Solution:** This is intended behavior. Locks are for removal protection, not add prevention.

### Unlock Doesn't Work

**Symptom:** `unlockItem` succeeds but item still can't be removed.

**Cause:** Make sure you're unlocking in the same container where it's locked.

**Solution:** Verify container ID matches:

```typescript
// Find where the item is locked
const locations = inventory.findItem(itemId)
for (const loc of locations) {
  inventory.unlockItem(loc.containerId, itemId)
}
```

### Serialization and Locks

Locks are preserved through serialization. When you `serialize()` and `deserialize()`, locked items remain locked.

```typescript
inventory.lockItem('bag', 'important')
const data = inventory.serialize()

const newInventory = createInventoryManager()
newInventory.deserialize(data)

// Item is still locked in the new manager
```

## See Also

- **[Locking API](API-Locking)** - Reference for `lockItem`, `unlockItem`
- **[Transferring Items](Guide-Transferring-Items)** - How locks affect transfers
- **[Serialization](Guide-Serialization)** - Locks are persisted
