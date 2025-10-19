const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const mapScreen = document.getElementById('mapScreen');
const gameUI = document.getElementById('gameUI');
const towerBtns = document.querySelectorAll('.towerBtn');
const mapBtns = document.querySelectorAll('.mapBtn');
const upgradePanel = document.getElementById('upgradePanel');
const upgradeButtons = document.getElementById('upgradeButtons');
const closeUpgrade = document.getElementById('closeUpgrade');
const backToStart = document.getElementById('backToStart');

// 🆕 3 UNIQUE MAPS!
const maps = {
    forest: {
        bgColor: '#4CAF50',
        pathColor: '#2E7D32',
        path: [
            {x: 0, y: 300}, {x: 120, y: 300}, {x: 120, y: 100}, {x: 280, y: 100}, {x: 280, y: 400}, {x: 400, y: 400}
        ],
        difficulty: 1
    },
    desert: {
        bgColor: '#FFECB3',
        pathColor: '#F57C00',
        path: [
            {x: 0, y: 200}, {x: 100, y: 200}, {x: 100, y: 450}, {x: 200, y: 450}, 
            {x: 200, y: 150}, {x: 300, y: 150}, {x: 300, y: 350}, {x: 400, y: 350}
        ],
        difficulty: 1.5
    },
    mountain: {
        bgColor: '#CFD8DC',
        pathColor: '#455A64',
        path: [
            {x: 0, y: 150}, {x: 80, y: 150}, {x: 80, y: 350}, {x: 180, y: 350}, 
            {x: 180, y: 100}, {x: 280, y: 100}, {x: 280, y: 300}, {x: 400, y: 300}
        ],
        difficulty: 2
    }
};

let currentMap = 'forest';
let selectedTower = 'basic';
let selectedTowerObj = null;

// Tower types (SAME)
const towerTypes = {
    basic: {
        0: { cost: 50, color: 'gold', damage: 25, range: 80, cooldown: 60, size: 20, label: 'I' },
        1: { cost: 75, color: 'orange', damage: 40, range: 90, cooldown: 50, size: 22, label: 'II' },
        2: { cost: 120, color: 'red', damage: 60, range: 100, cooldown: 40, size: 25, label: 'III' },
        3: { cost: 200, color: 'darkred', damage: 100, range: 120, cooldown: 30, size: 28, label: 'MAX' }
    },
    fast: {
        0: { cost: 40, color: 'blue', damage: 15, range: 60, cooldown: 30, size: 20, label: 'I' },
        1: { cost: 60, color: 'cyan', damage: 25, range: 70, cooldown: 20, size: 22, label: 'II' },
        2: { cost: 100, color: 'navy', damage: 35, range: 80, cooldown: 15, size: 25, label: 'III' },
        3: { cost: 150, color: 'darkblue', damage: 50, range: 90, cooldown: 10, size: 28, label: 'MAX' }
    },
    aoe: {
        0: { cost: 80, color: 'purple', damage: 40, range: 100, cooldown: 90, size: 20, label: 'I' },
        1: { cost: 120, color: 'magenta', damage: 60, range: 120, cooldown: 75, size: 22, label: 'II' },
        2: { cost: 180, color: 'darkmagenta', damage: 90, range: 140, cooldown: 60, size: 25, label: 'III' },
        3: { cost: 300, color: 'black', damage: 150, range: 160, cooldown: 45, size: 28, label: 'MAX' }
    }
};

// Responsive canvas
let PATH = [];
function resizeCanvas() {
    const size = Math.min(window.innerWidth, 480);
    canvas.width = size; canvas.height = size * 1.25;
    PATH = maps[currentMap].path.map(p => ({
        x: (p.x / 400) * canvas.width,
        y: (p.y / 500) * canvas.height
    }));
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 🔥 FIXED MAP BUTTONS!
mapBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentMap = btn.dataset.map;
        mapBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        alert(`Selected ${currentMap.toUpperCase()}!`); // 🆕 TEMP CONFIRM
    });
});

backToStart.addEventListener('click', () => {
    mapScreen.style.display = 'none';
    startScreen.style.display = 'block';
});

// TOWER BUTTONS
towerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        selectedTower = btn.dataset.type;
        towerBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    });
});

// UPGRADE SYSTEM
function showUpgradePanel(tower) {
    selectedTowerObj = tower; upgradeButtons.innerHTML = '';
    const type = towerTypes[tower.type]; const level = tower.level || 0;
    for (let i = level + 1; i <= 3; i++) {
        const config = type[i];
        const btn = document.createElement('button');
        btn.className = `upgradeBtn upgrade${i}`;
        btn.innerText = `${config.label} $${config.cost}`;
        btn.addEventListener('click', () => upgradeTower(tower, i));
        btn.disabled = game.money < config.cost;
        upgradeButtons.appendChild(btn);
    }
    upgradePanel.style.display = 'block';
}

function upgradeTower(tower, newLevel) {
    const config = towerTypes[tower.type][newLevel];
    if (game.money >= config.cost) {
        tower.level = newLevel; tower.damage = config.damage; tower.range = config.range;
        tower.cooldownMax = config.cooldown; tower.size = config.size;
        game.money -= config.cost; saveGame(); upgradePanel.style.display = 'none';
    }
}

closeUpgrade.addEventListener('click', () => upgradePanel.style.display = 'none');

