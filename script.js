window.onload = function () { alert("JS loaded – entering hub"); login(); };

/*********************************************************************
 * 0. UTILS
 *********************************************************************/
const $ = id => document.getElementById(id);
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/*********************************************************************
 * 1. PLAYER + GEAR
 *********************************************************************/
class Player {
    constructor(name) {
        this.name = name;
        this.level = 1;
        this.exp = 0;
        this.coins = 0;
        this.inventory = []; // 40 slot bag
        this.equipment = {}; // weapon / armor / ring
        this.initGear();
    }
    initGear() {
        this.inventory.push(randomItem(1, 2, "weapon"));
        this.inventory.push(randomItem(1, 2, "armor"));
    }
    gainExp(n) {
        this.exp += n;
        if (this.exp >= this.level * 100) {
            this.exp -= this.level * 100;
            this.level++;
            alert("Level Up! You are now level " + this.level);
        }
        updateHub();
    }
    getStat(stat) {
        let total = 1;
        Object.values(this.equipment).forEach(g => {
            if (g && g.stats[stat]) total *= g.stats[stat];
        });
        return total;
    }
}
class Gear {
    constructor(name, type, tier, stats) {
        this.name = name; this.type = type; this.tier = tier; this.stats = stats;
    }
}
const ITEM_DB = {
    "Wooden Clicksword": { type: "weapon", tier: 1, stats: { clickDmg: 1.2 } },
    "Iron Clicksword": { type: "weapon", tier: 2, stats: { clickDmg: 1.4 } },
    "Steel Clicksword": { type: "weapon", tier: 3, stats: { clickDmg: 1.6 } },
    "Mithril Clicksword": { type: "weapon", tier: 4, stats: { clickDmg: 1.8 } },
    "Gridreaver": { type: "weapon", tier: 5, stats: { clickDmg: 2.0, chordPower: 1.2 } },
    "Minelord Blade": { type: "weapon", tier: 6, stats: { clickDmg: 2.3 } },
    "Void Clicksword": { type: "weapon", tier: 7, stats: { clickDmg: 2.6, chordPower: 1.4 } },

    "Cloth Robe": { type: "armor", tier: 1, stats: { def: 0.95 } },
    "Leather Armor": { type: "armor", tier: 2, stats: { def: 0.9 } },
    "Chainmail": { type: "armor", tier: 3, stats: { def: 0.85 } },
    "Plate Mail": { type: "armor", tier: 4, stats: { def: 0.8 } },
    "Reinforced Mail": { type: "armor", tier: 5, stats: { def: 0.75 } },
    "Minelord Mail": { type: "armor", tier: 6, stats: { def: 0.7, hp: 1.2 } },
    "Void Armor": { type: "armor", tier: 7, stats: { def: 0.65, hp: 1.3 } },

    "Speed Ring": { type: "ring", tier: 3, stats: { speed: 1.3 } },
    "Loot Ring": { type: "ring", tier: 4, stats: { luck: 1.4 } },
    "HP Ring": { type: "ring", tier: 5, stats: { hp: 1.2 } },
    "Chord Ring": { type: "ring", tier: 6, stats: { chordPower: 1.3 } }
};
function randomItem(tierMin, tierMax, type = null) {
    const pool = Object.entries(ITEM_DB).filter(([_, it]) =>
        it.tier >= tierMin && it.tier <= tierMax && (type ? it.type === type : true)
    );
    if (!pool.length) return null;
    const [name, data] = pool[rand(0, pool.length - 1)];
    return new Gear(name, data.type, data.tier, data.stats);
}

/*********************************************************************
 * 2. GRID CORE (kept from old version)
 *********************************************************************/
