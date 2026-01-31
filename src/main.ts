import { Board } from './Board';
import { GameUI } from './GameUI';
import { Game } from './Game';
import { InputHandler } from './InputHandler';

const canvas = document.getElementById("game") as HTMLCanvasElement;
// Use device pixel ratio for sharp rendering on high-DPI displays
const dpr = window.devicePixelRatio || 1;
canvas.width = window.innerWidth * dpr;
canvas.height = window.innerHeight * dpr;
canvas.style.width = window.innerWidth + 'px';
canvas.style.height = window.innerHeight + 'px';

window.addEventListener('resize', () => {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  render();
});

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("No 2D context");

// Enable high-quality image rendering
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

// Scale context to match device pixel ratio
ctx.scale(dpr, dpr);

const game = new Game(render);
const board = new Board(canvas, game.state);
const ui = new GameUI(canvas);
new InputHandler(canvas, game);

function updateScreenShake(): { offsetX: number; offsetY: number } {
  const shake = game.state.screenShake;
  if (!shake) return { offsetX: 0, offsetY: 0 };

  const elapsed = performance.now() - shake.startTime;
  if (elapsed >= shake.duration) {
    // Shake finished, clean up
    game.state.screenShake = undefined;
    return { offsetX: 0, offsetY: 0 };
  }

  // Calculate decay (exponential falloff)
  const progress = elapsed / shake.duration;
  const decay = 1 - progress;
  const currentIntensity = shake.intensity * decay;

  // Random offset with decay
  shake.offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
  shake.offsetY = (Math.random() - 0.5) * 2 * currentIntensity;

  return { offsetX: shake.offsetX, offsetY: shake.offsetY };
}

function render() {
  if (!ctx) return;

  // Update and get screen shake offset
  const shakeOffset = updateScreenShake();

  // Save current transform
  ctx.save();

  // Reset transform for clearing
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Restore scaled transform with shake offset
  ctx.restore();

  // Apply shake offset
  if (shakeOffset.offsetX !== 0 || shakeOffset.offsetY !== 0) {
    ctx.save();
    ctx.translate(shakeOffset.offsetX, shakeOffset.offsetY);
  }

  // Then render board and UI
  board.render();
  ui.render(game.state, game);

  // Restore after shake
  if (shakeOffset.offsetX !== 0 || shakeOffset.offsetY !== 0) {
    ctx.restore();
  }
}

// Continuous animation loop for glitter and other animated effects
function animationLoop() {
  render();
  requestAnimationFrame(animationLoop);
}

// Start the animation loop
animationLoop();
