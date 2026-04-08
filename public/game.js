var canvas = document.getElementById('balloonCanvas');
var ctx = canvas.getContext('2d');
var gameBtn = document.getElementById('gameBtn');
var continueBtn = document.getElementById('continueBtn');
var scoreDisplay = document.getElementById('score-display');
var challengeDisplay = document.getElementById('challenge-display');
var rewardsDisplay = document.getElementById('rewards-display');
var letterGrid = document.getElementById('letter-grid');
var settingsBtn = document.getElementById('settingsBtn');
var settingsDropdown = document.getElementById('settings-dropdown');
var modalOverlay = document.getElementById('modal-overlay');
var modalCancel = document.getElementById('modal-cancel');
var modalConfirm = document.getElementById('modal-confirm');
var modeBtns = {
  free: document.getElementById('mode-free'),
  spell: document.getElementById('mode-spell'),
  math: document.getElementById('mode-math')
};

var gameActive = false;
var balloons = [];
var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

var popParticles = [];
var score = 0;
var letterStats = {};
var currentMode = 'free';
var currentChallenge = null;
var rewards = [];
var streak = 0;

// ── Reward emoji pool ──
var REWARD_EMOJIS = ['\uD83C\uDF5C','\uD83C\uDF6B','\uD83E\uDDC1','\uD83C\uDF70','\uD83C\uDF6C','\uD83C\uDF82','\uD83C\uDF69','\uD83C\uDF6A'];

// ── Word bank (100 common short words for 4-5 year olds) ──
var WORD_BANK = [
  'CAT','DOG','SUN','MOM','DAD','CUP','BUS','HAT','PIG','COW',
  'BED','RED','BIG','RUN','FUN','CAN','MAN','PAN','VAN','FAN',
  'BAT','RAT','SAT','MAT','MAP','TAP','CAP','NAP','LAP','JAM',
  'HOP','POP','MOP','TOP','POT','HOT','DOT','GOT','NOT','LOT',
  'BUG','HUG','MUG','RUG','TUG','DUG','CUT','NUT','HUT','BUT',
  'HEN','PEN','TEN','DEN','MEN','NET','PET','SET','WET','JET',
  'FIG','DIG','WIG','PIN','WIN','TIN','BIN','SIT','HIT','BIT',
  'BOX','FOX','LOG','FOG','JOG','MOB','JOB','SOB','COB','COP',
  'APE','ATE','AGE','ACE','USE','OAK','OWL','ODD','ORB','OAR',
  'SKY','FLY','TRY','DRY','CRY','SPY','SHY','WHY','FRY','PLY'
];

// ── Settings & persistence ──
var STORAGE_KEY = 'abc-balloon-game';
var defaultSettings = { wiggle: true, speed: 1.4, balloonSize: 75 };

function loadSaved() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    score: score, letterStats: letterStats, settings: settings,
    rewards: rewards, currentMode: currentMode
  }));
}

var saved = loadSaved();
var settings = Object.assign({}, defaultSettings, saved ? saved.settings : {});
if (saved) {
  score = saved.score || 0;
  letterStats = saved.letterStats || {};
  rewards = saved.rewards || [];
  if (saved.currentMode) currentMode = saved.currentMode;
}

// Apply saved settings to UI controls
document.getElementById('set-wiggle').checked = settings.wiggle;
document.getElementById('set-speed').value = String(settings.speed);
document.getElementById('set-size').value = String(settings.balloonSize);

