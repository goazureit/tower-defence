const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const mapScreen = document.getElementById('mapScreen');
const gameUI = document.getElementById('gameUI');
const gameOverScreen = document.getElementById('gameOverScreen');
const towerBtns = document.querySelectorAll('.towerBtn');
const mapBtns = document.querySelectorAll('.mapBtn');
const upgradePanel = document.getElementById('upgradePanel');
const upgradeButtons = document.getElementById('upgradeButtons');
const closeUpgrade = document.getElementById('closeUpgrade');
const backToStart = document.getElementById('backToStart');

let mouseX = 0, mouseY = 0;
let ghostTower = null;
let gameLoopRunning = false;
let placementPreview = false;
let lastTouchTime = 0;
let placementMessage = '';
let messageTimer = 0;

class Projectile {
    constructor(x, y, targetX, targetY, damage, color, speed = 5, ability = 'none', isCrit = false, level = 0, targetEnemy = null) { // 🆕 Added targetEnemy
        this.x = x; this.y = y; this.targetX = targetX; this.targetY = targetY;
        this.damage = damage; this.color = color; this.speed = speed; this.ability = ability; this.isCrit = isCrit;
        this.level = level; this.angle = Math.atan2(targetY - y, targetX - x); this.alpha = 1;
        this.targetEnemy = targetEnemy; // 🆕 Reference to target enemy
    }
    update() {
        if (this.ability === 'laser') {
            this.alpha -= 0.05;
            return this.alpha > 0;
        }
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        const dist = Math.hypot(this.x - this.targetX, this.y - this.targetY);
        if (dist <= 5 && this.ability === 'none' && this.targetEnemy) { // 🆕 Apply damage for standard projectiles
            this.targetEnemy.health -= this.damage;
            if (this.targetEnemy.health <= 0) {
                const index = game.enemies.indexOf(this.targetEnemy);
                if (index !== -1) {
                    game.enemies.splice(index, 1);
                    game.money += this.targetEnemy.reward;
                }
            }
            return false; // Remove projectile after hitting
        }
        return dist > 5;
    }
    draw() {
        ctx.globalAlpha = this.ability === 'laser' ? this.alpha : 1;
        if (this.ability === 'laser') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.level === 4 ? 6 : this.isCrit ? 5 : 3;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.targetX, this.targetY);
            ctx.stroke();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.isCrit ? 6 : 4, 0, Math.PI*2); ctx.fill(); // 🆕 Increased size
            // 🆕 Trail effect for visibility
            ctx.globalAlpha = 0.3;
            ctx.beginPath(); ctx.arc(this.x - Math.cos(this.angle) * 5, this.y - Math.sin(this.angle) * 5, 3, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
}

