// ============================================
// ITEM DEFINITIONS
// ============================================
const ITEMS = {
  gem: { icon: '💎', name: 'Gem', size: { width: 1, height: 1 }, weight: 0.5 },
  sword: { icon: '⚔️', name: 'Sword', size: { width: 1, height: 3 }, weight: 5 },
  shield: { icon: '🛡️', name: 'Shield', size: { width: 2, height: 2 }, weight: 8 },
  bow: { icon: '🏹', name: 'Bow', size: { width: 3, height: 1 }, weight: 3 },
  scroll: { icon: '📜', name: 'Scroll', size: { width: 1, height: 1 }, weight: 0.2 },
  helmet: { icon: '🪖', name: 'Helmet', size: { width: 2, height: 1 }, weight: 4 },
  potion: { icon: '🧪', name: 'Potion', size: { width: 1, height: 1 }, weight: 0.5 },
  gold: { icon: '💰', name: 'Gold', size: { width: 1, height: 1 }, weight: 0.1 },
  bread: { icon: '🍞', name: 'Bread', size: { width: 1, height: 1 }, weight: 0.3 },
  armor: { icon: '🥋', name: 'Armor', size: { width: 2, height: 2 }, weight: 12 },
  pants: { icon: '👖', name: 'Pants', size: { width: 1, height: 2 }, weight: 3 },
  boots: { icon: '👢', name: 'Boots', size: { width: 1, height: 1 }, weight: 2 },
  rustySword: { icon: '🗡️', name: 'Rusty Sword', size: { width: 1, height: 2 }, weight: 4 },
  magicSword: { icon: '⚔️', name: 'Magic Sword', size: { width: 1, height: 3 }, weight: 3, price: 100 },
  steelShield: { icon: '🛡️', name: 'Steel Shield', size: { width: 2, height: 2 }, weight: 10, price: 75 },
  elixir: { icon: '🧪', name: 'Elixir', size: { width: 1, height: 1 }, weight: 0.5, price: 50 },
  spellScroll: { icon: '📜', name: 'Scroll', size: { width: 1, height: 1 }, weight: 0.1, price: 25 },
  plateHelm: { icon: '🪖', name: 'Plate Helm', size: { width: 2, height: 1 }, weight: 6, slotType: 'head' },
  plateArmor: { icon: '🥋', name: 'Plate Armor', size: { width: 2, height: 2 }, weight: 15, slotType: 'chest' },
  longbow: { icon: '🏹', name: 'Longbow', size: { width: 1, height: 3 }, weight: 4 },
  manaPotion: { icon: '🧪', name: 'Mana Pot', size: { width: 1, height: 1 }, weight: 0.5 },
  ruby: { icon: '💎', name: 'Ruby', size: { width: 1, height: 1 }, weight: 0.3 },
  emerald: { icon: '💎', name: 'Emerald', size: { width: 1, height: 1 }, weight: 0.3 }
};

// ============================================
// EXHIBIT 1: TETRIS VAULT
// ============================================
const gridManager = window.Library.createInventoryManager({
  getItemSize: (id) => ITEMS[id]?.size || { width: 1, height: 1 },
  getItemWeight: (id) => ITEMS[id]?.weight || 1
});

const GRID_WIDTH = 10, GRID_HEIGHT = 8;
let lootPile = ['gem', 'sword', 'shield', 'bow', 'scroll', 'helmet'];
let rotationEnabled = true;
let draggingItem = null;

function initGridExhibit() {
  gridManager.createContainer('vault', { mode: 'grid', width: GRID_WIDTH, height: GRID_HEIGHT, allowRotation: true });
  // Pre-populate with scattered items
  gridManager.addItemAt('vault', 'sword', { x: 0, y: 0, rotated: false });
  gridManager.addItemAt('vault', 'shield', { x: 3, y: 2, rotated: false });
  gridManager.addItemAt('vault', 'gem', { x: 6, y: 0, rotated: false });
  gridManager.addItemAt('vault', 'bow', { x: 7, y: 3, rotated: false });
  renderGrid();
  renderLootPile();
}

