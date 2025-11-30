/*********************************************************************
 *  1.  UTILS
 *********************************************************************/
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/*********************************************************************
 *  2.  ROTMG-STYLE ITEMS / STATS
 *********************************************************************/
const ITEM_DB = {
    /* weapons */
    "Clicksword T1": { type: "weapon", tier: 1, stats: { clickDmg: 1.2 } },
    "Clicksword T6": { type: "weapon", tier: 6, stats: { clickDmg: 2.0 } },
    "Gridreaver":    { type: "weapon", tier: 7, stats: { clickDmg: 2.5, chordPower: 1.3 } },
    /* armor */
    "Paper Robe":    { type: "armor",  tier: 1, stats: { def: 0.95 } },
    "Reinforced T6": { type: "armor",  tier: 6, stats: { def: 0.75 } },
    "Minelord Mail": { type: "armor",  tier: 7, stats: { def: 0.6, hp: 1.2 } },
    /* rings */
    "Speed Ring":    { type: "ring",   tier: 3, stats: { speed: 1.4 } },
    "Loot Ring":     { type: "ring",   tier: 4, stats: { luck: 1.5 } },
    "HP Ring":       { type: "ring",   tier: 5, stats: { hp: 1.3 } }
};
function randomItem(tierMin, tierMax, type = null) {
    const pool = Object.entries(ITEM_DB).filter(([_, it]) =>
        it.tier >= tierMin && it.tier <= tierMax && (type ? it.type === type : true)
    );
    if (!pool.length) return null;
    const [name, data] = pool[rand(0, pool.length - 1)];
    return { name, ...data };
}

/*********************************************************************
 *  3.  ENEMY SYSTEM (spawns inside normal world)
 *********************************************************************/
class Enemy {
    constructor(world, cell) {
        this.world = world;
        this.cell = cell;          // {i,j}
        this.hp = 3 + world.id * 2;
        this.maxHp = this.hp;
        this.dmg = 1 + Math.floor(world.id / 3);
        this.alive = true;
    }
    onReveal(grid, pl) {
        if (!this.alive) return;
        /* damage player if they step on it */
        const clickDmg = pl.getStat("clickDmg") || 1;
        this.hp -= clickDmg;
        if (this.hp <= 0) {
            this.alive = false;
            grid.cells[this.cell.i][this.cell.j] = -2; // mark as dead
            const xp = 10 * this.world.id;
            const coins = 5 * this.world.id;
            pl.gainExp(xp); pl.coins += coins;
            if (rand(1, 100) <= 20) {
                const item = randomItem(Math.max(1, this.world.id - 1), this.world.id + 1);
                if (item) pl.inventory.push(item);
            }
        } else {
            /* enemy hits back */
            const def = pl.getStat("def") || 1;
            const realDmg = Math.ceil(this.dmg / def);
            alert(`Enemy hits you for ${realDmg} (you have infinite HP for demo)`);
        }
    }
}

/*********************************************************************
 *  4.  WORLD  (normal minesweeper + enemies)
 *********************************************************************/
class World {
    constructor(id) {
        this.id = id;
        this.size = DIFF.intermediate;
        this.grid = new Grid(this.size.r, this.size.c, this.size.m);
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
        const enemy = this.enemies.find(e => e.cell.i === i && e.cell.j === j);
        if (enemy && enemy.alive) enemy.onReveal(this.grid, player);
        else this.grid.reveal(i, j);
    }
}

/*********************************************************************
 *  5.  RAID BOSS  (co-op grid)
 *********************************************************************/