const towerTypes = {
    basic: {
        0:{cost:50,color:'gold',damage:25,range:80,cooldown:60,size:20,label:'I',bullet:'yellow',ability:'none'},
        1:{cost:75,color:'orange',damage:40,range:90,cooldown:50,size:22,label:'II',bullet:'orange',ability:'none'},
        2:{cost:120,color:'red',damage:60,range:100,cooldown:40,size:25,label:'III',bullet:'red',ability:'none'},
        3:{cost:200,color:'darkred',damage:100,range:120,cooldown:30,size:28,label:'MAX',bullet:'darkred',ability:'none'},
        4:{cost:300,color:'goldenrod',damage:150,range:140,cooldown:20,size:30,label:'OP',bullet:'yellow',ability:'none'}
    },
    fast: {
        0:{cost:40,color:'blue',damage:10,range:60,cooldown:30,size:20,label:'I',bullet:'lightblue',ability:'freeze'},
        1:{cost:60,color:'cyan',damage:15,range:70,cooldown:20,size:22,label:'II',bullet:'cyan',ability:'freeze'},
        2:{cost:100,color:'navy',damage:25,range:80,cooldown:15,size:25,label:'III',bullet:'blue',ability:'freeze'},
        3:{cost:150,color:'darkblue',damage:40,range:90,cooldown:10,size:28,label:'MAX',bullet:'navy',ability:'freeze'},
        4:{cost:250,color:'dodgerblue',damage:60,range:100,cooldown:5,size:30,label:'OP',bullet:'lightblue',ability:'freeze'}
    },
    snare: {
        0:{cost:60,color:'green',damage:20,range:90,cooldown:50,size:20,label:'I',bullet:'lime',ability:'snare'},
        1:{cost:90,color:'darkgreen',damage:35,range:100,cooldown:40,size:22,label:'II',bullet:'green',ability:'snare'},
        2:{cost:140,color:'forestgreen',damage:55,range:110,cooldown:30,size:25,label:'III',bullet:'darkgreen',ability:'snare'},
        3:{cost:220,color:'black',damage:90,range:130,cooldown:20,size:28,label:'MAX',bullet:'olive',ability:'snare'},
        4:{cost:350,color:'limegreen',damage:130,range:150,cooldown:15,size:30,label:'OP',bullet:'lime',ability:'snare'}
    },
    poison: {
        0:{cost:70,color:'purple',damage:15,range:85,cooldown:70,size:20,label:'I',bullet:'violet',ability:'poison'},
        1:{cost:100,color:'indigo',damage:25,range:95,cooldown:60,size:22,label:'II',bullet:'purple',ability:'poison'},
        2:{cost:160,color:'darkviolet',damage:40,range:105,cooldown:50,size:25,label:'III',bullet:'indigo',ability:'poison'},
        3:{cost:250,color:'black',damage:70,range:125,cooldown:40,size:28,label:'MAX',bullet:'darkviolet',ability:'poison'},
        4:{cost:400,color:'plum',damage:100,range:140,cooldown:30,size:30,label:'OP',bullet:'violet',ability:'poison'}
    },
    aoe: {
        0:{cost:80,color:'magenta',damage:40,range:100,cooldown:90,size:20,label:'I',bullet:'pink',ability:'explode'},
        1:{cost:120,color:'darkmagenta',damage:60,range:120,cooldown:75,size:22,label:'II',bullet:'magenta',ability:'explode'},
        2:{cost:180,color:'rebeccapurple',damage:90,range:140,cooldown:60,size:25,label:'III',bullet:'darkmagenta',ability:'explode'},
        3:{cost:300,color:'black',damage:150,range:160,cooldown:45,size:28,label:'MAX',bullet:'black',ability:'explode'},
        4:{cost:450,color:'hotpink',damage:200,range:180,cooldown:35,size:30,label:'OP',bullet:'pink',ability:'explode'}
    },
    sniper: {
        0:{cost:90,color:'black',damage:80,range:150,cooldown:120,size:18,label:'I',bullet:'white',ability:'sniper'},
        1:{cost:130,color:'gray',damage:120,range:170,cooldown:100,size:20,label:'II',bullet:'silver',ability:'sniper'},
        2:{cost:200,color:'darkgray',damage:180,range:190,cooldown:80,size:22,label:'III',bullet:'gray',ability:'sniper'},
        3:{cost:320,color:'black',damage:300,range:220,cooldown:60,size:25,label:'MAX',bullet:'white',ability:'sniper'},
        4:{cost:500,color:'silver',damage:450,range:250,cooldown:50,size:28,label:'OP',bullet:'white',ability:'sniper'}
    },
    laser: {
        0:{cost:100,color:'cyan',damage:30,range:200,cooldown:100,size:20,label:'I',bullet:'cyan',ability:'laser'},
        1:{cost:150,color:'lightcyan',damage:50,range:220,cooldown:85,size:22,label:'II',bullet:'lightcyan',ability:'laser'},
        2:{cost:220,color:'deepskyblue',damage:80,range:240,cooldown:70,size:25,label:'III',bullet:'deepskyblue',ability:'laser'},
        3:{cost:350,color:'darkcyan',damage:120,range:260,cooldown:55,size:28,label:'MAX',bullet:'darkcyan',ability:'laser'},
        4:{cost:550,color:'aqua',damage:180,range:280,cooldown:40,size:30,label:'OP',bullet:'aqua',ability:'laser'}
    }
};

