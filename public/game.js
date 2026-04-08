const canvas = document.getElementById('balloonCanvas');
const ctx = canvas.getContext('2d');
const gameBtn = document.getElementById('gameBtn');
const continueBtn = document.getElementById('continueBtn');
const scoreDisplay = document.getElementById('score-display');
const statsPanel = document.getElementById('stats-panel');
const letterGrid = document.getElementById('letter-grid');
const settingsBtn = document.getElementById('settingsBtn');
const settingsDropdown = document.getElementById('settings-dropdown');
const modalOverlay = document.getElementById('modal-overlay');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');

let gameActive = false;
let balloons = [];
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

let popParticles = [];
let score = 0;
let letterStats = {};

// ── Settings & persistence ──
const STORAGE_KEY = 'abc-balloon-game';
const defaultSettings = { wiggle: true, speed: 1.4, balloonSize: 75 };

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ score, letterStats, settings }));
}

const saved = loadSaved();
let settings = Object.assign({}, defaultSettings, saved ? saved.settings : {});
if (saved) {
  score = saved.score || 0;
  letterStats = saved.letterStats || {};
}

// Apply saved settings to UI controls
document.getElementById('set-wiggle').checked = settings.wiggle;
document.getElementById('set-speed').value = String(settings.speed);
document.getElementById('set-size').value = String(settings.balloonSize);

document.getElementById('set-wiggle').addEventListener('change', function () {
  settings.wiggle = this.checked;
  for (const b of balloons) b.wiggleAmp = settings.wiggle ? (0.3 + Math.random() * 0.5) : 0;
  saveState();
});
document.getElementById('set-speed').addEventListener('input', function () {
  settings.speed = parseFloat(this.value);
  saveState();
});
document.getElementById('set-size').addEventListener('input', function () {
  settings.balloonSize = parseInt(this.value, 10);
  saveState();
});

// ── Settings dropdown ──
settingsBtn.addEventListener('click', function (e) {
  e.stopPropagation();
  settingsDropdown.classList.toggle('hidden');
});
document.addEventListener('click', function (e) {
  if (!settingsDropdown.contains(e.target) && e.target !== settingsBtn) {
    settingsDropdown.classList.add('hidden');
  }
});

// ── Modal ──
function showModal() { modalOverlay.classList.remove('hidden'); }
function hideModal() { modalOverlay.classList.add('hidden'); }
modalCancel.addEventListener('click', hideModal);
modalConfirm.addEventListener('click', function () { hideModal(); doRestart(); });
modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) hideModal(); });

// ── Stats panel ──
function buildLetterGrid() {
  letterGrid.innerHTML = '';
  for (const l of letters) {
    const cell = document.createElement('div');
    cell.className = 'letter-cell';
    cell.id = 'lc-' + l;
    cell.innerHTML = '<span class="lc-letter">' + l + '</span><span class="lc-count"></span>';
    cell.addEventListener('click', function () {
      if (!gameActive) return;
      const key = l;
      const idx = balloons.findIndex(function (b) { return b.letter === key; });
      if (idx !== -1) {
        popBalloon(idx);
        balloons.push(createBalloon(key, { index: letters.indexOf(key) }));
      } else {
        balloons.push(createBalloon(key, { index: letters.indexOf(key) }));
      }
    });
    letterGrid.appendChild(cell);
  }
}

function updateStatsUI() {
  scoreDisplay.textContent = '\uD83C\uDF88 ' + score;
  if (score > 0) {
    statsPanel.classList.remove('collapsed');
  } else {
    statsPanel.classList.add('collapsed');
  }
  for (const l of letters) {
    const cell = document.getElementById('lc-' + l);
    if (!cell) continue;
    const stat = letterStats[l];
    if (stat) {
      cell.className = 'letter-cell popped';
      cell.style.background = stat.color;
      cell.style.color = '#fff';
      cell.querySelector('.lc-count').textContent = stat.count;
    } else {
      cell.className = 'letter-cell';
      cell.style.background = '';
      cell.style.color = '';
      cell.querySelector('.lc-count').textContent = '';
    }
  }
}

function openStats() {
  statsPanel.classList.remove('collapsed');
}

buildLetterGrid();
updateStatsUI();
updateButtons();

