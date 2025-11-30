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

/* ----------------- INITIALIZATION ----------------- */
function createDungeonSelector() {
  const sel = document.getElementById('dungeonSelector');
  sel.innerHTML='<b>Select Dungeon:</b>';
  zones.forEach((z,i)=>{
    const btn = document.createElement('button');
    btn.textContent=z.name;
    btn.addEventListener('click',()=>startDungeon(i));
    sel.appendChild(btn);
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
  for(let dr=-1;dr<=1;dr++){
    for(let dc=-1;dc<=1;dc++){
      if(dr===0 && dc===0) continue;
      const nr=r+dr, nc=c+dc;
      if(nr>=0 && nr<board.length && nc>=0 && nc<board[0].length && board[nr][nc]==='M') count++;
    }
  }
  return count;
}

/* ----------------- GAMEPLAY ----------------- */
function revealCell(r,c){
  if(revealed[r][c]||flagged[r][c]||gameOver) return;
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
  if(revealed[r][c]||gameOver) return;
  flagged[r][c]=!flagged[r][c];
  updateBoardUI();
}
function chordCell(r,c){
  if(!revealed[r][c] || board[r][c]==0) return;
  let flagsAround=0;
  for(let dr=-1;dr<=1;dr++){for(let dc=-1;dc<=1;dc++){
    const nr=r+dr, nc=c+dc;
    if(nr>=0 && nr<board.length && nc>=0 && nc<board[0].length && flagged[nr][nc]) flagsAround++;
  }}
  if(flagsAround===board[r][c]){
    for(let dr=-1;dr<=1;dr++){for(let dc=-1;dc<=1;dc++){
      const nr=r+dr, nc=c+dc;
      if(nr>=0 && nr<board.length && nc>=0 && nc<board[0].length && !flagged[nr][nc]) revealCell(nr,nc);
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
    player.coins+=10; player.xp+=5;
    if(player.xp>=player.xpToNext){player.level++; player.xp=0; player.maxHp+=5; player.hp=player.maxHp;}
    dungeon.floor++;
    const z = zones[dungeon.zone];
    if(dungeon.floor>=z.floors){
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