const difficultyLevels = [
    { wave: 1, name: 'Easy', multiplier: 1, enemyTypes: ['basic'], spawnRate: 800 },
    { wave: 11, name: 'Medium', multiplier: 1.5, enemyTypes: ['basic', 'fast'], spawnRate: 700 },
    { wave: 21, name: 'Hard', multiplier: 2, enemyTypes: ['basic', 'fast', 'tank'], spawnRate: 600 },
    { wave: 31, name: 'Nightmare', multiplier: 3, enemyTypes: ['basic', 'fast', 'tank', 'stealth'], spawnRate: 500 },
    { wave: 41, name: 'Insane', multiplier: 4, enemyTypes: ['basic', 'fast', 'tank', 'stealth'], spawnRate: 400 }
];

const enemyTypes = {
    basic: { color: 'red', health: 50, speed: 1, size: 15, reward: 10 },
    fast: { color: 'orange', health: 30, speed: 2, size: 12, reward: 15 },
    tank: { color: 'darkred', health: 150, speed: 0.5, size: 20, reward: 25 },
    stealth: { color: 'purple', health: 80, speed: 1.5, size: 14, reward: 20 }
};

const maps = {
    forest: { bgColor: '#4CAF50', pathColor: '#2E7D32', path: [{x:0,y:0.6},{x:0.3,y:0.6},{x:0.3,y:0.2},{x:0.7,y:0.2},{x:0.7,y:0.8},{x:1,y:0.8}], difficulty: 1 },
    desert: { bgColor: '#FFECB3', pathColor: '#F57C00', path: [{x:0,y:0.4},{x:0.25,y:0.4},{x:0.25,y:0.9},{x:0.5,y:0.9},{x:0.5,y:0.3},{x:0.75,y:0.3},{x:0.75,y:0.7},{x:1,y:0.7}], difficulty: 1.5 },
    mountain: { bgColor: '#CFD8DC', pathColor: '#455A64', path: [{x:0,y:0.3},{x:0.2,y:0.3},{x:0.2,y:0.7},{x:0.45,y:0.7},{x:0.45,y:0.2},{x:0.7,y:0.2},{x:0.7,y:0.6},{x:1,y:0.6}], difficulty: 2 }
};

let currentMap = 'forest', selectedTower = 'basic', selectedTowerObj = null, PATH = [];
let tutorialStep = 0;

const tutorialSteps = [
    { text: "1. Tap a tower type below", target: '.towerBtn' },
    { text: "2. Tap to preview, tap again to place", target: '#gameCanvas' },
    { text: "3. Tap your tower to upgrade it!", target: '.towerBtn' }
];
const tutorial = document.getElementById('tutorial');
const tutorialText = document.getElementById('tutorialText');
const nextStep = document.getElementById('nextStep');

function showTutorial() { tutorial.style.display = 'flex'; updateTutorial(); }
function updateTutorial() {
    if (tutorialStep < tutorialSteps.length) {
        tutorialText.innerHTML = tutorialSteps[tutorialStep].text;
        nextStep.onclick = nextTutorial;
    } else { tutorial.style.display = 'none'; localStorage.setItem('tutorialDone', 'true'); }
}
function nextTutorial() { tutorialStep++; updateTutorial(); }

function resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth * 0.9, 480);
    const maxHeight = Math.min(window.innerHeight * 0.9, 600);
    canvas.width = maxWidth; canvas.height = maxHeight;
    PATH = maps[currentMap].path.map(p => ({x: p.x * canvas.width, y: p.y * canvas.height}));
}
resizeCanvas(); window.addEventListener('resize', resizeCanvas);

mapBtns.forEach(btn => btn.addEventListener('click', () => {
    currentMap = btn.dataset.map; mapBtns.forEach(b => b.classList.remove('selected')); btn.classList.add('selected');
    game = { enemies: [], towers: [], projectiles: [], wave: 1, money: 100, lives: 20 }; startGame();
}));
backToStart.addEventListener('click', () => { mapScreen.style.display = 'none'; startScreen.style.display = 'block'; });

