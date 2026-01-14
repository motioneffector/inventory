# Your First Inventory

This guide walks you through creating a working inventory system in about 5 minutes.

By the end of this guide, you'll have a backpack container that can add, query, and remove items.

## What We're Building

A simple unlimited-capacity backpack that stores items by name and quantity. You'll add a sword and some potions, check what's inside, and remove items.

## Step 1: Create the Inventory Manager

The manager is the central object that holds all your containers. Create one with `createInventoryManager()`.

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()
```

The manager starts empty with no containers. You'll create containers next.

## Step 2: Create a Container

Containers are where items live. Create an unlimited container called "backpack".

```typescript
inventory.createContainer('backpack', {
  mode: 'unlimited',
})
```

The `mode: 'unlimited'` configuration means this container accepts any number of items without restrictions.

## Step 3: Add Items

Use `addItem()` to put items in your container.

```typescript
inventory.addItem('backpack', 'sword', 1)
inventory.addItem('backpack', 'potion', 5)
inventory.addItem('backpack', 'gold', 100)
```

Each call specifies the container ID, item ID, and quantity. The item ID can be any string—it's up to you how to identify items in your game.

## Step 4: Query Contents

Check what's in the container with `getContents()`, or query specific items.

```typescript
// Get everything in the backpack
const contents = inventory.getContents('backpack')
// [{ itemId: 'sword', quantity: 1 }, { itemId: 'potion', quantity: 5 }, { itemId: 'gold', quantity: 100 }]

// Check for a specific item
const hasSword = inventory.hasItem('backpack', 'sword') // true
const potionCount = inventory.getQuantity('backpack', 'potion') // 5
```

## Step 5: Remove Items

Use `removeItem()` to take items out.

```typescript
const removed = inventory.removeItem('backpack', 'potion', 2)
// removed = 2

const remaining = inventory.getQuantity('backpack', 'potion')
// remaining = 3
```

The function returns the actual number removed. If you try to remove more than exists, it removes what's available.

## The Complete Code

Here's everything together:

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

// Create the manager
const inventory = createInventoryManager()

// Create a container
inventory.createContainer('backpack', {
  mode: 'unlimited',
})

// Add items
inventory.addItem('backpack', 'sword', 1)
inventory.addItem('backpack', 'potion', 5)
inventory.addItem('backpack', 'gold', 100)

// Query contents
const contents = inventory.getContents('backpack')
console.log(contents)
// [{ itemId: 'sword', quantity: 1 }, { itemId: 'potion', quantity: 5 }, { itemId: 'gold', quantity: 100 }]

// Check specific items
console.log(inventory.hasItem('backpack', 'sword')) // true
console.log(inventory.getQuantity('backpack', 'potion')) // 5

// Remove items
inventory.removeItem('backpack', 'potion', 2)
console.log(inventory.getQuantity('backpack', 'potion')) // 3
```

## What's Next?

Now that you have the basics:

- **[Understand Containers better](Concept-Containers)** - Learn about container lifecycle and configuration
- **[Add capacity limits](Guide-Weight-Based-Inventories)** - Create weight-limited inventories
- **[Build a grid inventory](Guide-Grid-Placement)** - Tetris-style item placement
- **[Explore the API](API-Container-Management)** - Full reference for all methods