class Grid {
    constructor(r, c, m) {
        this.r = r; this.c = c; this.m = m;
        this.cells = Array(r).fill().map(() => Array(c).fill(0));
        this.rev = Array(r).fill().map(() => Array(c).fill(false));
        this.flagged = Array(r).fill().map(() => Array(c).fill(false));
    }
    placeMines(exI, exJ) {
        let p = 0;
        while (p < this.m) {
            const i = rand(0, this.r - 1), j = rand(0, this.c - 1);
            if (this.cells[i][j] !== -1 && (i !== exI || j !== exJ)) { this.cells[i][j] = -1; p++; }
        }
        for (let i = 0; i < this.r; i++) {
            for (let j = 0; j < this.c; j++) {
                if (this.cells[i][j] === -1) continue;
                let cnt = 0;
                for (let di = -1; di <= 1; di++) {
                    for (let dj = -1; dj <= 1; dj++) {
                        const ni = i + di, nj = j + dj;
                        if (ni >= 0 && ni < this.r && nj >= 0 && nj < this.c && this.cells[ni][nj] === -1) cnt++;
                    }
                }
                this.cells[i][j] = cnt;
            }
        }
    }
    reveal(i, j) {
        if (this.rev[i][j] || this.flagged[i][j]) return;
        this.rev[i][j] = true;
        if (this.cells[i][j] === 0) {
            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    const ni = i + di, nj = j + dj;
                    if (ni >= 0 && ni < this.r && nj >= 0 && nj < this.c) this.reveal(ni, nj);
                }
            }
        }
    }
    chord(i, j) {
        if (!this.rev[i][j] || this.cells[i][j] <= 0) return true;
        let fc = 0;
        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                const ni = i + di, nj = j + dj;
                if (ni >= 0 && ni < this.r && nj >= 0 && nj < this.c && this.flagged[ni][nj]) fc++;
            }
        }
        if (fc !== this.cells[i][j]) return true;
        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                const ni = i + di, nj = j + dj;
                if (ni >= 0 && ni < this.r && nj >= 0 && nj < this.c && !this.rev[ni][nj] && !this.flagged[ni][nj]) {
                    this.reveal(ni, nj);
                    if (this.cells[ni][nj] === -1) return false;
                }
            }
        }
        return true;
    }
}

/*********************************************************************
 * 3. ENEMY (inside normal worlds)
 *********************************************************************/
class Enemy {
    constructor(world, cell) {
        this.world = world;
        this.cell = cell;
        this.hp = 3 + world.id * 2;
        this.dmg = 1 + Math.floor(world.id / 3);
        this.alive = true;
    }
    onReveal(grid, pl) {
        if (!this.alive) return;
        const dmg = pl.getStat("clickDmg") || 1;
        this.hp -= dmg;
        if (this.hp <= 0) {
            this.alive = false;
            const xp = 10 * this.world.id, coins = 5 * this.world.id;
            pl.gainExp(xp); pl.coins += coins;
            if (rand(1, 100) <= 25) {
                const item = randomItem(Math.max(1, this.world.id - 1), this.world.id + 1);
                if (item) pl.inventory.push(item);
            }
        } else {
            const def = pl.getStat("def") || 1;
            alert(`Enemy hits you for ${Math.ceil(this.dmg / def)} (demo HP infinite)`);
        }
    }
}

/*********************************************************************
 * 4. WORLD (normal grinding, 6 worlds)
 *********************************************************************/
const WORLD_DIFF = [
    { r: 9,  c: 9,  m: 10 },  // World 1
    { r: 12, c: 12, m: 20 },  // World 2
    { r: 14, c: 14, m: 30 },  // World 3
    { r: 16, c: 16, m: 40 },  // World 4
    { r: 18, c: 20, m: 60 },  // World 5
    { r: 20, c: 24, m: 80 }   // World 6
];
class World {
    constructor(id) {
        this.id = id;
        const d = WORLD_DIFF[id - 1];
        this.grid = new Grid(d.r, d.c, d.m);
        this.enemies = [];
        this.spawnEnemies();
    }
    spawnEnemies() {
        const count = 3 + this.id;
        let placed = 0;
        while (placed < count) {
            const i = rand(0, this.grid.r - 1), j = rand(0, this.grid.c - 1);
            if (this.grid.cells[i][j] !== -1 && !this.enemies.find(e => e.cell.i === i && e.cell.j === j)) {
                this.enemies.push(new Enemy(this, { i, j }));
                placed++;
            }
        }
    }
    tryReveal(i, j, player) {
        const enemy = this.enemies.find(e => e.cell.i === i && e.cell.j === j && e.alive);
        if (enemy) enemy.onReveal(this.grid, player);
        else this.grid.reveal(i, j);
    }
}

/*********************************************************************
 * 5. RAID BOSS (co-op)
 *********************************************************************/
let RAID_BOSS = null;
class RaidBoss {
    constructor(partySize) {
        this.name = "Grid Guardian";
        this.maxHp = 1000 * partySize;
        this.hp = this.maxHp;
        this.gridW = 20; this.gridH = 20; this.mines = 99;
        this.grid = new Grid(this.gridH, this.gridW, this.mines);
        this.hands = [];
        for (let k = 0; k < 3; k++) this.hands.push({ i: rand(0, this.gridH - 1), j: rand(0, this.gridW - 1) });
    }
    moveHands() {
        this.hands.forEach(h => {
            h.i = Math.max(0, Math.min(this.gridH - 1, h.i + rand(-2, 2)));
            h.j = Math.max(0, Math.min(this.gridW - 1, h.j + rand(-2, 2)));
        });
    }
    applyHandEffect() {
        this.hands.forEach(h => {
            if (this.grid.rev[h.i][h.j] && this.grid.cells[h.i][h.j] !== -1) {
                this.grid.cells[h.i][h.j] = -1;
                this.grid.rev[h.i][h.j] = false;
            }
        });
    }
    takeDamage(amt) {
        this.hp -= amt;
        if (this.hp < 0) this.hp = 0;
        const fill = $("boss-hp-fill");
        if (fill) fill.style.width = (this.hp / this.maxHp * 100) + "%";
    }
}

