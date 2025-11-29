// Minesweeper Chronicles: Eternal Depths - PERMADEATH + ENEMIES + LOOT
const zones = [
  { name: "Beginner Caves", rows: 9, cols: 9, mines: 10, enemies: 2, reqGS: 0, boss: false },
  { name: "Forgotten Mines", rows: 14, cols: 14, mines: 35, enemies: 4, reqGS: 50, boss: false },
  { name: "Abyssal Vaults", rows: 16, cols: 28, mines: 99, enemies: 8, reqGS: 150, boss: false },
  { name: "Nether Core", rows: 20, cols: 20, mines: 85, enemies: 0, reqGS: 300, boss: true, bossName: "Nether King" },
  { name: "Eternal Void", rows: 24, cols: 24, mines: 140, enemies: 0, reqGS: 600, boss: true, bossName: "Void Devourer" }
];

let player = {
  level: 1, xp: 0, xpNeeded: 200,
  gold: 0, hp: 100, maxHp: 100, potions: 0,
  gearScore: 10, bossKills: 0,
  equipment: { pickaxe: null, armor: null },
  relics: []
};

const gearItems = [
  { id: "pick1", name: "Rusty Pickaxe", type: "pickaxe", gs: 10, power: 1, cost: 0 },
  { id: "pick2", name: "Iron Pickaxe", type: "pickaxe", gs: 50, power: 2, cost: 300 },
  { id: "pick3", name: "Mithril Pickaxe", type: "pickaxe", gs: 120, power: 3, cost: 1000 },
  { id: "pick4", name: "Dragonbone Pickaxe", type: "pickaxe", gs: 300, power: 5, cost: 4000 },
  { id: "pick5", name: "Void Reaver", type: "pickaxe", gs: 650, power: 8, cost: 15000 },
  { id: "arm1", name: "Leather Vest", type: "armor", gs: 40, hp: 100, cost: 400 },
  { id: "arm2", name: "Knight's Plate", type: "armor", gs: 150, hp: 300, cost: 1800 },
  { id: "arm3", name: "Dragon Scale", type: "armor", gs: 400, hp: 800, cost: 8000 },
  { id: "rel1", name: "Ring of Fortune", type: "relic", effect: "doubleGold", cost: 2000 },
  { id: "rel2", name: "Amulet of Life", type: "relic", effect: "extraLife", cost: 5000 },
  { id: "potion", name: "Healing Potion", type: "potion", heal: 100, cost: 100 }
];

const enemyTypes = ["Cave Rat", "Tunnel Orc", "Abyss Wraith", "Shadow Stalker", "Doom Spider"];

// Load save
if (localStorage.getItem("minesweeper_save")) {
  player = JSON.parse(localStorage.getItem("minesweeper_save"));
  if (!player.potions) player.potions = 0;
}
updateDisplay();
updateDungeons();

let currentZone = null, rows, cols, board = [], revealed = 0;
let timer = 0, timerInterval = null;
let gameActive = true, combatActive = false;

document.querySelectorAll(".dungeon").forEach(d => {
  d.addEventListener("click", () => {
    const zoneId = parseInt(d.dataset.zone);
    const zone = zones[zoneId];
    if (player.gearScore < zone.reqGS) {
      alert(`Gear Score too low! Need ${zone.reqGS} (You have ${player.gearScore})`);
      return;
    }
    startZone(zoneId);
  });
});

document.getElementById("back-to-map").onclick = () => showScreen("world-map");
document.getElementById("inventory-btn").onclick = () => openInventory();
document.getElementById("reset-btn").onclick = () => {
  if (confirm("Start a new hero? All progress LOST!")) {
    localStorage.removeItem("minesweeper_save");
    location.reload();
  }
};
document.getElementById("use-potion").onclick = usePotion;

function startZone(id) {
  currentZone = zones[id];
  document.getElementById("zone-name").textContent = currentZone.name;
  showScreen("game-screen");
  initGame();
}

