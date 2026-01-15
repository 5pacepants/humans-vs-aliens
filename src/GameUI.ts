// GameUI class for rendering UI elements like card piles

import type { GameState } from './types';
import { CardRenderer } from './CardRenderer';

export class GameUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cardRenderer: CardRenderer;
  private backgroundImage: HTMLImageElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cardRenderer = new CardRenderer();
    
    // Load background image for UI area
    this.backgroundImage = new Image();
    this.backgroundImage.src = '/background-hex-3.png';
  }

  render(gameState: GameState) {
    const boardWidth = this.canvas.width * 0.6;
    const uiX = boardWidth;
    const uiWidth = this.canvas.width - boardWidth;

    // Draw background image for UI (right 40%)
    if (this.backgroundImage.complete) {
      this.ctx.drawImage(this.backgroundImage, uiX, 0, uiWidth, this.canvas.height);
      
      // Apply soft gradient fade on left edge
      const gradientWidth = 120;
      const fadeGradient = this.ctx.createLinearGradient(uiX, 0, uiX + gradientWidth, 0);
      fadeGradient.addColorStop(0, 'rgba(74, 84, 98, 0.6)');
      fadeGradient.addColorStop(0.5, 'rgba(74, 84, 98, 0.2)');
      fadeGradient.addColorStop(1, 'rgba(74, 84, 98, 0)');
      
      this.ctx.fillStyle = fadeGradient;
      this.ctx.fillRect(uiX, 0, gradientWidth, this.canvas.height);
    } else {
      // Fallback to gray background if image not loaded
      this.ctx.fillStyle = '#4a4a4a';
      this.ctx.fillRect(uiX, 0, uiWidth, this.canvas.height);
    }
    
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
    this.ctx.font = '700 18px "Smooch Sans", sans-serif';
    this.ctx.fillText('Human Deck', deckX + 10, 75);
    this.ctx.font = '16px Quicksand, sans-serif';
    this.ctx.fillText(`${gameState.humanDeck.length} cards`, deckX + 10, 95);

    // Alien deck pile
    color = gameState.hoverPile === 'alien' ? 'darkgray' : 'gray';
    this.ctx.fillStyle = color;
    this.ctx.fillRect(deckX, 130, deckWidth, deckHeight);
    this.ctx.fillStyle = 'white';
    this.ctx.font = '700 18px "Smooch Sans", sans-serif';
    this.ctx.fillText('Alien Deck', deckX + 10, 155);
    this.ctx.font = '16px Quicksand, sans-serif';
    this.ctx.fillText(`${gameState.alienDeck.length} cards`, deckX + 10, 175);

    // Event deck pile
    color = gameState.hoverPile === 'event' ? 'darkgray' : 'gray';
    this.ctx.fillStyle = color;
    this.ctx.fillRect(deckX, 210, deckWidth, deckHeight);
    this.ctx.fillStyle = 'white';
    this.ctx.font = '700 18px "Smooch Sans", sans-serif';
    this.ctx.fillText('Event Deck', deckX + 10, 235);
    this.ctx.font = '16px Quicksand, sans-serif';
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

    // Card preview moved to Board.ts for better positioning

    // Render drawn cards in 3-column grid
    if (gameState.drawnCards.length > 0) {
      const cardsPerRow = 3;
      const cardStartX = deckX;
      const cardStartY = 320;
      const cardSpacing = 21;
      const cardWidth = 304;
      const cardHeight = 487;

      // First pass: render all non-hovered cards
      for (let i = 0; i < gameState.drawnCards.length; i++) {
        if (gameState.hoverCardIndex === i) continue; // Skip hovered card for now
        
        const card = gameState.drawnCards[i];
        const row = Math.floor(i / cardsPerRow);
        const col = i % cardsPerRow;
        const cardX = cardStartX + col * (cardWidth + cardSpacing);
        const cardY = cardStartY + row * (cardHeight + cardSpacing);

        // Use CardRenderer for visual cards
        this.cardRenderer.renderCard(this.ctx, card, cardX, cardY, cardWidth, cardHeight);
      }

      // Second pass: render hovered card last (on top) and with animated scale
      if (gameState.hoverCardIndex !== undefined) {
        const i = gameState.hoverCardIndex;
        const card = gameState.drawnCards[i];
        const row = Math.floor(i / cardsPerRow);
        const col = i % cardsPerRow;
        const baseCardX = cardStartX + col * (cardWidth + cardSpacing);
        const baseCardY = cardStartY + row * (cardHeight + cardSpacing);

        // Animate scale from 1.0 to 1.2 over 300ms
        const targetScale = 1.2;
        const animationDuration = 300; // milliseconds
        
        if (gameState.hoverStartTime !== undefined) {
          const elapsed = Date.now() - gameState.hoverStartTime;
          const progress = Math.min(elapsed / animationDuration, 1.0);
          // Ease-out cubic for smoother animation
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          gameState.hoverCardScale = 1.0 + (targetScale - 1.0) * easedProgress;
          
          // Request another frame if animation not complete
          if (progress < 1.0) {
            requestAnimationFrame(() => this.render(gameState));
          }
        }

        const currentScale = gameState.hoverCardScale ?? 1.0;
        const hoverWidth = cardWidth * currentScale;
        const hoverHeight = cardHeight * currentScale;
        
        // Center the enlarged card on the original position
        const hoverX = baseCardX - (hoverWidth - cardWidth) / 2;
        const hoverY = baseCardY - (hoverHeight - cardHeight) / 2;

        this.cardRenderer.renderCard(this.ctx, card, hoverX, hoverY, hoverWidth, hoverHeight);
      }
    }

    // Draw cursor dot if holding a card
    if (gameState.selectedCard !== undefined) {
      const boardWidth = this.canvas.width * 0.6;
      const isOverBoard = gameState.mouseX < boardWidth;
      
      // Determine target scale based on location
      const targetScale = isOverBoard ? 0.5 : 1.0;
      
      // Initialize or update target scale
      if (gameState.previewTargetScale !== targetScale) {
        gameState.previewTargetScale = targetScale;
        gameState.previewScaleStartTime = Date.now();
        if (gameState.previewScale === undefined) {
          gameState.previewScale = targetScale; // First time, no animation
        }
      }
      
      // Animate scale from current to target over 300ms
      const animationDuration = 300;
      if (gameState.previewScaleStartTime !== undefined && gameState.previewScale !== undefined) {
        const elapsed = Date.now() - gameState.previewScaleStartTime;
        const progress = Math.min(elapsed / animationDuration, 1.0);
        // Ease-out cubic for smoother animation
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const startScale = gameState.previewScale;
        gameState.previewScale = startScale + (targetScale - startScale) * easedProgress;
        
        // Request another frame if animation not complete
        if (progress < 1.0) {
          requestAnimationFrame(() => this.render(gameState));
        }
      }
      
      // Use current scale for rendering
      const currentScale = gameState.previewScale ?? 1.0;
      const previewWidth = 200 * currentScale;
      const previewHeight = 320 * currentScale;
      const previewX = gameState.mouseX - previewWidth / 2;
      const previewY = gameState.mouseY - previewHeight * 0.3;
      this.cardRenderer.renderFrameAndCharacter(this.ctx, gameState.selectedCard, previewX, previewY, previewWidth, previewHeight);
    }
  }
}