/*********************************************************************
 * 6. RAID QUEUE
 *********************************************************************/
let QUEUE = [];
function openRaidQueue() {
    hideAll(); $("raid-lobby").style.display = "block";
    renderQueue();
}
function joinQueue() {
    if (!QUEUE.find(p => p.name === PLAYER.name)) QUEUE.push(PLAYER);
    renderQueue();
    if (QUEUE.length >= 2) startRaid();
}
function leaveQueue() {
    QUEUE = QUEUE.filter(p => p.name !== PLAYER.name);
    renderQueue();
}
function renderQueue() {
    $("queue-list").innerHTML = QUEUE.map(p => `<div>${p.name} (Lv ${p.level})</div>`).join("");
}
function startRaid() {
    RAID_BOSS = new RaidBoss(QUEUE.length);
    hideAll(); $("raid-fight").style.display = "block";
    renderRaidGrid();
    raidLoop();
}
function raidLoop() {
    if (RAID_BOSS.hp <= 0) {
        alert("Boss defeated!");
        QUEUE.forEach(p => {
            p.gainExp(500);
            const loot = randomItem(6, 7);
            if (loot) p.inventory.push(loot);
        });
        return resetToHub();
    }
    setTimeout(() => {
        if (RAID_BOSS.hp <= 0) return;
        RAID_BOSS.moveHands();
        RAID_BOSS.applyHandEffect();
        renderRaidGrid();
        raidLoop();
    }, 3000);
}

/*********************************************************************
 * 7. RAID GRID RENDER
 *********************************************************************/
function renderRaidGrid() {
    const cont = $("raid-grid-container");
    cont.innerHTML = "";
    cont.className = "grid";
    cont.style.gridTemplateColumns = `repeat(${RAID_BOSS.gridW}, 1fr)`;
    const g = RAID_BOSS.grid;
    for (let i = 0; i < RAID_BOSS.gridH; i++) {
        for (let j = 0; j < RAID_BOSS.gridW; j++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            if (RAID_BOSS.hands.find(h => h.i === i && h.j === j)) cell.classList.add("boss-hand");
            if (g.rev[i][j]) {
                cell.classList.add("revealed");
                if (g.cells[i][j] === -1) cell.classList.add("mine"), cell.textContent = "💣";
                else if (g.cells[i][j] > 0) cell.textContent = g.cells[i][j];
            } else if (g.flagged[i][j]) {
                cell.classList.add("flagged"); cell.textContent = "🚩";
            }
            cell.onmousedown = e => {
                if (e.button === 0) {
                    const dmg = (PLAYER.getStat("clickDmg") || 1) * 10;
                    RAID_BOSS.takeDamage(dmg);
                    g.reveal(i, j);
                    renderRaidGrid();
                } else if (e.button === 2) {
                    g.flagged[i][j] = !g.flagged[i][j];
                    renderRaidGrid();
                }
            };
            cell.oncontextmenu = e => e.preventDefault();
            cont.appendChild(cell);
        }
    }
}

/*********************************************************************
 * 8. INVENTORY (RotMG bag + 3 equip)
 *********************************************************************/
function openInventory() {
    hideAll(); $("inventory").style.display = "block";
    renderInv();
}
function closeInventory() {
    $("inventory").style.display = "none"; goToHub();
}
function renderInv() {
    const cont = $("inv-slots");
    cont.innerHTML = "";
    for (let i = 0; i < 40; i++) {
        const slot = document.createElement("div");
        slot.className = "inv-slot";
        const it = PLAYER.inventory[i];
        if (it) {
            slot.textContent = it.name.slice(0, 4);
            slot.style.borderColor = (it.tier >= 6) ? "#ff00ff" : "#888";
        }
        slot.onclick = () => equipFromInv(i);
        cont.appendChild(slot);
    }
    ["weapon", "armor", "ring"].forEach(type => {
        const slot = document.querySelector(`.equip-slot[data-type="${type}"]`);
        const eq = PLAYER.equipment[type];
        slot.textContent = eq ? eq.name.slice(0, 8) : type.charAt(0).toUpperCase() + type.slice(1);
    });
}
function equipFromInv(idx) {
    const it = PLAYER.inventory[idx];
    if (!it) return;
    const type = it.type;
    if (PLAYER.equipment[type]) PLAYER.inventory.push(PLAYER.equipment[type]);
    PLAYER.equipment[type] = it;
    PLAYER.inventory.splice(idx, 1);
    renderInv();
}

