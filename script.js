// Minesweeper Chronicles: Eternal Depths
const zones = [
  { name: "Beginner Caves", rows: 9, cols: 9, mines: 10, reqGS: 0, boss: false },
  { name: "Forgotten Mines", rows: 16, cols: 16, mines: 40, reqGS: 50, boss: false },
  { name: "Abyssal Vaults", rows: 16, cols: 30, mines: 99, reqGS: 150, boss: false },
  { name: "Nether Core", rows: 20, cols: 20, mines: 90, reqGS: 300, boss: true, bossName: "Mine Overlord" },
  { name: "Eternal Void", rows: 25, cols: 25, mines: 150, reqGS: 600, boss: true, bossName: "Void Devourer" }
];

let player = {
  name: "Hero",
  level: 1,
  xp: 0,
  xpNeeded: 200,
  gold: 0,
  hp: 100,
  maxHp: 100,
  gearScore: 10,
  bossKills: 0,
  equipment: { pickaxe: null, armor: null, ring: null },
  relics: [],
  party: ["Self"]
};

const gearDB = [
  { name: "Rusty Pickaxe", gs: 10, power: 1, cost: 0 },
  { name: "Iron Pickaxe", gs: 40, power: 2, cost: 200 },
  { name: "Mithril Pickaxe", gs: 100, power: 3, cost: 800 },
  { name: "Dragonbone Pickaxe", gs: 250, power: 5, cost: 3000 },
  { name: "Void Reaver", gs: 500, power: 8, cost: 10000 },

  { name: "Leather Vest", gs: 30, hp: 80, cost: 300 },
  { name: "Knight's Plate", gs: 120, hp: 200, cost: 1200 },
  { name: "Dragon Scale", gs: 300, hp: 500, cost: 5000 },

  { name: "Ring of Insight", gs: 80, effect: "reveal3x3", cost: 1500 },
  { name: "Ring of Immortality", gs: 400, effect: "revive", cost: 8000 }
];

let currentZone = null;
let board = [];
let gameActive = false;

// Load save
if (localStorage.getItem("minesweeperChronicles")) {
  player = JSON.parse(localStorage.getItem("minesweeperChronicles"));
}
updatePlayerDisplay();

// === Event Listeners ===
document.querySelectorAll(".dungeon").forEach(d => {
  d.addEventListener("click", () => enterDungeon(+d.dataset.zone));
});
document.getElementById("back-to-map").addEventListener("click", () => showScreen("world-map"));
document.getElementById("inventory-btn").addEventListener("click", () => showScreen("inventory-screen"));
document.getElementById("leaderboard-btn").addEventListener("click", showLeaderboard);
document.querySelectorAll(".close-btn").forEach(b => b.addEventListener("click", () => showScreen("world-map")));

function enterDungeon(zoneId) {
  const zone = zones[zoneId];
  if (player.gearScore < zone.reqGS) {
    alert(`⚠️ Gear Score ${player.gearScore} too low! Need ${zone.reqGS}+`);
    return;
  }
  currentZone = zone;
  document.getElementById("zone-name").textContent = zone.name;
  showScreen("game-screen");
  startMinesweeperGame();
}

function startMinesweeperGame() {
  const mf = document.getElementById("minefield");
  mf.innerHTML = "";
  mf.style.gridTemplateColumns = `repeat(${currentZone.cols}, 1fr)`;
  board = Array(currentZone.rows).fill().map(() => Array(currentZone.cols).fill(0));
  gameActive = true;

  // Place mines
  let minesLeft = currentZone.mines;
  while (minesLeft > 0) {
    const r = Math.floor(Math.random() * currentZone.rows);
    const c = Math.floor(Math.random() * currentZone.cols);
    if (board[r][c] !== -1) {
      board[r][c] = -1;
      minesLeft--;
    }
  }

  // Calculate numbers
  for (let r = 0; r < currentZone.rows; r++) {
    for (let c = 0; c < currentZone.cols; c++) {
      if (board[r][c] === -1) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (board[r+dr]?.[c+dc] === -1) count++;
        }
      }
      board[r][c] = count;
    }
  }

  // Render cells
  for (let r = 0; r < currentZone.rows; r++) {
    for (let c = 0; c < currentZone.cols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r; cell.dataset.c = c;
      cell.addEventListener("click", () => reveal(r, c));
      cell.addEventListener("contextmenu", e => { e.preventDefault(); flag(r, c); });
      mf.appendChild(cell);
    }
  }

  if (currentZone.boss) startBossFight();
}

function reveal(r, c) {
  if (!gameActive || board[r][c] === "R" || board[r][c] === "F") return;
  const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  cell.classList.add("revealed");

  if (board[r][c] === -1) {
    cell.classList.add("mine");
    cell.textContent = "💣";
    takeDamage(40 + Math.random() * 60);
    return;
  }

  cell.textContent = board[r][c] || "";
  if (board[r][c] === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (board[r+dr]?.[c+dc] !== undefined && board[r+dr][c+dc] !== "R") {
          reveal(r+dr, c+dc);
        }
      }
    }
  }
}

function takeDamage(dmg) {
  player.hp -= dmg;
  updateHP();
  if (player.hp <= 0) {
    setTimeout(() => {
      alert("☠️ You have fallen in battle!");
      player.hp = player.maxHp;
      updateHP();
      showScreen("world-map");
    }, 1000);
  }
}

function startBossFight() {
  const hud = document.getElementById("boss-hud");
  hud.classList.remove("hidden");
  document.getElementById("boss-name").textContent = currentZone.bossName;
  let bossHP = 1000 + player.level * 500;
  document.getElementById("boss-hp-fill").style.width = "100%";

  const fight = setInterval(() => {
    const playerDmg = 15 + (player.equipment.pickaxe?.power || 1) * 20;
    bossHP -= playerDmg;
    document.getElementById("boss-hp-fill").style.width = (bossHP > 0 ? bossHP / (1000 + player.level * 500) * 100 : 0) + "%";

    if (bossHP <= 0) {
      clearInterval(fight);
      hud.classList.add("hidden");
      player.bossKills++;
      player.gold += 1000 + player.level * 500;
      gainXP(500 + player.level * 200);
      alert(`VICTORY! ${currentZone.bossName} defeated!`);
      saveGame();
      showScreen("world-map");
    } else {
      takeDamage(25 + Math.random() * 30);
    }
  }, 1000);
}

function gainXP(amount) {
  player.xp += amount;
  while (player.xp >= player.xpNeeded) {
    player.xp -= player.xpNeeded;
    player.level++;
    player.xpNeeded = Math.floor(player.xpNeeded * 1.8);
    player.maxHp += 50;
    player.hp = player.maxHp;
  }
  updatePlayerDisplay();
  saveGame();
}

function updatePlayerDisplay() {
  document.getElementById("level").textContent = player.level;
  document.getElementById("gold").textContent = player.gold;
  document.getElementById("gear-score").textContent = player.gearScore;
  document.getElementById("boss-kills").textContent = player.bossKills;
  document.getElementById("hp").textContent = Math.floor(player.hp);
  document.getElementById("max-hp").textContent = player.maxHp;
  saveGame();
}

function saveGame() {
  localStorage.setItem("minesweeperChronicles", JSON.stringify(player));
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// Initialize
updatePlayerDisplay();
document.querySelectorAll(".dungeon").forEach(d => {
  const zone = zones[d.dataset.zone];
  if (player.gearScore < zone.reqGS) d.classList.add("locked");
});
