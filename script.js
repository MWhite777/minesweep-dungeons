/* ----------------- GAME DATA ----------------- */
const zones = [
  {name:'Tutorial Village', floors:3, size:9, mines:10, boss:false},
  {name:'Forest of Shadows', floors:4, size:10, mines:15, boss:false},
  {name:'Crystal Caverns', floors:4, size:12, mines:20, boss:false},
  {name:'Fiery Peaks', floors:5, size:14, mines:30, boss:false},
  {name:'Dark Citadel', floors:1, size:16, mines:40, boss:true}
];

let player = {
  level:1, xp:0, xpToNext:20, hp:20, maxHp:20, coins:0, gearScore:1,
  inventory:{weapon:'Wooden Pickaxe', armor:'Leather Tunic', accessory:'Lucky Charm', potions:1}
};

let dungeon = {zone:0, floor:0};
let board = [], revealed = [], flagged = [], enemies = [];
let gameOver=false;
let NFMode = false; // No-Flags Mode

/* ----------------- INITIALIZATION ----------------- */
function createDungeonSelector() {
  const sel = document.getElementById('dungeonSelector');
  sel.innerHTML = '<label><input type="checkbox" id="nfModeToggle"> No-Flags Mode (NF)</label>';
  zones.forEach((z,i)=>{
    const btn = document.createElement('button');
    btn.textContent=z.name;
    btn.addEventListener('click',()=>startDungeon(i));
    sel.appendChild(btn);
  });

  document.getElementById('nfModeToggle').addEventListener('change',(e)=>{
    NFMode = e.target.checked;
  });
}
function startDungeon(zoneIndex) {
  dungeon.zone=zoneIndex; dungeon.floor=0;
  startFloor();
}
function startFloor() {
  gameOver=false;
  document.getElementById('message').textContent='';
  const z = zones[dungeon.zone];
  const size = z.size;
  const mines = z.mines;
  board = Array(size).fill().map(()=>Array(size).fill(0));
  revealed = Array(size).fill().map(()=>Array(size).fill(false));
  flagged = Array(size).fill().map(()=>Array(size).fill(false));
  enemies = Array(size).fill().map(()=>Array(size).fill(null));
  placeMines(size,mines);
  updateBoardUI();
}

/* ----------------- BOARD GENERATION ----------------- */
function placeMines(size,mines){
  let placed=0;
  while(placed<mines){
    const r=Math.floor(Math.random()*size);
    const c=Math.floor(Math.random()*size);
    if(board[r][c]!=='M'){board[r][c]='M'; placed++;}
  }
  for(let r=0;r<size;r++){
    for(let c=0;c<size;c++){
      if(board[r][c]!=='M') board[r][c]=countAdjacentMines(r,c);
    }
  }
}
function countAdjacentMines(r,c){
  let count=0;
  for(let dr=-1;dr<=1;dr++){for(let dc=-1;dc<=1;dc++){
    if(dr===0 && dc===0) continue;
    const nr=r+dr, nc=c+dc;
    if(nr>=0 && nr<board.length && nc>=0 && nc<board[0].length && board[nr][nc]==='M') count++;
  }}
  return count;
}

/* ----------------- GAMEPLAY ----------------- */
function revealCell(r,c){
  if(revealed[r][c]||gameOver) return;
  revealed[r][c]=true;
  if(board[r][c]==='M'){
    player.hp-=5;
    if(player.hp<=0){gameOver=true; player.hp=0; document.getElementById('message').textContent='You Died!'; return;}
    document.getElementById('message').textContent='Hit a mine! -5 HP';
  } else if(board[r][c]===0){
    for(let dr=-1;dr<=1;dr++){for(let dc=-1;dc<=1;dc++){
      const nr=r+dr, nc=c+dc;
      if(nr>=0 && nr<board.length && nc>=0 && nc<board[0].length) revealCell(nr,nc);
    }}
  }
  updateBoardUI();
  checkWin();
}
function toggleFlag(r,c){
  if(NFMode) return; // Disable flags in NF mode
  if(revealed[r][c]||gameOver) return;
  flagged[r][c]=!flagged[r][c];
  updateBoardUI();
}
function chordCell(r,c){
  if(!revealed[r][c] || board[r][c]==0) return;
  let flagsAround=0;
  for(let dr=-1;dr<=1;dr++){for(let dc=-1;dc<=1;dc++){
    const nr=r+dr, nc=c+dc;
    if(nr>=0 && nr<board.length && nc>=0 && nc<board[0].length){
      if(!NFMode && flagged[nr][nc]) flagsAround++;
    }
  }}
  if(flagsAround===board[r][c] || NFMode){ // NF ignores flags
    for(let dr=-1;dr<=1;dr++){for(let dc=-1;dc<=1;dc++){
      const nr=r+dr, nc=c+dc;
      if(nr>=0 && nr<board.length && nc>=0 && nc<board[0].length){
        if(!revealed[nr][nc]) revealCell(nr,nc);
      }
    }}
  }
}

