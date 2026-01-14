// GameUI class for rendering UI elements like card piles

import type { GameState } from './types';

export class GameUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  render(gameState: GameState) {
    // Render phase
    this.ctx.fillStyle = 'white';
    this.ctx.font = '20px sans-serif';
    this.ctx.fillText(`Phase: ${gameState.phase.toUpperCase()}`, 50, 50);
    this.ctx.fillText(`Player: ${gameState.currentPlayer}`, 50, 80);
    if (gameState.phase === 'combat') {
      this.ctx.fillText(`Combat Turn: ${gameState.currentCombatIndex + 1}/${gameState.combatOrder.length}`, 50, 110);
      if (gameState.selectedAttacker) {
        this.ctx.fillText('Select target to attack', 50, 140);
      } else {
        this.ctx.fillText('Select your unit to attack', 50, 140);
      }
    } else if (gameState.phase === 'scoring') {
      this.ctx.fillText(`Human Score: ${gameState.humanScore}`, 50, 110);
      this.ctx.fillText(`Alien Score: ${gameState.alienScore}`, 50, 140);
      if (gameState.winner) {
        this.ctx.fillText(`Winner: ${gameState.winner.toUpperCase()}`, 50, 170);
      }
    }
    let color = gameState.hoverPile === 'human' ? 'darkgray' : 'gray';
    this.ctx.fillStyle = color;
    this.ctx.fillRect(this.canvas.width - 200, 50, 150, 100); // Human deck
    this.ctx.fillStyle = 'white';
    this.ctx.font = '16px sans-serif';
    this.ctx.fillText('Human Deck', this.canvas.width - 180, 80);
    this.ctx.fillText(`${gameState.humanDeck.length} cards`, this.canvas.width - 180, 100);

    color = gameState.hoverPile === 'alien' ? 'darkgray' : 'gray';
    this.ctx.fillStyle = color;
    this.ctx.fillRect(this.canvas.width - 200, 200, 150, 100); // Alien deck
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Alien Deck', this.canvas.width - 180, 230);
    this.ctx.fillText(`${gameState.alienDeck.length} cards`, this.canvas.width - 180, 250);

    color = gameState.hoverPile === 'event' ? 'darkgray' : 'gray';
    this.ctx.fillStyle = color;
    this.ctx.fillRect(this.canvas.width - 200, 350, 150, 100); // Event deck
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Event Deck', this.canvas.width - 180, 380);
    this.ctx.fillText(`${gameState.eventDeck.length} cards`, this.canvas.width - 180, 400);

    // Render drawn cards below piles (shifted down a bit)
    if (gameState.drawnCards.length > 0) {
      for (let i = 0; i < gameState.drawnCards.length; i++) {
        const baseColor = gameState.drawnCards[i].faction === 'human' ? 'blue' : 'red';
        const color = gameState.hoverCardIndex === i ? `dark${baseColor}` : baseColor;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(this.canvas.width - 200, 560 + i * 60, 150, 50);
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(gameState.drawnCards[i].name, this.canvas.width - 180, 585 + i * 60);
      }
    }

    // Render drawn event just under the Event deck
    if (gameState.drawnEvent) {
      this.ctx.fillStyle = 'purple'; // Lila for events
      this.ctx.fillRect(this.canvas.width - 200, 470, 150, 50);
      this.ctx.fillStyle = 'white';
      this.ctx.fillText(gameState.drawnEvent.name, this.canvas.width - 180, 495);

      // Skip button
      this.ctx.fillStyle = 'gray';
      this.ctx.fillRect(this.canvas.width - 200, 530, 70, 30);
      this.ctx.fillStyle = 'white';
      this.ctx.font = '14px sans-serif';
      this.ctx.fillText('Skip', this.canvas.width - 175, 550);
      const skips = gameState.currentPlayer === 'human' ? gameState.humanEventSkips : gameState.alienEventSkips;
      this.ctx.fillText(`(${skips})`, this.canvas.width - 130, 550);
    }

    // Draw cursor dot if holding a card
    if (gameState.selectedCard !== undefined) {
      const color = gameState.selectedCard.faction === 'human' ? 'blue' : 'red';
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(gameState.mouseX, gameState.mouseY, 8, 0, 2 * Math.PI);
      this.ctx.fill();
      // Add white border for better visibility
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(gameState.mouseX, gameState.mouseY, 8, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
  }
}
