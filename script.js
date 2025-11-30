/* ===========================
   UTILS & GLOBALS
=========================== */
const $ = id => document.getElementById(id);
const rand = (min,max) => Math.floor(Math.random()*(max-min+1))+min;
let PLAYER, GRID, ROWS=16, COLS=16, MINES=40;
let SOCKET = { emit:(...a)=>mockSocket(...a), on:(...a)=>mockSocket(...a) };

/* mock socket for solo demo */
function mockSocket(evt,data){
    if(evt==='move'&&data) broadcastMove(data);
    if(evt==='reveal'&&data) broadcastReveal(data);
}

/* ===========================
   PLAYER & PROGRESSION
=========================== */
class Player {
    constructor(name){
        this.name = name;
        this.level = 1;
        this.exp = 0;
        this.minesCleared = 0;
        this.coins = 0;
        this.inventory = new Inventory(20);
        this.equipment = {};
        this.initGear();
    }
    initGear(){
        this.inventory.add(new Gear("Mouse","common",{speed:1.1}));
        this.inventory.add(new Gear("Keyboard","common",{flagPower:1.1}));
    }
    gainExp(n){
        this.exp += n;
        if(this.exp >= this.level*100){
            this.exp -= this.level*100;
            this.level++;
            alert(`Level Up! You are now level ${this.level}`);
        }
        $("level").textContent = this.level;
        $("exp").textContent = this.exp;
    }
    getStat(base){
        let total = 1;
        Object.values(this.equipment).forEach(g=>{
            if(g&&g.stats[base]) total *= g.stats[base];
        });
        return total;
    }
}

class Gear {
    constructor(name,rarity,stats){
        this.name = name;
        this.rarity = rarity;
        this.stats = stats;
    }
}

class Inventory {
    constructor(size){
        this.slots = Array(size).fill(null);
    }
    add(item){
        const idx = this.slots.findIndex(s=>!s);
        if(idx===-1) return false;
        this.slots[idx] = item;
        return true;
    }
    remove(idx){
        const out = this.slots[idx];
        this.slots[idx] = null;
        return out;
    }
}

/* ===========================
   GRID & GAME
=========================== */
class Grid {
    constructor(r,c,m){
        this.r = r;
        this.c = c;
        this.m = m;
        this.cells = Array(r).fill().map(()=>Array(c).fill(0));
        this.revealed = Array(r).fill().map(()=>Array(c).fill(false));
        this.flagged = Array(r).fill().map(()=>Array(c).fill(false));
        this.placeMines();
        this.calcNumbers();
    }
    placeMines(){
        let placed = 0;
        while(placed<this.m){
            const x=rand(0,this.r-1), y=rand(0,this.c-1);
            if(this.cells[x][y]!==-1){
                this.cells[x][y]=-1;
                placed++;
            }
        }
    }
    calcNumbers(){
        for(let i=0;i<this.r;i++){
            for(let j=0;j<this.c;j++){
                if(this.cells[i][j]===-1) continue;
                let count=0;
                for(let di=-1;di<=1;di++){
                    for(let dj=-1;dj<=1;dj++){
                        const ni=i+di, nj=j+dj;
                        if(ni>=0&&ni<this.r&&nj>=0&&nj<this.c&&this.cells[ni][nj]===-1) count++;
                    }
                }
                this.cells[i][j]=count;
            }
        }
    }
    reveal(i,j){
        if(this.revealed[i][j]||this.flagged[i][j]) return;
        this.revealed[i][j]=true;
        if(this.cells[i][j]===0){
            for(let di=-1;di<=1;di++){
                for(let dj=-1;dj<=1;dj++){
                    const ni=i+di, nj=j+dj;
                    if(ni>=0&&ni<this.r&&nj>=0&&nj<this.c) this.reveal(ni,nj);
                }
            }
        }
    }
    chord(i,j){
        if(!this.revealed[i][j]||this.cells[i][j]<=0) return;
        let fc=0;
        for(let di=-1;di<=1;di++){
            for(let dj=-1;dj<=1;dj++){
                const ni=i+di, nj=j+dj;
                if(ni>=0&&ni<this.r&&nj>=0&&nj<this.c&&this.flagged[ni][nj]) fc++;
            }
        }
        if(fc===this.cells[i][j]){
            for(let di=-1;di<=1;di++){
                for(let dj=-1;dj<=1;dj++){
                    const ni=i+di, nj=j+dj;
                    if(ni>=0&&ni<this.r&&nj>=0&&nj<this.c&&!this.revealed[ni][nj]&&!this.flagged[ni][nj]){
                        this.reveal(ni,nj);
                        if(this.cells[ni][nj]===-1) return false;
                    }
                }
            }
        }
        return true;
    }
}