towerBtns.forEach(btn => btn.addEventListener('click', () => {
    selectedTower = btn.dataset.type; 
    towerBtns.forEach(b => b.classList.remove('selected')); 
    btn.classList.add('selected');
    ghostTower = { x: mouseX, y: mouseY, type: selectedTower, level: 0 };
    placementPreview = false;
}));

closeUpgrade.addEventListener('click', () => { upgradePanel.style.display = 'none'; placementPreview = false; });

function getDifficulty() {
    const level = difficultyLevels.find(l => game.wave <= l.wave) || difficultyLevels[difficultyLevels.length - 1];
    return { ...level, mapMultiplier: maps[currentMap].difficulty };
}

function showUpgradePanel(tower) {
    selectedTowerObj = tower; upgradeButtons.innerHTML = '';
    const type = towerTypes[tower.type]; const level = tower.level || 0;
    for (let i = level + 1; i <= 4; i++) {
        const config = type[i];
        const btn = document.createElement('button');
        btn.className = `upgradeBtn upgrade${i}`; 
        btn.innerText = `${config.label} $${config.cost}`;
        btn.addEventListener('click', () => upgradeTower(tower, i));
        btn.disabled = game.money < config.cost; upgradeButtons.appendChild(btn);
    }
    upgradePanel.style.display = 'block';
}
function upgradeTower(tower, newLevel) {
    const config = towerTypes[tower.type][newLevel];
    if (game.money >= config.cost) {
        tower.level = newLevel; tower.damage = config.damage; tower.range = config.range;
        tower.cooldownMax = config.cooldown; tower.size = config.size; 
        tower.bulletColor = config.bullet; tower.ability = config.ability;
        game.money -= config.cost; saveGame(); upgradePanel.style.display = 'none';
        placementPreview = false;
    }
}

function saveGame() {
    localStorage.setItem('towerDefenseSave', JSON.stringify({
        map: currentMap, wave: game.wave, money: game.money, lives: game.lives,
        canvasWidth: canvas.width, canvasHeight: canvas.height,
        towers: game.towers.map(t => ({x: t.x, y: t.y, type: t.type, level: t.level || 0}))
    }));
}
function loadGame() {
    const saved = JSON.parse(localStorage.getItem('towerDefenseSave'));
    if (!saved) return false;
    currentMap = saved.map || 'forest'; game.wave = saved.wave || 1; 
    game.money = saved.money || 100; game.lives = saved.lives || 20;
    canvas.width = saved.canvasWidth || 400; canvas.height = saved.canvasHeight || 500;
    resizeCanvas(); game.towers = saved.towers.map(t => new Tower(t.x, t.y, t.type, t.level));
    towerBtns[0].classList.add('selected'); return true;
}

function startNewGame() {
    game = { enemies: [], towers: [], projectiles: [], wave: 1, money: 100, lives: 20 };
    ghostTower = null; placementPreview = false;
    startScreen.style.display = 'none'; mapScreen.style.display = 'block';
    mapBtns[0].classList.add('selected');
}
function startGame() {
    mapScreen.style.display = 'none'; gameUI.style.display = 'flex';
    gameOverScreen.style.display = 'none';
    towerBtns[0].classList.add('selected');
    ghostTower = { x: mouseX, y: mouseY, type: 'basic', level: 0 };
    if (game.enemies.length === 0) spawnWave();
    if (!localStorage.getItem('tutorialDone')) showTutorial();
    gameLoopRunning = true;
    gameLoop();
}

document.getElementById('newGame').addEventListener('click', startNewGame);
document.getElementById('loadGame').addEventListener('click', () => {
    if (loadGame()) { startGame(); alert(`✅ Loaded ${currentMap.toUpperCase()}!`); }
    else { alert('No saved game!'); startNewGame(); }
});
document.getElementById('restartGame')?.addEventListener('click', () => {
    gameLoopRunning = false;
    startNewGame();
    gameOverScreen.style.display = 'none';
    mapScreen.style.display = 'block';
});
setInterval(saveGame, 10000);

