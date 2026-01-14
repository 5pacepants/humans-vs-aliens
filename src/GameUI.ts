// GameUI class for rendering UI elements like card piles

import type { GameState } from './types';
import { CardRenderer } from './CardRenderer';

export class GameUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cardRenderer: CardRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cardRenderer = new CardRenderer();
  }

  render(gameState: GameState) {
    const boardWidth = this.canvas.width * 0.6;
    const uiX = boardWidth;
    const uiWidth = this.canvas.width - boardWidth;

    // Draw UI background (right 40%)
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(uiX, 0, uiWidth, this.canvas.height);
    
    // Render phase/status info at top left
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

    // Right sidebar - deck piles and drawn cards
    const deckX = uiX + 10;
    const deckWidth = uiWidth - 20;
    const deckHeight = 70;
    const pileSpacing = 10;

    // Human deck pile
    let color = gameState.hoverPile === 'human' ? 'darkgray' : 'gray';
    this.ctx.fillStyle = color;
    this.ctx.fillRect(deckX, 50, deckWidth, deckHeight);
    this.ctx.fillStyle = 'white';
    this.ctx.font = '16px sans-serif';
    this.ctx.fillText('Human Deck', deckX + 10, 75);
    this.ctx.fillText(`${gameState.humanDeck.length} cards`, deckX + 10, 95);

    // Alien deck pile
    color = gameState.hoverPile === 'alien' ? 'darkgray' : 'gray';
    this.ctx.fillStyle = color;
    this.ctx.fillRect(deckX, 130, deckWidth, deckHeight);
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Alien Deck', deckX + 10, 155);
    this.ctx.fillText(`${gameState.alienDeck.length} cards`, deckX + 10, 175);

    // Event deck pile
    color = gameState.hoverPile === 'event' ? 'darkgray' : 'gray';
    this.ctx.fillStyle = color;
    this.ctx.fillRect(deckX, 210, deckWidth, deckHeight);
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Event Deck', deckX + 10, 235);
    this.ctx.fillText(`${gameState.eventDeck.length} cards`, deckX + 10, 255);

    // Drawn event card
    if (gameState.drawnEvent) {
      const eventColor = gameState.hoverDrawnEvent ? '#5b2d82' : 'purple';
      this.ctx.fillStyle = eventColor;
      this.ctx.fillRect(deckX, 290, deckWidth, 50);
      this.ctx.fillStyle = 'white';
      this.ctx.fillText(gameState.drawnEvent.name, deckX + 10, 320);

      // Skip button
      const skipColor = gameState.hoverSkip ? 'darkgray' : 'gray';
      this.ctx.fillStyle = skipColor;
      const skipWidth = 70;
      this.ctx.fillRect(deckX, 350, skipWidth, 30);
      this.ctx.fillStyle = 'white';
      this.ctx.font = '14px sans-serif';
      const cardStartY = 380;
      const skips = gameState.currentPlayer === 'human' ? gameState.humanEventSkips : gameState.alienEventSkips;
      this.ctx.fillText('Skip', deckX + 10, 368);
      this.ctx.fillText(`(${skips})`, deckX + skipWidth + 5, 368);
    }

    // Render drawn cards in 3-column grid
    if (gameState.drawnCards.length > 0) {
      const cardsPerRow = 3;
      const cardStartX = deckX;
      const cardStartY = 380;
      const cardSpacing = 14;
      const cardWidth = 200;
      const cardHeight = 320;

      for (let i = 0; i < gameState.drawnCards.length; i++) {
        const card = gameState.drawnCards[i];
        const row = Math.floor(i / cardsPerRow);
        const col = i % cardsPerRow;
        const cardX = cardStartX + col * (cardWidth + cardSpacing);
        const cardY = cardStartY + row * (cardHeight + cardSpacing);

        // Use CardRenderer for visual cards
        this.cardRenderer.renderCard(this.ctx, card, cardX, cardY, cardWidth, cardHeight);
      }
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
