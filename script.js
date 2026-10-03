const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const PREVIEW_SIZE = 4;
const BASE_DROP_INTERVAL = 700;

const PIECES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

const COLORS = {
  I: '#4dd0ff',
  O: '#ffd166',
  T: '#c084fc',
  S: '#7ee787',
  Z: '#ff6b6b',
  J: '#5ca8ff',
  L: '#ffb866',
};

const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const scoreValue = document.getElementById('scoreValue');
const highScoreValue = document.getElementById('highScoreValue');
const linesValue = document.getElementById('linesValue');
const levelValue = document.getElementById('levelValue');
const menuButton = document.getElementById('menuButton');
const menuOverlay = document.getElementById('menuOverlay');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const restartButton = document.getElementById('restartButton');

let board = [];
let currentPiece = null;
let nextPiece = null;
let pieceBag = [];
let score = 0;
let lines = 0;
let level = 1;
let dropInterval = BASE_DROP_INTERVAL;
let isRunning = false;
let isPaused = false;
let isGameOver = false;
let lastTimestamp = 0;
let dropAccumulator = 0;
let bestScore = Number(localStorage.getItem('tetris-best-score') || 0);

highScoreValue.textContent = String(bestScore);

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function randomPiece() {
  if (pieceBag.length === 0) {
    pieceBag = Object.keys(PIECES);
    for (let index = pieceBag.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [pieceBag[index], pieceBag[swapIndex]] = [pieceBag[swapIndex], pieceBag[index]];
    }
  }

  const type = pieceBag.pop();
  const matrix = cloneMatrix(PIECES[type]);
  return { type, matrix, x: Math.floor((COLS - matrix[0].length) / 2), y: -1 };
}

function resetGame() {
  board = createBoard();
  pieceBag = [];
  currentPiece = randomPiece();
  nextPiece = randomPiece();
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = BASE_DROP_INTERVAL;
  isRunning = true;
  isPaused = false;
  isGameOver = false;
  dropAccumulator = 0;
  lastTimestamp = 0;
  setMenuVisible(false);
  updateHud();
  render();
}

function setMenuVisible(visible) {
  menuOverlay.classList.toggle('visible', visible);
  if (visible) {
    startButton.focus();
  }
}

function toggleMenu() {
  if (!isRunning || isGameOver) {
    setMenuVisible(true);
    return;
  }

  if (isPaused) {
    resumeGame();
  } else {
    pauseGame();
  }
}

function updateHud() {
  scoreValue.textContent = String(score);
  linesValue.textContent = String(lines);
  levelValue.textContent = String(level);
  highScoreValue.textContent = String(bestScore);
  pauseButton.textContent = isPaused ? 'Spel hervatten' : 'Pauzeren';

  if (!isRunning || isGameOver) {
    startButton.textContent = 'Start spel';
  } else if (isPaused) {
    startButton.textContent = 'Hervatten';
  } else {
    startButton.textContent = 'Doorgaan';
  }
}

function collide(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (matrix[y][x] === 0) continue;
      const newX = piece.x + x + offsetX;
      const newY = piece.y + y + offsetY;

      if (newX < 0 || newX >= COLS || newY >= ROWS) {
        return true;
      }

      if (newY >= 0 && board[newY][newX]) {
        return true;
      }
    }
  }
  return false;
}

function mergePiece() {
  currentPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) return;
      const boardY = currentPiece.y + y;
      const boardX = currentPiece.x + x;
      if (boardY >= 0) {
        board[boardY][boardX] = currentPiece.type;
      }
    });
  });
}

function clearLines() {
  let cleared = 0;

  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every((cell) => cell !== null)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    lines += cleared;
    const scoring = [0, 100, 300, 500, 800];
    score += scoring[cleared] * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, BASE_DROP_INTERVAL - (level - 1) * 60);
    bestScore = Math.max(bestScore, score);
    localStorage.setItem('tetris-best-score', String(bestScore));
  }
}

function spawnPiece() {
  currentPiece = nextPiece;
  currentPiece.x = Math.floor((COLS - currentPiece.matrix[0].length) / 2);
  currentPiece.y = -1;

  nextPiece = randomPiece();

  if (collide(currentPiece)) {
    endGame();
  }
}

function endGame() {
  isGameOver = true;
  isRunning = false;
  isPaused = false;
  setMenuVisible(true);
  updateHud();
  render();
}

function pauseGame() {
  if (!isRunning || isGameOver) return;
  isPaused = true;
  setMenuVisible(true);
  updateHud();
}

function resumeGame() {
  if (!isRunning || isGameOver) return;
  isPaused = false;
  setMenuVisible(false);
  updateHud();
}