/*********************************************************************
 * 9. WORLD RENDER (enemies inside)
 *********************************************************************/
let CURRENT_WORLD = null;
function enterWorld(id) {
    hideAll(); $("world").style.display = "block";
    $("worldName").textContent = PLAYER.name;
    $("worldId").textContent = id;
    CURRENT_WORLD = new World(id);
    renderWorldGrid();
    $("enemyCount").textContent = CURRENT_WORLD.enemies.filter(e => e.alive).length;
}
function exitWorld() {
    CURRENT_WORLD = null; goToHub();
}
function renderWorldGrid() {
    const cont = $("grid-container");
    cont.innerHTML = "";
    cont.className = "grid";
    cont.style.gridTemplateColumns = `repeat(${CURRENT_WORLD.grid.c}, 1fr)`;
    const g = CURRENT_WORLD.grid;
    for (let i = 0; i < g.r; i++) {
        for (let j = 0; j < g.c; j++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            const enemy = CURRENT_WORLD.enemies.find(e => e.cell.i === i && e.cell.j === j && e.alive);
            if (enemy) cell.classList.add("enemy");
            if (g.rev[i][j]) {
                cell.classList.add("revealed");
                if (g.cells[i][j] === -1) cell.classList.add("mine"), cell.textContent = "💣";
                else if (g.cells[i][j] > 0) cell.textContent = g.cells[i][j];
            } else if (g.flagged[i][j]) {
                cell.classList.add("flagged"); cell.textContent = "🚩";
            }
            cell.oncontextmenu = e => {
                e.preventDefault();
                if (!GAME_OVER) {
                    g.flagged[i][j] = !g.flagged[i][j];
                    renderWorldGrid();
                }
            };
            cell.onmousedown = e => {
                if (e.button === 0 && !GAME_OVER) {
                    if (g.rev[i][j] && g.cells[i][j] > 0) {
                        if (!g.chord(i, j)) endGame(false);
                    } else {
                        CURRENT_WORLD.tryReveal(i, j, PLAYER);
                        $("enemyCount").textContent = CURRENT_WORLD.enemies.filter(en => en.alive).length;
                        renderWorldGrid();
                        checkWinWorld();
                    }
                }
            };
            cont.appendChild(cell);
        }
    }
}
function checkWinWorld() {
    const g = CURRENT_WORLD.grid;
    let rev = 0;
    for (let i = 0; i < g.r; i++) for (let j = 0; j < g.c; j++) if (g.rev[i][j]) rev++;
    if (rev === g.r * g.c - g.m) {
        alert("World cleared!");
        PLAYER.gainExp(100 * CURRENT_WORLD.id);
        exitWorld();
    }
}
function endGame(won) {
    GAME_OVER = true;
    alert(won ? "You Win!" : "Game Over");
    if (won) {
        const exp = Math.floor(CURRENT_WORLD.grid.r * CURRENT_WORLD.grid.c / CURRENT_WORLD.grid.m * 10);
        const coins = Math.floor(CURRENT_WORLD.grid.m * PLAYER.getStat("luck") * 5);
        PLAYER.gainExp(exp); PLAYER.coins += coins;
    }
    GAME_OVER = false;
    exitWorld();
}

/*********************************************************************
 * 10. NAVIGATION
 *********************************************************************/
function hideAll() {
    ["login", "hub", "world", "raid-lobby", "raid-fight", "inventory"].forEach(id => $(id).style.display = "none");
}
function goToHub() {
    hideAll(); $("hub").style.display = "block";
    updateHub();
    buildWorldButtons();
}
function updateHub() {
    $("hubName").textContent = PLAYER.name;
    $("hubLevel").textContent = PLAYER.level;
    $("hubCoins").textContent = PLAYER.coins;
}
function buildWorldButtons() {
    const cont = $("world-buttons");
    cont.innerHTML = "";
    for (let i = 1; i <= 6; i++) {
        const b = document.createElement("button");
        b.textContent = `World ${i}`;
        b.onclick = () => enterWorld(i);
        cont.appendChild(b);
    }
}
function resetToHub() {
    RAID_BOSS = null; QUEUE = []; goToHub();
}

/*********************************************************************
 * 11. LOGIN
 *********************************************************************/
function login() {
    const name = $("username").value.trim();
    if (!name) return;
    PLAYER = new Player(name);
    $("login").style.display = "none";
    goToHub();
}

/* on load */
document.addEventListener("DOMContentLoaded", () => {
    document.oncontextmenu = () => false;
});