function renderGrid() {
  const container = document.getElementById('grid-cells');
  container.innerHTML = '';
  const grid = gridManager.getGrid('vault');
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      const gridCell = grid[y][x];
      if (gridCell && gridCell.isOrigin) {
        cell.textContent = ITEMS[gridCell.itemId]?.icon || '?';
        cell.classList.add('occupied');
        cell.draggable = true;
        cell.dataset.itemId = gridCell.itemId;
      } else if (gridCell) {
        cell.classList.add('occupied');
      }
      cell.addEventListener('dragover', handleGridDragOver);
      cell.addEventListener('drop', handleGridDrop);
      cell.addEventListener('dragleave', handleGridDragLeave);
      cell.addEventListener('dragstart', handleGridDragStart);
      container.appendChild(cell);
    }
  }
  updateCapacityBar();
}

function renderLootPile() {
  const container = document.getElementById('loot-items');
  container.innerHTML = '';
  lootPile.forEach((itemId, i) => {
    const item = ITEMS[itemId];
    const el = document.createElement('div');
    el.className = 'loot-item' + (i === 0 ? ' highlight' : '');
    el.draggable = true;
    el.dataset.itemId = itemId;
    el.innerHTML = `<span class="loot-item-icon">${item.icon}</span><div><div class="item-name">${item.name}</div><div class="loot-item-info">${item.size.width}x${item.size.height}</div></div>`;
    el.addEventListener('dragstart', handleLootDragStart);
    container.appendChild(el);
  });
}

function updateCapacityBar() {
  const cap = gridManager.getRemainingCapacity('vault');
  const total = GRID_WIDTH * GRID_HEIGHT;
  const used = total - cap.remaining;
  document.getElementById('grid-capacity').style.width = (used / total * 100) + '%';
}

function handleLootDragStart(e) {
  draggingItem = { itemId: e.target.dataset.itemId, fromLoot: true };
  e.dataTransfer.effectAllowed = 'move';
}

function handleGridDragStart(e) {
  const itemId = e.target.dataset.itemId;
  if (!itemId) return;
  draggingItem = { itemId, fromGrid: true, x: parseInt(e.target.dataset.x), y: parseInt(e.target.dataset.y) };
  e.dataTransfer.effectAllowed = 'move';
}

function handleGridDragOver(e) {
  e.preventDefault();
  if (!draggingItem) return;
  const x = parseInt(e.target.dataset.x), y = parseInt(e.target.dataset.y);
  clearDropHighlights();
  const placements = gridManager.findPlacements('vault', draggingItem.itemId);
  const valid = placements.some(p => p.x === x && p.y === y);
  highlightCells(x, y, draggingItem.itemId, valid);
}

function handleGridDragLeave() { clearDropHighlights(); }

function handleGridDrop(e) {
  e.preventDefault();
  if (!draggingItem) return;
  const x = parseInt(e.target.dataset.x), y = parseInt(e.target.dataset.y);
  clearDropHighlights();
  if (draggingItem.fromGrid) {
    gridManager.removeItem('vault', draggingItem.itemId, 1);
  }
  const result = gridManager.addItemAt('vault', draggingItem.itemId, { x, y, rotated: false });
  if (result.success) {
    if (draggingItem.fromLoot) {
      lootPile = lootPile.filter(id => id !== draggingItem.itemId);
      renderLootPile();
    }
  } else if (draggingItem.fromGrid) {
    gridManager.addItemAt('vault', draggingItem.itemId, { x: draggingItem.x, y: draggingItem.y, rotated: false });
  }
  draggingItem = null;
  renderGrid();
}

function highlightCells(x, y, itemId, valid) {
  const size = ITEMS[itemId]?.size || { width: 1, height: 1 };
  for (let dy = 0; dy < size.height; dy++) {
    for (let dx = 0; dx < size.width; dx++) {
      const cell = document.querySelector(`.grid-cell[data-x="${x+dx}"][data-y="${y+dy}"]`);
      if (cell) cell.classList.add(valid ? 'valid-drop' : 'invalid-drop');
    }
  }
}

