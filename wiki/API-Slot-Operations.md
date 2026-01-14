# Slot Operations API

Equipment slot operations for slots-mode containers.

---

## `setSlot()`

Places an item in a slot, returning the previous item.

**Signature:**

```typescript
function setSlot(
  containerId: ContainerId,
  slot: string,
  itemId: ItemId | null
): ItemId | null
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the slots container |
| `slot` | `string` | Yes | Name of the slot |
| `itemId` | `string \| null` | Yes | Item to place, or `null` to clear |

**Returns:** `ItemId | null` — Previously equipped item, or `null`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('gear', {
  mode: 'slots',
  slots: ['head', 'chest', 'mainhand'],
})

// Equip helmet
const old = inventory.setSlot('gear', 'head', 'iron-helmet')
console.log(old) // null (nothing was there)

// Replace with better helmet
const replaced = inventory.setSlot('gear', 'head', 'steel-helmet')
console.log(replaced) // 'iron-helmet'

// Unequip
inventory.setSlot('gear', 'head', null)
```

**Throws:**

- `ValidationError` — Container is not in slots mode
- `ValidationError` — Slot does not exist
- `ValidationError` — Item rejected by slot filter

---

## `getSlot()`

Returns the item currently in a slot.

**Signature:**

```typescript
function getSlot(
  containerId: ContainerId,
  slot: string
): ItemId | null
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the slots container |
| `slot` | `string` | Yes | Name of the slot |

**Returns:** `ItemId | null` — Item in the slot, or `null` if empty

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('gear', { mode: 'slots', slots: ['head', 'chest'] })
inventory.setSlot('gear', 'head', 'helmet')

console.log(inventory.getSlot('gear', 'head'))  // 'helmet'
console.log(inventory.getSlot('gear', 'chest')) // null
```

**Throws:**

- `ValidationError` — Container is not in slots mode

---

## `getAllSlots()`

Returns all slots and their current items.

**Signature:**

```typescript
function getAllSlots(containerId: ContainerId): Record<string, ItemId | null>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the slots container |

**Returns:** `Record<string, ItemId | null>` — Object mapping slot names to items

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('gear', {
  mode: 'slots',
  slots: ['head', 'chest', 'legs', 'feet'],
})

inventory.setSlot('gear', 'head', 'helmet')
inventory.setSlot('gear', 'chest', 'armor')

const slots = inventory.getAllSlots('gear')
console.log(slots)
// { head: 'helmet', chest: 'armor', legs: null, feet: null }
```

**Throws:**

- `ValidationError` — Container is not in slots mode

---

## `clearSlot()`

Removes the item from a slot.

**Signature:**

```typescript
function clearSlot(
  containerId: ContainerId,
  slot: string
): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the slots container |
| `slot` | `string` | Yes | Name of the slot to clear |

**Returns:** `void`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('gear', { mode: 'slots', slots: ['head'] })
inventory.setSlot('gear', 'head', 'helmet')

inventory.clearSlot('gear', 'head')
console.log(inventory.getSlot('gear', 'head')) // null
```

---

## `canEquip()`

Checks if an item can be placed in a slot.

**Signature:**

```typescript
function canEquip(
  containerId: ContainerId,
  slot: string,
  itemId: ItemId
): CanAddResult
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `containerId` | `string` | Yes | ID of the slots container |
| `slot` | `string` | Yes | Name of the slot |
| `itemId` | `string` | Yes | Item to check |

**Returns:** `CanAddResult`

```typescript
type CanAddResult = {
  canAdd: boolean
  maxAddable: number  // Always 0 or 1 for slots
  reason?: string
}
```

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('gear', {
  mode: 'slots',
  slots: ['head', 'mainhand'],
  slotFilters: {
    head: (id) => id.includes('helmet'),
    mainhand: (id) => id.includes('sword'),
  },
})

// Valid equipment
const valid = inventory.canEquip('gear', 'head', 'iron-helmet')
console.log(valid) // { canAdd: true, maxAddable: 1 }

// Invalid - sword in head slot
const invalid = inventory.canEquip('gear', 'head', 'iron-sword')
console.log(invalid) // { canAdd: false, maxAddable: 0, reason: 'slot_filter_failed' }

// Non-existent slot
const noSlot = inventory.canEquip('gear', 'wings', 'feathers')
console.log(noSlot) // { canAdd: false, maxAddable: 0, reason: 'slot_not_found' }
```
