# Container Management API

Core lifecycle operations for creating, removing, and listing containers.

---

## `createContainer()`

Creates a new container with the specified configuration.

**Signature:**

```typescript
function createContainer(
  id: ContainerId,
  config: ContainerConfig
): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for the container |
| `config` | `ContainerConfig` | Yes | Configuration object specifying mode and options |

**Returns:** `void`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

// Unlimited container
inventory.createContainer('backpack', {
  mode: 'unlimited',
})

// Weight-based container
inventory.createContainer('pouch', {
  mode: 'weight',
  maxWeight: 10,
  allowStacking: true,
})

// Grid container
inventory.createContainer('stash', {
  mode: 'grid',
  width: 10,
  height: 6,
  allowRotation: true,
})
```

**Throws:**

- `ValidationError` — Container with this ID already exists
- `ValidationError` — Invalid container mode
- `ValidationError` — Grid dimensions invalid or too large

---

## `removeContainer()`

Destroys a container and all its contents.

**Signature:**

```typescript
function removeContainer(id: ContainerId): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | ID of the container to remove |

**Returns:** `void`

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('temp', { mode: 'unlimited' })
inventory.addItem('temp', 'item', 10)

// Destroys container and all items inside
inventory.removeContainer('temp')

// Container no longer exists
inventory.listContainers() // []
```

**Throws:**

- `ValidationError` — Container does not exist

---

## `listContainers()`

Returns an array of all container IDs.

**Signature:**

```typescript
function listContainers(): ContainerId[]
```

**Parameters:** None

**Returns:** `ContainerId[]` — Array of container ID strings

**Example:**

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
inventory.createContainer('backpack', { mode: 'unlimited' })
inventory.createContainer('chest', { mode: 'count', maxCount: 20 })
inventory.createContainer('equipment', { mode: 'slots', slots: ['head'] })

const containers = inventory.listContainers()
// ['backpack', 'chest', 'equipment']
```

---

## Types

### `ContainerConfig`

Union type of all possible container configurations.

```typescript
type ContainerConfig =
  | UnlimitedConfig
  | CountConfig
  | WeightConfig
  | GridConfig
  | SlotConfig
  | CombinedConfig
```

### `UnlimitedConfig`

```typescript
type UnlimitedConfig = {
  mode: 'unlimited'
  allowStacking?: boolean
  maxStackSize?: number
}
```

### `CountConfig`

```typescript
type CountConfig = {
  mode: 'count'
  maxCount: number
  allowStacking?: boolean
  maxStackSize?: number
}
```

### `WeightConfig`

```typescript
type WeightConfig = {
  mode: 'weight'
  maxWeight: number
  allowStacking?: boolean
  maxStackSize?: number
}
```

### `GridConfig`

```typescript
type GridConfig = {
  mode: 'grid'
  width: number
  height: number
  allowStacking?: boolean
  maxStackSize?: number
  allowRotation?: boolean
}
```

### `SlotConfig`

```typescript
type SlotConfig = {
  mode: 'slots'
  slots: string[]
  slotFilters?: Record<string, (itemId: string) => boolean>
}
```

### `CombinedConfig`

```typescript
type CombinedConfig = {
  mode: 'combined'
  rules: ContainerConfig[]
}
```