/* ----------------- BOARD UI ----------------- */
function updateBoardUI(){
  const boardEl=document.getElementById('board');
  boardEl.style.gridTemplateColumns=`repeat(${board[0].length},40px)`;
  boardEl.style.gridTemplateRows=`repeat(${board.length},40px)`;
  boardEl.innerHTML='';
  for(let r=0;r<board.length;r++){
    for(let c=0;c<board[0].length;c++){
      const cell=document.createElement('div');
      cell.className='cell';
      if(revealed[r][c]) cell.classList.add('revealed');
      if(flagged[r][c]) cell.classList.add('flagged');
      if(revealed[r][c]){
        if(board[r][c]!=='M' && board[r][c]!==0) cell.textContent=board[r][c];
        if(board[r][c]==='M') cell.textContent='💣';
      } else if(flagged[r][c]) cell.textContent='🚩';
      cell.addEventListener('click',()=>revealCell(r,c));
      cell.addEventListener('contextmenu',(e)=>{e.preventDefault(); toggleFlag(r,c);});
      cell.addEventListener('dblclick',()=>chordCell(r,c));
      boardEl.appendChild(cell);
    }
  }
  updatePlayerUI();
}
function updatePlayerUI(){
  document.getElementById('playerLevel').textContent=player.level;
  document.getElementById('playerHP').textContent=player.hp;
  document.getElementById('playerMaxHP').textContent=player.maxHp;
  document.getElementById('playerCoins').textContent=player.coins;
  document.getElementById('playerXP').textContent=player.xp+'/'+player.xpToNext;
}

/* ----------------- WIN CONDITION ----------------- */
function checkWin(){
  let won=true;
  for(let r=0;r<board.length;r++){
    for(let c=0;c<board[0].length;c++){
      if(board[r][c]!=='M' && !revealed[r][c]) won=false;
    }
  }
  if(won){
    const z = zones[dungeon.zone];
    const reward = NFMode ? 15 : 10; // bonus coins for NF mode
    player.coins += reward;
    player.xp += 5;
    if(player.xp >= player.xpToNext){player.level++; player.xp=0; player.maxHp+=5; player.hp=player.maxHp;}
    dungeon.floor++;
    if(dungeon.floor >= z.floors){
      document.getElementById('message').textContent='Dungeon Complete! Coins & XP awarded';
    } else {
      document.getElementById('message').textContent='Floor Complete! Proceeding to next floor';
      startFloor();
    }
    updatePlayerUI();
  }
}

/* ----------------- INVENTORY & SHOP ----------------- */
function showInventory(){
  const inv=document.getElementById('inventory'); inv.classList.toggle('hidden');
  if(!inv.classList.contains('hidden')){
    inv.innerHTML='<b>Inventory</b><br>';
    for(let item in player.inventory) inv.innerHTML+=item+': '+player.inventory[item]+'<br>';
  }
}
function showShop(){
  const shop=document.getElementById('shop'); shop.classList.toggle('hidden');
  if(!shop.classList.contains('hidden')){
    shop.innerHTML='<b>Shop</b><br>';
    const items=[
      {name:'Iron Sword',type:'weapon',price:20},
      {name:'Steel Armor',type:'armor',price:30},
      {name:'Magic Ring',type:'accessory',price:25},
      {name:'Potion',type:'potion',price:5}
    ];
    items.forEach(i=>{
      const btn=document.createElement('button');
      btn.textContent=i.name+' ('+i.price+' coins)';
      btn.addEventListener('click',()=>{
        if(player.coins>=i.price){
          player.coins-=i.price;
          if(i.type==='potion') player.inventory.potions++;
          else player.inventory[i.type]=i.name;
          updatePlayerUI(); showShop();
        }
      });
      shop.appendChild(btn);
    });
  }
}