// SAVE/LOAD
function saveGame() {
    const saveData = {
        map: currentMap, wave: game.wave, money: game.money, lives: game.lives,
        canvasWidth: canvas.width, canvasHeight: canvas.height,
        towers: game.towers.map(t => ({x: t.x, y: t.y, type: t.type, level: t.level || 0}))
    };
    localStorage.setItem('towerDefenseSave', JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem('towerDefenseSave');
    if (!saved) return false;
    const data = JSON.parse(saved);
    currentMap = data.map || 'forest';
    game.wave = data.wave || 1; game.money = data.money || 100; game.lives = data.lives || 20;
    canvas.width = data.canvasWidth || 400; canvas.height = data.canvasHeight || 500;
    resizeCanvas();
    game.towers = data.towers.map(t => new Tower(t.x, t.y, t.type, t.level));
    selectedTower = 'basic'; towerBtns[0].classList.add('selected');
    return true;
}

function startNewGame() {
    game = { enemies: [], towers: [], projectiles: [], wave: 1, money: 100, lives: 20 };
    startScreen.style.display = 'none';
    mapScreen.style.display = 'block';
    mapBtns[0].classList.add('selected');
}

function startGame() {
    mapScreen.style.display = 'none'; gameUI.style.display = 'flex';
    towerBtns[0].classList.add('selected');
    if (game.enemies.length === 0) spawnWave();
    gameLoop();
}

// 🔥 START BUTTONS!
document.getElementById('newGame').addEventListener('click', startNewGame);
document.getElementById('loadGame').addEventListener('click', () => {
    if (loadGame()) { 
        startGame(); 
        alert(`✅ Loaded ${currentMap.toUpperCase()}!`);
    } else { 
        alert('No saved game!'); 
        startNewGame(); 
    }
});

// CLASSES
class Tower {
    constructor(x, y, type = 'basic', level = 0) {
        this.x = x; this.y = y; this.type = type; this.level = level;
        const config = towerTypes[type][level];
        this.damage = config.damage; this.range = config.range;
        this.cooldown = 0; this.cooldownMax = config.cooldown; this.size = config.size;
    }
    update() {
        if (this.cooldown > 0) this.cooldown--;
        if (this.cooldown === 0) {
            const targets = game.enemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) < this.range);
            if (targets.length > 0) {
                if (this.type === 'aoe') {
                    targets.forEach(t => {
                        t.health -= this.damage;
                        if (t.health <= 0) {
                            game.enemies.splice(game.enemies.indexOf(t), 1);
                            game.money += 10;
                        }
                    });
                } else {
                    const target = targets[0];
                    target.health -= this.damage;
                    if (target.health <= 0) {
                        game.enemies.splice(game.enemies.indexOf(target), 1);
                        game.money += 10;
                    }
                }
                this.cooldown = this.cooldownMax;
            }
        }
    }
    draw() {
        const config = towerTypes[this.type][this.level];
        ctx.fillStyle = config.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = config.color + '30';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.range, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = 'white'; ctx.font = '12px Arial';
        ctx.fillText(config.label, this.x-5, this.y+4);
    }
}

class Enemy {
    constructor() {
        this.x = PATH[0].x; this.y = PATH[0].y; this.pathIndex = 0;
        this.health = 50 * maps[currentMap].difficulty;
        this.maxHealth = this.health;
        this.speed = 1 * maps[currentMap].difficulty;
        this.size = 15;
    }
    update() {
        const target = PATH[this.pathIndex];
        const dx = target.x - this.x; const dy = target.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < this.speed) {
            this.pathIndex++;
            if (this.pathIndex >= PATH.length) { game.lives--; return false; }
        } else {
            this.x += (dx/dist) * this.speed;
            this.y += (dy/dist) * this.speed;
        }
        return true;
    }
    draw() {
        ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'green'; ctx.fillRect(this.x-15, this.y-20, 30 * (this.health/this.maxHealth), 5);
    }
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    selectedTowerObj = game.towers.find(t => Math.hypot(t.x - x, t.y - y) < t.size);
    if (selectedTowerObj) {
        showUpgradePanel(selectedTowerObj);
    } else {
        const type = towerTypes[selectedTower][0];
        if (game.money >= type.cost) {
            game.towers.push(new Tower(x, y, selectedTower));
            game.money -= type.cost; saveGame();
        }
    }
});

function spawnWave() {
    const enemyCount = Math.floor(game.wave * 2 * maps[currentMap].difficulty);
    for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => game.enemies.push(new Enemy()), i * 800);
    }
}

function gameLoop() {
    ctx.fillStyle = maps[currentMap].bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = maps[currentMap].pathColor; ctx.lineWidth = 20;
    ctx.beginPath(); ctx.moveTo(PATH[0].x, PATH[0].y);
    for (let p of PATH) ctx.lineTo(p.x, p.y); ctx.stroke();
    
    game.enemies = game.enemies.filter(e => e.update());
    game.towers.forEach(t => t.update());
    game.enemies.forEach(e => e.draw());
    game.towers.forEach(t => t.draw());
    
    ctx.fillStyle = 'black'; ctx.font = '20px Arial';
    ctx.fillText(`Wave: ${game.wave} | $$: ${game.money} | ❤️: ${game.lives}`, 10, 30);
    ctx.fillText(`Map: ${currentMap}`, 10, 55);
    
    if (game.enemies.length === 0 && Date.now() > (game.lastWave || 0) + 5000) {
        game.wave++; game.lastWave = Date.now(); spawnWave();
    }
    
    saveGame(); requestAnimationFrame(gameLoop);
}

// Initialize
game = { enemies: [], towers: [], projectiles: [], wave: 1, money: 100, lives: 20 };

// 🔥 MAP START BUTTON!
mapBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentMap = btn.dataset.map;
        mapBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        game = { enemies: [], towers: [], projectiles: [], wave: 1, money: 100, lives: 20 };
        startGame(); // 🆕 START GAME IMMEDIATELY!
    });
});

setInterval(saveGame, 10000);