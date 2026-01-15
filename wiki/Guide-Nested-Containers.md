# Nested Containers

Create bags that can contain other bags. Nested containers let you organize inventory hierarchically—a backpack containing pouches, each with their own contents.

## Prerequisites

Before starting, you should:

- [Understand how containers work](Concept-Containers)

## Overview

We'll create nested containers by:

1. Creating parent and child containers
2. Adding the child container as an item in the parent
3. Using `{ deep: true }` for queries that traverse the hierarchy
4. Understanding cycle prevention

## Step 1: Create Parent and Child Containers

Both are regular containers. The "nesting" happens when you add one as an item in another.

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager()

// Parent container
inventory.createContainer('backpack', { mode: 'unlimited' })

// Child container (a pouch that goes inside the backpack)
inventory.createContainer('gem-pouch', { mode: 'count', maxCount: 10 })
```

## Step 2: Add Child Container as Item

Add the child container's ID as an item in the parent.

```typescript
// Put the gem pouch in the backpack
inventory.addItem('backpack', 'gem-pouch', 1)

// Add items to the pouch directly
inventory.addItem('gem-pouch', 'ruby', 3)
inventory.addItem('gem-pouch', 'emerald', 2)

// Add other items to the backpack
inventory.addItem('backpack', 'sword', 1)
inventory.addItem('backpack', 'potion', 5)
```

Now the backpack contains: sword, potions, and a gem-pouch. The gem-pouch contains rubies and emeralds.

## Step 3: Query with Deep Option

Use `{ deep: true }` to search or list contents across the entire hierarchy.

```typescript
// Shallow: only direct contents
const shallow = inventory.getContents('backpack')
// [{ itemId: 'gem-pouch', quantity: 1 }, { itemId: 'sword', quantity: 1 }, { itemId: 'potion', quantity: 5 }]

// Deep: includes nested container contents
const deep = inventory.getContents('backpack', { deep: true })
// [{ itemId: 'gem-pouch', quantity: 1 }, { itemId: 'sword', quantity: 1 }, { itemId: 'potion', quantity: 5 },
//  { itemId: 'ruby', quantity: 3 }, { itemId: 'emerald', quantity: 2 }]

// Find item across all containers
const found = inventory.findItem('ruby', { deep: true })
// [{ containerId: 'gem-pouch', quantity: 3 }]
```

## Step 4: Deep Weight Calculation

Calculate total weight including nested contents.

```typescript
const inventory = createInventoryManager({
  getItemWeight: (id) => {
    if (id === 'gem-pouch') return 0.5 // Empty pouch weight
    if (id === 'ruby') return 0.1
    if (id === 'sword') return 5
    return 1
  },
})

inventory.createContainer('backpack', { mode: 'weight', maxWeight: 50 })
inventory.createContainer('gem-pouch', { mode: 'unlimited' })

inventory.addItem('gem-pouch', 'ruby', 10) // 1.0 weight in gems
inventory.addItem('backpack', 'gem-pouch', 1)
inventory.addItem('backpack', 'sword', 1)

// Shallow weight: pouch (0.5) + sword (5) = 5.5
const shallow = inventory.getTotalWeight('backpack')
console.log(shallow) // 5.5

// Deep weight: pouch (0.5) + gems (1.0) + sword (5) = 6.5
const deep = inventory.getTotalWeight('backpack', { deep: true })
console.log(deep) // 6.5
```

## Cycle Prevention

The library prevents circular nesting, which would cause infinite loops.

```typescript
inventory.createContainer('bag-a', { mode: 'unlimited' })
inventory.createContainer('bag-b', { mode: 'unlimited' })

inventory.addItem('bag-a', 'bag-b', 1) // OK: bag-b is inside bag-a

// This would create a cycle: bag-a → bag-b → bag-a
inventory.addItem('bag-b', 'bag-a', 1) // Throws: "Cannot create circular nesting"

// Self-nesting is also prevented
inventory.addItem('bag-a', 'bag-a', 1) // Throws: "Cannot nest container in itself"
```

## Complete Example

```typescript
import { createInventoryManager } from '@motioneffector/inventory'

const inventory = createInventoryManager({
  getItemWeight: (id) => {
    const weights: Record<string, number> = {
      'backpack': 2,
      'coin-purse': 0.2,
      'gem-pouch': 0.3,
      'gold': 0.01,
      'ruby': 0.1,
      'sword': 5,
      'potion': 0.5,
    }
    return weights[id] ?? 1
  },
})

// Main inventory
inventory.createContainer('backpack', { mode: 'weight', maxWeight: 30 })

// Specialized sub-containers
inventory.createContainer('coin-purse', { mode: 'unlimited' })
inventory.createContainer('gem-pouch', { mode: 'count', maxCount: 20 })

// Nest them in the backpack
inventory.addItem('backpack', 'coin-purse', 1)
inventory.addItem('backpack', 'gem-pouch', 1)

// Fill the sub-containers
inventory.addItem('coin-purse', 'gold', 500)
inventory.addItem('gem-pouch', 'ruby', 15)

// Add regular items
inventory.addItem('backpack', 'sword', 1)
inventory.addItem('backpack', 'potion', 4)

// Query everything
console.log('Backpack contents (shallow):')
console.log(inventory.getContents('backpack'))

console.log('Backpack contents (deep):')
console.log(inventory.getContents('backpack', { deep: true }))

console.log('Total weight (shallow):', inventory.getTotalWeight('backpack'))
console.log('Total weight (deep):', inventory.getTotalWeight('backpack', { deep: true }))

// Find all gold
const goldLocations = inventory.findItem('gold', { deep: true })
console.log('Gold found:', goldLocations)
```

## Variations

### Multiple Nesting Levels

```typescript
inventory.createContainer('vault', { mode: 'unlimited' })
inventory.createContainer('chest', { mode: 'unlimited' })
inventory.createContainer('box', { mode: 'unlimited' })

// Vault contains chest, chest contains box
inventory.addItem('vault', 'chest', 1)
inventory.addItem('chest', 'box', 1)
inventory.addItem('box', 'treasure', 1)

// Deep query finds treasure
const found = inventory.findItem('treasure', { deep: true })
// [{ containerId: 'box', quantity: 1 }]
```

### Checking If Container Is Nested

```typescript
function isNested(containerId: string): boolean {
  const locations = inventory.findItem(containerId)
  return locations.length > 0
}
```

## Troubleshooting

### Deep Query Returns Duplicates

**Symptom:** Items appear multiple times in deep query results.

**Cause:** This shouldn't happen—the library tracks visited containers. If you see duplicates, check if you have multiple containers with similar IDs.

**Solution:** Ensure container IDs are unique.

### Circular Nesting Error Unexpected

**Symptom:** Adding a container throws "Cannot create circular nesting" when you don't expect it.

**Cause:** There's an existing path from the target container back to the source.

**Solution:** Use `findItem` to trace where containers are located and identify the cycle.

## See Also

- **[Containers](Concept-Containers)** - Container basics
- **[Querying API](API-Querying)** - Reference for `getContents`, `findItem`, `getTotalWeight` with deep option