/* ===========================
   DOM & RENDER
=========================== */
function renderGrid(){
    const cont = $("grid-container");
    cont.innerHTML="";
    cont.style.gridTemplateColumns=`repeat(${GRID.c},1fr)`;
    for(let i=0;i<GRID.r;i++){
        for(let j=0;j<GRID.c;j++){
            const cell = document.createElement("div");
            cell.className="cell";
            if(GRID.revealed[i][j]){
                cell.classList.add("revealed");
                if(GRID.cells[i][j]===-1) cell.classList.add("mine"), cell.textContent="💣";
                else if(GRID.cells[i][j]>0) cell.textContent=GRID.cells[i][j];
            }else if(GRID.flagged[i][j]){
                cell.classList.add("flagged"); cell.textContent="🚩";
            }
            cell.oncontextmenu=e=>{e.preventDefault(); toggleFlag(i,j);};
            cell.onmousedown=e=>{
                if(e.button===0){
                    if(GRID.revealed[i][j]&&GRID.cells[i][j]>0) GRID.chord(i,j)?renderGrid():endGame(false);
                    else clickCell(i,j);
                }
            };
            cont.appendChild(cell);
        }
    }
}

/* ===========================
   ACTIONS
=========================== */
function clickCell(i,j){
    if(GRID.revealed[i][j]||GRID.flagged[i][j]) return;
    SOCKET.emit("reveal",{i,j});
    GRID.reveal(i,j);
    if(GRID.cells[i][j]===-1) return endGame(false);
    checkWin();
    renderGrid();
}
function toggleFlag(i,j){
    if(GRID.revealed[i][j]) return;
    GRID.flagged[i][j]=!GRID.flagged[i][j];
    renderGrid();
}
function endGame(won){
    alert(won?"You Win!":"Game Over");
    if(won){
        const exp = Math.floor(ROWS*COLS/MINES*10);
        const coins = Math.floor(MINES*PLAYER.getStat("luck")*5);
        PLAYER.gainExp(exp);
        PLAYER.coins+=coins;
        $("coins").textContent=PLAYER.coins;
        lootDrop();
    }
    resetGame();
}
function checkWin(){
    let rev=0;
    for(let i=0;i<GRID.r;i++){
        for(let j=0;j<GRID.c;j++) if(GRID.revealed[i][j]) rev++;
    }
    if(rev===GRID.r*GRID.c-GRID.m) endGame(true);
}
function lootDrop(){
    if(Math.random()<0.3){
        const gear=new Gear("Rare Mouse","rare",{speed:1.2});
        PLAYER.inventory.add(gear);
        alert("Loot! "+gear.name);
    }
}

/* ===========================
   UI
=========================== */
function login(){
    const name=$("username").value.trim();
    if(!name) return;
    PLAYER=new Player(name);
    $("playerName").textContent=name;
    $("login").style.display="none";
    $("game").style.display="block";
    resetGame();
}
function resetGame(){
    GRID=new Grid(ROWS,COLS,MINES);
    renderGrid();
}
function toggleInv(){
    const inv=$("inventory");
    inv.style.display=inv.style.display==="none"?"block":"none";
    renderInv();
}
function renderInv(){
    const slots=$("invSlots");
    slots.innerHTML="";
    PLAYER.inventory.slots.forEach((item,i)=>{
        const div=document.createElement("div");
        div.className="invSlot";
        div.textContent=item?item.name.slice(0,4):"";
        div.onclick=()=>equip(i);
        slots.appendChild(div);
    });
}
function equip(idx){
    const item=PLAYER.inventory.remove(idx);
    if(!item) return;
    PLAYER.equipment[item.name]=item;
    alert("Equipped "+item.name);
    renderInv();
}

/* init */
document.addEventListener("DOMContentLoaded",()=>{
    /* add middle-click chord */
    document.addEventListener("auxclick",e=>{
        if(e.button===1) e.preventDefault();
    });
});