function clearDropHighlights() {
  document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('valid-drop', 'invalid-drop'));
}

document.getElementById('auto-arrange').addEventListener('click', () => {
  gridManager.autoArrange('vault');
  renderGrid();
  document.getElementById('auto-arrange').classList.remove('btn-pulse');
});

document.getElementById('clear-grid').addEventListener('click', () => {
  const contents = gridManager.getContents('vault');
  contents.forEach(item => {
    gridManager.removeItem('vault', item.itemId, item.quantity);
    if (!lootPile.includes(item.itemId)) lootPile.push(item.itemId);
  });
  renderGrid();
  renderLootPile();
});

document.getElementById('rotation-toggle').addEventListener('change', (e) => { rotationEnabled = e.target.checked; });

// ============================================
// EXHIBIT 2: ADVENTURER'S LOADOUT
// ============================================
const loadoutManager = window.Library.createInventoryManager({
  getItemWeight: (id) => ITEMS[id]?.weight || 1,
  getItemSize: (id) => ITEMS[id]?.size || { width: 1, height: 1 }
});

let savedSnapshot = null;
let goldLocked = false;

function initLoadoutExhibit() {
  loadoutManager.createContainer('backpack', { mode: 'weight', maxWeight: 50, allowStacking: true });
  loadoutManager.createContainer('chest', { mode: 'unlimited', allowStacking: true });
  loadoutManager.createContainer('equipment', {
    mode: 'slots',
    slots: ['head', 'mainhand', 'offhand', 'chest', 'legs', 'feet'],
    slotFilters: {
      head: (id) => ['helmet', 'plateHelm'].includes(id),
      mainhand: (id) => ['sword', 'rustySword', 'magicSword'].includes(id),
      offhand: (id) => ['shield', 'steelShield'].includes(id),
      chest: (id) => ['armor', 'plateArmor'].includes(id),
      legs: (id) => ['pants'].includes(id),
      feet: (id) => ['boots'].includes(id)
    }
  });
  // Pre-populate backpack (~70% weight)
  loadoutManager.addItem('backpack', 'rustySword', 1);
  loadoutManager.addItem('backpack', 'potion', 12);
  loadoutManager.addItem('backpack', 'gold', 47);
  loadoutManager.addItem('backpack', 'bread', 5);
  loadoutManager.addItem('backpack', 'ruby', 3);
  loadoutManager.addItem('backpack', 'emerald', 2);
  // Pre-equip some gear
  loadoutManager.setSlot('equipment', 'head', 'helmet');
  loadoutManager.setSlot('equipment', 'mainhand', 'rustySword');
  loadoutManager.setSlot('equipment', 'chest', 'armor');
  // Chest has better gear
  loadoutManager.addItem('chest', 'gold', 500);
  loadoutManager.addItem('chest', 'magicSword', 1);
  loadoutManager.addItem('chest', 'plateHelm', 1);
  loadoutManager.addItem('chest', 'manaPotion', 20);
  loadoutManager.addItem('chest', 'longbow', 1);
  renderLoadout();
}

function renderLoadout() {
  renderBackpack();
  renderChest();
  renderEquipment();
  updateWeightBar();
}

function renderBackpack() {
  const container = document.getElementById('backpack-items');
  container.innerHTML = '';
  const contents = loadoutManager.getContents('backpack');
  contents.forEach(entry => {
    const item = ITEMS[entry.itemId];
    const el = document.createElement('div');
    el.className = 'inventory-item' + (goldLocked && entry.itemId === 'gold' ? ' locked' : '');
    el.draggable = !(goldLocked && entry.itemId === 'gold');
    el.dataset.itemId = entry.itemId;
    el.dataset.source = 'backpack';
    el.innerHTML = `<span class="item-icon">${item?.icon || '?'}</span><span class="item-name">${item?.name || entry.itemId}</span><span class="item-qty">x${entry.quantity}</span>`;
    el.addEventListener('dragstart', handleLoadoutDragStart);
    container.appendChild(el);
  });
}

