/* ----------------- GAME DATA ----------------- */
const worlds = [
  {name:'Tutorial', floors:1, unlocked:true, boss:false},
  {name:'Forest', floors:3, unlocked:false, boss:false},
  {name:'Caverns', floors:3, unlocked:false, boss:false},
  {name:'Peaks', floors:4, unlocked:false, boss:false},
  {name:'Citadel', floors:1, unlocked:false, boss:true}
];

let player = {
  level:1, xp:0, xpToNext:20, hp:20, maxHp:20, coins:0,
  inventory:{weapon:'Wooden Pickaxe', armor:'Leather Tunic', accessory:'Lucky Charm', potions:1},
  completedWorlds:[0]
};

let dungeon = {world:0, floor:0};
let board=[], revealed=[], flagged=[], enemies=[];
let NFMode=false, gameOver=false;

/* ----------------- WORLD & FLOOR SELECTORS ----------------- */
function createWorldSelector(){
  const sel = document.getElementById('worldSelector');
  sel.innerHTML='<b>Select World:</b>';
  worlds.forEach((w,i)=>{
    const btn = document.createElement('button');
    btn.textContent=w.name;
    if(!w.unlocked) btn.classList.add('locked');
    btn.addEventListener('click',()=>{ if(w.unlocked) startWorld(i); });
    sel.appendChild(btn);
  });
}
function startWorld(worldIndex){
  dungeon.world=worldIndex; dungeon.floor=0;
  createFloorSelector();
}
function createFloorSelector(){
  const sel = document.getElementById('floorSelector');
  sel.innerHTML='<b>Select Floor:</b>';
  const w = worlds[dungeon.world];
  for(let f=0; f<w.floors; f++){
    const btn = document.createElement('button');
    btn.textContent='Floor '+(f+1);
    btn.addEventListener('click',()=>startFloor(f));
    sel.appendChild(btn);
  }
}