// ── Canvas sizing ──
let balloonXPositions = [];
function calculateBalloonXPositions() {
  const margin = 10;
  const container = document.getElementById('canvas-container');
  const width = container.clientWidth;
  const step = (width - 2 * margin) / letters.length;
  balloonXPositions = [];
  for (let i = 0; i < letters.length; i++) {
    balloonXPositions.push(margin + step * i + step / 2);
  }
}

function resizeCanvas() {
  const container = document.getElementById('canvas-container');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
  canvas.style.width = container.clientWidth + 'px';
  canvas.style.height = container.clientHeight + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  calculateBalloonXPositions();
}
window.addEventListener('resize', resizeCanvas);
new ResizeObserver(() => resizeCanvas()).observe(document.getElementById('canvas-container'));
resizeCanvas();

// ── Balloon helpers ──
function randomColor() {
  const colors = [
    '#FF5252','#FFB300','#FFD600','#69F0AE','#40C4FF','#7C4DFF',
    '#FF4081','#FF6D00','#C6FF00','#00B8D4','#00E676','#FF1744',
    '#F50057','#D500F9','#651FFF','#2979FF','#00E5FF','#1DE9B6',
    '#76FF03','#FFEA00','#FFC400','#FF9100','#FF3D00','#C51162',
    '#AA00FF','#00BFAE'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
function randomSize() { return settings.balloonSize + Math.random() * settings.balloonSize; }
function randomEllipseRatio() {
  return { aRatio: 0.55 + Math.random() * 0.15, bRatio: 1.2 + Math.random() * 0.3 };
}

function createBalloon(letter, opts) {
  const size = randomSize();
  const { aRatio, bRatio } = randomEllipseRatio();
  const dpr = window.devicePixelRatio || 1;
  const index = (opts && opts.index !== undefined) ? opts.index : letters.indexOf(letter);
  return {
    letter,
    x: (opts && opts.x !== undefined) ? opts.x : (balloonXPositions[index] || (canvas.width / dpr / 2)),
    y: (opts && opts.y !== undefined) ? opts.y : (canvas.height / dpr + size),
    size, color: randomColor(),
    speed: (1.2 + Math.random() * 1.5),
    aRatio, bRatio,
    wiggleOffset: Math.random() * Math.PI * 2,
    wiggleAmp: settings.wiggle ? (0.3 + Math.random() * 0.5) : 0
  };
}

function getAvailableLetters() {
  const onScreen = new Set(balloons.map(b => b.letter));
  return letters.filter(l => !onScreen.has(l));
}

// ── Drawing ──
function drawBalloon(b) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(b.x, b.y + b.size * b.bRatio / 2);
  ctx.lineTo(b.x, b.y + b.size * b.bRatio / 2 + b.size * 1.2);
  ctx.strokeStyle = b.color; ctx.lineWidth = 2; ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(b.x, b.y, b.size * b.aRatio, b.size * b.bRatio / 2, 0, 0, 2 * Math.PI);
  ctx.fillStyle = b.color; ctx.fill();

  ctx.font = 'bold ' + (b.size / 2) + 'px sans-serif';
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(b.letter, b.x, b.y);
  ctx.restore();
}

function createPopParticles(balloon) {
  const particles = [];
  const count = 12 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    const speed = 2 + Math.random() * 2;
    particles.push({ x: balloon.x, y: balloon.y, radius: 4 + Math.random() * 4,
      color: balloon.color, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, alpha: 1.0 });
  }
  return particles;
}

function updatePopParticles() {
  for (let i = popParticles.length - 1; i >= 0; i--) {
    const p = popParticles[i];
    p.x += p.dx; p.y += p.dy; p.radius *= 0.92; p.alpha *= 0.92;
    if (p.radius < 1 || p.alpha < 0.1) popParticles.splice(i, 1);
  }
}

function drawPopParticles() {
  for (const p of popParticles) {
    ctx.save(); ctx.globalAlpha = p.alpha;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
    ctx.fillStyle = p.color; ctx.fill(); ctx.restore();
  }
}

// ── Game loop ──
function updateBalloons() {
  const time = Date.now() / 1000;
  for (let b of balloons) {
    const minY = (b.size * b.bRatio / 2) + 2;
    const effectiveSpeed = b.speed * settings.speed;
    if (b.y - minY > 0) { b.y -= effectiveSpeed; if (b.y - minY < 0) b.y = minY; }
    if (b.wiggleAmp > 0) b.x += Math.sin(time * 2 * settings.speed + b.wiggleOffset) * b.wiggleAmp * settings.speed;
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let b of balloons) drawBalloon(b);
  drawPopParticles();
}

