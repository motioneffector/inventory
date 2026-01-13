// Public API exports
export { createInventoryManager } from './manager'
export type {
  InventoryManager,
  ContainerConfig,
  UnlimitedConfig,
  CountConfig,
  WeightConfig,
  GridConfig,
  SlotConfig,
  CombinedConfig,
  InventoryManagerOptions,
  AddItemResult,
  CanAddResult,
  TransferResult,
  ItemEntry,
  GridCell,
  GridPosition,
  FindPlacementResult,
  ContainerContents,
  FindItemResult,
  RemainingCapacity,
} from './types'
export { InventoryError, ValidationError } from './errors'
