// 🆕 FIXED: GHOST SPAWNS INSTANTLY!
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

let mouseX = 0, mouseY = 0;
let ghostTower = null;

class Projectile {
    constructor(x, y, targetX, targetY, damage, color, speed = 5, ability = 'none', isCrit = false) {
        this.x = x; this.y = y; this.targetX = targetX; this.targetY = targetY;
        this.damage = damage; this.color = color; this.speed = speed; this.ability = ability; this.isCrit = isCrit;
        const dx = targetX - x; const dy = targetY - y;
        this.angle = Math.atan2(dy, dx);
    }
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        return Math.hypot(this.x - this.targetX, this.y - this.targetY) > 5;
    }
    draw() {
        ctx.fillStyle = this.color; ctx.beginPath();
        ctx.arc(this.x, this.y, this.isCrit ? 5 : 3, 0, Math.PI*2); ctx.fill();
    }
}

const towerTypes = {
    basic: {
        0:{cost:50,color:'gold',damage:25,range:80,cooldown:60,size:20,label:'I',bullet:'yellow',ability:'none'},
        1:{cost:75,color:'orange',damage:40,range:90,cooldown:50,size:22,label:'II',bullet:'orange',ability:'none'},
        2:{cost:120,color:'red',damage:60,range:100,cooldown:40,size:25,label:'III',bullet:'red',ability:'none'},
        3:{cost:200,color:'darkred',damage:100,range:120,cooldown:30,size:28,label:'MAX',bullet:'darkred',ability:'none'}
    },
    fast: {
        0:{cost:40,color:'blue',damage:10,range:60,cooldown:30,size:20,label:'I',bullet:'lightblue',ability:'freeze'},
        1:{cost:60,color:'cyan',damage:15,range:70,cooldown:20,size:22,label:'II',bullet:'cyan',ability:'freeze'},
        2:{cost:100,color:'navy',damage:25,range:80,cooldown:15,size:25,label:'III',bullet:'blue',ability:'freeze'},
        3:{cost:150,color:'darkblue',damage:40,range:90,cooldown:10,size:28,label:'MAX',bullet:'navy',ability:'freeze'}
    },
    snare: {
        0:{cost:60,color:'green',damage:20,range:90,cooldown:50,size:20,label:'I',bullet:'lime',ability:'snare'},
        1:{cost:90,color:'darkgreen',damage:35,range:100,cooldown:40,size:22,label:'II',bullet:'green',ability:'snare'},
        2:{cost:140,color:'forestgreen',damage:55,range:110,cooldown:30,size:25,label:'III',bullet:'darkgreen',ability:'snare'},
        3:{cost:220,color:'black',damage:90,range:130,cooldown:20,size:28,label:'MAX',bullet:'olive',ability:'snare'}
    },
    poison: {
        0:{cost:70,color:'purple',damage:15,range:85,cooldown:70,size:20,label:'I',bullet:'violet',ability:'poison'},
        1:{cost:100,color:'indigo',damage:25,range:95,cooldown:60,size:22,label:'II',bullet:'purple',ability:'poison'},
        2:{cost:160,color:'darkviolet',damage:40,range:105,cooldown:50,size:25,label:'III',bullet:'indigo',ability:'poison'},
        3:{cost:250,color:'black',damage:70,range:125,cooldown:40,size:28,label:'MAX',bullet:'darkviolet',ability:'poison'}
    },
    aoe: {
        0:{cost:80,color:'magenta',damage:40,range:100,cooldown:90,size:20,label:'I',bullet:'pink',ability:'explode'},
        1:{cost:120,color:'darkmagenta',damage:60,range:120,cooldown:75,size:22,label:'II',bullet:'magenta',ability:'explode'},
        2:{cost:180,color:'rebeccapurple',damage:90,range:140,cooldown:60,size:25,label:'III',bullet:'darkmagenta',ability:'explode'},
        3:{cost:300,color:'black',damage:150,range:160,cooldown:45,size:28,label:'MAX',bullet:'black',ability:'explode'}
    },
    sniper: {
        0:{cost:90,color:'black',damage:80,range:150,cooldown:120,size:18,label:'I',bullet:'white',ability:'sniper'},
        1:{cost:130,color:'gray',damage:120,range:170,cooldown:100,size:20,label:'II',bullet:'silver',ability:'sniper'},
        2:{cost:200,color:'darkgray',damage:180,range:190,cooldown:80,size:22,label:'III',bullet:'gray',ability:'sniper'},
        3:{cost:320,color:'black',damage:300,range:220,cooldown:60,size:25,label:'MAX',bullet:'white',ability:'sniper'}
    }
};

