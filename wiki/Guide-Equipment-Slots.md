# Equipment Slots

Create named equipment slots with optional type restrictions. Perfect for character gear, crafting stations, or any UI with specific input positions.

## Prerequisites

Before starting, you should:

- [Understand how containers work](Concept-Containers)

## Overview

We'll create an equipment system by:

1. Creating a container with `mode: 'slots'` and a `slots` array
2. Optionally adding `slotFilters` for type restrictions
3. Using `setSlot`, `getSlot`, and `clearSlot` to manage equipment
4. Checking equippability with `canEquip`

## Step 1: Create a Slots Container

Define which slots exist using the `slots` array.

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

inventory.createContainer('equipment', {
  mode: 'slots',
  slots: ['head', 'chest', 'legs', 'feet', 'mainhand', 'offhand'],
})
```

Slot names are arbitrary strings—use whatever makes sense for your game.

## Step 2: Add Slot Filters (Optional)

Restrict what items can go in each slot using filter functions.

```typescript
inventory.createContainer('equipment', {
  mode: 'slots',
  slots: ['head', 'chest', 'legs', 'feet', 'mainhand', 'offhand'],
  slotFilters: {
    head: (itemId) => itemId.includes('helmet') || itemId.includes('hat'),
    chest: (itemId) => itemId.includes('armor') || itemId.includes('robe'),
    mainhand: (itemId) => itemId.includes('sword') || itemId.includes('staff'),
    offhand: (itemId) => itemId.includes('shield') || itemId.includes('tome'),
  },
})
```

Slots without filters accept any item.

## Step 3: Equip Items

Use `setSlot` to equip items. It returns the previously equipped item (or null).

```typescript
// Equip a helmet
inventory.setSlot('equipment', 'head', 'iron-helmet')

// Swap weapons - setSlot returns the old item
const oldWeapon = inventory.setSlot('equipment', 'mainhand', 'steel-sword')
console.log(oldWeapon) // null (nothing was equipped)

// Replace with a better weapon
const replaced = inventory.setSlot('equipment', 'mainhand', 'magic-sword')
console.log(replaced) // 'steel-sword'
```

## Step 4: Query and Clear Slots

```typescript
// Check what's equipped
const helmet = inventory.getSlot('equipment', 'head')
console.log(helmet) // 'iron-helmet'

// Get all slots at once
const allSlots = inventory.getAllSlots('equipment')
console.log(allSlots)
// { head: 'iron-helmet', chest: null, legs: null, feet: null, mainhand: 'magic-sword', offhand: null }

// Unequip an item
inventory.clearSlot('equipment', 'head')
// Or: inventory.setSlot('equipment', 'head', null)
```

## Step 5: Check Before Equipping

Use `canEquip` to check if an item can go in a slot before trying.

```typescript
// Check if a sword can go in the head slot
const result = inventory.canEquip('equipment', 'head', 'steel-sword')
console.log(result)
// { canAdd: false, maxAddable: 0, reason: 'slot_filter_failed' }

// Check valid equipment
const valid = inventory.canEquip('equipment', 'mainhand', 'steel-sword')
console.log(valid)
// { canAdd: true, maxAddable: 1 }
```

## Complete Example

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

// Character equipment with slot restrictions
inventory.createContainer('gear', {
  mode: 'slots',
  slots: ['head', 'chest', 'legs', 'feet', 'mainhand', 'offhand', 'ring1', 'ring2', 'amulet'],
  slotFilters: {
    head: (id) => id.endsWith('-helmet') || id.endsWith('-hat') || id.endsWith('-hood'),
    chest: (id) => id.endsWith('-armor') || id.endsWith('-robe'),
    legs: (id) => id.endsWith('-pants') || id.endsWith('-greaves'),
    feet: (id) => id.endsWith('-boots'),
    mainhand: (id) => id.includes('sword') || id.includes('staff') || id.includes('axe'),
    offhand: (id) => id.includes('shield') || id.includes('tome') || id.includes('dagger'),
    ring1: (id) => id.startsWith('ring-'),
    ring2: (id) => id.startsWith('ring-'),
    amulet: (id) => id.startsWith('amulet-'),
  },
})

// Equip a full set
inventory.setSlot('gear', 'head', 'steel-helmet')
inventory.setSlot('gear', 'chest', 'plate-armor')
inventory.setSlot('gear', 'mainhand', 'longsword')
inventory.setSlot('gear', 'offhand', 'tower-shield')
inventory.setSlot('gear', 'ring1', 'ring-of-strength')
inventory.setSlot('gear', 'amulet', 'amulet-of-protection')

// Check equipped items
const equipped = inventory.getAllSlots('gear')
console.log(equipped)

// Try to equip invalid item
try {
  inventory.setSlot('gear', 'head', 'longsword') // Throws!
} catch (e) {
  console.log('Cannot equip sword as helmet')
}
```

## Variations

### Crafting Station Slots

Use slots for crafting input/output positions.

```typescript
inventory.createContainer('forge', {
  mode: 'slots',
  slots: ['input1', 'input2', 'fuel', 'output'],
  slotFilters: {
    input1: (id) => id.includes('ore') || id.includes('ingot'),
    input2: (id) => id.includes('ore') || id.includes('ingot'),
    fuel: (id) => id === 'coal' || id === 'wood',
    // output has no filter - anything can go there
  },
})
```

### Dynamic Filter Based on Game State

```typescript
// Filter that checks external game state
const canEquipTwoHander = (itemId: string) => {
  const isTwoHanded = gameData.items[itemId]?.twoHanded
  const offhandEmpty = inventory.getSlot('equipment', 'offhand') === null
  return !isTwoHanded || offhandEmpty
}

inventory.createContainer('equipment', {
  mode: 'slots',
  slots: ['mainhand', 'offhand'],
  slotFilters: {
    mainhand: canEquipTwoHander,
  },
})
```

### Swapping Items Between Slots

```typescript
function swapSlots(container: string, slot1: string, slot2: string) {
  const item1 = inventory.getSlot(container, slot1)
  const item2 = inventory.getSlot(container, slot2)

  inventory.transaction(() => {
    inventory.setSlot(container, slot1, null)
    inventory.setSlot(container, slot2, null)
    if (item1) inventory.setSlot(container, slot2, item1)
    if (item2) inventory.setSlot(container, slot1, item2)
  })
}
```

## Troubleshooting

### setSlot Throws Error

**Symptom:** `setSlot` throws `ValidationError` instead of returning false.

**Cause:** The slot filter rejected the item.

**Solution:** Use `canEquip` first to check, or wrap in try/catch:

```typescript
if (inventory.canEquip('equipment', 'head', itemId).canAdd) {
  inventory.setSlot('equipment', 'head', itemId)
}
```

### Slot Not Found

**Symptom:** `getSlot` or `setSlot` throws "slot does not exist".

**Cause:** The slot name wasn't included in the `slots` array when creating the container.

**Solution:** Ensure all slot names are defined in the container config.

## See Also

- **[Storage Modes](Concept-Storage-Modes)** - Overview of all container modes
- **[Slot Operations API](API-Slot-Operations)** - Reference for `setSlot`, `getSlot`, `getAllSlots`, `clearSlot`, `canEquip`
- **[Events](Concept-Events-And-Transactions)** - The `slotChanged` event fires on equipment changes