/* ----------------- START FLOOR ----------------- */
function startFloor(floorIndex){
  dungeon.floor=floorIndex;
  gameOver=false;
  document.getElementById('message').textContent='';
  const size = 8 + dungeon.floor*2;
  const mines = Math.floor(size*size*0.15);
  board=Array(size).fill().map(()=>Array(size).fill(0));
  revealed=Array(size).fill().map(()=>Array(size).fill(false));
  flagged=Array(size).fill().map(()=>Array(size).fill(false));
  enemies=Array(size).fill().map(()=>Array(size).fill(null));
  placeMines(size,mines);
  placeEnemies(size);
  if(worlds[dungeon.world].boss) showBossOverlay();
  else hideBossOverlay();
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
  for(let r=0;r<size;r++){for(let c=0;c<size;c++){
    if(board[r][c]!=='M') board[r][c]=countAdjacentMines(r,c);
  }}
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
function placeEnemies(size){
  const enemyCount = Math.floor(size*size*0.05);
  for(let i=0;i<enemyCount;i++){
    let r,c;
    do{ r=Math.floor(Math.random()*size); c=Math.floor(Math.random()*size); } while(board[r][c]!=='0');
    enemies[r][c]='Goblin';
  }
}

/* ----------------- GAMEPLAY (Revealing, Flags, Chording) ----------------- */
function revealCell(r,c){
  if(revealed[r][c]||gameOver) return;
  revealed[r][c]=true;
  if(board[r][c]==='M'){
    let damage=5;
    if(player.inventory.armor==='Iron Armor') damage*=0.7;
    player.hp-=Math.floor(damage);
    if(player.hp<=0){gameOver=true; player.hp=0; document.getElementById('message').textContent='You Died!'; return;}
    document.getElementById('message').textContent='Hit a mine! -'+Math.floor(damage)+' HP';
    if(worlds[dungeon.world].boss) attackBoss(Math.floor(damage*0.5));
  } else if(board[r][c]===0){ for(let dr=-1;dr<=1;dr++){for(let dc=-1;dc<=1;dc++){
    const nr=r+dr,nc=c+dc; if(nr>=0 && nr<board.length && nc>=0 && nc<board[0].length) revealCell(nr,nc);
  }}}
  if(enemies[r][c]){
    let dmg=5; if(player.inventory.weapon==='Iron Pickaxe') dmg+=2;
    document.getElementById('message').textContent='Enemy found: '+enemies[r][c]+'! Dealt '+dmg+' damage to it';
    if(worlds[dungeon.world].boss) attackBoss(dmg);
    enemies[r][c]=null;
  }
  updateBoardUI();
  checkWin();
}
function toggleFlag(r,c){ if(NFMode) return; if(revealed[r][c]||gameOver) return; flagged[r][c]=!flagged[r][c]; updateBoardUI(); }
function chordCell(r,c){ if(!revealed[r][c]||board[r][c]==0) return; let flagsAround=0; for(let dr=-1;dr<=1;dr++){for(let dc=-1;dc<=1;dc++){ const nr=r+dr,nc=c+dc;if(nr>=0 && nr<board.length && nc>=0 && nc<board[0].length){ if(!NFMode && flagged[nr][nc]) flagsAround++; }}} if(flagsAround===board[r][c]||NFMode){ for(let dr=-1;dr<=1;dr++){for(let dc=-1;dc<=1;dc++){ const nr=r+dr,nc=c+dc;if(nr>=0 && nr<board.length && nc>=0 && nc<board[0].length){ if(!revealed[nr][nc]) revealCell(nr,nc); }}}}}

function updateBoardUI(){
  const boardEl=document.getElementById('board');
  boardEl.style.gridTemplateColumns=`repeat(${board[0].length},40px)`;
  boardEl.style.gridTemplateRows=`repeat(${board.length},40px)`;
  boardEl.innerHTML='';
  for(let r=0;r<board.length;r++){for(let c=0;c<board[0].length;c++){
    const cell=document.createElement('div'); cell.className='cell';
    if(revealed[r][c]) cell.classList.add('revealed');
    if(flagged[r][c]) cell.classList.add('flagged');
    if(revealed[r][c]){
      if(board[r][c]!=='M' && board[r][c]!==0) cell.textContent=board[r][c];
      if(board[r][c]==='M') cell.textContent='💣';
      if(enemies[r][c]) cell.textContent='👹';
    } else if(flagged[r][c]) cell.textContent='🚩';
    cell.addEventListener('click',()=>revealCell(r,c));
    cell.addEventListener('contextmenu',(e)=>{e.preventDefault(); toggleFlag(r,c);});
    cell.addEventListener('dblclick',()=>chordCell(r,c));
    boardEl.appendChild(cell);
  }}
  updatePlayerUI();
}
function updatePlayerUI(){ document.getElementById('playerLevel').textContent=player.level; document.getElementById('playerHP').textContent=player.hp; document.getElementById('playerMaxHP').textContent=player.maxHp; document.getElementById('playerCoins').textContent=player.coins; document.getElementById('playerXP').textContent=player.xp+'/'+player.xpToNext; }

/* ----------------- WIN CONDITION ----------------- */
function checkWin(){
  let won=true; for(let r=0;r<board.length;r++){for(let c=0;c<board[0].length;c++){ if(board[r][c]!=='M' && !revealed[r][c]) won=false; }}
  if(won){
    const reward = NFMode ? 15 : 10; player.coins+=reward; player.xp+=5;
    if(player.xp>=player.xpToNext){player.level++; player.xp=0; player.maxHp+=5; player.hp=player.maxHp;}
    const w=worlds[dungeon.world]; dungeon.floor++;
    if(dungeon.floor>=w.floors){
      document.getElementById('message').textContent='World Complete! Coins & XP awarded';
      if(dungeon.world+1<worlds.length) worlds[dungeon.world+1].unlocked=true;
      createWorldSelector();
    } else {
      document.getElementById('message').textContent='Floor Complete! Proceeding to next floor';
      startFloor(dungeon.floor);
    }
    updatePlayerUI();
  }
}

/* ----------------- EVENT LISTENERS ----------------- */
document.getElementById('toggleDark').addEventListener('click',()=>document.body.classList.toggle('light'));
document.getElementById('nfModeToggle').addEventListener('change',(e)=>{NFMode=e.target.checked;});
document.getElementById('restart').addEventListener('click',()=>startFloor(dungeon.floor));

createWorldSelector();
