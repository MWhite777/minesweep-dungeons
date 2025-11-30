const $ = id => document.getElementById(id);

let PLAYER, GRID, ROWS = 16, COLS = 16, MINES = 40;
let FIRST_CLICK = true;
let GAME_OVER   = false;

const DIFF = {
    beginner:    { r: 9,  c: 9,  m: 10 },
    intermediate:{ r: 16, c: 16, m: 40 },
    expert:      { r: 16, c: 30, m: 99 }
};

/* ---------- PLAYER ---------- */
class Player {
    constructor(name) {
        this.name = name;
        this.level = 1;
        this.exp = 0;
        this.coins = 0;
        this.inventory = [];
        this.equipment = {};
        this.initGear();
    }
    initGear() {
        this.inventory.push(new Gear("Mouse", "common", { speed: 1.1 }));
        this.inventory.push(new Gear("Keyboard", "common", { flagPower: 1.1 }));
    }
    gainExp(n) {
        this.exp += n;
        if (this.exp >= this.level * 100) {
            this.exp -= this.level * 100;
            this.level++;
            alert("Level Up! You are now level " + this.level);
        }
        $("level").textContent = this.level;
        $("exp").textContent   = this.exp;
    }
    getStat(base) {
        let total = 1;
        Object.values(this.equipment).forEach(g => {
            if (g && g.stats[base]) total *= g.stats[base];
        });
        return total;
    }
}
class Gear {
    constructor(name, rarity, stats) {
        this.name = name; this.rarity = rarity; this.stats = stats;
    }
}

/* ---------- GRID ---------- */
class Grid {
    constructor(r, c, m) {
        this.r = r; this.c = c; this.m = m;
        this.cells   = Array(r).fill().map(() => Array(c).fill(0));
        this.rev     = Array(r).fill().map(() => Array(c).fill(false));
        this.flagged = Array(r).fill().map(() => Array(c).fill(false));
    }
    placeMines(exI, exJ) {
        let p = 0;
        while (p < this.m) {
            const i = rand(0, this.r - 1), j = rand(0, this.c - 1);
            if (this.cells[i][j] !== -1 && (i !== exI || j !== exJ)) {
                this.cells[i][j] = -1; p++;
            }
        }
        /* numbers */
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

/* ---------- DOM ---------- */
function renderGrid() {
    const cont = $("grid-container");
    cont.innerHTML = "";
    cont.style.gridTemplateColumns = `repeat(${GRID.c}, 1fr)`;
    for (let i = 0; i < GRID.r; i++) {
        for (let j = 0; j < GRID.c; j++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            if (GRID.rev[i][j]) {
                cell.classList.add("revealed");
                if (GRID.cells[i][j] === -1) cell.classList.add("mine"), cell.textContent = "💣";
                else if (GRID.cells[i][j] > 0) cell.textContent = GRID.cells[i][j];
            } else if (GRID.flagged[i][j]) {
                cell.classList.add("flagged"); cell.textContent = "🚩";
            }
            cell.oncontextmenu = e => {
                e.preventDefault();
                if (!GAME_OVER) toggleFlag(i, j);
            };
            cell.onmousedown = e => {
                if (GAME_OVER) return;
                if (e.button === 0) {
                    if (GRID.rev[i][j] && GRID.cells[i][j] > 0) {
                        if (!GRID.chord(i, j)) endGame(false);
                    } else clickCell(i, j);
                }
            };
            cont.appendChild(cell);
        }
    }
}
function clickCell(i, j) {
    if (GRID.rev[i][j] || GRID.flagged[i][j]) return;
    if (FIRST_CLICK) {
        GRID.placeMines(i, j); FIRST_CLICK = false;
    }
    GRID.reveal(i, j);
    if (GRID.cells[i][j] === -1) return endGame(false);
    checkWin();
    renderGrid();
}
function toggleFlag(i, j) {
    if (GRID.rev[i][j]) return;
    GRID.flagged[i][j] = !GRID.flagged[i][j];
    renderGrid();
}
function endGame(won) {
    GAME_OVER = true;
    alert(won ? "You Win!" : "Game Over");
    if (won) {
        const exp = Math.floor(ROWS * COLS / MINES * 10);
        const coins = Math.floor(MINES * PLAYER.getStat("luck") * 5);
        PLAYER.gainExp(exp); PLAYER.coins += coins; $("coins").textContent = PLAYER.coins;
        lootDrop();
    }
    resetGame();
}
function checkWin() {
    let rev = 0;
    for (let i = 0; i < GRID.r; i++) for (let j = 0; j < GRID.c; j++) if (GRID.rev[i][j]) rev++;
    if (rev === GRID.r * GRID.c - GRID.m) endGame(true);
}
function lootDrop() {
    if (Math.random() < 0.3) {
        const g = new Gear("Rare Mouse", "rare", { speed: 1.2 });
        PLAYER.inventory.push(g);
        alert("Loot! " + g.name);
    }
}
function resetGame() {
    GRID = new Grid(ROWS, COLS, MINES); FIRST_CLICK = true; GAME_OVER = false;
    $("mineCount").textContent = MINES;
    renderGrid();
}
function setDiff(d) {
    const o = DIFF[d]; ROWS = o.r; COLS = o.c; MINES = o.m;
    resetGame();
}
function login() {
    const name = $("username").value.trim(); if (!name) return;
    PLAYER = new Player(name);
    $("playerName").textContent = name;
    $("login").style.display = "none";
    $("game").style.display = "block";
    resetGame();
}
function toggleInv() {
    const inv = $("inventory");
    inv.style.display = inv.style.display === "none" ? "block" : "none";
    renderInv();
}
function renderInv() {
    const slots = $("invSlots");
    slots.innerHTML = "";
    PLAYER.inventory.forEach((it, idx) => {
        const d = document.createElement("div");
        d.className = "invSlot";
        d.textContent = it ? it.name.slice(0, 4) : "";
        d.onclick = () => { if (it) PLAYER.equipment[it.name] = it; };
        slots.appendChild(d);
    });
}
document.addEventListener("DOMContentLoaded", () => {
    document.oncontextmenu = () => false;
});
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