function renderChest() {
  const container = document.getElementById('chest-items');
  container.innerHTML = '';
  const contents = loadoutManager.getContents('chest');
  contents.forEach((entry, i) => {
    const item = ITEMS[entry.itemId];
    const el = document.createElement('div');
    el.className = 'inventory-item' + (entry.itemId === 'plateHelm' ? ' highlight' : '');
    el.draggable = true;
    el.dataset.itemId = entry.itemId;
    el.dataset.source = 'chest';
    if (entry.itemId === 'plateHelm') el.title = 'Drag me to upgrade!';
    el.innerHTML = `<span class="item-icon">${item?.icon || '?'}</span><span class="item-name">${item?.name || entry.itemId}</span><span class="item-qty">x${entry.quantity}</span>`;
    el.addEventListener('dragstart', handleLoadoutDragStart);
    container.appendChild(el);
  });
}

function renderEquipment() {
  const slots = loadoutManager.getAllSlots('equipment');
  for (const [slot, itemId] of Object.entries(slots)) {
    const el = document.getElementById('slot-' + slot);
    if (el) {
      el.innerHTML = `<span class="slot-label">${slot}</span>`;
      if (itemId) {
        el.innerHTML = ITEMS[itemId]?.icon || '?' + el.innerHTML;
        el.classList.add('filled');
      } else {
        el.classList.remove('filled');
      }
    }
  }
}

function updateWeightBar() {
  const weight = loadoutManager.getTotalWeight('backpack');
  const maxWeight = 50;
  const pct = (weight / maxWeight) * 100;
  const fill = document.getElementById('weight-fill');
  fill.style.width = pct + '%';
  fill.className = 'weight-bar-fill' + (pct > 90 ? ' danger' : pct > 70 ? ' warning' : '');
  document.getElementById('weight-text').textContent = `${weight.toFixed(1)}/${maxWeight} kg`;
}

let loadoutDragging = null;

function handleLoadoutDragStart(e) {
  loadoutDragging = { itemId: e.target.dataset.itemId, source: e.target.dataset.source };
  e.dataTransfer.effectAllowed = 'move';
}

document.querySelectorAll('.equipment-slot').forEach(slot => {
  slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.style.borderColor = 'var(--accent-blue)'; });
  slot.addEventListener('dragleave', () => { slot.style.borderColor = ''; });
  slot.addEventListener('drop', (e) => {
    e.preventDefault();
    slot.style.borderColor = '';
    if (!loadoutDragging) return;
    const slotName = slot.dataset.slot;
    const result = loadoutManager.canEquip('equipment', slotName, loadoutDragging.itemId);
    if (result.canAdd) {
      const oldItem = loadoutManager.setSlot('equipment', slotName, loadoutDragging.itemId);
      loadoutManager.removeItem(loadoutDragging.source, loadoutDragging.itemId, 1);
      if (oldItem) loadoutManager.addItem('backpack', oldItem, 1);
      renderLoadout();
    } else {
      slot.classList.add('invalid');
      setTimeout(() => slot.classList.remove('invalid'), 300);
    }
    loadoutDragging = null;
  });
});

['backpack-items', 'chest-items'].forEach(containerId => {
  document.getElementById(containerId).addEventListener('dragover', (e) => e.preventDefault());
  document.getElementById(containerId).addEventListener('drop', (e) => {
    e.preventDefault();
    if (!loadoutDragging) return;
    const target = containerId === 'backpack-items' ? 'backpack' : 'chest';
    if (loadoutDragging.source !== target) {
      const result = loadoutManager.transfer(loadoutDragging.source, target, loadoutDragging.itemId, 1);
      renderLoadout();
    }
    loadoutDragging = null;
  });
});

document.getElementById('lock-gold').addEventListener('click', () => {
  goldLocked = !goldLocked;
  if (goldLocked) loadoutManager.lockItem('backpack', 'gold');
  else loadoutManager.unlockItem('backpack', 'gold');
  document.getElementById('lock-gold').textContent = goldLocked ? '🔓 Unlock Gold' : '🔒 Lock Gold';
  renderLoadout();
});