/* ----------------- EVENT LISTENERS ----------------- */
document.getElementById('toggleDark').addEventListener('click',()=>document.body.classList.toggle('light'));
document.getElementById('openInventory').addEventListener('click',showInventory);
document.getElementById('openShop').addEventListener('click',showShop);
document.getElementById('restart').addEventListener('click',startFloor);

/* ----------------- INIT ----------------- */
createDungeonSelector();

/* ----------------- ENEMIES & BOSS ----------------- */
let boss = null;

// Spawn mini-enemies on the floor
function spawnEnemies(){
  if(!board) return;
  enemies = Array(board.length).fill().map(()=>Array(board[0].length).fill(null));
  for(let r=0;r<board.length;r++){
    for(let c=0;c<board[0].length;c++){
      if(Math.random() < 0.05 && board[r][c] !== 'M'){ // 5% chance per cell
        enemies[r][c] = {hp:5, icon:'👾'};
      }
    }
  }
}

// Draw enemies on the board
function drawEnemies(){
  const boardEl = document.getElementById('board');
  if(!boardEl) return;
  for(let r=0;r<board.length;r++){
    for(let c=0;c<board[0].length;c++){
      const cell = boardEl.children[r*board[0].length + c];
      if(enemies[r][c] && !revealed[r][c]) cell.textContent = enemies[r][c].icon;
    }
  }
}

// Attack enemy at cell
function attackEnemy(r,c){
  if(!enemies[r][c]) return;
  enemies[r][c].hp -= player.gearScore || 1;
  const boardEl = document.getElementById('board');
  const rect = boardEl?.children[r*board[0].length+c]?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width/2 : 0;
  const y = rect ? rect.top : 0;
  showFloatingDamage('-'+(player.gearScore||1), x, y);
  if(enemies[r][c].hp <= 0) enemies[r][c] = null;
  updateBoardUI();
  if(boss) damageBoss(player.gearScore||1);
}

// Boss system
function spawnBoss(hp){
  boss = {hp:hp, maxHp:hp};
  const statsEl = document.getElementById('stats');
  if(!document.getElementById('bossBar')){
    const div = document.createElement('div');
    div.id = 'bossBarContainer';
    div.innerHTML = 'Boss HP: <div class="bar-bg"><div id="bossBar" class="bar-fill"></div></div>';
    statsEl.appendChild(div);
  }
  updateHeaderBars();
}

function damageBoss(amount){
  if(!boss) return;
  boss.hp -= amount;
  if(boss.hp < 0) boss.hp = 0;
  updateHeaderBars();
}

// Floating damage numbers
function showFloatingDamage(text,x,y){
  const dmgEl = document.createElement('div');
  dmgEl.textContent = text;
  dmgEl.style.position = 'absolute';
  dmgEl.style.left = x+'px';
  dmgEl.style.top = y+'px';
  dmgEl.style.color = 'red';
  dmgEl.style.fontWeight = 'bold';
  dmgEl.style.pointerEvents = 'none';
  dmgEl.style.transition = 'all 1s ease';
  dmgEl.style.zIndex = '200';
  document.body.appendChild(dmgEl);
  setTimeout(()=>{
    dmgEl.style.top = (y-30)+'px';
    dmgEl.style.opacity='0';
  },10);
  setTimeout(()=>dmgEl.remove(),1000);
}

// Update header bars including boss
function updateHeaderBars(){
  const hpPercent = (player.hp/player.maxHp)*100;
  const xpPercent = (player.xp/player.xpToNext)*100;
  const coinPercent = Math.min(player.coins/100,1)*100;
  document.getElementById('playerHP').textContent = player.hp;
  document.getElementById('playerMaxHP').textContent = player.maxHp;
  document.getElementById('playerXP').textContent = player.xp+'/'+player.xpToNext;
  document.getElementById('playerCoins').textContent = player.coins;

  const bossBar = document.getElementById('bossBar');
  if(boss && bossBar){
    bossBar.style.width = (boss.hp/boss.maxHp*100)+'%';
  }
}

// Hook revealCell to enemies and boss
const originalRevealCell = revealCell;
revealCell = function(r,c){
  const boardEl = document.getElementById('board');
  const rect = boardEl?.children[r*board[0].length+c]?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width/2 : 0;
  const y = rect ? rect.top : 0;

  const cellValue = board[r][c];
  originalRevealCell(r,c);

  if(cellValue === 'M') showFloatingDamage('-5', x, y);
  if(enemies[r][c]) attackEnemy(r,c);
  if(boss && cellValue === 'M') damageBoss(5); // mines damage boss
};

