// Core type definitions for inventory system

export type ItemId = string
export type ContainerId = string

// Container configurations
export type UnlimitedConfig = {
  mode: 'unlimited'
  allowStacking?: boolean
  maxStackSize?: number
}

export type CountConfig = {
  mode: 'count'
  maxCount: number
  allowStacking?: boolean
  maxStackSize?: number
}

export type WeightConfig = {
  mode: 'weight'
  maxWeight: number
  allowStacking?: boolean
  maxStackSize?: number
}

export type GridConfig = {
  mode: 'grid'
  width: number
  height: number
  allowStacking?: boolean
  maxStackSize?: number
  allowRotation?: boolean
}

export type SlotConfig = {
  mode: 'slots'
  slots: string[]
  slotFilters?: Record<string, (itemId: ItemId) => boolean>
}

export type CombinedConfig = {
  mode: 'combined'
  rules: ContainerConfig[]
}

export type ContainerConfig =
  | UnlimitedConfig
  | CountConfig
  | WeightConfig
  | GridConfig
  | SlotConfig
  | CombinedConfig

// Item size for grid placement
export type ItemSize = {
  width: number
  height: number
}

// Grid position
export type GridPosition = {
  x: number
  y: number
  rotated?: boolean
}

// Grid cell state
export type GridCell = {
  itemId: ItemId
  quantity: number
  isOrigin: boolean
} | null

// Result types
export type AddItemResult = {
  success: boolean
  added: number
  overflow: number
  reason?: string
}

export type CanAddResult = {
  canAdd: boolean
  reason?: string
  maxAddable: number
}

export type TransferResult = {
  transferred: number
  overflow: number
}

export type FindPlacementResult = GridPosition

// Item entry in inventory
export type ItemEntry = {
  itemId: ItemId
  quantity: number
  position?: GridPosition
  slot?: string
}

// Individual item stack (internal representation)
export type ItemStack = {
  itemId: ItemId
  quantity: number
  position?: GridPosition
}

// Container contents
export type ContainerContents = ItemEntry[]

// Find item result
export type FindItemResult = {
  containerId: ContainerId
  quantity: number
}

// Remaining capacity
export type RemainingCapacity =
  | { type: 'unlimited' }
  | { type: 'count'; remaining: number }
  | { type: 'weight'; remaining: number }
  | { type: 'cells'; remaining: number }
  | { type: 'slots'; empty: string[] }

// Event types
export type ItemAddedEvent = {
  containerId: ContainerId
  itemId: ItemId
  quantity: number
  newTotal: number
}

export type ItemRemovedEvent = {
  containerId: ContainerId
  itemId: ItemId
  quantity: number
  newTotal: number
}

export type ItemTransferredEvent = {
  from: ContainerId
  to: ContainerId
  itemId: ItemId
  quantity: number
}

export type ContainerFullEvent = {
  containerId: ContainerId
  itemId: ItemId
  overflow: number
}

export type SlotChangedEvent = {
  containerId: ContainerId
  slot: string
  oldItem: ItemId | null
  newItem: ItemId | null
}

export type EventCallback<T> = (event: T) => void

// Inventory manager options
export type InventoryManagerOptions = {
  getItemWeight?: (itemId: ItemId) => number
  getItemSize?: (itemId: ItemId) => ItemSize
  getItemStackLimit?: (itemId: ItemId) => number
  defaultStackSize?: number
}

// Inventory manager interface
export interface InventoryManager {
  // Container management
  createContainer(id: ContainerId, config: ContainerConfig): void
  removeContainer(id: ContainerId): void
  listContainers(): ContainerId[]

  // Item operations
  addItem(containerId: ContainerId, itemId: ItemId, quantity: number): AddItemResult
  addItemAt(
    containerId: ContainerId,
    itemId: ItemId,
    position: GridPosition,
    quantity?: number
  ): AddItemResult
  removeItem(containerId: ContainerId, itemId: ItemId, quantity: number): number
  transfer(
    from: ContainerId,
    to: ContainerId,
    itemId: ItemId,
    quantity: number
  ): TransferResult

  // Queries
  getContents(containerId: ContainerId, options?: { deep?: boolean }): ContainerContents
  getStacks(containerId: ContainerId, itemId: ItemId): ItemStack[]
  hasItem(containerId: ContainerId, itemId: ItemId): boolean
  getQuantity(containerId: ContainerId, itemId: ItemId): number
  canAdd(containerId: ContainerId, itemId: ItemId, quantity: number): CanAddResult
  findItem(itemId: ItemId, options?: { deep?: boolean }): FindItemResult[]
  getTotalWeight(containerId: ContainerId, options?: { deep?: boolean }): number
  getRemainingCapacity(containerId: ContainerId): RemainingCapacity
  isEmpty(containerId: ContainerId): boolean

  // Grid operations
  getGrid(containerId: ContainerId): GridCell[][]
  findPlacements(containerId: ContainerId, itemId: ItemId): FindPlacementResult[]

  // Slot operations
  setSlot(containerId: ContainerId, slot: string, itemId: ItemId | null): ItemId | null
  getSlot(containerId: ContainerId, slot: string): ItemId | null
  getAllSlots(containerId: ContainerId): Record<string, ItemId | null>
  clearSlot(containerId: ContainerId, slot: string): void
  canEquip(containerId: ContainerId, slot: string, itemId: ItemId): CanAddResult

  // Stack operations
  splitStack(
    containerId: ContainerId,
    itemId: ItemId,
    fromIndex: number,
    count: number
  ): void
  mergeStacks(
    containerId: ContainerId,
    itemId: ItemId,
    fromIndex: number,
    toIndex: number
  ): void
  consolidate(containerId: ContainerId): void

  // Locking
  lockItem(containerId: ContainerId, itemId: ItemId): void
  unlockItem(containerId: ContainerId, itemId: ItemId): void

  // Transactions
  transaction(fn: () => void): void

  // Sorting
  sort(containerId: ContainerId, compareFn: (a: ItemEntry, b: ItemEntry) => number): void
  autoArrange(containerId: ContainerId): void

  // Events
  on(event: 'itemAdded', callback: EventCallback<ItemAddedEvent>): () => void
  on(event: 'itemRemoved', callback: EventCallback<ItemRemovedEvent>): () => void
  on(event: 'itemTransferred', callback: EventCallback<ItemTransferredEvent>): () => void
  on(event: 'containerFull', callback: EventCallback<ContainerFullEvent>): () => void
  on(event: 'slotChanged', callback: EventCallback<SlotChangedEvent>): () => void

  // Serialization
  serialize(): unknown
  deserialize(data: unknown): void
  serializeContainer(containerId: ContainerId): unknown
}