document.getElementById('sort-items').addEventListener('click', () => {
  loadoutManager.sort('backpack', (a, b) => a.itemId.localeCompare(b.itemId));
  renderLoadout();
});

document.getElementById('merge-stacks').addEventListener('click', () => {
  loadoutManager.consolidate('backpack');
  renderLoadout();
});

document.getElementById('snapshot').addEventListener('click', () => {
  savedSnapshot = loadoutManager.serialize();
  document.getElementById('restore').disabled = false;
  document.body.style.animation = 'flash 0.2s';
  setTimeout(() => document.body.style.animation = '', 200);
});

document.getElementById('restore').addEventListener('click', () => {
  if (savedSnapshot) {
    loadoutManager.deserialize(savedSnapshot);
    renderLoadout();
  }
});

// ============================================
// EXHIBIT 3: TIME-WARP TRADING
// ============================================
const tradeManager = window.Library.createInventoryManager({
  getItemWeight: (id) => ITEMS[id]?.weight || 1
});

let playerOffer = ['rustySword'];
let playerWant = ['magicSword'];
let tradeInProgress = false;

function initTradingExhibit() {
  tradeManager.createContainer('player', { mode: 'weight', maxWeight: 30, allowStacking: true });
  tradeManager.createContainer('merchant', { mode: 'unlimited', allowStacking: true });
  tradeManager.addItem('player', 'rustySword', 1);
  tradeManager.addItem('player', 'potion', 3);
  tradeManager.addItem('player', 'gold', 150);
  tradeManager.addItem('merchant', 'magicSword', 1);
  tradeManager.addItem('merchant', 'steelShield', 1);
  tradeManager.addItem('merchant', 'elixir', 1);
  tradeManager.addItem('merchant', 'spellScroll', 1);
  renderTrading();
}

function renderTrading() {
  renderPlayerInventory();
  renderMerchantInventory();
  updateTradeSummary();
  document.getElementById('player-gold').textContent = tradeManager.getQuantity('player', 'gold');
  document.getElementById('player-weight').textContent = tradeManager.getTotalWeight('player').toFixed(1);
}

function renderPlayerInventory() {
  const container = document.getElementById('player-inventory');
  container.innerHTML = '';
  const contents = tradeManager.getContents('player').filter(e => e.itemId !== 'gold');
  contents.forEach(entry => {
    const item = ITEMS[entry.itemId];
    const el = document.createElement('div');
    el.className = 'trader-item' + (playerOffer.includes(entry.itemId) ? ' selected' : '');
    el.dataset.itemId = entry.itemId;
    el.innerHTML = `<span class="item-icon">${item?.icon || '?'}</span><span class="item-name">${item?.name || entry.itemId}</span>`;
    el.addEventListener('click', () => toggleOffer(entry.itemId));
    container.appendChild(el);
  });
}

function renderMerchantInventory() {
  const container = document.getElementById('merchant-inventory');
  container.innerHTML = '';
  const contents = tradeManager.getContents('merchant');
  contents.forEach(entry => {
    const item = ITEMS[entry.itemId];
    const el = document.createElement('div');
    el.className = 'trader-item' + (playerWant.includes(entry.itemId) ? ' selected' : '');
    el.dataset.itemId = entry.itemId;
    el.innerHTML = `<span class="item-icon">${item?.icon || '?'}</span><span class="item-name">${item?.name || entry.itemId}</span><span class="trader-item-price">${item?.price || 25}g</span>`;
    el.addEventListener('click', () => toggleWant(entry.itemId));
    container.appendChild(el);
  });
}

function toggleOffer(itemId) {
  if (playerOffer.includes(itemId)) playerOffer = playerOffer.filter(id => id !== itemId);
  else playerOffer.push(itemId);
  renderTrading();
}

function toggleWant(itemId) {
  if (playerWant.includes(itemId)) playerWant = playerWant.filter(id => id !== itemId);
  else playerWant.push(itemId);
  renderTrading();
}

