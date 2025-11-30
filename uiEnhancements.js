// ----------------- uiEnhancements.js (mine damage floats included) -----------------

(function(){
  // ----------------- THEMED GRIDS -----------------
  const zoneThemes = [
    {bg:'#d0f0ff', cell:'#a0e0ff'},
    {bg:'#dfffd0', cell:'#b0ffb0'},
    {bg:'#ffd0d0', cell:'#ffb0b0'},
    {bg:'#e0d0ff', cell:'#c0b0ff'},
    {bg:'#aaa', cell:'#888'}
  ];

  function applyGridTheme() {
    if(!window.dungeon || !window.board) return;
    const z = dungeon.zone;
    const boardEl = document.getElementById('board');
    if(zoneThemes[z]){
      boardEl.style.background = zoneThemes[z].bg;
      document.querySelectorAll('.cell').forEach(c => {
        if(!c.classList.contains('revealed')) c.style.background = zoneThemes[z].cell;
      });
    }
  }

  // ----------------- CELL ANIMATIONS -----------------
  const cellAnimationDuration = 300;
  function animateCellReveal(cell) {
    if(!cell.classList.contains('revealed')) return;
    cell.style.transition = `all ${cellAnimationDuration}ms ease`;
    cell.style.transform = 'scale(0.95)';
    setTimeout(()=>{cell.style.transform='scale(1)';},10);
  }

  // ----------------- HEADER BARS -----------------
  function createHeaderBars() {
    const statsEl = document.getElementById('stats');
    if(!statsEl) return;
    statsEl.innerHTML = `
      <div>Level: <span id="playerLevel">${window.player?.level||1}</span></div>
      <div>HP: <div class="bar-bg"><div id="hpBar" class="bar-fill"></div></div></div>
      <div>XP: <div class="bar-bg"><div id="xpBar" class="bar-fill"></div></div></div>
      <div>Coins: <div class="bar-bg"><div id="coinBar" class="bar-fill"></div></div></div>
    `;
  }

  function updateHeaderBars() {
    if(!window.player) return;
    const hpPercent = (player.hp/player.maxHp)*100;
    const xpPercent = (player.xp/player.xpToNext)*100;
    const coinPercent = Math.min(player.coins/100,1)*100;
    document.getElementById('hpBar').style.width = hpPercent+'%';
    document.getElementById('xpBar').style.width = xpPercent+'%';
    document.getElementById('coinBar').style.width = coinPercent+'%';
  }

  // ----------------- SLIDING PANELS -----------------
  function setupSlidingPanels() {
    ['inventory','shop','dungeonSelector'].forEach(id => {
      const el = document.getElementById(id);
      if(!el) return;
      el.style.position = 'fixed';
      el.style.top = '50px';
      el.style.right = '-650px';
      el.style.width = '600px';
      el.style.transition = 'right 0.3s ease';
      el.style.zIndex = '100';
    });

    // Attach sliding behavior to existing buttons
    const mappings = [
      {btn:'#openInventory', panel:'inventory'},
      {btn:'#openShop', panel:'shop'},
      {btn:'#dungeonSelector button', panel:'dungeonSelector'}
    ];
    mappings.forEach(m=>{
      const btns = document.querySelectorAll(m.btn);
      btns.forEach(b=>b.addEventListener('click',()=>togglePanel(m.panel)));
    });
  }

  function togglePanel(id){
    const el = document.getElementById(id);
    if(!el) return;
    el.style.right = (el.style.right==='0px') ? '-650px' : '0px';
  }

  // ----------------- FLOATING DAMAGE NUMBERS -----------------
  window.showFloatingDamage = function(text, x, y) {
    const dmgEl = document.createElement('div');
    dmgEl.textContent = text;
    dmgEl.style.position='absolute';
    dmgEl.style.left = x+'px';
    dmgEl.style.top = y+'px';
    dmgEl.style.color='red';
    dmgEl.style.fontWeight='bold';
    dmgEl.style.pointerEvents='none';
    dmgEl.style.transition='all 1s ease';
    dmgEl.style.zIndex='200';
    document.body.appendChild(dmgEl);
    setTimeout(()=>{
      dmgEl.style.top = (y-30)+'px';
      dmgEl.style.opacity='0';
    },10);
    setTimeout(()=>{dmgEl.remove();},1000);
  }

  // ----------------- HOOK INTO BOARD UI -----------------
  function hookBoardUI(){
    if(typeof updateBoardUI !== 'function') return;
    const original = updateBoardUI;
    window.updateBoardUI = function(){
      original();
      applyGridTheme();
      document.querySelectorAll('.cell').forEach(c=>{
        c.addEventListener('mouseover',()=>c.style.boxShadow='0 0 8px #fff');
        c.addEventListener('mouseout',()=>c.style.boxShadow='none');
        if(c.classList.contains('revealed')) animateCellReveal(c);
      });
      updateHeaderBars();
    };
  }

  // ----------------- HOOK INTO revealCell FOR MINE DAMAGE -----------------
  function hookRevealCell(){
    if(typeof revealCell !== 'function') return;
    const original = revealCell;
    window.revealCell = function(r,c){
      const boardEl = document.getElementById('board');
      const cellEl = boardEl?.children[r*board[0].length + c];
      const rect = cellEl?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width/2 : 0;
      const y = rect ? rect.top : 0;

      const cellValue = board[r][c];
      original(r,c);

      if(cellValue === 'M'){
        showFloatingDamage('-5', x, y);
      }
    };
  }

  // ----------------- CSS for Header Bars & Panels -----------------
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
  .bar-bg { width: 100%; height: 15px; background: #555; border-radius: 7px; margin: 2px 0; }
  .bar-fill { height: 100%; width: 0; background: #4caf50; border-radius: 7px; transition: width 0.3s ease; }
  #inventory, #shop, #dungeonSelector { box-shadow: 0 0 20px #000; }
  `;
  document.head.appendChild(styleEl);

  // ----------------- INIT -----------------
  createHeaderBars();
  setupSlidingPanels();
  hookBoardUI();
  hookRevealCell();
})();