function isOnPath(x, y) {
    for (let i = 0; i < PATH.length; i++) {
        const p1 = PATH[i];
        const p2 = PATH[(i + 1) % PATH.length];
        const dist = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y);
        if (dist < 20) return true;
    }
    return false;
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1; const B = py - y1; const C = x2 - x1; const D = y2 - y1;
    const dot = A * C + B * D; const lenSq = C * C + D * D;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    const param = dot / lenSq;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    return Math.hypot(px - xx, py - yy);
}

function drawGhostTower(x, y) {
    if (!ghostTower) return;
    const config = towerTypes[ghostTower.type][0];
    const canPlace = game.money >= config.cost && !isOnPath(x, y);
    
    ctx.globalAlpha = placementPreview ? 0.8 : 0.6;
    ctx.fillStyle = canPlace ? config.color : 'red';
    ctx.beginPath(); ctx.arc(x, y, config.size, 0, Math.PI*2); ctx.fill();
    
    ctx.strokeStyle = canPlace ? config.color + '40' : 'red';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, config.range, 0, Math.PI*2); ctx.stroke();
    
    ctx.fillStyle = canPlace ? 'white' : 'black';
    ctx.font = '12px Arial'; ctx.fillText(config.label, x-5, y+4);
    ctx.globalAlpha = 1;
    
    if (placementPreview && canPlace) {
        ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 200) * 0.2;
        ctx.fillStyle = config.color;
        ctx.beginPath(); ctx.arc(x, y, config.size + 5, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class Tower {
    constructor(x, y, type = 'basic', level = 0) {
        this.x = x; this.y = y; this.type = type; this.level = level;
        const config = towerTypes[type][level];
        this.damage = config.damage; this.range = config.range;
        this.cooldown = 0; this.cooldownMax = config.cooldown; this.size = config.size;
        this.bulletColor = config.bullet; this.ability = config.ability;
    }
    update() {
        if (this.cooldown > 0) this.cooldown--;
        if (this.cooldown === 0) {
            const targets = game.enemies.filter(e => {
                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                console.log(`Tower(${this.type}, x:${this.x}, y:${this.y}, range:${this.range}) checking enemy(x:${e.x}, y:${e.y}), dist:${dist}`); // 🆕 Active debug
                return dist <= this.range;
            });
            if (targets.length > 0) {
                console.log(`Tower(${this.type}) firing at ${targets.length} target(s)`); // 🆕 Active debug
                if (this.ability === 'explode') {
                    let explosionTargets = [targets[0]];
                    const maxTargets = this.level === 4 ? 5 : 3;
                    for (let i = 0; i < maxTargets - 1 && explosionTargets.length < maxTargets; i++) {
                        const nearby = game.enemies.find(e => 
                            e !== explosionTargets[explosionTargets.length-1] && 
                            Math.hypot(e.x - explosionTargets[explosionTargets.length-1].x, 
                                     e.y - explosionTargets[explosionTargets.length-1].y) < 40
                        );
                        if (nearby) explosionTargets.push(nearby);
                    }
                    explosionTargets.forEach(t => {
                        t.health -= this.damage;
                        if (t.health <= 0) { game.enemies.splice(game.enemies.indexOf(t), 1); game.money += t.reward; }
                    });
                } else if (this.ability === 'laser') {
                    const target = targets[0];
                    let hitEnemies = [target];
                    let current = target;
                    const maxHits = this.level === 4 ? 7 : 5;
                    for (let i = 0; i < maxHits - 1; i++) {
                        const next = game.enemies.find(e => 
                            e !== current && 
                            Math.hypot(e.x - this.x, e.y - this.y) <= this.range &&
                            Math.abs(Math.atan2(e.y - this.y, e.x - this.x) - Math.atan2(target.y - this.y, target.x - this.x)) < 0.1
                        );
                        if (next) hitEnemies.push(next);
                        current = next;
                    }
                    hitEnemies.forEach(e => {
                        e.health -= this.damage;
                        if (e.health <= 0) { game.enemies.splice(game.enemies.indexOf(e), 1); game.money += e.reward; }
                    });
                    game.projectiles.push(new Projectile(this.x, this.y, target.x, target.y, this.damage, this.bulletColor, 0, this.ability, false, this.level));
                } else {
                    const target = targets[0];
                    let finalDamage = this.damage;
                    let isCrit = false;
                    if (this.ability === 'sniper' && Math.random() < (this.level === 4 ? 0.75 : 0.5)) {
                        finalDamage *= 2; isCrit = true;
                    }
                    game.projectiles.push(new Projectile(this.x, this.y, target.x, target.y, finalDamage, this.bulletColor, 7, this.ability, isCrit, this.level, target)); // 🆕 Pass target enemy
                }
                this.cooldown = this.cooldownMax;
            }
        }
    }
    draw() {
        const config = towerTypes[this.type][this.level];
        ctx.fillStyle = config.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = config.color + '30'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.range, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.fillText(config.label, this.x-5, this.y+4);
        if (selectedTowerObj === this) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'yellow';
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size + 5, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
}

class Enemy {
    constructor(type = 'basic') {
        const config = enemyTypes[type];
        const diff = getDifficulty();
        this.x = PATH[0].x; this.y = PATH[0].y; this.pathIndex = 0;
        this.type = type; this.color = config.color;
        this.health = config.health * diff.multiplier * diff.mapMultiplier;
        this.maxHealth = this.health; this.baseSpeed = config.speed * diff.multiplier * diff.mapMultiplier;
        this.speed = this.baseSpeed; this.size = config.size; this.reward = config.reward;
        this.frozenUntil = 0; this.slowUntil = 0;
        this.poisonDamage = 0; this.poisonUntil = 0;
    }
    update() {
        const now = Date.now();
        if (now < this.poisonUntil) {
            this.health -= this.poisonDamage;
            if (this.health <= 0) { game.enemies.splice(game.enemies.indexOf(this), 1); game.money += this.reward; return false; }
        }
        
        if (now < this.frozenUntil) { this.speed = 0; } 
        else if (now < this.slowUntil) { this.speed = this.baseSpeed * 0.5; }
        else { this.speed = this.baseSpeed; }
        
        const target = PATH[this.pathIndex];
        const dx = target.x - this.x; const dy = target.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < this.speed) {
            this.pathIndex++; if (this.pathIndex >= PATH.length) { game.lives--; return false; }
        } else {
            this.x += (dx/dist) * this.speed; this.y += (dy/dist) * this.speed;
        }
        return true;
    }
    draw() {
        ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'green'; ctx.fillRect(this.x-this.size, this.y-this.size-5, this.size*2 * (this.health/this.maxHealth), 3);
        if (Date.now() < this.frozenUntil) {
            ctx.fillStyle = 'rgba(0,150,255,0.5)'; ctx.beginPath(); ctx.arc(this.x, this.y, this.size+3, 0, Math.PI*2); ctx.fill();
        }
        if (Date.now() < this.poisonUntil) {
            ctx.fillStyle = 'rgba(128,0,128,0.5)'; ctx.beginPath(); ctx.arc(this.x, this.y, this.size+2, 0, Math.PI*2); ctx.fill();
        }
    }
}

function spawnWave() {
    const diff = getDifficulty();
    const enemyCount = Math.min(Math.floor(game.wave * 2 * diff.multiplier), 30);
    const types = diff.enemyTypes;
    for (let i = 0; i < enemyCount; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        setTimeout(() => game.enemies.push(new Enemy(type)), i * diff.spawnRate);
    }
    game.lastWave = Date.now();
}

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (ghostTower) {
        ghostTower.x = mouseX; ghostTower.y = mouseY;
    }
});

canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); ghostTower = null; placementPreview = false; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { ghostTower = null; placementPreview = false; } });

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastTouchTime < 300) return;
    lastTouchTime = now;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = (touch.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (touch.clientY - rect.top) * (canvas.height / rect.height);
    
    selectedTowerObj = game.towers.find(t => Math.hypot(t.x - mouseX, t.y - mouseY) < t.size * 2);
    if (selectedTowerObj) { 
        showUpgradePanel(selectedTowerObj); 
        if (tutorialStep === 2) nextTutorial(); 
        ghostTower = null; placementPreview = false;
    } else if (ghostTower) {
        const config = towerTypes[selectedTower][0];
        if (placementPreview) {
            if (game.money >= config.cost && !isOnPath(mouseX, mouseY)) {
                game.towers.push(new Tower(mouseX, mouseY, selectedTower)); 
                game.money -= config.cost; 
                saveGame();
                ctx.fillStyle = 'rgba(255,215,0,0.2)'; 
                ctx.beginPath(); ctx.arc(mouseX, mouseY, 50, 0, Math.PI*2); ctx.fill();
                if (tutorialStep === 1) nextTutorial();
                ghostTower = null; placementPreview = false;
            } else {
                placementMessage = !isOnPath(mouseX, mouseY) ? 'Not enough money!' : 'Cannot place on path!';
                messageTimer = Date.now() + 2000;
                ghostTower = null; placementPreview = false;
            }
        } else {
            placementPreview = true;
            ghostTower.x = mouseX; ghostTower.y = mouseY;
        }
    }
}, { passive: false });