function initGame() {
  gameActive = true; combatActive = false;
  document.getElementById("combat-hud").classList.add("hidden");
  document.getElementById("boss-hud").classList.add("hidden");
  const mf = document.getElementById("minefield");
  mf.innerHTML = "";
  rows = currentZone.rows; cols = currentZone.cols;
  mf.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  board = Array(rows).fill().map(() => Array(cols).fill(0));
  revealed = 0;

  // Place mines
  let mines = currentZone.mines;
  while (mines-- > 0) {
    let r, c;
    do { r = Math.floor(Math.random() * rows); c = Math.floor(Math.random() * cols); }
    while (board[r][c] !== 0);
    board[r][c] = -1;
  }

  // Place enemies
  if (currentZone.enemies > 0) {
    let enemies = currentZone.enemies;
    while (enemies-- > 0) {
      let r, c;
      do { r = Math.floor(Math.random() * rows); c = Math.floor(Math.random() * cols); }
      while (board[r][c] !== 0);
      board[r][c] = -3; // enemy
    }
  }

  // Place boss
  if (currentZone.boss) {
    const br = Math.floor(rows / 2), bc = Math.floor(cols / 2);
    board[br][bc] = -2;
  }

  // Calculate numbers
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] <= -2) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (board[r+dr]?.[c+dc] === -1) count++;
      }
      board[r][c] = count;
    }
  }

  // Render
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r; cell.dataset.c = c;
      if (board[r][c] === -3) cell.classList.add("enemy");
      if (board[r][c] === -2) cell.classList.add("boss");
      cell.addEventListener('mousedown', e => handleClick(e, r, c));
      cell.addEventListener('contextmenu', e => e.preventDefault());
      mf.appendChild(cell);
    }
  }

  timer = 0;
  document.getElementById("timer").textContent = "Time: 0s";
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timer++;
    document.getElementById("timer").textContent = `Time: ${timer}s`;
  }, 1000);

  updatePotionBtn();
}

function handleClick(e, r, c) {
  if (!gameActive || combatActive) return;
  e.preventDefault();
  const buttons = e.buttons;
  if (buttons === 1 && board[r][c] !== "F") reveal(r, c);
  else if (buttons === 2) flag(r, c);
  else if (buttons === 3 && board[r][c] === "R") chord(r, c);
}

function reveal(r, c) {
  if (board[r][c] === "R" || board[r][c] === "F") return;
  const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  board[r][c] = "R";
  cell.classList.add("revealed");
  revealed++;

  if (board[r][c] === -1) {
    cell.classList.add("mine"); cell.textContent = "Bomb";
    takeDamage(50 + Math.random() * 50);
    return;
  }
  if (board[r][c] === -3) {
    startEnemyCombat(r, c);
    return;
  }
  if (board[r][c] === -2) {
    startBossFight();
    return;
  }

  const num = getNumber(r, c);
  if (num > 0) {
    cell.textContent = num;
    cell.style.color = ["", "blue", "green", "red", "purple", "maroon", "cyan", "black", "gray"][num];
  } else {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] !== "R" && board[nr][nc] !== "F")
        reveal(nr, nc);
    }
  }
  checkWin();
}

function getNumber(r, c) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (board[r+dr]?.[c+dc] === -1) count++;
  }
  return count;
}

function flag(r, c) {
  const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if (board[r][c] === "R") return;
  if (board[r][c] === "F") {
    board[r][c] = getNumber(r, c);
    cell.classList.remove("flagged"); cell.textContent = "";
  } else {
    board[r][c] = "F";
    cell.classList.add("flagged"); cell.textContent = "Flag";
  }
}

function chord(r, c) {
  if (board[r][c] !== "R") return;
  const num = getNumber(r, c);
  let flags = 0, toReveal = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (dr === 0 && dc === 0) continue;
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    if (board[nr][nc] === "F") flags++;
    else if (board[nr][nc] !== "R") toReveal.push([nr, nc]);
  }
  if (flags === num) toReveal.forEach(p => reveal(...p));
}