const difficultyLevels = [
    { wave: 1, name: 'Easy', multiplier: 1, enemyTypes: ['basic'] },
    { wave: 5, name: 'Medium', multiplier: 1.5, enemyTypes: ['basic', 'fast'] },
    { wave: 10, name: 'Hard', multiplier: 2, enemyTypes: ['basic', 'fast', 'tank'] },
    { wave: 15, name: 'Nightmare', multiplier: 3, enemyTypes: ['basic', 'fast', 'tank'] },
    { wave: 20, name: 'Insane', multiplier: 4, enemyTypes: ['basic', 'fast', 'tank'] }
];
const enemyTypes = {
    basic: { color: 'red', health: 50, speed: 1, size: 15, reward: 10 },
    fast: { color: 'orange', health: 30, speed: 2, size: 12, reward: 15 },
    tank: { color: 'darkred', health: 150, speed: 0.5, size: 20, reward: 25 }
};
const maps = {
    forest: { bgColor: '#4CAF50', pathColor: '#2E7D32', path: [{x:0,y:300},{x:120,y:300},{x:120,y:100},{x:280,y:100},{x:280,y:400},{x:400,y:400}], difficulty: 1 },
    desert: { bgColor: '#FFECB3', pathColor: '#F57C00', path: [{x:0,y:200},{x:100,y:200},{x:100,y:450},{x:200,y:450},{x:200,y:150},{x:300,y:150},{x:300,y:350},{x:400,y:350}], difficulty: 1.5 },
    mountain: { bgColor: '#CFD8DC', pathColor: '#455A64', path: [{x:0,y:150},{x:80,y:150},{x:80,y:350},{x:180,y:350},{x:180,y:100},{x:280,y:100},{x:280,y:300},{x:400,y:300}], difficulty: 2 }
};

let currentMap = 'forest', selectedTower = 'basic', selectedTowerObj = null, PATH = [];
let tutorialStep = 0;

const tutorialSteps = [
    { text: "1. Click a tower type below", target: '.towerBtn' },
    { text: "2. Click anywhere on the map to place", target: '#gameCanvas' },
    { text: "3. Click your tower to upgrade it!", target: '.towerBtn' }
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
    const size = Math.min(window.innerWidth, 480);
    canvas.width = size; canvas.height = size * 1.25;
    PATH = maps[currentMap].path.map(p => ({x: (p.x / 400) * canvas.width, y: (p.y / 500) * canvas.height}));
}
resizeCanvas(); window.addEventListener('resize', resizeCanvas);

mapBtns.forEach(btn => btn.addEventListener('click', () => {
    currentMap = btn.dataset.map; mapBtns.forEach(b => b.classList.remove('selected')); btn.classList.add('selected');
    game = { enemies: [], towers: [], projectiles: [], wave: 1, money: 100, lives: 20 }; startGame();
}));
backToStart.addEventListener('click', () => { mapScreen.style.display = 'none'; startScreen.style.display = 'block'; });

// 🆕 FIXED: GHOST SPAWNS INSTANTLY ON SELECT!
towerBtns.forEach(btn => btn.addEventListener('click', () => {
    selectedTower = btn.dataset.type; 
    towerBtns.forEach(b => b.classList.remove('selected')); 
    btn.classList.add('selected');
    // 🆕 CREATE GHOST IMMEDIATELY!
    ghostTower = { x: mouseX, y: mouseY, type: selectedTower, level: 0 };
}));

closeUpgrade.addEventListener('click', () => upgradePanel.style.display = 'none');

function getDifficulty() {
    const level = difficultyLevels.find(l => game.wave <= l.wave) || difficultyLevels[4];
    return { ...level, mapMultiplier: maps[currentMap].difficulty };
}

