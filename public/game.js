const canvas = document.getElementById('balloonCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

let gameActive = false;
let balloons = [];
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Touch mode detection
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// Popping effect particles
let popParticles = [];
let touchScore = 0;

// Pre-calculate non-overlapping X positions for 26 balloons
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
  // High-DPI support
  const dpr = window.devicePixelRatio || 1;
  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
  canvas.style.width = container.clientWidth + 'px';
  canvas.style.height = container.clientHeight + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
  ctx.scale(dpr, dpr);
  calculateBalloonXPositions();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function randomColor() {
  // Vibrant, kid-friendly colors
  const colors = [
    '#FF5252', '#FFB300', '#FFD600', '#69F0AE', '#40C4FF', '#7C4DFF',
    '#FF4081', '#FF6D00', '#C6FF00', '#00B8D4', '#00E676', '#FF1744',
    '#F50057', '#D500F9', '#651FFF', '#2979FF', '#00E5FF', '#1DE9B6',
    '#76FF03', '#FFEA00', '#FFC400', '#FF9100', '#FF3D00', '#C51162',
    '#AA00FF', '#00BFAE'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
function randomSize() {
  return 60 + Math.random() * 60; // 60-120px
}
function randomEllipseRatio() {
  // a: horizontal radius, b: vertical radius
  // Consistently tall and narrow balloons
  const aRatio = 0.55 + Math.random() * 0.15; // 0.55-0.7 (narrow but not too narrow)
  const bRatio = 1.2 + Math.random() * 0.3;   // 1.2-1.5 (consistently tall)
  return { aRatio, bRatio };
}

function createBalloon(letter, index) {
  const size = randomSize();
  const { aRatio, bRatio } = randomEllipseRatio();
  // Use pre-calculated X position for each letter
  const x = balloonXPositions[index] || (canvas.width / (window.devicePixelRatio || 1) / 2);
  return {
    letter,
    x,
    y: canvas.height / (window.devicePixelRatio || 1) + size,
    size,
    color: randomColor(),
    speed: 1.5 + Math.random() * 1.5,
    aRatio,
    bRatio,
    wiggleOffset: Math.random() * Math.PI * 2,
    wiggleAmp: isTouchDevice ? (0.3 + Math.random() * 0.5) : 0
  };
}

function createBalloonAtPosition(letter, x, y) {
  const size = randomSize();
  const { aRatio, bRatio } = randomEllipseRatio();
  return {
    letter,
    x,
    y,
    size,
    color: randomColor(),
    speed: 1.2 + Math.random() * 1.0,
    aRatio,
    bRatio,
    wiggleOffset: Math.random() * Math.PI * 2,
    wiggleAmp: 0.4 + Math.random() * 0.4
  };
}

function getAvailableLetters() {
  const onScreen = new Set(balloons.map(b => b.letter));
  return letters.filter(l => !onScreen.has(l));
}

function drawBalloon(balloon) {
  ctx.save();
  // Draw string/rope
  ctx.beginPath();
  ctx.moveTo(balloon.x, balloon.y + balloon.size * balloon.bRatio / 2);
  ctx.lineTo(balloon.x, balloon.y + balloon.size * balloon.bRatio / 2 + balloon.size * 1.2);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw vertical ellipse (balloon) with random a/b
  ctx.beginPath();
  ctx.ellipse(balloon.x, balloon.y, balloon.size * balloon.aRatio, balloon.size * balloon.bRatio / 2, 0, 0, 2 * Math.PI);
  ctx.fillStyle = balloon.color;
  ctx.fill();
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw letter
  ctx.font = `${balloon.size/2}px Comic Sans MS, Comic Sans, cursive`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(balloon.letter, balloon.x, balloon.y);
  ctx.restore();
}

function createPopParticles(balloon) {
  // Simple burst effect: colored circles radiating out
  const particles = [];
  const count = 12 + Math.floor(Math.random() * 6); // 12-18 particles
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    const speed = 2 + Math.random() * 2;
    particles.push({
      x: balloon.x,
      y: balloon.y,
      radius: 4 + Math.random() * 4,
      color: balloon.color,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      alpha: 1.0
    });
  }
  return particles;
}

function updatePopParticles() {
  for (let i = popParticles.length - 1; i >= 0; i--) {
    const p = popParticles[i];
    p.x += p.dx;
    p.y += p.dy;
    p.radius *= 0.92;
    p.alpha *= 0.92;
    if (p.radius < 1 || p.alpha < 0.1) {
      popParticles.splice(i, 1);
    }
  }
}

function drawPopParticles() {
  for (const p of popParticles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }
}

function updateBalloons() {
  const time = Date.now() / 1000;
  // Balloons stop at the top of the canvas
  for (let balloon of balloons) {
    const minY = (balloon.size * balloon.bRatio / 2) + 2; // 2px margin
    if (balloon.y - minY > 0) {
      balloon.y -= balloon.speed;
      if (balloon.y - minY < 0) {
        balloon.y = minY;
      }
    }
    // Gentle horizontal wiggle (touch mode balloons)
    if (balloon.wiggleAmp > 0) {
      balloon.x += Math.sin(time * 2 + balloon.wiggleOffset) * balloon.wiggleAmp;
    }
  }
  // Do not remove balloons at the top
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let balloon of balloons) {
    drawBalloon(balloon);
  }
  drawPopParticles();
  // Draw score in touch mode
  if (isTouchDevice && gameActive) {
    ctx.save();
    ctx.font = 'bold 24px Comic Sans MS, cursive';
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const w = canvas.width / (window.devicePixelRatio || 1);
    ctx.fillText('⭐ ' + touchScore, w - 16, 12);
    ctx.restore();
  }
}

function gameLoop() {
  if (gameActive) {
    updateBalloons();
    updatePopParticles();
    render();
    requestAnimationFrame(gameLoop);
  } else {
    render();
  }
}

function startGame() {
  gameActive = true;
  balloons = [];
  popParticles = [];
  touchScore = 0;
  startBtn.disabled = true;
  restartBtn.disabled = false;
  window.addEventListener('keydown', handleKey);
  gameLoop();
}

function restartGame() {
  gameActive = false;
  balloons = [];
  popParticles = [];
  render();
  startBtn.disabled = false;
  restartBtn.disabled = true;
  window.removeEventListener('keydown', handleKey);
}

function handleKey(e) {
  if (!gameActive) return;
  const key = e.key.toUpperCase();
  // Check if a balloon with this letter exists on screen
  const idx = balloons.findIndex(b => b.letter === key);
  if (idx !== -1) {
    // Pop the balloon (remove it)
    const popped = balloons.splice(idx, 1)[0];
    // Add pop effect
    popParticles.push(...createPopParticles(popped));
    // Respawn a new balloon with same letter and horizontal position
    // Find the index for the letter in the alphabet for X position
    const letterIndex = letters.indexOf(key);
    if (letterIndex !== -1) {
      balloons.push(createBalloon(key, letterIndex));
    }
  } else {
    // If not on screen, spawn a new balloon for this letter
    const letterIndex = letters.indexOf(key);
    if (letterIndex !== -1) {
      balloons.push(createBalloon(key, letterIndex));
    }
  }
}


function isPointInBalloon(x, y, balloon) {
  // Check if (x, y) is inside the ellipse of the balloon
  // Ellipse: ((x - h)/a)^2 + ((y - k)/b)^2 <= 1
  const a = balloon.size * balloon.aRatio;
  const b = balloon.size * balloon.bRatio / 2;
  const h = balloon.x;
  const k = balloon.y;
  return (((x - h) ** 2) / (a ** 2) + ((y - k) ** 2) / (b ** 2)) <= 1;
}

function handleCanvasClick(e) {
  if (!gameActive) return;
  // Adjust for canvas scaling (high-DPI)
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const x = (e.clientX - rect.left) * (canvas.width / rect.width) / dpr;
  const y = (e.clientY - rect.top) * (canvas.height / rect.height) / dpr;
  handleCanvasInteraction(x, y);
}

function handleCanvasTouch(e) {
  if (!gameActive) return;
  e.preventDefault(); // Prevent double-fire and scroll
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const x = (touch.clientX - rect.left) * (canvas.width / rect.width) / dpr;
  const y = (touch.clientY - rect.top) * (canvas.height / rect.height) / dpr;
  handleCanvasInteraction(x, y);
}

function handleCanvasInteraction(x, y) {
  // Check balloons from topmost to bottom (reverse order)
  for (let i = balloons.length - 1; i >= 0; i--) {
    const balloon = balloons[i];
    if (isPointInBalloon(x, y, balloon)) {
      // Pop the balloon
      const popped = balloons.splice(i, 1)[0];
      popParticles.push(...createPopParticles(popped));

      if (!isTouchDevice) {
        // Desktop: respawn same letter at fixed X position
        const letterIndex = letters.indexOf(popped.letter);
        if (letterIndex !== -1) {
          balloons.push(createBalloon(popped.letter, letterIndex));
        }
      } else {
        // Touch mode: score!
        touchScore++;
      }
      // Touch mode: don't auto-respawn — letter returns to available pool
      return;
    }
  }

  // Touch mode: tap on empty area → spawn a new balloon from available letters
  if (isTouchDevice) {
    const available = getAvailableLetters();
    if (available.length > 0) {
      const letter = available[Math.floor(Math.random() * available.length)];
      balloons.push(createBalloonAtPosition(letter, x, y));
    }
  }
}

canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('touchend', handleCanvasTouch, { passive: false });
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

// On touch devices, auto-start and show touch hint
if (isTouchDevice) {
  // Auto-start after a brief delay for page load
  setTimeout(() => {
    startGame();
    // Show a brief touch hint
    const hint = document.createElement('div');
    hint.textContent = 'Tap anywhere to spawn balloons! Tap a balloon to pop it!';
    hint.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);color:#fff;padding:16px 24px;border-radius:12px;font-size:18px;font-family:Comic Sans MS,cursive;text-align:center;z-index:100;pointer-events:none;transition:opacity 1s;';
    document.body.appendChild(hint);
    setTimeout(() => { hint.style.opacity = '0'; }, 2000);
    setTimeout(() => { hint.remove(); }, 3000);
  }, 300);
}

// Initial render
render();