function startEnemyCombat(r, c) {
  combatActive = true;
  gameActive = false;
  document.getElementById("combat-hud").classList.remove("hidden");
  const name = enemyTypes[Math.min(Math.floor(player.level / 3), enemyTypes.length - 1)];
  document.getElementById("enemy-name").textContent = name;
  let enemyHP = 150 + player.level * 80 + currentZone.enemies * 50;
  const maxHP = enemyHP;

  const int = setInterval(() => {
    const dmg = 25 + (player.equipment.pickaxe?.power || 1) * 30;
    enemyHP -= dmg;
    document.getElementById("enemy-hp-fill").style.width = Math.max(0, enemyHP / maxHP * 100) + "%";

    if (enemyHP <= 0) {
      clearInterval(int);
      document.getElementById("combat-hud").classList.add("hidden");
      combatActive = false;
      gameActive = true;

      // LOOT
      const goldDrop = Math.floor(50 + Math.random() * 100 + player.level * 20);
      player.gold += goldDrop;
      let msg = `Enemy slain! +${goldDrop} gold`;
      if (Math.random() < 0.15) { player.potions++; msg += " +1 Potion"; }
      if (Math.random() < 0.05) { player.gold += 500; msg += " +500 bonus gold!"; }
      document.getElementById("message").textContent = msg;
      document.getElementById("message").className = "win";
      updateDisplay();
      save();
      checkWin();
      return;
    }
    takeDamage(20 + Math.random() * 30 + currentZone.enemies * 5);
  }, 900);
}

function startBossFight() {
  combatActive = true;
  gameActive = false;
  document.getElementById("boss-hud").classList.remove("hidden");
  document.getElementById("boss-name").textContent = currentZone.bossName;
  let bossHP = 2000 + player.level * 1200;
  const maxHP = bossHP;

  const int = setInterval(() => {
    const dmg = 30 + (player.equipment.pickaxe?.power || 1) * 40;
    bossHP -= dmg;
    document.getElementById("boss-hp-fill").style.width = Math.max(0, bossHP / maxHP * 100) + "%";

    if (bossHP <= 0) {
      clearInterval(int);
      document.getElementById("boss-hud").classList.add("hidden");
      combatActive = false;
      gameActive = true;
      player.bossKills++;
      const gold = 3000 + player.level * 2000;
      player.gold += gold;
      gainXP(800 + player.level * 400);
      alert(`BOSS DEFEATED! +${gold} gold`);
      save();
      showScreen("world-map");
      return;
    }
    takeDamage(40 + Math.random() * 50);
  }, 1000);
}

function takeDamage(dmg) {
  player.hp -= dmg;
  updateDisplay();
  if (player.hp > 0) return;

  // Extra life?
  const lifeIdx = player.relics.findIndex(r => r.effect === "extraLife");
  if (lifeIdx !== -1) {
    player.relics.splice(lifeIdx, 1);
    player.hp = player.maxHp;
    alert("Amulet of Life saved you!");
    updateDisplay();
    renderInventory();
    return;
  }

  // PERMADEATH
  clearInterval(timerInterval);
  revealAllMines();
  setTimeout(() => {
    alert("YOU DIED. Everything is lost. Starting over...");
    localStorage.removeItem("minesweeper_save");
    location.reload();
  }, 2000);
}

function revealAllMines() {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (board[r][c] === -1) {
      const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
      cell.classList.add("revealed", "mine");
      cell.textContent = "Bomb";
    }
  }
}

function checkWin() {
  const totalSafe = rows * cols - currentZone.mines - (currentZone.boss ? 1 : 0) - currentZone.enemies;
  if (revealed >= totalSafe && gameActive) {
    clearInterval(timerInterval);
    const gold = Math.floor((100 + timer * 2 + player.level * 50) * (player.relics.some(r => r.effect === "doubleGold") ? 2 : 1));
    player.gold += gold;
    gainXP(150 + player.level * 80);
    document.getElementById("message").textContent = `Dungeon Cleared! +${gold} gold`;
    document.getElementById("message").className = "win";
    save();
    setTimeout(() => showScreen("world-map"), 2500);
  }
}

function usePotion() {
  if (player.potions > 0 && player.hp < player.maxHp) {
    player.potions--;
    player.hp = Math.min(player.maxHp, player.hp + 100);
    updateDisplay();
    updatePotionBtn();
  }
}

function gainXP(amount) {
  player.xp += amount;
  while (player.xp >= player.xpNeeded) {
    player.xp -= player.xpNeeded;
    player.level++;
    player.xpNeeded = Math.floor(player.xpNeeded * 1.7);
    player.maxHp += 80;
    player.hp = player.maxHp;
  }
  updateDisplay();
  save();
}

