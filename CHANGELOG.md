# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-13

### Added
- Initial release
- Multiple container modes: unlimited, count, weight, grid, slots, and combined
- Smart item stacking with configurable stack limits
- Grid-based inventory with tetris-style placement and rotation support
- Equipment slots with optional slot filtering
- Container nesting (bags in bags)
- Item locking to prevent removal or transfer
- Transaction system with automatic rollback on failure
- Comprehensive event system for inventory changes
- Full JSON serialization and deserialization support
- Stack operations: split, merge, and consolidate
- Query methods: canAdd, hasItem, getQuantity, findItem, getTotalWeight
- Sorting and auto-arrangement for optimized layouts
- Complete TypeScript type definitions
- Comprehensive test suite (225+ tests)
- Interactive demo with drag-and-drop interface