let lastTap = 0;
canvas.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) { ghostTower = null; placementPreview = false; }
    lastTap = now;
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    selectedTowerObj = game.towers.find(t => Math.hypot(t.x - x, t.y - y) < t.size * 2);
    if (selectedTowerObj) { 
        showUpgradePanel(selectedTowerObj); 
        if (tutorialStep === 2) nextTutorial(); 
        ghostTower = null; placementPreview = false;
    } else if (ghostTower) {
        const config = towerTypes[selectedTower][0];
        if (game.money >= config.cost && !isOnPath(x, y)) {
            game.towers.push(new Tower(x, y, selectedTower)); 
            game.money -= config.cost; 
            saveGame();
            ctx.fillStyle = 'rgba(255,215,0,0.2)'; 
            ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI*2); ctx.fill();
            if (tutorialStep === 1) nextTutorial();
        } else {
            placementMessage = !isOnPath(x, y) ? 'Not enough money!' : 'Cannot place on path!';
            messageTimer = Date.now() + 2000;
        }
        ghostTower = null; placementPreview = false;
    }
});

function gameLoop() {
    if (!gameLoopRunning) return;
    ctx.fillStyle = maps[currentMap].bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = maps[currentMap].pathColor; ctx.lineWidth = 20;
    ctx.beginPath(); ctx.moveTo(PATH[0].x, PATH[0].y); for (let p of PATH) ctx.lineTo(p.x, p.y); ctx.stroke();
    
    drawGhostTower(mouseX, mouseY);
    
    game.projectiles = game.projectiles.filter(p => p.update()).slice(0, 100);
    
    game.enemies = game.enemies.filter(e => e.update());
    game.towers.forEach(t => t.update());
    game.enemies.forEach(e => e.draw());
    game.towers.forEach(t => t.draw());
    
    const diff = getDifficulty();
    ctx.fillStyle = 'white'; ctx.font = 'bold 20px Arial';
    ctx.fillText(`Wave ${game.wave} (${diff.name})`, 10, 30);
    ctx.fillText(`$${game.money}`, 10, 55);
    ctx.fillText(`Lives: ${game.lives}`, canvas.width - 90, 30);
    
    if (messageTimer > Date.now()) {
        ctx.fillStyle = 'red'; ctx.font = '16px Arial';
        ctx.fillText(placementMessage, canvas.width / 2 - 50, canvas.height - 30);
    }
    
    if (game.lives <= 0) {
        gameLoopRunning = false;
        gameUI.style.display = 'none';
        gameOverScreen.style.display = 'flex';
        document.getElementById('finalWave').innerText = `Reached Wave: ${game.wave}`;
        saveGame();
        return;
    }
    
    if (game.enemies.length === 0 && Date.now() > (game.lastWave || 0) + 5000) {
        game.wave++; spawnWave();
    }
    requestAnimationFrame(gameLoop);
}

game = { enemies: [], towers: [], projectiles: [], wave: 1, money: 100, lives: 20 };