function gameLoop() {
  if (gameActive) { updateBalloons(); updatePopParticles(); render(); requestAnimationFrame(gameLoop); }
  else { render(); }
}

// ── Start / Restart ──
function updateButtons() {
  if (gameActive) {
    gameBtn.textContent = 'Restart';
    gameBtn.classList.add('restart');
    continueBtn.classList.add('hidden');
  } else if (score > 0) {
    continueBtn.classList.remove('hidden');
    gameBtn.textContent = 'Restart';
    gameBtn.classList.add('restart');
  } else {
    continueBtn.classList.add('hidden');
    gameBtn.textContent = 'Start';
    gameBtn.classList.remove('restart');
  }
}

function startGame() {
  gameActive = true;
  balloons = [];
  popParticles = [];
  updateStatsUI();
  updateButtons();
  saveState();
  window.addEventListener('keydown', handleKey);
  gameLoop();
}

function doRestart() {
  score = 0;
  letterStats = {};
  saveState();
  gameActive = false;
  balloons = [];
  popParticles = [];
  render();
  window.removeEventListener('keydown', handleKey);
  startGame();
}

gameBtn.addEventListener('click', function () {
  if (!gameActive && score === 0) startGame();
  else showModal();
});

continueBtn.addEventListener('click', function () {
  startGame();
});

// ── Pop & interaction ──
function popBalloon(index) {
  const popped = balloons.splice(index, 1)[0];
  popParticles.push(...createPopParticles(popped));
  score++;
  if (!letterStats[popped.letter]) letterStats[popped.letter] = { color: popped.color, count: 0 };
  letterStats[popped.letter].color = popped.color;
  letterStats[popped.letter].count++;
  updateStatsUI();
  saveState();
  return popped;
}

function handleKey(e) {
  if (!gameActive) return;
  const key = e.key.toUpperCase();
  if (letters.indexOf(key) === -1) return;
  const idx = balloons.findIndex(b => b.letter === key);
  if (idx !== -1) {
    popBalloon(idx);
    balloons.push(createBalloon(key, { index: letters.indexOf(key) }));
  } else {
    balloons.push(createBalloon(key, { index: letters.indexOf(key) }));
  }
}

function isPointInBalloon(x, y, b) {
  const a = b.size * b.aRatio;
  const bR = b.size * b.bRatio / 2;
  return (((x - b.x) ** 2) / (a ** 2) + ((y - b.y) ** 2) / (bR ** 2)) <= 1;
}

function handlePointer(e) {
  if (!gameActive) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const x = (e.clientX - rect.left) * (canvas.width / rect.width) / dpr;
  const y = (e.clientY - rect.top) * (canvas.height / rect.height) / dpr;
  handleCanvasInteraction(x, y);
}

function handleCanvasInteraction(x, y) {
  for (let i = balloons.length - 1; i >= 0; i--) {
    if (isPointInBalloon(x, y, balloons[i])) {
      const popped = popBalloon(i);
      if (!isTouchDevice) {
        balloons.push(createBalloon(popped.letter, { index: letters.indexOf(popped.letter) }));
      }
      return;
    }
  }
  const available = getAvailableLetters();
  if (available.length > 0) {
    const letter = available[Math.floor(Math.random() * available.length)];
    balloons.push(createBalloon(letter, { x, y }));
  }
}

canvas.addEventListener('pointerup', handlePointer);

// ── Touch auto-start ──
if (isTouchDevice) {
  setTimeout(() => {
    startGame();
    const hint = document.createElement('div');
    hint.textContent = 'Tap anywhere to spawn balloons! Tap a balloon to pop it!';
    hint.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);color:#fff;padding:16px 24px;border-radius:12px;font-size:18px;font-family:sans-serif;text-align:center;z-index:100;pointer-events:none;transition:opacity 1s;';
    document.body.appendChild(hint);
    setTimeout(() => { hint.style.opacity = '0'; }, 2000);
    setTimeout(() => { hint.remove(); }, 3000);
  }, 300);
}

render();
