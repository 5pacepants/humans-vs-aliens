import { Board } from './Board';
import { GameUI } from './GameUI';
import { Game } from './Game';
import { InputHandler } from './InputHandler';

const canvas = document.getElementById("game") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  render();
});

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("No 2D context");

const game = new Game(render);
const board = new Board(canvas, game.state);
const ui = new GameUI(canvas);
const inputHandler = new InputHandler(canvas, game);

function render() {
  board.render();
  ui.render(game.state);
}

render();
