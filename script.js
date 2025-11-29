document.addEventListener('DOMContentLoaded', () => {
    // --- Game State ---
    const gameState = {
        currentScreen: 'class-selection',
        player: {
            class: '',
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            gold: 0,
            health: 100,
            maxHealth: 100,
            baseDamage: 5,
            critDamage: 20,
            weapon: 'Fists',
            inventory: [],
            relics: [],
            shield: 0,
            skillCharges: 0
        },
        grid: [],
        width: 10,
        height: 10,
        mineCount: 15,
        isGameOver: false,
        isPracticeMode: false,
        enemy: {
            name: 'Grid Sprite',
            health: 50,
            maxHealth: 50,
            damage: 10,
            portrait: '👾',
            attackInterval: null,
            isBoss: false,
            phase: 1,
            coreLocation: null
        },
        zones: [
            { id: 1, name: "The Fractured Meadow", width: 9, height: 9, mines: 12, enemy: { name: "Grid Sprite", health: 50, maxHealth: 50, damage: 10, portrait: '👾', isBoss: false }, goldReward: 25, xpReward: 50 },
            { id: 2, name: "The Corrupted Core", width: 12, height: 12, mines: 20, enemy: { name: "The Corruptor", health: 200, maxHealth: 200, damage: 15, portrait: '👹', isBoss: true }, goldReward: 150, xpReward: 300 },
            { id: 3, name: "The Shadow Labyrinth", width: 14, height: 14, mines: 40, enemy: { name: "Shadow Lurker", health: 150, maxHealth: 150, damage: 20, portrait: '👹', isBoss: false }, goldReward: 100, xpReward: 200 }
        ],
        currentZone: null,
        shop: [
            { id: 'w1', name: 'Pickaxe', type: 'weapon', cost: 50, effect: { stat: 'baseDamage', value: 3 }, purchased: false },
            { id: 'w2', name: 'Warhammer', type: 'weapon', cost: 150, effect: { stat: 'baseDamage', value: 8 }, purchased: false },
            { id: 'w3', name: 'Gilded Blade', type: 'weapon', cost: 400, effect: { stat: 'baseDamage', value: 15 }, purchased: false },
            { id: 'r1', name: 'Lucky Clover', type: 'relic', cost: 200, effect: { description: '5% chance to survive a fatal hit with 1 HP.' }, purchased: false, func: (state) => { state.hasLuckyClover = true; } }
        ]
    };

    // --- DOM Elements ---
    const screens = document.querySelectorAll('.screen');
    const classCards = document.querySelectorAll('.class-card');
    const hubPracticeBtn = document.getElementById('hub-practice-btn');
    const hubMapBtn = document.getElementById('hub-map-btn');
    const hubShopBtn = document.getElementById('hub-shop-btn');
    const mapBackBtn = document.getElementById('map-back-btn');
    const shopBackBtn = document.getElementById('shop-back-btn');
    const backToHubBtn = document.getElementById('back-to-hub-btn');
    const resultModal = document.getElementById('result-modal');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const resultContinueBtn = document.getElementById('result-continue-btn');
    const skillButton = document.getElementById('skill-1');
    
    // --- Screen Management ---
    function showScreen(screenId) {
        screens.forEach(screen => screen.classList.remove('active'));
        document.getElementById(`${screenId}-screen`).classList.add('active');
        gameState.currentScreen = screenId;
        if (screenId === 'hub') updateHubUI();
        if (screenId === 'shop') renderShop();
    }

    // --- Class Selection ---
    classCards.forEach(card => {
        card.addEventListener('click', () => {
            const selectedClass = card.dataset.class;
            initializePlayer(selectedClass);
            showScreen('hub');
        });
    });

    function initializePlayer(className) {
        gameState.player.class = className;
        switch (className) {
            case 'Striker':
                gameState.player.maxHealth = 90;
                gameState.player.baseDamage = 7;
                break;
            case 'Guardian':
                gameState.player.maxHealth = 120;
                gameState.player.baseDamage = 4;
                break;
            case 'Oracle':
                gameState.player.maxHealth = 100;
                gameState.player.baseDamage = 5;
                break;
        }
        gameState.player.health = gameState.player.maxHealth;
        updateUI();
    }
    
    // --- Hub Logic ---
    hubPracticeBtn.addEventListener('click', () => enterPracticeMode());
    hubMapBtn.addEventListener('click', () => showScreen('world-map'));
    hubShopBtn.addEventListener('click', () => showScreen('shop'));

    function updateHubUI() {
        document.getElementById('hub-player-info').innerHTML = `
            Level ${gameState.player.level} ${gameState.player.class}<br>
            Gold: ${gameState.player.gold} | XP: ${gameState.player.xp}/${gameState.player.xpToNextLevel}
        `;
    }

    // --- World Map Logic ---
    mapBackBtn.addEventListener('click', () => showScreen('hub'));
    document.querySelectorAll('.map-node').forEach(node => {
        node.addEventListener('click', () => {
            if (node.classList.contains('locked')) {
                logEntry("This zone is locked.", "info");
                return;
            }
            const zoneId = parseInt(node.dataset.zoneId);
            enterZone(zoneId);
        });
    });

    // --- Shop Logic ---
    shopBackBtn.addEventListener('click', () => showScreen('hub'));
    
    function renderShop() {
        const shopItemsContainer = document.getElementById('shop-items');
        shopItemsContainer.innerHTML = '';
        document.getElementById('shop-player-gold').textContent = `Your Gold: ${gameState.player.gold}`;

        gameState.shop.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `shop-item ${item.purchased ? 'purchased' : ''}`;
            const effectText = item.type === 'weapon' ? `(+${item.effect.value} ${item.effect.stat})` : item.effect.description;
            itemDiv.innerHTML = `
                <span>${item.name} ${effectText}</span>
                <div>
                    <span>Cost: ${item.cost} Gold</span>
                    <button data-item-id="${item.id}" ${item.purchased ? 'disabled' : ''}>Buy</button>
                </div>
            `;
            shopItemsContainer.appendChild(itemDiv);
        });

        shopItemsContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && !e.target.disabled) {
                buyItem(e.target.dataset.itemId);
            }
        });
    }

    function buyItem(itemId) {
        const item = gameState.shop.find(i => i.id === itemId);
        if (!item || item.purchased) return;

        if (gameState.player.gold >= item.cost) {
            gameState.player.gold -= item.cost;
            item.purchased = true;
            
            if (item.type === 'weapon') {
                gameState.player.baseDamage += item.effect.value;
                gameState.player.weapon = item.name;
                logEntry(`Purchased ${item.name}!`, "loot");
            } else if (item.type === 'relic') {
                gameState.player.inventory.push(item);
                item.func(gameState);
                logEntry(`Purchased Relic: ${item.name}!`, "loot");
            }
            
            renderShop();
            updateUI();
        } else {
            logEntry("Not enough gold!", "damage");
        }
    }

    // --- Game Logic ---
    function enterPracticeMode() {
        gameState.isPracticeMode = true;
        gameState.currentZone = null;
        gameState.width = 8;
        gameState.height = 8;
        gameState.mineCount = 10;
        gameState.player.health = gameState.player.maxHealth;
        gameState.enemy = { name: "Practice Dummy", health: 999, maxHealth: 999, damage: 0, portrait: '🤖', attackInterval: null, isBoss: false };
        showScreen('game');
        startNewGame();
    }

    function enterZone(zoneId) {
        gameState.isPracticeMode = false;
        const zone = gameState.zones.find(z => z.id === zoneId);
        if (!zone) return;
        
        gameState.currentZone = zone;
        Object.assign(gameState.enemy, JSON.parse(JSON.stringify(zone.enemy))); // Deep copy
        gameState.width = zone.width;
        gameState.height = zone.height;
        gameState.mineCount = zone.mines;
        gameState.player.health = gameState.player.maxHealth; // Full heal
        
        showScreen('game');
        startNewGame();
    }

    function startNewGame() {
        gameState.isGameOver = false;
        clearInterval(gameState.enemy.attackInterval);
        createGrid();
        renderGrid();
        updateUI();
        startEnemyAttack();
        logEntry(`You have entered: ${gameState.isPracticeMode ? 'Practice Grounds' : gameState.currentZone.name}`, "info");
        updateSkillButton();
    }

    function createGrid() {
        gameState.grid = [];
        for (let r = 0; r < gameState.height; r++) {
            gameState.grid[r] = [];
            for (let c = 0; c < gameState.width; c++) {
                gameState.grid[r][c] = { isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0, isCorrupted: false, isCore: false };
            }
        }
        placeMines();
        calculateNumbers();
    }

    function placeMines() {
        let minesPlaced = 0;
        while (minesPlaced < gameState.mineCount) {
            const r = Math.floor(Math.random() * gameState.height);
            const c = Math.floor(Math.random() * gameState.width);
            if (!gameState.grid[r][c].isMine) {
                gameState.grid[r][c].isMine = true;
                minesPlaced++;
            }
        }
    }

    function calculateNumbers() {
        for (let r = 0; r < gameState.height; r++) {
            for (let c = 0; c < gameState.width; c++) {
                if (!gameState.grid[r][c].isMine) {
                    gameState.grid[r][c].adjacentMines = countAdjacentMines(r, c);
                }
            }
        }
    }

    function countAdjacentMines(row, col) {
        let count = 0;
        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                const newRow = row + r, newCol = col + c;
                if (newRow >= 0 && newRow < gameState.height && newCol >= 0 && newCol < gameState.width) {
                    if (gameState.grid[newRow][newCol].isMine) count++;
                }
            }
        }
        return count;
    }

    function renderGrid() {
        const gridContainer = document.getElementById('grid-container');
        gridContainer.innerHTML = '';
        gridContainer.style.gridTemplateColumns = `repeat(${gameState.width}, 30px)`;
        for (let r = 0; r < gameState.height; r++) {
            for (let c = 0; c < gameState.width; c++) {
                const tile = document.createElement('div');
                tile.classList.add('tile');
                tile.dataset.row = r; tile.dataset.col = c;
                const tileData = gameState.grid[r][c];
                if (tileData.isRevealed) {
                    tile.classList.add('revealed');
                    if (tileData.isMine) tile.classList.add('mine');
                    else if (tileData.isCore) tile.classList.add('is-core');
                    else if (tileData.adjacentMines > 0 && !tileData.isCorrupted) {
                        tile.textContent = tileData.adjacentMines;
                        tile.dataset.count = tileData.adjacentMines;
                    }
                } else if (tileData.isFlagged) {
                    tile.classList.add('flagged');
                }
                tile.addEventListener('click', (e) => handleLeftClick(e, r, c));
                tile.addEventListener('contextmenu', (e) => handleRightClick(e, r, c));
                gridContainer.appendChild(tile);
            }
        }
    }

    function handleLeftClick(e, row, col) {
        e.preventDefault();
        if (gameState.isGameOver) return;
        const tile = gameState.grid[row][col];
        if (tile.isRevealed || tile.isFlagged) return;
        
        if (e.ctrlKey && tile.isRevealed && tile.adjacentMines > 0 && !tile.isCorrupted) {
            chordTile(row, col);
            return;
        }
        revealTile(row, col);
    }

    function chordTile(row, col) {
        const tile = gameState.grid[row][col];
        if (!tile.isRevealed || tile.adjacentMines === 0) return;
        let adjacentFlags = 0;
        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                const newRow = row + r, newCol = col + c;
                if (newRow >= 0 && newRow < gameState.height && newCol >= 0 && newCol < gameState.width) {
                    if (gameState.grid[newRow][newCol].isFlagged) adjacentFlags++;
                }
            }
        }
        if (adjacentFlags === tile.adjacentMines) {
            for (let r = -1; r <= 1; r++) {
                for (let c = -1; c <= 1; c++) {
                    const newRow = row + r, newCol = col + c;
                    if (newRow >= 0 && newRow < gameState.height && newCol >= 0 && newCol < gameState.width) {
                        const adjacentTile = gameState.grid[newRow][newCol];
                        if (!adjacentTile.isRevealed && !adjacentTile.isFlagged) {
                            revealTile(newRow, newCol);
                        }
                    }
                }
            }
        }
    }

    function handleRightClick(e, row, col) {
        e.preventDefault();
        if (gameState.isGameOver) return;
        const tile = gameState.grid[row][col];
        if (tile.isRevealed) return;
        tile.isFlagged = !tile.isFlagged;
        if (tile.isFlagged && tile.isMine) {
            if (gameState.player.skillCharges > 0 && gameState.player.class === 'Guardian') {
                gameState.player.shield += 10;
                gameState.player.skillCharges--;
                logEntry("Fortify! Shield gained.", "skill");
                updateUI();
            }
        }
        renderGrid();
    }

    function revealTile(row, col) {
        const tile = gameState.grid[row][col];
        if (tile.isRevealed || tile.isFlagged) return;
        tile.isRevealed = true;

        if (tile.isMine) {
            playerTakeDamage(gameState.enemy.damage);
            logEntry(`You hit a MINE for ${gameState.enemy.damage} damage!`, "damage");
        } else {
            let damage = gameState.player.baseDamage;
            if (gameState.player.skillCharges > 0 && gameState.player.class === 'Striker') {
                damage = gameState.player.critDamage;
                gameState.player.skillCharges--;
                logEntry(`Unstable Cleave! Critical Hit for ${damage} damage!`, "crit");
            } else if (tile.adjacentMines === 0) {
                damage = gameState.player.critDamage;
                logEntry(`Critical Hit! Revealed a '0' for ${damage} damage!`, "crit");
                revealAdjacent(row, col);
            } else {
                logEntry(`Revealed a '${tile.adjacentMines}' for ${damage} damage.`, "info");
            }
            enemyTakeDamage(damage);
            awardXP(1); // Small XP for revealing a number
        }
        renderGrid();
        checkWinCondition();
    }

    function revealAdjacent(row, col) {
        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                const newRow = row + r, newCol = col + c;
                if (newRow >= 0 && newRow < gameState.height && newCol >= 0 && newCol < gameState.width) {
                    const adjacentTile = gameState.grid[newRow][newCol];
                    if (!adjacentTile.isRevealed && !adjacentTile.isMine) {
                        revealTile(newRow, newCol);
                    }
                }
            }
        }
    }

    function playerTakeDamage(damage) {
        if (gameState.player.shield > 0) {
            const absorbedDamage = Math.min(gameState.player.shield, damage);
            gameState.player.shield -= absorbedDamage;
            damage -= absorbedDamage;
            logEntry(`Shield absorbed ${absorbedDamage} damage.`, "info");
        }
        gameState.player.health -= damage;
        if (gameState.player.health <= 0 && gameState.hasLuckyClover && Math.random() < 0.05) {
            gameState.player.health = 1;
            logEntry("Lucky Clover saved you from death!", "crit");
        }
        if (gameState.player.health < 0) gameState.player.health = 0;
        updateUI();
        if (gameState.player.health <= 0) {
            endGame(false);
        }
    }

    function enemyTakeDamage(damage) {
        gameState.enemy.health -= damage;
        if (gameState.enemy.health < 0) gameState.enemy.health = 0;
        updateUI();
        checkBossPhase();
    }

    function startEnemyAttack() {
        clearInterval(gameState.enemy.attackInterval);
        if (gameState.isPracticeMode) return;
        gameState.enemy.attackInterval = setInterval(() => {
            if (!gameState.isGameOver && gameState.enemy.health > 0) {
                playerTakeDamage(gameState.enemy.damage);
                logEntry(`The ${gameState.enemy.name} attacks for ${gameState.enemy.damage} damage!`, "damage");
                updateUI();
            }
        }, 4000);
    }

    function checkBossPhase() {
        if (!gameState.enemy.isBoss) return;
        
        if (gameState.enemy.health <= gameState.enemy.maxHealth * 0.6 && gameState.enemy.phase === 1) {
            gameState.enemy.phase = 2;
            logEntry("The boss shatters the grid! The layout has changed!", "damage");
            // Regenerate the grid with more mines
            createGrid();
            renderGrid();
            startBossCorruption();
        }

        if (gameState.enemy.health <= gameState.enemy.maxHealth * 0.3 && gameState.enemy.phase === 2) {
            gameState.enemy.phase = 3;
            logEntry("The boss exposes its Core! Flag the adjacent tiles to destroy it!", "crit");
            clearInterval(gameState.enemy.corruptionInterval);
            // Find a random non-mine spot for the core
            let corePlaced = false;
            while(!corePlaced) {
                const r = Math.floor(Math.random() * gameState.height);
                const c = Math.floor(Math.random() * gameState.width);
                if(!gameState.grid[r][c].isMine) {
                    gameState.grid[r][c].isCore = true;
                    gameState.enemy.coreLocation = {r, c};
                    renderGrid();
                    corePlaced = true;
                }
            }
        }
    }

    function startBossCorruption() {
        gameState.enemy.corruptionInterval = setInterval(() => {
            if (gameState.isGameOver || gameState.enemy.phase !== 2) return;
            let corrupted = false;
            while(!corrupted) {
                const r = Math.floor(Math.random() * gameState.height);
                const c = Math.floor(Math.random() * gameState.width);
                const tile = gameState.grid[r][c];
                if (tile.isRevealed && tile.adjacentMines > 0 && !tile.isCorrupted) {
                    tile.isCorrupted = true;
                    renderGrid();
                    logEntry("A tile has been corrupted!", "damage");
                    corrupted = true;
                }
            }
        }, 5000);
    }

    function checkWinCondition() {
        if (gameState.enemy.isBoss && gameState.enemy.phase === 3) {
            // Check for core destruction
            const core = gameState.enemy.coreLocation;
            if (!core) return;
            let adjacentFlags = 0;
            for (let r = -1; r <= 1; r++) {
                for (let c = -1; c <= 1; c++) {
                    const newRow = core.r + r, newCol = core.c + c;
                    if (newRow >= 0 && newRow < gameState.height && newCol >= 0 && newCol < gameState.width) {
                        if (gameState.grid[newRow][newCol].isFlagged) adjacentFlags++;
                    }
                }
            }
            if (adjacentFlags >= 8) { // All 8 surrounding tiles must be flagged
                endGame(true);
                return;
            }
        }

        // Normal win condition
        let tilesToReveal = 0;
        for (let r = 0; r < gameState.height; r++) {
            for (let c = 0; c < gameState.width; c++) {
                if (!gameState.grid[r][c].isMine && !gameState.grid[r][c].isRevealed) {
                    tilesToReveal++;
                }
            }
        }
        if (tilesToReveal === 0) {
            endGame(true);
        }
    }

    function endGame(isVictory) {
        gameState.isGameOver = true;
        clearInterval(gameState.enemy.attackInterval);
        clearInterval(gameState.enemy.corruptionInterval);
        resultModal.style.display = 'flex';
        
        if (isVictory) {
            resultTitle.textContent = gameState.isPracticeMode ? "Practice Complete!" : "Zone Cleared!";
            resultMessage.textContent = gameState.isPracticeMode ? "You've mastered the basics." : `You have cleared ${gameState.currentZone.name}!`;
            if (!gameState.isPracticeMode) {
                gameState.player.gold += gameState.currentZone.goldReward;
                awardXP(gameState.currentZone.xpReward);
                logEntry(`Zone Cleared! +${gameState.currentZone.goldReward} Gold, +${gameState.currentZone.xpReward} XP`, "loot");
            }
        } else {
            resultTitle.textContent = "You Have Been Defeated!";
            resultMessage.textContent = "The Shattered Grid claims another soul.";
        }
    }

    resultContinueBtn.addEventListener('click', () => {
        resultModal.style.display = 'none';
        showScreen('hub');
    });
    
    backToHubBtn.addEventListener('click', () => {
        if (confirm("Fleeing will not save your progress in this zone. Are you sure?")) {
            clearInterval(gameState.enemy.attackInterval);
            clearInterval(gameState.enemy.corruptionInterval);
            showScreen('hub');
        }
    });

    // --- Skills ---
    skillButton.addEventListener('click', () => {
        if (gameState.player.skillCharges > 0) {
            logEntry("Skill is already active!", "info");
            return;
        }
        if (gameState.player.class === 'Oracle') {
            // Reveal a random safe tile
            let safeTiles = [];
            for (let r = 0; r < gameState.height; r++) {
                for (let c = 0; c < gameState.width; c++) {
                    const tile = gameState.grid[r][c];
                    if (!tile.isMine && !tile.isRevealed) {
                        safeTiles.push({r, c});
                    }
                }
            }
            if (safeTiles.length > 0) {
                const randomTile = safeTiles[Math.floor(Math.random() * safeTiles.length)];
                revealTile(randomTile.r, randomTile.c);
                logEntry("Clairvoyance reveals a safe tile!", "skill");
            }
        } else {
            // Striker and Guardian skills are handled on click/flag
            gameState.player.skillCharges = 5;
            const skillName = gameState.player.class === 'Striker' ? 'Unstable Cleave' : 'Fortify';
            logEntry(`${skillName} activated!`, "skill");
        }
        updateSkillButton();
        updateUI();
    });

    function updateSkillButton() {
        const skillName = gameState.player.class === 'Striker' ? 'Unstable Cleave' :
                          gameState.player.class === 'Guardian' ? 'Fortify' :
                          'Clairvoyance';
        skillButton.textContent = `${skillName} ${gameState.player.skillCharges > 0 ? `(${gameState.player.skillCharges})` : ''}`;
        skillButton.disabled = gameState.player.class === 'Oracle' && gameState.isGameOver;
    }


    // --- UI & Progression ---
    function updateUI() {
        // Player UI
        document.getElementById('player-class-display').textContent = `${gameState.player.class} - ${gameState.player.weapon}`;
        document.getElementById('player-level').textContent = gameState.player.level;
        document.getElementById('player-health-text').textContent = gameState.player.health;
        document.getElementById('player-max-health-text').textContent = gameState.player.maxHealth;
        document.getElementById('player-health-bar').style.width = `${(gameState.player.health / gameState.player.maxHealth) * 100}%`;
        document.getElementById('player-damage').textContent = gameState.player.baseDamage;
        document.getElementById('player-gold').textContent = gameState.player.gold;
        document.getElementById('player-xp').textContent = gameState.player.xp;
        document.getElementById('player-xp-to-next').textContent = gameState.player.xpToNextLevel;

        // Enemy UI
        document.getElementById('enemy-name').textContent = gameState.enemy.name;
        document.getElementById('enemy-portrait').textContent = gameState.enemy.portrait;
        document.getElementById('enemy-health-text').textContent = gameState.enemy.health;
        document.getElementById('enemy-max-health-text').textContent = gameState.enemy.maxHealth;
        document.getElementById('enemy-health-bar').style.width = `${(gameState.enemy.health / gameState.enemy.maxHealth) * 100}%`;
    }
    
    function awardXP(amount) {
        gameState.player.xp += amount;
        while (gameState.player.xp >= gameState.player.xpToNextLevel) {
            levelUp();
        }
        updateUI();
    }

    function levelUp() {
        gameState.player.xp -= gameState.player.xpToNextLevel;
        gameState.player.level++;
        gameState.player.xpToNextLevel = Math.floor(gameState.player.xpToNextLevel * 1.5);
        
        const healthIncrease = 10;
        const damageIncrease = 2;
        gameState.player.maxHealth += healthIncrease;
        gameState.player.health += healthIncrease; // Heal on level up
        gameState.player.baseDamage += damageIncrease;

        logEntry(`LEVEL UP! You are now level ${gameState.player.level}!`, "levelup");
    }

    function logEntry(message, type = '') {
        const log = document.getElementById('log');
        const entry = document.createElement('div');
        entry.classList.add('log-entry', type);
        entry.textContent = message;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }
});