function rotateMatrix(matrix) {
  return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

function attemptRotate() {
  if (!currentPiece || isPaused || isGameOver) return;

  const rotated = rotateMatrix(currentPiece.matrix);
  const kicks = [0, -1, 1, -2, 2];

  for (const offset of kicks) {
    if (!collide(currentPiece, offset, 0, rotated)) {
      currentPiece.matrix = rotated;
      currentPiece.x += offset;
      render();
      return;
    }
  }
}

function movePiece(deltaX, deltaY) {
  if (!currentPiece || isPaused || isGameOver) return false;

  if (!collide(currentPiece, deltaX, deltaY)) {
    currentPiece.x += deltaX;
    currentPiece.y += deltaY;
    render();
    return true;
  }

  if (deltaY > 0) {
    mergePiece();
    clearLines();
    spawnPiece();
    render();
    return false;
  }

  return false;
}

function drawCell(context, x, y, color, size) {
  context.fillStyle = color;
  context.fillRect(x * size, y * size, size, size);
  context.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  context.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
}

function drawBoard() {
  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const value = board[y][x];
      if (value) {
        drawCell(ctx, x, y, COLORS[value], BLOCK_SIZE);
      } else {
        ctx.fillStyle = '#0d1728';
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeRect(x * BLOCK_SIZE + 0.5, y * BLOCK_SIZE + 0.5, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
      }
    }
  }

  if (currentPiece) {
    currentPiece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value === 0) return;
        const boardX = currentPiece.x + x;
        const boardY = currentPiece.y + y;
        if (boardY >= 0) {
          drawCell(ctx, boardX, boardY, COLORS[currentPiece.type], BLOCK_SIZE);
        }
      });
    });
  }

  if (isGameOver) {
    ctx.fillStyle = 'rgba(5, 8, 16, 0.6)';
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    ctx.fillStyle = '#f1f5ff';
    ctx.font = 'bold 28px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', gameCanvas.width / 2, gameCanvas.height / 2);
  }
}

function drawNextPiece() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = '#0d1728';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!nextPiece) return;

  const size = 24;
  const offsetX = Math.floor((nextCanvas.width - nextPiece.matrix[0].length * size) / 2);
  const offsetY = Math.floor((nextCanvas.height - nextPiece.matrix.length * size) / 2);

  nextPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) return;
      drawCell(nextCtx, x + offsetX / size, y + offsetY / size, COLORS[nextPiece.type], size);
    });
  });
}

function render() {
  drawBoard();
  drawNextPiece();
}

function gameLoop(timestamp) {
  if (!isRunning || isPaused || isGameOver) {
    render();
    requestAnimationFrame(gameLoop);
    return;
  }

  if (!lastTimestamp) {
    lastTimestamp = timestamp;
  }

  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  dropAccumulator += delta;

  while (dropAccumulator >= dropInterval) {
    const moved = movePiece(0, 1);
    if (!moved) {
      break;
    }
    dropAccumulator -= dropInterval;
  }

  if (dropAccumulator >= dropInterval) {
    dropAccumulator = 0;
  }

  render();
  requestAnimationFrame(gameLoop);
}

function handleKeydown(event) {
  const key = event.key;

  if (key === 'Escape') {
    event.preventDefault();
    toggleMenu();
    return;
  }

  if (key === 'm' || key === 'M') {
    event.preventDefault();
    toggleMenu();
    return;
  }

  if (key === 'p' || key === 'P') {
    event.preventDefault();
    if (isRunning && !isGameOver) {
      if (isPaused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }
    return;
  }

  if (!isRunning || isPaused || isGameOver) {
    return;
  }

  switch (key) {
    case 'ArrowLeft':
      event.preventDefault();
      movePiece(-1, 0);
      break;
    case 'ArrowRight':
      event.preventDefault();
      movePiece(1, 0);
      break;
    case 'ArrowDown':
      event.preventDefault();
      movePiece(0, 1);
      score += 1;
      updateHud();
      break;
    case 'ArrowUp':
    case ' ':
      event.preventDefault();
      attemptRotate();
      updateHud();
      break;
    default:
      break;
  }
}

startButton.addEventListener('click', () => {
  if (!isRunning || isGameOver) {
    resetGame();
    return;
  }

  if (isPaused) {
    resumeGame();
  } else {
    setMenuVisible(false);
  }
});

pauseButton.addEventListener('click', () => {
  if (!isRunning || isGameOver) return;

  if (isPaused) {
    resumeGame();
  } else {
    pauseGame();
  }
});

restartButton.addEventListener('click', () => {
  resetGame();
});

menuButton.addEventListener('click', () => {
  toggleMenu();
});

document.addEventListener('keydown', handleKeydown);

window.addEventListener('blur', () => {
  if (isRunning && !isPaused && !isGameOver) {
    pauseGame();
  }
});

function initialiseGame() {
  resetGame();
  setMenuVisible(true);
  startButton.textContent = 'Start spel';
  pauseButton.textContent = 'Pauzeren';
  render();
}

initialiseGame();
requestAnimationFrame(gameLoop);
