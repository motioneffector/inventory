// Inventory manager implementation
import type {
  InventoryManager,
  InventoryManagerOptions,
  ContainerId,
  ItemId,
  ContainerConfig,
  AddItemResult,
  GridPosition,
  CanAddResult,
  TransferResult,
  ContainerContents,
  FindItemResult,
  RemainingCapacity,
  GridCell,
  FindPlacementResult,
  ItemEntry,
  EventCallback,
  ItemAddedEvent,
  ItemRemovedEvent,
  ItemTransferredEvent,
  ContainerFullEvent,
  SlotChangedEvent,
  ItemSize,
} from './types'
import { ValidationError } from './errors'

type Container = {
  id: ContainerId
  config: ContainerConfig
  items: Map<ItemId, ItemStack[]>
  lockedItems: Set<ItemId>
  gridState?: GridState
  slotState?: SlotState
}

type ItemStack = {
  itemId: ItemId
  quantity: number
  position?: GridPosition
}

type GridState = {
  width: number
  height: number
  cells: (GridCellInternal | null)[][]
}

type GridCellInternal = {
  itemId: ItemId
  stackIndex: number
  isOrigin: boolean
}

type SlotState = {
  slots: Map<string, ItemId | null>
}

export function createInventoryManager(
  options?: InventoryManagerOptions
): InventoryManager {
  const containers = new Map<ContainerId, Container>()
  const eventListeners = {
    itemAdded: [] as EventCallback<ItemAddedEvent>[],
    itemRemoved: [] as EventCallback<ItemRemovedEvent>[],
    itemTransferred: [] as EventCallback<ItemTransferredEvent>[],
    containerFull: [] as EventCallback<ContainerFullEvent>[],
    slotChanged: [] as EventCallback<SlotChangedEvent>[],
  }

  let inTransaction = false
  let transactionSnapshot: unknown = null

  const getItemWeight = options?.getItemWeight ?? (() => 1)
  const getItemSize = options?.getItemSize ?? (() => ({ width: 1, height: 1 }))
  const getItemStackLimit = options?.getItemStackLimit ?? (() => options?.defaultStackSize ?? 99)

  function validateItemWeight(itemId: ItemId): number {
    const weight = getItemWeight(itemId)
    if (typeof weight !== 'number' || isNaN(weight)) {
      throw new ValidationError(`getItemWeight must return a valid number for item "${itemId}"`)
    }
    return weight
  }

  function validateItemSize(itemId: ItemId): ItemSize {
    const size = getItemSize(itemId)
    if (
      typeof size !== 'object' ||
      typeof size.width !== 'number' ||
      typeof size.height !== 'number' ||
      size.width <= 0 ||
      size.height <= 0
    ) {
      throw new ValidationError(`getItemSize must return {width, height} with positive numbers`)
    }
    return size
  }

  function createContainer(id: ContainerId, config: ContainerConfig): void {
    if (containers.has(id)) {
      throw new ValidationError(`Container "${id}" already exists`)
    }

    const validModes = ['unlimited', 'count', 'weight', 'grid', 'slots', 'combined']
    if (!validModes.includes(config.mode)) {
      throw new ValidationError(`Invalid container mode: "${config.mode}"`)
    }

    const container: Container = {
      id,
      config,
      items: new Map(),
      lockedItems: new Set(),
    }

    if (config.mode === 'grid') {
      container.gridState = {
        width: config.width,
        height: config.height,
        cells: Array.from({ length: config.height }, () =>
          Array.from({ length: config.width }, () => null)
        ),
      }
    }

    if (config.mode === 'slots') {
      container.slotState = {
        slots: new Map(config.slots.map((slot) => [slot, null])),
      }
    }

    containers.set(id, container)
  }

  function removeContainer(id: ContainerId): void {
    if (!containers.has(id)) {
      throw new ValidationError(`Container "${id}" does not exist`)
    }
    containers.delete(id)
  }

  function listContainers(): ContainerId[] {
    return Array.from(containers.keys())
  }

  function getContainer(id: ContainerId): Container {
    const container = containers.get(id)
    if (!container) {
      throw new ValidationError(`Container "${id}" does not exist`)
    }
    return container
  }

  function isNestedIn(containerId: ContainerId, potentialParentId: ContainerId): boolean {
    const potentialParent = containers.get(potentialParentId)
    if (!potentialParent) return false
    for (const [itemId, _] of potentialParent.items) {
      if (itemId === containerId) return true
      if (containers.has(itemId) && isNestedIn(containerId, itemId)) {
        return true
      }
    }
    return false
  }

  function addItem(
    containerId: ContainerId,
    itemId: ItemId,
    quantity: number
  ): AddItemResult {
    if (quantity === 0) {
      return { success: true, added: 0, overflow: 0 }
    }

    // Check for circular nesting
    if (containerId === itemId) {
      throw new ValidationError('Cannot nest container in itself')
    }

    // Check for circular nesting through the chain
    if (containers.has(itemId)) {
      if (isNestedIn(containerId, itemId)) {
        throw new ValidationError('Cannot create circular nesting')
      }
    }

    const container = getContainer(containerId)
    const config = container.config

    if (config.mode === 'unlimited') {
      return addItemUnlimited(container, itemId, quantity)
    } else if (config.mode === 'count') {
      return addItemCount(container, itemId, quantity)
    } else if (config.mode === 'weight') {
      return addItemWeight(container, itemId, quantity)
    } else if (config.mode === 'grid') {
      return addItemGrid(container, itemId, quantity)
    } else if (config.mode === 'combined') {
      return addItemCombined(container, itemId, quantity)
    }

    return { success: false, added: 0, overflow: quantity, reason: 'unsupported_mode' }
  }

  function addItemUnlimited(
    container: Container,
    itemId: ItemId,
    quantity: number
  ): AddItemResult {
    const config = container.config as Extract<ContainerConfig, { mode: 'unlimited' }>
    const stacks = container.items.get(itemId) ?? []
    const stackLimit = Math.min(
      config.maxStackSize ?? Infinity,
      getItemStackLimit(itemId)
    )

    let remaining = quantity

    if (config.allowStacking) {
      // Fill existing stacks first
      for (const stack of stacks) {
        if (stack.quantity < stackLimit) {
          const canAdd = stackLimit - stack.quantity
          const toAdd = Math.min(canAdd, remaining)
          stack.quantity += toAdd
          remaining -= toAdd
          if (remaining === 0) break
        }
      }

      // Create new stacks if needed
      while (remaining > 0) {
        const toAdd = Math.min(stackLimit, remaining)
        stacks.push({ itemId, quantity: toAdd })
        remaining -= toAdd
      }
    } else {
      // No stacking - each item is its own stack
      for (let i = 0; i < quantity; i++) {
        stacks.push({ itemId, quantity: 1 })
      }
    }

    container.items.set(itemId, stacks)

    fireEvent('itemAdded', {
      containerId: container.id,
      itemId,
      quantity,
      newTotal: getTotalQuantity(container, itemId),
    })

    return { success: true, added: quantity, overflow: 0 }
  }

  function addItemCount(
    container: Container,
    itemId: ItemId,
    quantity: number
  ): AddItemResult {
    const config = container.config as Extract<ContainerConfig, { mode: 'count' }>
    const stacks = container.items.get(itemId) ?? []
    const stackLimit = Math.min(
      config.maxStackSize ?? Infinity,
      getItemStackLimit(itemId)
    )

    let remaining = quantity
    let added = 0

    if (config.allowStacking) {
      // Fill existing stacks first
      for (const stack of stacks) {
        if (stack.quantity < stackLimit) {
          const canAdd = stackLimit - stack.quantity
          const toAdd = Math.min(canAdd, remaining)
          stack.quantity += toAdd
          remaining -= toAdd
          added += toAdd
          if (remaining === 0) break
        }
      }
    }

    // Check how many new stacks we can create
    const currentStackCount = Array.from(container.items.values()).reduce(
      (sum, stacks) => sum + stacks.length,
      0
    )
    const availableSlots = config.maxCount - currentStackCount

    if (remaining > 0 && availableSlots > 0) {
      const newStacks = Math.min(availableSlots, Math.ceil(remaining / stackLimit))
      for (let i = 0; i < newStacks && remaining > 0; i++) {
        const toAdd = Math.min(stackLimit, remaining)
        stacks.push({ itemId, quantity: toAdd })
        remaining -= toAdd
        added += toAdd
      }
    }

    if (stacks.length > 0) {
      container.items.set(itemId, stacks)
    }

    if (added > 0) {
      fireEvent('itemAdded', {
        containerId: container.id,
        itemId,
        quantity: added,
        newTotal: getTotalQuantity(container, itemId),
      })
    }

    if (remaining > 0) {
      fireEvent('containerFull', {
        containerId: container.id,
        itemId,
        overflow: remaining,
      })
      return { success: false, added, overflow: remaining, reason: 'count_exceeded' }
    }

    return { success: true, added, overflow: 0 }
  }

  function addItemWeight(
    container: Container,
    itemId: ItemId,
    quantity: number
  ): AddItemResult {
    const config = container.config as Extract<ContainerConfig, { mode: 'weight' }>
    const itemWeight = validateItemWeight(itemId)
    const currentWeight = getTotalWeightInternal(container)
    const availableWeight = config.maxWeight - currentWeight
    const maxAddable = Math.floor(availableWeight / itemWeight)

    if (maxAddable === 0) {
      fireEvent('containerFull', {
        containerId: container.id,
        itemId,
        overflow: quantity,
      })
      return { success: false, added: 0, overflow: quantity, reason: 'weight_exceeded' }
    }

    const toAdd = Math.min(quantity, maxAddable)
    const result = addItemUnlimited(container, itemId, toAdd)

    if (toAdd < quantity) {
      const overflow = quantity - toAdd
      fireEvent('containerFull', {
        containerId: container.id,
        itemId,
        overflow,
      })
      return { success: false, added: toAdd, overflow, reason: 'weight_exceeded' }
    }

    return result
  }

  function addItemGrid(
    container: Container,
    itemId: ItemId,
    quantity: number,
    position?: GridPosition
  ): AddItemResult {
    const config = container.config as Extract<ContainerConfig, { mode: 'grid' }>
    const size = validateItemSize(itemId)

    if (position) {
      return addItemGridAt(container, itemId, quantity, position)
    }

    // Auto-place
    const placements = findPlacements(container.id, itemId)
    if (placements.length === 0) {
      fireEvent('containerFull', {
        containerId: container.id,
        itemId,
        overflow: quantity,
      })
      return { success: false, added: 0, overflow: quantity, reason: 'no_space' }
    }

    return addItemGridAt(container, itemId, quantity, placements[0]!)
  }

  function addItemGridAt(
    container: Container,
    itemId: ItemId,
    quantity: number,
    position: GridPosition
  ): AddItemResult {
    const config = container.config as Extract<ContainerConfig, { mode: 'grid' }>
    const size = validateItemSize(itemId)
    const { width, height } = position.rotated
      ? { width: size.height, height: size.width }
      : size

    // Check if item fits
    if (!canPlaceAtPosition(container, itemId, position)) {
      return { success: false, added: 0, overflow: quantity, reason: 'no_space' }
    }

    // Check stacking
    if (config.allowStacking) {
      const originCell = container.gridState!.cells[position.y]?.[position.x]
      if (originCell && originCell.isOrigin && originCell.itemId === itemId) {
        const stacks = container.items.get(itemId) ?? []
        const stack = stacks[originCell.stackIndex]
        if (stack) {
          const stackLimit = Math.min(
            config.maxStackSize ?? Infinity,
            getItemStackLimit(itemId)
          )
          const canAdd = stackLimit - stack.quantity
          if (canAdd >= quantity) {
            stack.quantity += quantity
            fireEvent('itemAdded', {
              containerId: container.id,
              itemId,
              quantity,
              newTotal: getTotalQuantity(container, itemId),
            })
            return { success: true, added: quantity, overflow: 0 }
          }
          return { success: false, added: 0, overflow: quantity, reason: 'stack_full' }
        }
      }
    }

    // Place new item
    const stacks = container.items.get(itemId) ?? []
    const stackIndex = stacks.length
    stacks.push({ itemId, quantity, position })
    container.items.set(itemId, stacks)

    // Update grid
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const y = position.y + dy
        const x = position.x + dx
        container.gridState!.cells[y]![x] = {
          itemId,
          stackIndex,
          isOrigin: dy === 0 && dx === 0,
        }
      }
    }

    fireEvent('itemAdded', {
      containerId: container.id,
      itemId,
      quantity,
      newTotal: getTotalQuantity(container, itemId),
    })

    return { success: true, added: quantity, overflow: 0 }
  }

  function canPlaceAtPosition(
    container: Container,
    itemId: ItemId,
    position: GridPosition
  ): boolean {
    if (!container.gridState) return false

    const size = validateItemSize(itemId)
    const { width, height } = position.rotated
      ? { width: size.height, height: size.width }
      : size

    if (
      position.x < 0 ||
      position.y < 0 ||
      position.x + width > container.gridState.width ||
      position.y + height > container.gridState.height
    ) {
      return false
    }

    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const cell = container.gridState.cells[position.y + dy]?.[position.x + dx]
        if (cell !== null) {
          return false
        }
      }
    }

    return true
  }

  function addItemCombined(
    container: Container,
    itemId: ItemId,
    quantity: number
  ): AddItemResult {
    const config = container.config as Extract<ContainerConfig, { mode: 'combined' }>

    // Test each rule with a simulated add
    for (const rule of config.rules) {
      // Create temporary container for testing
      const testContainer: Container = {
        id: container.id + '-test',
        config: rule,
        items: new Map(),
        lockedItems: new Set(container.lockedItems),
        gridState: container.gridState
          ? {
              width: container.gridState.width,
              height: container.gridState.height,
              cells: container.gridState.cells.map((row) => [...row]),
            }
          : undefined,
        slotState: container.slotState,
      }

      // Copy items deeply
      for (const [iid, stacks] of container.items) {
        testContainer.items.set(
          iid,
          stacks.map((s) => ({ ...s }))
        )
      }

      // Temporarily add test container, test the add, then remove
      containers.set(testContainer.id, testContainer)
      const result = addItem(testContainer.id, itemId, quantity)
      containers.delete(testContainer.id)

      if (!result.success) {
        fireEvent('containerFull', {
          containerId: container.id,
          itemId,
          overflow: quantity,
        })
        return result
      }
    }

    // All rules passed, do actual add using first rule
    return addItemImpl(container, config.rules[0]!, itemId, quantity)
  }

  function addItemImpl(
    container: Container,
    config: ContainerConfig,
    itemId: ItemId,
    quantity: number
  ): AddItemResult {
    const savedConfig = container.config
    container.config = config
    const result = addItem(container.id, itemId, quantity)
    container.config = savedConfig
    return result
  }

  function addItemAt(
    containerId: ContainerId,
    itemId: ItemId,
    position: GridPosition,
    quantity = 1
  ): AddItemResult {
    const container = getContainer(containerId)
    if (container.config.mode !== 'grid') {
      throw new ValidationError('addItemAt only works with grid containers')
    }
    return addItemGrid(container, itemId, quantity, position)
  }

  function removeItem(containerId: ContainerId, itemId: ItemId, quantity: number): number {
    if (quantity === 0) return 0

    const container = getContainer(containerId)

    if (container.lockedItems.has(itemId)) {
      throw new ValidationError(`Item "${itemId}" is locked and cannot be removed`)
    }

    const stacks = container.items.get(itemId)
    if (!stacks || stacks.length === 0) return 0

    let remaining = quantity
    let removed = 0

    for (let i = stacks.length - 1; i >= 0 && remaining > 0; i--) {
      const stack = stacks[i]!
      const toRemove = Math.min(stack.quantity, remaining)
      stack.quantity -= toRemove
      remaining -= toRemove
      removed += toRemove

      if (stack.quantity === 0) {
        // Clear grid cells if grid mode
        if (container.gridState && stack.position) {
          clearGridPosition(container, stack.position, itemId)
        }
        stacks.splice(i, 1)
      }
    }

    if (stacks.length === 0) {
      container.items.delete(itemId)
    }

    if (removed > 0) {
      fireEvent('itemRemoved', {
        containerId: container.id,
        itemId,
        quantity: removed,
        newTotal: getTotalQuantity(container, itemId),
      })
    }

    return removed
  }

  function clearGridPosition(
    container: Container,
    position: GridPosition,
    itemId: ItemId
  ): void {
    if (!container.gridState) return

    const size = validateItemSize(itemId)
    const { width, height } = position.rotated
      ? { width: size.height, height: size.width }
      : size

    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const y = position.y + dy
        const x = position.x + dx
        if (container.gridState.cells[y]?.[x]) {
          container.gridState.cells[y]![x] = null
        }
      }
    }
  }

  function transfer(
    from: ContainerId,
    to: ContainerId,
    itemId: ItemId,
    quantity: number
  ): TransferResult {
    if (quantity === 0) return { transferred: 0, overflow: 0 }

    const sourceContainer = getContainer(from)

    if (sourceContainer.lockedItems.has(itemId)) {
      throw new ValidationError(`Item "${itemId}" is locked and cannot be transferred`)
    }

    const available = getTotalQuantity(sourceContainer, itemId)
    const toTransfer = Math.min(available, quantity)

    if (toTransfer === 0) {
      return { transferred: 0, overflow: quantity }
    }

    // Try to add to destination
    const addResult = addItem(to, itemId, toTransfer)

    if (addResult.added > 0) {
      // Remove from source
      removeItem(from, itemId, addResult.added)

      fireEvent('itemTransferred', {
        from,
        to,
        itemId,
        quantity: addResult.added,
      })
    }

    return {
      transferred: addResult.added,
      overflow: quantity - addResult.added,
    }
  }

  function getContents(containerId: ContainerId, options?: { deep?: boolean }): ContainerContents {
    const container = getContainer(containerId)
    const contents: ContainerContents = []

    for (const [itemId, stacks] of container.items) {
      const totalQuantity = stacks.reduce((sum, stack) => sum + stack.quantity, 0)
      const firstStack = stacks[0]
      contents.push({
        itemId,
        quantity: totalQuantity,
        position: firstStack?.position,
        slot: undefined, // Will be filled for slot containers
      })
    }

    return contents
  }

  function hasItem(containerId: ContainerId, itemId: ItemId): boolean {
    const container = getContainer(containerId)
    return container.items.has(itemId)
  }

  function getQuantity(containerId: ContainerId, itemId: ItemId): number {
    const container = getContainer(containerId)
    return getTotalQuantity(container, itemId)
  }

  function getTotalQuantity(container: Container, itemId: ItemId): number {
    const stacks = container.items.get(itemId)
    if (!stacks) return 0
    return stacks.reduce((sum, stack) => sum + stack.quantity, 0)
  }

  function canAdd(
    containerId: ContainerId,
    itemId: ItemId,
    quantity: number
  ): CanAddResult {
    const container = getContainer(containerId)
    const config = container.config

    if (config.mode === 'unlimited') {
      return { canAdd: true, maxAddable: Infinity, reason: undefined }
    }

    if (config.mode === 'count') {
      const currentStackCount = Array.from(container.items.values()).reduce(
        (sum, stacks) => sum + stacks.length,
        0
      )
      const availableSlots = config.maxCount - currentStackCount
      if (availableSlots <= 0) {
        return { canAdd: false, maxAddable: 0, reason: 'count_exceeded' }
      }
      return { canAdd: true, maxAddable: Infinity, reason: undefined }
    }

    if (config.mode === 'weight') {
      const itemWeight = validateItemWeight(itemId)
      const currentWeight = getTotalWeightInternal(container)
      const availableWeight = config.maxWeight - currentWeight
      const maxAddable = Math.floor(availableWeight / itemWeight)
      if (maxAddable === 0) {
        return { canAdd: false, maxAddable: 0, reason: 'weight_exceeded' }
      }
      return { canAdd: true, maxAddable, reason: undefined }
    }

    if (config.mode === 'grid') {
      const placements = findPlacements(containerId, itemId)
      if (placements.length === 0) {
        return { canAdd: false, maxAddable: 0, reason: 'no_space' }
      }
      return { canAdd: true, maxAddable: placements.length, reason: undefined }
    }

    return { canAdd: false, maxAddable: 0, reason: 'unsupported_mode' }
  }

  function findItem(itemId: ItemId, options?: { deep?: boolean }): FindItemResult[] {
    const results: FindItemResult[] = []

    for (const container of containers.values()) {
      const quantity = getTotalQuantity(container, itemId)
      if (quantity > 0) {
        results.push({
          containerId: container.id,
          quantity,
        })
      }
    }

    return results
  }

  function getTotalWeight(containerId: ContainerId, options?: { deep?: boolean }): number {
    const container = getContainer(containerId)
    return getTotalWeightInternal(container)
  }

  function getTotalWeightInternal(container: Container): number {
    let weight = 0
    for (const [itemId, stacks] of container.items) {
      const itemWeight = validateItemWeight(itemId)
      const quantity = stacks.reduce((sum, stack) => sum + stack.quantity, 0)
      weight += itemWeight * quantity
    }
    return weight
  }

  function getRemainingCapacity(containerId: ContainerId): RemainingCapacity {
    const container = getContainer(containerId)
    const config = container.config

    if (config.mode === 'unlimited') {
      return { type: 'unlimited' }
    }

    if (config.mode === 'count') {
      const currentStackCount = Array.from(container.items.values()).reduce(
        (sum, stacks) => sum + stacks.length,
        0
      )
      return { type: 'count', remaining: config.maxCount - currentStackCount }
    }

    if (config.mode === 'weight') {
      const currentWeight = getTotalWeightInternal(container)
      return { type: 'weight', remaining: config.maxWeight - currentWeight }
    }

    if (config.mode === 'grid') {
      let occupiedCells = 0
      for (const row of container.gridState!.cells) {
        for (const cell of row) {
          if (cell !== null) occupiedCells++
        }
      }
      const totalCells = config.width * config.height
      return { type: 'cells', remaining: totalCells - occupiedCells }
    }

    if (config.mode === 'slots') {
      const emptySlots: string[] = []
      for (const [slot, itemId] of container.slotState!.slots) {
        if (itemId === null) emptySlots.push(slot)
      }
      return { type: 'slots', empty: emptySlots }
    }

    return { type: 'unlimited' }
  }

  function isEmpty(containerId: ContainerId): boolean {
    const container = getContainer(containerId)
    return container.items.size === 0
  }

  function getGrid(containerId: ContainerId): GridCell[][] {
    const container = getContainer(containerId)
    if (!container.gridState) {
      throw new ValidationError('Container is not in grid mode')
    }

    const result: GridCell[][] = []

    for (let y = 0; y < container.gridState.height; y++) {
      const row: GridCell[] = []
      for (let x = 0; x < container.gridState.width; x++) {
        const cell = container.gridState.cells[y]?.[x]
        if (cell === null) {
          row.push(null)
        } else {
          const stacks = container.items.get(cell.itemId)
          const stack = stacks?.[cell.stackIndex]
          row.push({
            itemId: cell.itemId,
            quantity: stack?.quantity ?? 0,
            isOrigin: cell.isOrigin,
          })
        }
      }
      result.push(row)
    }

    return result
  }

  function findPlacements(containerId: ContainerId, itemId: ItemId): FindPlacementResult[] {
    const container = getContainer(containerId)
    if (!container.gridState) {
      return []
    }

    const config = container.config as Extract<ContainerConfig, { mode: 'grid' }>
    const size = validateItemSize(itemId)
    const placements: FindPlacementResult[] = []

    // Try normal orientation
    for (let y = 0; y <= container.gridState.height - size.height; y++) {
      for (let x = 0; x <= container.gridState.width - size.width; x++) {
        if (canPlaceAtPosition(container, itemId, { x, y, rotated: false })) {
          placements.push({ x, y, rotated: false })
        }
      }
    }

    // Try rotated if allowed
    if (config.allowRotation && size.width !== size.height) {
      for (let y = 0; y <= container.gridState.height - size.width; y++) {
        for (let x = 0; x <= container.gridState.width - size.height; x++) {
          if (canPlaceAtPosition(container, itemId, { x, y, rotated: true })) {
            placements.push({ x, y, rotated: true })
          }
        }
      }
    }

    return placements
  }

  function setSlot(
    containerId: ContainerId,
    slot: string,
    itemId: ItemId | null
  ): ItemId | null {
    const container = getContainer(containerId)
    if (!container.slotState) {
      throw new ValidationError('Container is not in slots mode')
    }

    if (!container.slotState.slots.has(slot)) {
      throw new ValidationError(`Slot "${slot}" does not exist`)
    }

    const config = container.config as Extract<ContainerConfig, { mode: 'slots' }>

    // Check filter
    if (itemId !== null && config.slotFilters?.[slot]) {
      if (!config.slotFilters[slot]!(itemId)) {
        throw new ValidationError(`Item "${itemId}" cannot be equipped in slot "${slot}"`)
      }
    }

    const oldItem = container.slotState.slots.get(slot) ?? null
    container.slotState.slots.set(slot, itemId)

    fireEvent('slotChanged', {
      containerId: container.id,
      slot,
      oldItem,
      newItem: itemId,
    })

    return oldItem
  }

  function getSlot(containerId: ContainerId, slot: string): ItemId | null {
    const container = getContainer(containerId)
    if (!container.slotState) {
      throw new ValidationError('Container is not in slots mode')
    }
    return container.slotState.slots.get(slot) ?? null
  }

  function getAllSlots(containerId: ContainerId): Record<string, ItemId | null> {
    const container = getContainer(containerId)
    if (!container.slotState) {
      throw new ValidationError('Container is not in slots mode')
    }
    return Object.fromEntries(container.slotState.slots)
  }

  function clearSlot(containerId: ContainerId, slot: string): void {
    setSlot(containerId, slot, null)
  }

  function canEquip(containerId: ContainerId, slot: string, itemId: ItemId): CanAddResult {
    const container = getContainer(containerId)
    if (!container.slotState) {
      return { canAdd: false, maxAddable: 0, reason: 'not_slots_container' }
    }

    const config = container.config as Extract<ContainerConfig, { mode: 'slots' }>

    if (!container.slotState.slots.has(slot)) {
      return { canAdd: false, maxAddable: 0, reason: 'slot_not_found' }
    }

    if (config.slotFilters?.[slot]) {
      if (!config.slotFilters[slot]!(itemId)) {
        return { canAdd: false, maxAddable: 0, reason: 'slot_filter_failed' }
      }
    }

    return { canAdd: true, maxAddable: 1, reason: undefined }
  }

  function splitStack(
    containerId: ContainerId,
    itemId: ItemId,
    fromIndex: number,
    count: number
  ): void {
    const container = getContainer(containerId)
    const stacks = container.items.get(itemId)
    if (!stacks || !stacks[fromIndex]) {
      throw new ValidationError(`Stack not found`)
    }

    const stack = stacks[fromIndex]!
    if (stack.quantity < count) {
      throw new ValidationError(`Insufficient quantity in stack`)
    }

    stack.quantity -= count
    stacks.push({ itemId, quantity: count })
  }

  function mergeStacks(
    containerId: ContainerId,
    itemId: ItemId,
    fromIndex: number,
    toIndex: number
  ): void {
    const container = getContainer(containerId)

    // Try to get the stacks for this item
    const stacks = container.items.get(itemId)
    if (!stacks || stacks.length === 0) {
      throw new ValidationError(`No stacks found for item "${itemId}"`)
    }

    // Check if indices are valid
    if (fromIndex < 0 || fromIndex >= stacks.length) {
      throw new ValidationError(`Invalid fromIndex: ${fromIndex}`)
    }
    if (toIndex < 0 || toIndex >= stacks.length) {
      throw new ValidationError(`Invalid toIndex: ${toIndex}`)
    }

    const fromStack = stacks[fromIndex]!
    const toStack = stacks[toIndex]!

    if (fromStack.itemId !== toStack.itemId) {
      throw new ValidationError(`Cannot merge different items`)
    }

    const config = container.config
    const stackLimit =
      'maxStackSize' in config ? config.maxStackSize ?? Infinity : Infinity

    const canAdd = stackLimit - toStack.quantity
    const toMove = Math.min(canAdd, fromStack.quantity)

    toStack.quantity += toMove
    fromStack.quantity -= toMove

    if (fromStack.quantity === 0) {
      stacks.splice(fromIndex, 1)
    }
  }

  function consolidate(containerId: ContainerId): void {
    const container = getContainer(containerId)
    const config = container.config
    const stackLimit =
      'maxStackSize' in config ? config.maxStackSize ?? Infinity : Infinity

    for (const [itemId, stacks] of container.items) {
      const itemStackLimit = Math.min(stackLimit, getItemStackLimit(itemId))
      const consolidated: ItemStack[] = []
      let currentStack: ItemStack | null = null

      for (const stack of stacks) {
        let remaining = stack.quantity

        while (remaining > 0) {
          if (!currentStack || currentStack.quantity >= itemStackLimit) {
            currentStack = { itemId, quantity: 0 }
            consolidated.push(currentStack)
          }

          const canAdd = itemStackLimit - currentStack.quantity
          const toAdd = Math.min(canAdd, remaining)
          currentStack.quantity += toAdd
          remaining -= toAdd
        }
      }

      container.items.set(itemId, consolidated)
    }
  }

  function lockItem(containerId: ContainerId, itemId: ItemId): void {
    const container = getContainer(containerId)
    container.lockedItems.add(itemId)
  }

  function unlockItem(containerId: ContainerId, itemId: ItemId): void {
    const container = getContainer(containerId)
    container.lockedItems.delete(itemId)
  }

  function transaction(fn: () => void): void {
    transactionSnapshot = serialize()
    inTransaction = true

    try {
      fn()
      inTransaction = false
      transactionSnapshot = null
    } catch (error) {
      // Rollback
      deserialize(transactionSnapshot)
      inTransaction = false
      transactionSnapshot = null
      throw error
    }
  }

  function sort(
    containerId: ContainerId,
    compareFn: (a: ItemEntry, b: ItemEntry) => number
  ): void {
    const container = getContainer(containerId)
    if (container.config.mode === 'grid') {
      throw new ValidationError('Use autoArrange() for grid containers')
    }

    const contents = getContents(containerId)
    contents.sort(compareFn)

    // Rebuild items map in sorted order
    const newItems = new Map<ItemId, ItemStack[]>()
    for (const entry of contents) {
      const oldStacks = container.items.get(entry.itemId) ?? []
      newItems.set(entry.itemId, oldStacks)
    }
    container.items = newItems
  }

  function autoArrange(containerId: ContainerId): void {
    const container = getContainer(containerId)
    if (container.config.mode !== 'grid') {
      throw new ValidationError('autoArrange() only works with grid containers')
    }

    // Collect all items
    const items: Array<{ itemId: ItemId; quantity: number }> = []
    for (const [itemId, stacks] of container.items) {
      for (const stack of stacks) {
        items.push({ itemId, quantity: stack.quantity })
      }
    }

    // Clear grid
    container.items.clear()
    for (let y = 0; y < container.gridState!.height; y++) {
      for (let x = 0; x < container.gridState!.width; x++) {
        container.gridState!.cells[y]![x] = null
      }
    }

    // Re-place items
    for (const item of items) {
      addItem(containerId, item.itemId, item.quantity)
    }
  }

  function on(
    event: 'itemAdded',
    callback: EventCallback<ItemAddedEvent>
  ): () => void
  function on(
    event: 'itemRemoved',
    callback: EventCallback<ItemRemovedEvent>
  ): () => void
  function on(
    event: 'itemTransferred',
    callback: EventCallback<ItemTransferredEvent>
  ): () => void
  function on(
    event: 'containerFull',
    callback: EventCallback<ContainerFullEvent>
  ): () => void
  function on(
    event: 'slotChanged',
    callback: EventCallback<SlotChangedEvent>
  ): () => void
  function on(event: string, callback: EventCallback<any>): () => void {
    const listeners = eventListeners[event as keyof typeof eventListeners]
    if (listeners) {
      listeners.push(callback)
      return () => {
        const index = listeners.indexOf(callback)
        if (index !== -1) {
          listeners.splice(index, 1)
        }
      }
    }
    return () => {}
  }

  function fireEvent<T>(event: keyof typeof eventListeners, data: T): void {
    const listeners = eventListeners[event]
    for (const listener of listeners) {
      listener(data)
    }
  }

  function serialize(): unknown {
    const data: any = {
      containers: [] as any[],
    }

    for (const container of containers.values()) {
      data.containers.push({
        id: container.id,
        config: container.config,
        items: Array.from(container.items.entries()).map(([itemId, stacks]) => ({
          itemId,
          stacks: stacks.map((s) => ({
            quantity: s.quantity,
            position: s.position,
          })),
        })),
        lockedItems: Array.from(container.lockedItems),
        slotState: container.slotState
          ? {
              slots: Array.from(container.slotState.slots.entries()),
            }
          : undefined,
      })
    }

    return data
  }

  function deserialize(data: unknown): void {
    const d = data as any

    // Clear current state
    containers.clear()

    // Restore containers
    for (const containerData of d.containers) {
      createContainer(containerData.id, containerData.config)
      const container = getContainer(containerData.id)

      // Restore items
      for (const itemData of containerData.items) {
        for (const stackData of itemData.stacks) {
          if (stackData.position) {
            addItemAt(container.id, itemData.itemId, stackData.position, stackData.quantity)
          } else {
            addItem(container.id, itemData.itemId, stackData.quantity)
          }
        }
      }

      // Restore locked items
      for (const itemId of containerData.lockedItems) {
        lockItem(container.id, itemId)
      }

      // Restore slot state
      if (containerData.slotState) {
        for (const [slot, itemId] of containerData.slotState.slots) {
          if (itemId !== null) {
            setSlot(container.id, slot, itemId)
          }
        }
      }
    }
  }

  function serializeContainer(containerId: ContainerId): unknown {
    const container = getContainer(containerId)
    return {
      id: container.id,
      config: container.config,
      items: Array.from(container.items.entries()).map(([itemId, stacks]) => ({
        itemId,
        stacks: stacks.map((s) => ({
          quantity: s.quantity,
          position: s.position,
        })),
      })),
      lockedItems: Array.from(container.lockedItems),
    }
  }

  return {
    createContainer,
    removeContainer,
    listContainers,
    addItem,
    addItemAt,
    removeItem,
    transfer,
    getContents,
    hasItem,
    getQuantity,
    canAdd,
    findItem,
    getTotalWeight,
    getRemainingCapacity,
    isEmpty,
    getGrid,
    findPlacements,
    setSlot,
    getSlot,
    getAllSlots,
    clearSlot,
    canEquip,
    splitStack,
    mergeStacks,
    consolidate,
    lockItem,
    unlockItem,
    transaction,
    sort,
    autoArrange,
    on,
    serialize,
    deserialize,
    serializeContainer,
  }
}