class RaidBoss {
    constructor(partySize) {
        this.name = "Grid Guardian";
        this.maxHp = 1000 * partySize;
        this.hp = this.maxHp;
        this.gridW = 20;
        this.gridH = 20;
        this.mines = 99;
        this.grid = new Grid(this.gridH, this.gridW, this.mines);
        this.hands = []; // boss hands that distort cells
        this.initHands();
    }
    initHands() {
        // 3 "hands" that periodically slap the grid
        for (let k = 0; k < 3; k++) this.hands.push({ i: rand(0, this.gridH - 1), j: rand(0, this.gridW - 1) });
    }
    moveHands() {
        this.hands.forEach(h => {
            h.i = Math.max(0, Math.min(this.gridH - 1, h.i + rand(-2, 2)));
            h.j = Math.max(0, Math.min(this.gridW - 1, h.j + rand(-2, 2)));
        });
    }
    applyHandEffect() {
        // any revealed cell under a hand becomes a mine again (chaos!)
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
 *  6.  RAID QUEUE  (simple matchmaker)
 *********************************************************************/
let QUEUE = [];
let RAID_BOSS = null;
function openRaidQueue() {
    hideAll();
    $("raid-lobby").style.display = "block";
    renderQueue();
}
function joinQueue() {
    if (!QUEUE.find(p => p.name === PLAYER.name)) QUEUE.push(PLAYER);
    renderQueue();
    if (QUEUE.length >= 2) startRaid(); // demo: 2 players
}
function leaveQueue() {
    QUEUE = QUEUE.filter(p => p.name !== PLAYER.name);
    renderQueue();
}
function renderQueue() {
    const list = $("queue-list");
    list.innerHTML = QUEUE.map(p => `<div>${p.name}  (Lv ${p.level})</div>`).join("");
}
function startRaid() {
    // create boss
    RAID_BOSS = new RaidBoss(QUEUE.length);
    // hide lobby, show fight
    hideAll();
    $("raid-fight").style.display = "block";
    renderRaidGrid();
    // simple turn loop
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
    // boss acts every 3s
    setTimeout(() => {
        if (RAID_BOSS.hp <= 0) return;
        RAID_BOSS.moveHands();
        RAID_BOSS.applyHandEffect();
        renderRaidGrid();
        raidLoop();
    }, 3000);
}

/*********************************************************************
 *  7.  RAID GRID RENDER  (uses same cell class)
 *********************************************************************/
function renderRaidGrid() {
    const cont = $("raid-grid-container");
    cont.innerHTML = "";
    cont.className = "grid";
    cont.style.gridTemplateColumns = `repeat(${RAID_BOSS.gridW}, 1fr)`;
    for (let i = 0; i < RAID_BOSS.gridH; i++) {
        for (let j = 0; j < RAID_BOSS.gridW; j++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            // boss hand overlay
            if (RAID_BOSS.hands.find(h => h.i === i && h.j === j)) cell.classList.add("boss-hand");
            const g = RAID_BOSS.grid;
            if (g.rev[i][j]) {
                cell.classList.add("revealed");
                if (g.cells[i][j] === -1) cell.classList.add("mine"), cell.textContent = "💣";
                else if (g.cells[i][j] > 0) cell.textContent = g.cells[i][j];
            } else if (g.flagged[i][j]) {
                cell.classList.add("flagged"); cell.textContent = "🚩";
            }
            // click = damage boss + reveal
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
 *  8.  ROTMG INVENTORY (8×5 + 3 equip)
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
    // equipped
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
    if (PLAYER.equipment[type]) PLAYER.inventory.push(PLAYER.equipment[type]); // swap
    PLAYER.equipment[type] = it;
    PLAYER.inventory.splice(idx, 1);
    renderInv();
}

/*********************************************************************
 *  9.  WORLD LOOP (normal grinding)
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

/*********************************************************************
 * 10.  NAVIGATION
 *********************************************************************/
function hideAll() {
    ["login", "hub", "world", "raid-lobby", "raid-fight", "inventory"].forEach(id => $(id).style.display = "none");
}
function goToHub() {
    hideAll(); $("hub").style.display = "block";
    $("hubName").textContent = PLAYER.name;
    $("hubLevel").textContent = PLAYER.level;
    $("hubCoins").textContent = PLAYER.coins;
    buildWorldButtons();
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
 * 11.  LOGIN OVERRIDE
 *********************************************************************/
function login() {
    const name = $("username").value.trim();
    if (!name) return;
    PLAYER = new Player(name);
    $("login").style.display = "none";
    goToHub();
}