function updateTradeSummary() {
  const offerText = playerOffer.map(id => ITEMS[id]?.icon || '?').join(' ') || '-';
  const wantText = playerWant.map(id => ITEMS[id]?.icon || '?').join(' ') || '-';
  document.getElementById('offer-items').textContent = offerText;
  document.getElementById('want-items').textContent = wantText;
  const wantCost = playerWant.reduce((sum, id) => sum + (ITEMS[id]?.price || 25), 0);
  const offerValue = playerOffer.reduce((sum, id) => sum + (ITEMS[id]?.price || 10), 0);
  const net = offerValue - wantCost;
  const netEl = document.getElementById('trade-net');
  netEl.textContent = (net >= 0 ? '+' : '') + net + 'g';
  netEl.className = 'trade-net' + (net < 0 ? ' negative' : '');
}

async function executeTrade() {
  if (tradeInProgress || playerWant.length === 0) return;
  tradeInProgress = true;
  document.getElementById('execute-trade').disabled = true;
  const speed = 6 - parseInt(document.getElementById('trade-speed').value);
  const baseDelay = speed * 200;
  const chaosEnabled = document.getElementById('chaos-gremlin').checked;
  const tradeZone = document.getElementById('trade-zone');
  const wantCost = playerWant.reduce((sum, id) => sum + (ITEMS[id]?.price || 25), 0);
  const offerValue = playerOffer.reduce((sum, id) => sum + (ITEMS[id]?.price || 10), 0);
  const goldNeeded = wantCost - offerValue;

  try {
    tradeManager.transaction(() => {
      // Remove offered items
      playerOffer.forEach(id => tradeManager.removeItem('player', id, 1));
      // Pay gold if needed
      if (goldNeeded > 0) tradeManager.removeItem('player', 'gold', goldNeeded);
      // Simulate delay/failure point
      if (chaosEnabled) throw new Error('Chaos Gremlin strikes!');
      // Add wanted items
      playerWant.forEach(id => {
        tradeManager.removeItem('merchant', id, 1);
        tradeManager.addItem('player', id, 1);
      });
      // Add offered items to merchant
      playerOffer.forEach(id => tradeManager.addItem('merchant', id, 1));
      // Give gold to merchant
      if (goldNeeded > 0) tradeManager.addItem('merchant', 'gold', goldNeeded);
    });
    // Success animation
    tradeZone.style.background = 'rgba(35, 134, 54, 0.3)';
    await sleep(baseDelay);
    playerOffer = [];
    playerWant = [];
  } catch (e) {
    // Failure - show rewind
    tradeZone.style.background = 'rgba(218, 54, 51, 0.3)';
    const gremlin = document.createElement('div');
    gremlin.className = 'gremlin';
    gremlin.textContent = '🐛';
    gremlin.style.left = '50%';
    gremlin.style.top = '50%';
    gremlin.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(gremlin);
    await sleep(baseDelay);
    gremlin.remove();
  }

  tradeZone.style.background = '';
  tradeInProgress = false;
  document.getElementById('execute-trade').disabled = false;
  document.getElementById('execute-trade').classList.remove('btn-pulse');
  renderTrading();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

document.getElementById('execute-trade').addEventListener('click', executeTrade);

document.getElementById('reset-trade').addEventListener('click', () => {
  tradeManager.removeContainer('player');
  tradeManager.removeContainer('merchant');
  playerOffer = ['rustySword'];
  playerWant = ['magicSword'];
  initTradingExhibit();
  document.getElementById('execute-trade').classList.add('btn-pulse');
});

// ============================================
// EXHIBIT REGISTRATION FOR TEST RUNNER
// ============================================

// Register exhibits for automated demo walkthrough
if (typeof testRunner !== 'undefined') {
  testRunner.demoGridExhibit = async function() {
    const exhibit = document.querySelector('#exhibit-1').closest('.exhibit');
    exhibit.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(400);
    exhibit.classList.add('demo-highlight');

    // Add remaining loot items to grid
    const DEMO_DELAY = 200;
    while (lootPile.length > 0) {
      const itemId = lootPile[0];
      const placements = gridManager.findPlacements('vault', itemId);
      if (placements.length > 0) {
        gridManager.addItemAt('vault', itemId, placements[0]);
        lootPile = lootPile.filter(id => id !== itemId);
        renderGrid();
        renderLootPile();
        await sleep(DEMO_DELAY);
      } else break;
    }

    // Auto-arrange
    await sleep(300);
    document.getElementById('auto-arrange').classList.add('demo-action');
    gridManager.autoArrange('vault');
    renderGrid();
    document.getElementById('auto-arrange').classList.remove('btn-pulse');
    await sleep(400);

    exhibit.classList.remove('demo-highlight');
    await sleep(200);
  };

  testRunner.demoLoadoutExhibit = async function() {
    const exhibit = document.querySelector('#exhibit-2').closest('.exhibit');
    exhibit.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(400);
    exhibit.classList.add('demo-highlight');

    const DEMO_DELAY = 250;

    // Transfer plate helm from chest to head
    if (loadoutManager.hasItem('chest', 'plateHelm')) {
      const oldItem = loadoutManager.setSlot('equipment', 'head', 'plateHelm');
      loadoutManager.removeItem('chest', 'plateHelm', 1);
      if (oldItem) loadoutManager.addItem('backpack', oldItem, 1);
      renderLoadout();
      await sleep(DEMO_DELAY);
    }

    // Lock gold
    if (!goldLocked) {
      goldLocked = true;
      loadoutManager.lockItem('backpack', 'gold');
      document.getElementById('lock-gold').textContent = '🔓 Unlock Gold';
      renderLoadout();
      await sleep(DEMO_DELAY);
    }

    // Sort items
    document.getElementById('sort-items').classList.add('demo-action');
    loadoutManager.sort('backpack', (a, b) => a.itemId.localeCompare(b.itemId));
    renderLoadout();
    await sleep(DEMO_DELAY);

    // Snapshot
    document.getElementById('snapshot').classList.add('demo-action');
    savedSnapshot = loadoutManager.serialize();
    document.getElementById('restore').disabled = false;
    await sleep(DEMO_DELAY);

    // Transfer some items to chest
    if (loadoutManager.hasItem('backpack', 'potion')) {
      loadoutManager.transfer('backpack', 'chest', 'potion', 5);
      renderLoadout();
      await sleep(DEMO_DELAY);
    }

    // Restore from snapshot
    document.getElementById('restore').classList.add('demo-action');
    loadoutManager.deserialize(savedSnapshot);
    renderLoadout();
    await sleep(400);

    exhibit.classList.remove('demo-highlight');
    await sleep(200);
  };

  testRunner.demoTradingExhibit = async function() {
    const exhibit = document.querySelector('#exhibit-3').closest('.exhibit');
    exhibit.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(400);
    exhibit.classList.add('demo-highlight');

    // Execute pre-configured trade (success)
    document.getElementById('execute-trade').classList.add('demo-action');
    await executeTrade();
    await sleep(500);

    // Reset for failed trade demo
    document.getElementById('reset-trade').click();
    await sleep(300);

    // Enable chaos gremlin
    document.getElementById('chaos-gremlin').checked = true;
    await sleep(200);

    // Execute trade again (will fail and rollback)
    document.getElementById('execute-trade').classList.add('demo-action');
    await executeTrade();
    await sleep(500);

    // Disable chaos gremlin
    document.getElementById('chaos-gremlin').checked = false;

    exhibit.classList.remove('demo-highlight');
    await sleep(200);
  };
}

// ============================================
// INITIALIZE EXHIBITS
// ============================================
initGridExhibit();
initLoadoutExhibit();
initTradingExhibit();

// ============================================
// REGISTER EXHIBITS FOR AUTOMATED WALKTHROUGH
// ============================================

// Wait for testRunner to be available, then register exhibits
if (typeof testRunner !== 'undefined') {
  testRunner.registerExhibit(
    'Tetris Vault',
    document.getElementById('exhibit-tetris-vault'),
    async () => {
      const exhibit = document.querySelector('#exhibit-1').closest('.exhibit');
      exhibit.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(400);
      exhibit.classList.add('demo-highlight');

      // Add remaining loot items to grid
      const DEMO_DELAY = 200;
      while (lootPile.length > 0) {
        const itemId = lootPile[0];
        const placements = gridManager.findPlacements('vault', itemId);
        if (placements.length > 0) {
          gridManager.addItemAt('vault', itemId, placements[0]);
          lootPile = lootPile.filter(id => id !== itemId);
          renderGrid();
          renderLootPile();
          await sleep(DEMO_DELAY);
        } else break;
      }

      // Auto-arrange
      await sleep(300);
      document.getElementById('auto-arrange').classList.add('demo-action');
      gridManager.autoArrange('vault');
      renderGrid();
      document.getElementById('auto-arrange').classList.remove('btn-pulse');
      await sleep(400);

      exhibit.classList.remove('demo-highlight');
      await sleep(200);
    }
  );

  testRunner.registerExhibit(
    'Adventurer\'s Loadout',
    document.getElementById('exhibit-adventurer-loadout'),
    async () => {
      const exhibit = document.querySelector('#exhibit-2').closest('.exhibit');
      exhibit.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(400);
      exhibit.classList.add('demo-highlight');

      const DEMO_DELAY = 250;

      // Transfer plate helm from chest to head
      if (loadoutManager.hasItem('chest', 'plateHelm')) {
        const oldItem = loadoutManager.setSlot('equipment', 'head', 'plateHelm');
        loadoutManager.removeItem('chest', 'plateHelm', 1);
        if (oldItem) loadoutManager.addItem('backpack', oldItem, 1);
        renderLoadout();
        await sleep(DEMO_DELAY);
      }

      // Lock gold
      if (!goldLocked) {
        goldLocked = true;
        loadoutManager.lockItem('backpack', 'gold');
        document.getElementById('lock-gold').textContent = '🔓 Unlock Gold';
        renderLoadout();
        await sleep(DEMO_DELAY);
      }

      // Sort items
      document.getElementById('sort-items').classList.add('demo-action');
      loadoutManager.sort('backpack', (a, b) => a.itemId.localeCompare(b.itemId));
      renderLoadout();
      await sleep(DEMO_DELAY);

      // Snapshot
      document.getElementById('snapshot').classList.add('demo-action');
      savedSnapshot = loadoutManager.serialize();
      document.getElementById('restore').disabled = false;
      await sleep(DEMO_DELAY);

      // Transfer some items to chest
      if (loadoutManager.hasItem('backpack', 'potion')) {
        loadoutManager.transfer('backpack', 'chest', 'potion', 5);
        renderLoadout();
        await sleep(DEMO_DELAY);
      }

      // Restore from snapshot
      document.getElementById('restore').classList.add('demo-action');
      loadoutManager.deserialize(savedSnapshot);
      renderLoadout();
      await sleep(400);

      exhibit.classList.remove('demo-highlight');
      await sleep(200);
    }
  );

  testRunner.registerExhibit(
    'Time-Warp Trading',
    document.getElementById('exhibit-timewarp-trading'),
    async () => {
      const exhibit = document.querySelector('#exhibit-3').closest('.exhibit');
      exhibit.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(400);
      exhibit.classList.add('demo-highlight');

      // Execute pre-configured trade (success)
      document.getElementById('execute-trade').classList.add('demo-action');
      await executeTrade();
      await sleep(500);

      // Reset for failed trade demo
      document.getElementById('reset-trade').click();
      await sleep(300);

      // Enable chaos gremlin
      document.getElementById('chaos-gremlin').checked = true;
      await sleep(200);

      // Execute trade again (will fail and rollback)
      document.getElementById('execute-trade').classList.add('demo-action');
      await executeTrade();
      await sleep(500);

      // Disable chaos gremlin
      document.getElementById('chaos-gremlin').checked = false;

      exhibit.classList.remove('demo-highlight');
      await sleep(200);
    }
  );
}