function showUpgradePanel(tower) {
    selectedTowerObj = tower; upgradeButtons.innerHTML = '';
    const type = towerTypes[tower.type]; const level = tower.level || 0;
    for (let i = level + 1; i <= 3; i++) {
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
    ghostTower = null; // 🆕 RESET GHOST!
    startScreen.style.display = 'none'; mapScreen.style.display = 'block';
    mapBtns[0].classList.add('selected');
}
function startGame() {
    mapScreen.style.display = 'none'; gameUI.style.display = 'flex';
    towerBtns[0].classList.add('selected');
    ghostTower = { x: mouseX, y: mouseY, type: 'basic', level: 0 }; // 🆕 START WITH GHOST!
    if (game.enemies.length === 0) spawnWave();
    if (!localStorage.getItem('tutorialDone')) showTutorial();
    gameLoop();
}

document.getElementById('newGame').addEventListener('click', startNewGame);
document.getElementById('loadGame').addEventListener('click', () => {
    if (loadGame()) { startGame(); alert(`✅ Loaded ${currentMap.toUpperCase()}!`); }
    else { alert('No saved game!'); startNewGame(); }
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
    
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = canPlace ? config.color : 'red';
    ctx.beginPath(); ctx.arc(x, y, config.size, 0, Math.PI*2); ctx.fill();
    
    ctx.strokeStyle = canPlace ? config.color + '40' : 'red';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, config.range, 0, Math.PI*2); ctx.stroke();
    
    ctx.fillStyle = canPlace ? 'white' : 'black';
    ctx.font = '12px Arial'; ctx.fillText(config.label, x-5, y+4);
    ctx.globalAlpha = 1;
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
            const targets = game.enemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) < this.range);
            if (targets.length > 0) {
                if (this.ability === 'explode') {
                    let explosionTargets = [targets[0]];
                    for (let i = 0; i < 2 && explosionTargets.length < 3; i++) {
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
                } else {
                    const target = targets[0];
                    let finalDamage = this.damage;
                    let isCrit = false;
                    if (this.ability === 'sniper' && Math.random() < 0.5) {
                        finalDamage *= 2; isCrit = true;
                    }
                    game.projectiles.push(new Projectile(this.x, this.y, target.x, target.y, finalDamage, this.bulletColor, 7, this.ability, isCrit));
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
    const enemyCount = Math.floor(game.wave * 2 * diff.multiplier);
    const types = diff.enemyTypes;
    for (let i = 0; i < enemyCount; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        setTimeout(() => game.enemies.push(new Enemy(type)), i * 800);
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

canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); ghostTower = null; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ghostTower = null; });

// 🆕 PERFECT MOBILE TOUCH!
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = (touch.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (touch.clientY - rect.top) * (canvas.height / rect.height);
    
    // 🆕 SINGLE TAP = PLACE OR UPGRADE!
    selectedTowerObj = game.towers.find(t => Math.hypot(t.x - mouseX, t.y - mouseY) < t.size * 1.5);
    if (selectedTowerObj) { 
        showUpgradePanel(selectedTowerObj); 
        if (tutorialStep === 2) nextTutorial(); 
        ghostTower = null;
    } else if (ghostTower) {
        const config = towerTypes[selectedTower][0];
        if (game.money >= config.cost && !isOnPath(mouseX, mouseY)) {
            game.towers.push(new Tower(mouseX, mouseY, selectedTower)); 
            game.money -= config.cost; 
            saveGame();
            ctx.fillStyle = 'rgba(255,215,0,0.2)'; 
            ctx.beginPath(); ctx.arc(mouseX, mouseY, 50, 0, Math.PI*2); ctx.fill();
            if (tutorialStep === 1) nextTutorial();
        }
        ghostTower = null; // 🆕 CANCEL AFTER PLACE!
    }
}, { passive: false });

// 🆕 DOUBLE TAP = CANCEL GHOST!
let lastTap = 0;
canvas.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) { ghostTower = null; } // 🆕 DOUBLE TAP CANCEL!
    lastTap = now;
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    selectedTowerObj = game.towers.find(t => Math.hypot(t.x - x, t.y - y) < t.size * 1.5);
    if (selectedTowerObj) { 
        showUpgradePanel(selectedTowerObj); 
        if (tutorialStep === 2) nextTutorial(); 
        ghostTower = null;
    } else {
        const config = towerTypes[selectedTower][0];
        if (game.money >= config.cost && !isOnPath(x, y)) {
            game.towers.push(new Tower(x, y, selectedTower)); 
            game.money -= config.cost; 
            saveGame();
            ctx.fillStyle = 'rgba(255,215,0,0.2)'; 
            ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI*2); ctx.fill();
            if (tutorialStep === 1) nextTutorial();
        }
        ghostTower = null;
    }
});

function gameLoop() {
    ctx.fillStyle = maps[currentMap].bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = maps[currentMap].pathColor; ctx.lineWidth = 20;
    ctx.beginPath(); ctx.moveTo(PATH[0].x, PATH[0].y); for (let p of PATH) ctx.lineTo(p.x, p.y); ctx.stroke();
    
    // 🆕 FIXED: DRAW GHOST!
    drawGhostTower(mouseX, mouseY);
    
    game.projectiles = game.projectiles.filter(p => {
        if (!p.update()) return true;
        const hit = game.enemies.find(e => Math.hypot(e.x - p.x, e.y - p.y) < e.size);
        if (hit) {
            if (p.ability === 'poison') {
                hit.poisonDamage = p.damage * 0.4;
                hit.poisonUntil = Date.now() + 5000;
            } else if (p.ability === 'snare') { hit.slowUntil = Date.now() + 3000; }
            else if (p.ability === 'freeze') { hit.frozenUntil = Date.now() + 2000; }
            else { hit.health -= p.damage; }
            
            if (hit.health <= 0) {
                game.enemies.splice(game.enemies.indexOf(hit), 1);
                game.money += hit.reward;
            }
            return false;
        }
        p.draw(); return true;
    });
    
    game.enemies = game.enemies.filter(e => e.update());
    game.towers.forEach(t => t.update());
    game.enemies.forEach(e => e.draw());
    game.towers.forEach(t => t.draw());
    
    const diff = getDifficulty();
    ctx.fillStyle = 'white'; ctx.font = 'bold 20px Arial';
    ctx.fillText(`Wave ${game.wave} (${diff.name})`, 10, 30);
    ctx.fillText(`$${game.money}`, 10, 55);
    ctx.fillText(`Lives: ${game.lives}`, canvas.width - 90, 30);
    
    if (game.enemies.length === 0 && Date.now() > (game.lastWave || 0) + 5000) {
        game.wave++; spawnWave();
    }
    saveGame(); requestAnimationFrame(gameLoop);
}

game = { enemies: [], towers: [], projectiles: [], wave: 1, money: 100, lives: 20 };