document.getElementById('set-wiggle').addEventListener('change', function () {
  settings.wiggle = this.checked;
  for (var i = 0; i < balloons.length; i++) {
    balloons[i].wiggleAmp = settings.wiggle ? (0.3 + Math.random() * 0.5) : 0;
  }
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

// ── Mode switching ──
function setMode(mode) {
  currentMode = mode;
  for (var key in modeBtns) {
    modeBtns[key].classList.toggle('mode-active', key === mode);
  }
  currentChallenge = null;
  balloons = [];
  popParticles = [];
  streak = 0;
  buildGrid();
  updateChallengeUI();
  updateStatsUI();
  saveState();
  if (gameActive && mode !== 'free') {
    startChallenge();
  }
  if (gameActive) render();
}

for (var modeKey in modeBtns) {
  (function (k) {
    modeBtns[k].addEventListener('click', function () { setMode(k); });
  })(modeKey);
}

// ── Challenge engine ──
function randomRewardEmoji() {
  return REWARD_EMOJIS[Math.floor(Math.random() * REWARD_EMOJIS.length)];
}

function createSpellingChallenge() {
  var word = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
  return {
    type: 'spell',
    prompt: word,
    answer: word.split(''),
    progress: 0,
    rewardEmoji: randomRewardEmoji()
  };
}

function createMathChallenge() {
  var isAdd = Math.random() < 0.5;
  var a, b, result, prompt;
  if (isAdd) {
    a = Math.floor(Math.random() * 10);
    b = Math.floor(Math.random() * (11 - a));
    result = a + b;
    prompt = a + ' + ' + b;
  } else {
    a = Math.floor(Math.random() * 11);
    b = Math.floor(Math.random() * (a + 1));
    result = a - b;
    prompt = a + ' \u2212 ' + b;
  }
  return {
    type: 'math',
    prompt: prompt + ' = ?',
    answer: [String(result)],
    progress: 0,
    rewardEmoji: randomRewardEmoji()
  };
}

function startChallenge() {
  if (currentMode === 'spell') {
    currentChallenge = createSpellingChallenge();
  } else if (currentMode === 'math') {
    currentChallenge = createMathChallenge();
  }
  balloons = [];
  if (currentChallenge) spawnChallengeBalloons();
  updateChallengeUI();
  updateGridHighlights();
}

function spawnChallengeBalloons() {
  if (!currentChallenge) return;
  var balloonLabels = [];
  if (currentChallenge.type === 'spell') {
    var wordLetters = [];
    var seen = {};
    for (var i = 0; i < currentChallenge.answer.length; i++) {
      var c = currentChallenge.answer[i];
      if (!seen[c]) { wordLetters.push(c); seen[c] = true; }
    }
    var distractors = letters.filter(function (l) { return !seen[l]; });
    var numD = Math.min(3 + Math.floor(Math.random() * 3), distractors.length);
    distractors.sort(function () { return Math.random() - 0.5; });
    balloonLabels = wordLetters.concat(distractors.slice(0, numD));
  } else if (currentChallenge.type === 'math') {
    for (var n = 0; n <= 9; n++) balloonLabels.push(String(n));
  }
  for (var j = 0; j < balloonLabels.length; j++) {
    balloons.push(createBalloon(balloonLabels[j], { index: j, totalCount: balloonLabels.length }));
  }
}

function handleChallengeInput(key) {
  if (!currentChallenge) return false;
  var expected = currentChallenge.answer[currentChallenge.progress];
  if (key === expected) {
    currentChallenge.progress++;
    streak++;
    if (currentChallenge.progress >= currentChallenge.answer.length) {
      completeChallenge();
    } else {
      updateChallengeUI();
      updateGridHighlights();
    }
    return true;
  } else {
    streak = 0;
    shakeGridCell(key);
    return false;
  }
}

function completeChallenge() {
  rewards.push(currentChallenge.rewardEmoji);
  if (streak >= 3 && streak % 3 === 0) {
    rewards.push(randomRewardEmoji());
  }
  score++;
  updateRewardsUI();
  updateStatsUI();
  updateChallengeUI();
  saveState();
  for (var i = 0; i < balloons.length; i++) {
    popParticles.push.apply(popParticles, createPopParticles(balloons[i]));
  }
  balloons = [];
  setTimeout(function () {
    if (gameActive && currentMode !== 'free') startChallenge();
  }, 800);
}

function shakeGridCell(key) {
  var cell = document.getElementById('gc-' + key);
  if (!cell) return;
  cell.classList.add('shake');
  setTimeout(function () { cell.classList.remove('shake'); }, 400);
  var bIdx = -1;
  for (var i = 0; i < balloons.length; i++) {
    if (balloons[i].letter === key) { bIdx = i; break; }
  }
  if (bIdx !== -1) balloons[bIdx].shakeUntil = Date.now() + 400;
}

// ── Grid building (mode-aware) ──
function buildGrid() {
  letterGrid.innerHTML = '';
  letterGrid.classList.remove('math-grid');
  if (currentMode === 'math') {
    letterGrid.classList.add('math-grid');
    for (var i = 0; i <= 10; i++) {
      var val = String(i);
      var cell = createGridCell(val);
      letterGrid.appendChild(cell);
    }
  } else {
    for (var li = 0; li < letters.length; li++) {
      var cell2 = createGridCell(letters[li]);
      letterGrid.appendChild(cell2);
    }
  }
}

function createGridCell(label) {
  var cell = document.createElement('div');
  cell.className = 'letter-cell';
  cell.id = 'gc-' + label;
  cell.innerHTML = '<span class="lc-letter">' + label + '</span><span class="lc-count"></span>';
  cell.addEventListener('click', function () { handleGridClick(label); });
  return cell;
}

function updateGridHighlights() {
  var allCells = letterGrid.querySelectorAll('.letter-cell');
  for (var i = 0; i < allCells.length; i++) {
    allCells[i].classList.remove('challenge-target', 'challenge-next', 'challenge-done', 'challenge-dimmed');
  }
  if (!currentChallenge) return;
  var targetSet = {};
  for (var t = 0; t < currentChallenge.answer.length; t++) targetSet[currentChallenge.answer[t]] = true;
  var nextChar = currentChallenge.answer[currentChallenge.progress];
  var completedChars = {};
  for (var c = 0; c < currentChallenge.progress; c++) completedChars[currentChallenge.answer[c]] = true;

  for (var j = 0; j < allCells.length; j++) {
    var cell = allCells[j];
    var val = cell.querySelector('.lc-letter').textContent;
    if (currentChallenge.type === 'spell') {
      if (val === nextChar) {
        cell.classList.add('challenge-next');
      } else if (completedChars[val]) {
        cell.classList.add('challenge-done');
      } else if (targetSet[val]) {
        cell.classList.add('challenge-target');
      } else {
        cell.classList.add('challenge-dimmed');
      }
    } else if (currentChallenge.type === 'math') {
      if (val === nextChar) {
        cell.classList.add('challenge-next');
      }
    }
  }
}

function handleGridClick(key) {
  if (!gameActive) return;
  if (currentMode === 'free') {
    handleFreePlayInput(key);
  } else {
    var correct = handleChallengeInput(key);
    if (correct) {
      var idx = -1;
      for (var i = 0; i < balloons.length; i++) {
        if (balloons[i].letter === key) { idx = i; break; }
      }
      if (idx !== -1) {
        var popped = balloons.splice(idx, 1)[0];
        popParticles.push.apply(popParticles, createPopParticles(popped));
        if (currentChallenge && currentChallenge.progress < currentChallenge.answer.length) {
          balloons.push(createBalloon(key, { index: idx, totalCount: balloons.length + 1 }));
        }
      }
      if (!letterStats[key]) letterStats[key] = { color: randomColor(), count: 0 };
      letterStats[key].count++;
      saveState();
    }
  }
}

function handleFreePlayInput(key) {
  var idx = -1;
  for (var i = 0; i < balloons.length; i++) {
    if (balloons[i].letter === key) { idx = i; break; }
  }
  if (idx !== -1) {
    popBalloon(idx);
    balloons.push(createBalloon(key, { index: letters.indexOf(key) }));
  } else {
    balloons.push(createBalloon(key, { index: letters.indexOf(key) }));
  }
}

// ── UI updates ──
function updateChallengeUI() {
  if (currentMode === 'free' || !currentChallenge) {
    challengeDisplay.classList.add('hidden');
    scoreDisplay.classList.remove('hidden');
    scoreDisplay.textContent = '\uD83C\uDF88 ' + score;
  } else {
    scoreDisplay.classList.add('hidden');
    challengeDisplay.classList.remove('hidden');
    if (currentChallenge.type === 'spell') {
      var parts = [];
      for (var i = 0; i < currentChallenge.answer.length; i++) {
        if (i < currentChallenge.progress) {
          parts.push(currentChallenge.answer[i]);
        } else {
          parts.push('_');
        }
      }
      challengeDisplay.textContent = parts.join('\u00B7');
    } else {
      if (currentChallenge.progress >= currentChallenge.answer.length) {
        challengeDisplay.textContent = currentChallenge.prompt.replace('?', currentChallenge.answer[0]);
      } else {
        challengeDisplay.textContent = currentChallenge.prompt;
      }
    }
  }
}

function updateRewardsUI() {
  if (rewards.length === 0) {
    rewardsDisplay.textContent = '';
    return;
  }
  var maxShow = 8;
  var shown = rewards.slice(-maxShow);
  var text = shown.join('');
  if (rewards.length > maxShow) {
    text = '+' + (rewards.length - maxShow) + ' ' + text;
  }
  rewardsDisplay.textContent = text;
}

function updateStatsUI() {
  scoreDisplay.textContent = '\uD83C\uDF88 ' + score;
  if (currentMode === 'free') {
    for (var i = 0; i < letters.length; i++) {
      var l = letters[i];
      var cell = document.getElementById('gc-' + l);
      if (!cell) continue;
      var stat = letterStats[l];
      if (stat) {
        cell.classList.add('popped');
        cell.style.background = stat.color;
        cell.style.color = '#fff';
        cell.querySelector('.lc-count').textContent = stat.count;
      } else {
        cell.classList.remove('popped');
        cell.style.background = '';
        cell.style.color = '';
        cell.querySelector('.lc-count').textContent = '';
      }
    }
  }
}

buildGrid();
updateStatsUI();
updateRewardsUI();
// Initialize mode buttons
for (var mk in modeBtns) {
  modeBtns[mk].classList.toggle('mode-active', mk === currentMode);
}

// ── Canvas sizing ──
var balloonXPositions = [];
function calculateBalloonXPositions(count) {
  var num = count || 26;
  var margin = 10;
  var container = document.getElementById('canvas-container');
  var width = container.clientWidth;
  var step = (width - 2 * margin) / num;
  balloonXPositions = [];
  for (var i = 0; i < num; i++) {
    balloonXPositions.push(margin + step * i + step / 2);
  }
}

function resizeCanvas() {
  var container = document.getElementById('canvas-container');
  var dpr = window.devicePixelRatio || 1;
  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
  canvas.style.width = container.clientWidth + 'px';
  canvas.style.height = container.clientHeight + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  calculateBalloonXPositions();
}
window.addEventListener('resize', resizeCanvas);
new ResizeObserver(function () { resizeCanvas(); }).observe(document.getElementById('canvas-container'));
resizeCanvas();

// ── Balloon helpers ──
function randomColor() {
  var colors = [
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

function createBalloon(label, opts) {
  var size = randomSize();
  var er = randomEllipseRatio();
  var dpr = window.devicePixelRatio || 1;
  var totalCount = (opts && opts.totalCount) || 26;
  var index = (opts && opts.index !== undefined) ? opts.index : 0;
  calculateBalloonXPositions(totalCount);
  return {
    letter: label,
    x: (opts && opts.x !== undefined) ? opts.x : (balloonXPositions[index] || (canvas.width / dpr / 2)),
    y: (opts && opts.y !== undefined) ? opts.y : (canvas.height / dpr + size),
    size: size,
    color: randomColor(),
    speed: (1.2 + Math.random() * 1.5),
    aRatio: er.aRatio,
    bRatio: er.bRatio,
    wiggleOffset: Math.random() * Math.PI * 2,
    wiggleAmp: settings.wiggle ? (0.3 + Math.random() * 0.5) : 0,
    shakeUntil: 0
  };
}

function getAvailableLetters() {
  var onScreen = {};
  for (var i = 0; i < balloons.length; i++) onScreen[balloons[i].letter] = true;
  return letters.filter(function (l) { return !onScreen[l]; });
}

// ── Drawing ──
function drawBalloon(b) {
  ctx.save();
  var shaking = b.shakeUntil && Date.now() < b.shakeUntil;
  var offsetX = shaking ? Math.sin(Date.now() * 0.05) * 5 : 0;
  var bx = b.x + offsetX;

  ctx.beginPath();
  ctx.moveTo(bx, b.y + b.size * b.bRatio / 2);
  ctx.lineTo(bx, b.y + b.size * b.bRatio / 2 + b.size * 1.2);
  ctx.strokeStyle = b.color; ctx.lineWidth = 2; ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(bx, b.y, b.size * b.aRatio, b.size * b.bRatio / 2, 0, 0, 2 * Math.PI);
  ctx.fillStyle = b.color; ctx.fill();

  ctx.font = 'bold ' + (b.size / 2) + 'px sans-serif';
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(b.letter, bx, b.y);
  ctx.restore();
}

function createPopParticles(balloon) {
  var particles = [];
  var count = 12 + Math.floor(Math.random() * 6);
  for (var i = 0; i < count; i++) {
    var angle = (2 * Math.PI * i) / count;
    var speed = 2 + Math.random() * 2;
    particles.push({ x: balloon.x, y: balloon.y, radius: 4 + Math.random() * 4,
      color: balloon.color, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, alpha: 1.0 });
  }
  return particles;
}

function updatePopParticles() {
  for (var i = popParticles.length - 1; i >= 0; i--) {
    var p = popParticles[i];
    p.x += p.dx; p.y += p.dy; p.radius *= 0.92; p.alpha *= 0.92;
    if (p.radius < 1 || p.alpha < 0.1) popParticles.splice(i, 1);
  }
}

function drawPopParticles() {
  for (var i = 0; i < popParticles.length; i++) {
    var p = popParticles[i];
    ctx.save(); ctx.globalAlpha = p.alpha;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
    ctx.fillStyle = p.color; ctx.fill(); ctx.restore();
  }
}

// ── Game loop ──
function updateBalloons() {
  var time = Date.now() / 1000;
  for (var i = 0; i < balloons.length; i++) {
    var b = balloons[i];
    var minY = (b.size * b.bRatio / 2) + 2;
    var effectiveSpeed = b.speed * settings.speed;
    if (b.y - minY > 0) { b.y -= effectiveSpeed; if (b.y - minY < 0) b.y = minY; }
    if (b.wiggleAmp > 0) b.x += Math.sin(time * 2 * settings.speed + b.wiggleOffset) * b.wiggleAmp * settings.speed;
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (var i = 0; i < balloons.length; i++) drawBalloon(balloons[i]);
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
  } else if (score > 0 || rewards.length > 0) {
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
  updateChallengeUI();
  saveState();
  window.addEventListener('keydown', handleKey);
  if (currentMode !== 'free') startChallenge();
  gameLoop();
}

function doRestart() {
  score = 0;
  letterStats = {};
  rewards = [];
  streak = 0;
  currentChallenge = null;
  updateRewardsUI();
  saveState();
  gameActive = false;
  balloons = [];
  popParticles = [];
  render();
  window.removeEventListener('keydown', handleKey);
  buildGrid();
  updateChallengeUI();
  startGame();
}

gameBtn.addEventListener('click', function () {
  if (!gameActive && score === 0 && rewards.length === 0) startGame();
  else showModal();
});
continueBtn.addEventListener('click', function () { startGame(); });
updateButtons();

// ── Pop & interaction ──
function popBalloon(index) {
  var popped = balloons.splice(index, 1)[0];
  popParticles.push.apply(popParticles, createPopParticles(popped));
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
  var key = e.key.toUpperCase();
  if (currentMode === 'free') {
    if (letters.indexOf(key) === -1) return;
    handleFreePlayInput(key);
  } else if (currentMode === 'spell') {
    if (letters.indexOf(key) === -1) return;
    handleGridClick(key);
  } else if (currentMode === 'math') {
    if (key >= '0' && key <= '9') handleGridClick(key);
  }
}

function isPointInBalloon(x, y, b) {
  var a = b.size * b.aRatio;
  var bR = b.size * b.bRatio / 2;
  return (((x - b.x) * (x - b.x)) / (a * a) + ((y - b.y) * (y - b.y)) / (bR * bR)) <= 1;
}

function handlePointer(e) {
  if (!gameActive) return;
  var rect = canvas.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  var x = (e.clientX - rect.left) * (canvas.width / rect.width) / dpr;
  var y = (e.clientY - rect.top) * (canvas.height / rect.height) / dpr;
  handleCanvasInteraction(x, y);
}

function handleCanvasInteraction(x, y) {
  for (var i = balloons.length - 1; i >= 0; i--) {
    if (isPointInBalloon(x, y, balloons[i])) {
      var b = balloons[i];
      if (currentMode === 'free') {
        var popped = popBalloon(i);
        if (!isTouchDevice) {
          balloons.push(createBalloon(popped.letter, { index: letters.indexOf(popped.letter) }));
        }
      } else {
        handleGridClick(b.letter);
      }
      return;
    }
  }
  if (currentMode === 'free') {
    var available = getAvailableLetters();
    if (available.length > 0) {
      var letter = available[Math.floor(Math.random() * available.length)];
      balloons.push(createBalloon(letter, { x: x, y: y }));
    }
  }
}

canvas.addEventListener('pointerup', handlePointer);

// ── Touch auto-start ──
if (isTouchDevice) {
  setTimeout(function () {
    startGame();
    var hint = document.createElement('div');
    hint.textContent = currentMode === 'free'
      ? 'Tap anywhere to spawn balloons! Tap a balloon to pop it!'
      : 'Pop the right balloon!';
    hint.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);color:#fff;padding:16px 24px;border-radius:12px;font-size:18px;font-family:sans-serif;text-align:center;z-index:100;pointer-events:none;transition:opacity 1s;';
    document.body.appendChild(hint);
    setTimeout(function () { hint.style.opacity = '0'; }, 2000);
    setTimeout(function () { hint.remove(); }, 3000);
  }, 300);
}

render();