function calculateGearScore() {
  let gs = 10;
  if (player.equipment.pickaxe) gs += player.equipment.pickaxe.gs;
  if (player.equipment.armor) gs += player.equipment.armor.gs;
  return gs;
}

function updateDisplay() {
  player.gearScore = calculateGearScore();
  document.getElementById("level").textContent = player.level;
  document.getElementById("gold").textContent = player.gold.toLocaleString();
  document.getElementById("boss-kills").textContent = player.bossKills;
  document.getElementById("gear-score").textContent = player.gearScore;
  document.getElementById("hp").textContent = Math.floor(player.hp);
  document.getElementById("max-hp").textContent = player.maxHp;
  document.getElementById("hp-display").textContent = Math.floor(player.hp);
  document.getElementById("maxhp-display").textContent = player.maxHp;
  updateDungeons();
  updatePotionBtn();
}

function updatePotionBtn() {
  const btn = document.getElementById("use-potion");
  const count = document.getElementById("potion-count");
  count.textContent = player.potions;
  btn.disabled = player.potions === 0 || player.hp >= player.maxHp;
}

function updateDungeons() {
  document.querySelectorAll(".dungeon").forEach((d, i) => {
    d.classList.toggle("locked", player.gearScore < zones[i].reqGS);
  });
}

function openInventory() {
  showScreen("inventory-screen");
  renderInventory();
}

function renderInventory() {
  // Gear
  let html = `<h3>Equipped</h3>
    <div class="item">Pickaxe: ${player.equipment.pickaxe?.name || "None"}</div>
    <div class="item">Armor: ${player.equipment.armor?.name || "None"}</div>
    <div class="item">Potions: ${player.potions}</div>`;
  document.getElementById("gear-tab").innerHTML = html;

  // Relics
  const relicsHtml = player.relics.length ? player.relics.map(r => `<div class="item">${r.name}</div>`).join("") : "<div>No relics</div>";
  document.getElementById("relics-tab").innerHTML = `<h3>Relics</h3>${relicsHtml}`;

  // Shop
  let shopHtml = "<h3>Forge Shop</h3>";
  gearItems.forEach(item => {
    const owned = (item.type === "pickaxe" && player.equipment.pickaxe?.id === item.id) ||
                  (item.type === "armor" && player.equipment.armor?.id === item.id) ||
                  (item.type === "relic" && player.relics.some(r => r.id === item.id));
    shopHtml += `<div class="shop-item">
      <strong>${item.name}</strong><br>
      ${item.type === "potion" ? "Heal 100 HP" : item.type === "relic" ? "Special Effect" : `Power ${item.power || ''} | +${item.hp || 0} HP`}
      <br>Cost: ${item.cost} gold
      <button ${owned || player.gold < item.cost ? "disabled" : ""} onclick="buyItem('${item.id}')">
        ${owned ? "Owned" : "Buy"}
      </button>
    </div>`;
  });
  document.getElementById("shop-tab").innerHTML = shopHtml;
}

function buyItem(id) {
  const item = gearItems.find(i => i.id === id);
  if (player.gold < item.cost || (item.type !== "potion" && 
      ((item.type === "pickaxe" && player.equipment.pickaxe?.id === id) ||
       (item.type === "armor" && player.equipment.armor?.id === id) ||
       player.relics.some(r => r.id === id)))) return;

  player.gold -= item.cost;
  if (item.type === "pickaxe") player.equipment.pickaxe = item;
  else if (item.type === "armor") { player.equipment.armor = item; player.maxHp += item.hp; player.hp += item.hp; }
  else if (item.type === "relic") player.relics.push(item);
  else if (item.type === "potion") player.potions++;

  updateDisplay();
  save();
  renderInventory();
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "inventory-screen") renderInventory();
}

function save() {
  localStorage.setItem("minesweeper_save", JSON.stringify(player));
}

// Tab switching
document.querySelectorAll(".tab").forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(tc => tc.classList.add("hidden"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab + "-tab").classList.remove("hidden");
  };
});

// Init
updateDisplay();
