// GameUI class for rendering UI elements like card piles

import type { GameState } from './types';
import { CardRenderer } from './CardRenderer';

export class GameUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cardRenderer: CardRenderer;
  private backgroundImage: HTMLImageElement;
  private cardbackHuman: HTMLImageElement;
  private cardbackAlien: HTMLImageElement;
  private cardbackEvent: HTMLImageElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cardRenderer = new CardRenderer();
    
    // Load background image for UI area
    this.backgroundImage = new Image();
    this.backgroundImage.src = '/background-cards-2.png';
    
    // Load cardback images
    this.cardbackHuman = new Image();
    this.cardbackHuman.src = '/cardback-human.png';
    
    this.cardbackAlien = new Image();
    this.cardbackAlien.src = '/cardback-alien.png';
    
    this.cardbackEvent = new Image();
    this.cardbackEvent.src = '/cardback-event.png';
  }

  render(gameState: GameState, game?: any) {
    const boardWidth = this.canvas.width * 0.6;
    const uiX = boardWidth;
    const uiWidth = this.canvas.width - boardWidth;

    // Draw background image for UI (right 40%)
    if (this.backgroundImage.complete) {
      // Save context state
      this.ctx.save();
      
      // Clip to UI area to prevent shadows bleeding into hex side
      this.ctx.beginPath();
      this.ctx.rect(uiX, 0, uiWidth, this.canvas.height);
      this.ctx.clip();
      
      this.ctx.drawImage(this.backgroundImage, uiX, 0, uiWidth, this.canvas.height);
      
      // Apply soft gradient fade on left edge
      const gradientWidth = 120;
      const fadeGradient = this.ctx.createLinearGradient(uiX, 0, uiX + gradientWidth, 0);
      fadeGradient.addColorStop(0, 'rgba(74, 84, 98, 0.6)');
      fadeGradient.addColorStop(0.5, 'rgba(74, 84, 98, 0.2)');
      fadeGradient.addColorStop(1, 'rgba(74, 84, 98, 0)');
      
      this.ctx.fillStyle = fadeGradient;
      this.ctx.fillRect(uiX, 0, gradientWidth, this.canvas.height);
      
      // Restore context - removes clipping so shadows can render properly
      this.ctx.restore();
    } else {
      // Fallback to gray background if image not loaded
      this.ctx.fillStyle = '#4a4a4a';
      this.ctx.fillRect(uiX, 0, uiWidth, this.canvas.height);
    }
    
    // Render phase/status info at top left
    this.ctx.fillStyle = 'white';
    this.ctx.font = '20px Quicksand, sans-serif';
    this.ctx.fillText(`Phase: ${gameState.phase.toUpperCase()}`, 50, 50);
    this.ctx.fillText(`Player: ${gameState.currentPlayer}`, 50, 80);
    if (gameState.phase === 'combat') {
      this.ctx.fillText(`Combat Turn: ${gameState.currentCombatIndex + 1}/${gameState.combatOrder.length}`, 50, 110);
      if (gameState.selectedAttacker) {
        this.ctx.fillText('Select target to attack', 50, 140);
      } else {
        this.ctx.fillText('Select your unit to attack', 50, 140);
      }
    }

    // Draw cardbacks at top of UI in 3-column layout (these ARE the decks)
    const cardbackWidth = 304; // Same as drawn cards
    const cardbackHeight = 487; // Same as drawn cards
    const cardbackSpacing = 10;
    const cardbackStartY = 50;
    const totalCardbackWidth = cardbackWidth * 3 + cardbackSpacing * 2;
    const cardbackStartX = uiX + (uiWidth - totalCardbackWidth) / 2;
    
    // Determine which cardback should be enlarged (active deck)
    let activeCardback: 'human' | 'alien' | 'event' | null = null;
    if (gameState.drawnEvent) {
      activeCardback = 'event'; // Event card drawn
    } else if (gameState.currentPlayer === 'human') {
      activeCardback = 'human';
    } else if (gameState.currentPlayer === 'alien') {
      activeCardback = 'alien';
    }
    
    const enlargeScale = 1.15; // 15% larger for active deck
    
    // Human cardback
    if (this.cardbackHuman.complete) {
      const isActive = activeCardback === 'human';
      const scale = isActive ? enlargeScale : 1.0;
      const w = cardbackWidth * scale;
      const h = cardbackHeight * scale;
      const x = cardbackStartX - (w - cardbackWidth) / 2;
      const y = cardbackStartY - (h - cardbackHeight) / 2;
      
      // Desaturate if not selectable
      if (!isActive) {
        this.ctx.filter = 'brightness(0.6) saturate(0.3)';
      }
      
      // Shadow effect - red for hover when active, gray when not active, white otherwise
      if (gameState.hoverPile === 'human') {
        if (isActive) {
          this.ctx.shadowColor = 'rgba(255, 50, 50, 1.0)';
        } else {
          this.ctx.shadowColor = 'rgba(128, 128, 128, 1.0)'; // Gray hover
        }
        this.ctx.shadowBlur = 30;
      } else {
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        this.ctx.shadowBlur = 20;
      }
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      this.ctx.drawImage(this.cardbackHuman, x, y, w, h);
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.filter = 'none'; // Reset filter
      
      // Show card count on top of cardback - same shadow style as hex numbers
      this.ctx.fillStyle = 'white';
      this.ctx.font = '700 24px "Smooch Sans", sans-serif';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';
      this.ctx.shadowBlur = 20;
      this.ctx.shadowOffsetX = 4;
      this.ctx.shadowOffsetY = 4;
      const humanText = `${gameState.humanDeck.length} cards`;
      const humanTextWidth = this.ctx.measureText(humanText).width;
      // Use base position so text doesn't move with hover scale
      const humanTextX = cardbackStartX + (cardbackWidth - humanTextWidth) / 2;
      const humanTextY = cardbackStartY + cardbackHeight - 25; // Moved up 10px (was -15)
      // Add stroke outline like hex numbers
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 6;
      this.ctx.strokeText(humanText, humanTextX, humanTextY);
      this.ctx.fillText(humanText, humanTextX, humanTextY);
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    }
    
    // Alien cardback
    if (this.cardbackAlien.complete) {
      const isActive = activeCardback === 'alien';
      const scale = isActive ? enlargeScale : 1.0;
      const w = cardbackWidth * scale;
      const h = cardbackHeight * scale;
      const baseX = cardbackStartX + cardbackWidth + cardbackSpacing;
      const x = baseX - (w - cardbackWidth) / 2;
      const y = cardbackStartY - (h - cardbackHeight) / 2;
      
      // Desaturate if not selectable
      if (!isActive) {
        this.ctx.filter = 'brightness(0.6) saturate(0.3)';
      }
      
      // Shadow effect - red for hover when active, gray when not active, white otherwise
      if (gameState.hoverPile === 'alien') {
        if (isActive) {
          this.ctx.shadowColor = 'rgba(255, 50, 50, 1.0)';
        } else {
          this.ctx.shadowColor = 'rgba(128, 128, 128, 1.0)'; // Gray hover
        }
        this.ctx.shadowBlur = 30;
      } else {
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        this.ctx.shadowBlur = 20;
      }
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      this.ctx.drawImage(this.cardbackAlien, x, y, w, h);
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.filter = 'none'; // Reset filter
      
      // Show card count on top of cardback - same shadow style as hex numbers
      this.ctx.fillStyle = 'white';
      this.ctx.font = '700 24px "Smooch Sans", sans-serif';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';
      this.ctx.shadowBlur = 20;
      this.ctx.shadowOffsetX = 4;
      this.ctx.shadowOffsetY = 4;
      const alienText = `${gameState.alienDeck.length} cards`;
      const alienTextWidth = this.ctx.measureText(alienText).width;
      // Use base position so text doesn't move with hover scale
      const alienTextX = baseX + (cardbackWidth - alienTextWidth) / 2;
      const alienTextY = cardbackStartY + cardbackHeight - 25; // Moved up 10px
      // Add stroke outline like hex numbers
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 6;
      this.ctx.strokeText(alienText, alienTextX, alienTextY);
      this.ctx.fillText(alienText, alienTextX, alienTextY);
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    }
    
    // Event cardback
    if (this.cardbackEvent.complete) {
      const isActive = activeCardback === 'event';
      const scale = isActive ? enlargeScale : 1.0;
      const w = cardbackWidth * scale;
      const h = cardbackHeight * scale;
      const baseX = cardbackStartX + (cardbackWidth + cardbackSpacing) * 2;
      const x = baseX - (w - cardbackWidth) / 2;
      const y = cardbackStartY - (h - cardbackHeight) / 2;
      
      // Desaturate if not selectable
      if (!isActive) {
        this.ctx.filter = 'brightness(0.6) saturate(0.3)';
      }
      
      // Shadow effect - red for hover when active, gray when not active, white otherwise
      if (gameState.hoverPile === 'event') {
        if (isActive) {
          this.ctx.shadowColor = 'rgba(255, 50, 50, 1.0)';
        } else {
          this.ctx.shadowColor = 'rgba(128, 128, 128, 1.0)'; // Gray hover
        }
        this.ctx.shadowBlur = 30;
      } else {
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        this.ctx.shadowBlur = 20;
      }
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      this.ctx.drawImage(this.cardbackEvent, x, y, w, h);
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.filter = 'none'; // Reset filter
      
      // Show card count on top of cardback - same shadow style as hex numbers
      this.ctx.fillStyle = 'white';
      this.ctx.font = '700 24px "Smooch Sans", sans-serif';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';
      this.ctx.shadowBlur = 20;
      this.ctx.shadowOffsetX = 4;
      this.ctx.shadowOffsetY = 4;
      const eventText = `${gameState.eventDeck.length} cards`;
      const eventTextWidth = this.ctx.measureText(eventText).width;
      // Use base position so text doesn't move with hover scale
      const eventTextX = baseX + (cardbackWidth - eventTextWidth) / 2;
      const eventTextY = cardbackStartY + cardbackHeight - 25; // Moved up 10px
      // Add stroke outline like hex numbers
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 6;
      this.ctx.strokeText(eventText, eventTextX, eventTextY);
      this.ctx.fillText(eventText, eventTextX, eventTextY);
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    }

    const deckX = uiX + 10;
    const deckWidth = uiWidth - 20;
    const deckStartY = cardbackStartY + cardbackHeight + 20;

    // Drawn event card - render it properly like other cards
    if (gameState.drawnEvent) {
      const eventCardWidth = 274; // Same as drawn cards
      const eventCardHeight = 438;
      const eventCardX = deckX + (deckWidth - eventCardWidth) / 2; // Center it
      const eventCardY = deckStartY;

      // Apply shadow
      const isHovered = gameState.hoverDrawnEvent;
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      this.ctx.shadowBlur = 25;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      
      // Animate scale from 1.0 to 1.2 over 300ms when hovering
      const targetScale = isHovered ? 1.2 : 1.0;
      const animationDuration = 300; // milliseconds
      
      // Initialize or update scale animation
      if (gameState.hoverStartTime === undefined && isHovered) {
        gameState.hoverStartTime = Date.now();
        gameState.hoverCardScale = 1.0;
      } else if (!isHovered) {
        gameState.hoverStartTime = undefined;
        gameState.hoverCardScale = 1.0;
      }
      
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
      const scaledWidth = eventCardWidth * currentScale;
      const scaledHeight = eventCardHeight * currentScale;
      const scaledX = eventCardX - (scaledWidth - eventCardWidth) / 2;
      const scaledY = eventCardY - (scaledHeight - eventCardHeight) / 2;
      
      this.cardRenderer.renderCard(this.ctx, gameState.drawnEvent, scaledX, scaledY, scaledWidth, scaledHeight);
      
      // Reset shadow
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;

      // Skip button below the event card
      const skipY = eventCardY + eventCardHeight + 20; // Flyttad upp 10px (var +30)
      const skipButton = this.cardRenderer['assetLoader'].getAsset('skipButton');
      
      if (skipButton && skipButton.complete) {
        // Use skip button image with original aspect ratio, 50% larger
        const originalAspect = skipButton.width / skipButton.height;
        const skipHeight = 180; // 50% större än 120
        const skipWidth = skipHeight * originalAspect;
        const skipX = deckX + (deckWidth - skipWidth) / 2; // Center it
        
        // Optional hover effect
        const hoverScale = gameState.hoverSkip ? 1.05 : 1.0;
        const scaledSkipWidth = skipWidth * hoverScale;
        const scaledSkipHeight = skipHeight * hoverScale;
        const scaledSkipX = skipX - (scaledSkipWidth - skipWidth) / 2;
        const scaledSkipY = skipY - (scaledSkipHeight - skipHeight) / 2;
        
        // Apply black shadow - much darker and more visible
        this.ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';
        this.ctx.shadowBlur = 40;
        this.ctx.shadowOffsetX = 8;
        this.ctx.shadowOffsetY = 8;
        
        this.ctx.drawImage(skipButton, scaledSkipX, scaledSkipY, scaledSkipWidth, scaledSkipHeight);
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        
        // Draw skip count on the button with black shadow like hex numbers
        // Apply hover scale to text size too
        const baseFontSize = 20;
        const scaledFontSize = baseFontSize * hoverScale;
        this.ctx.font = `bold ${scaledFontSize}px Quicksand, sans-serif`;
        
        this.ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 4;
        this.ctx.shadowOffsetY = 4;
        
        // Black stroke outline
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 6;
        const skips = gameState.currentPlayer === 'human' ? gameState.humanEventSkips : gameState.alienEventSkips;
        const skipText = `Skip: (${skips})`;
        const skipTextWidth = this.ctx.measureText(skipText).width;
        const textX = skipX + (skipWidth - skipTextWidth) / 2;
        const textY = skipY + 89; // Flyttad ner 2px (var 87)
        this.ctx.strokeText(skipText, textX, textY);
        
        // Then fill with white
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(skipText, textX, textY);
        
        // Reset shadow and stroke
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
      } else {
        // Fallback to gray rectangle
        const skipColor = gameState.hoverSkip ? 'darkgray' : 'gray';
        this.ctx.fillStyle = skipColor;
        const skipWidth = 70;
        this.ctx.fillRect(deckX, skipY, skipWidth, 30);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Quicksand, sans-serif';
        const skips = gameState.currentPlayer === 'human' ? gameState.humanEventSkips : gameState.alienEventSkips;
        this.ctx.fillText('Skip', deckX + 10, skipY + 18);
        this.ctx.fillText(`(${skips})`, deckX + skipWidth + 5, skipY + 18);
      }
    }

    // Card preview moved to Board.ts for better positioning

    // Render drawn cards in 3-column grid
    if (gameState.drawnCards.length > 0) {
      const cardsPerRow = 3;
      const cardSpacing = 21;
      const cardWidth = 274; // 90% of 304
      const cardHeight = 438; // 90% of 487
      const totalCardsWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * cardSpacing;
      const cardStartX = uiX + (uiWidth - totalCardsWidth) / 2; // Center the cards
      const cardStartY = deckStartY + 170;

      // First pass: render all non-hovered cards
      for (let i = 0; i < gameState.drawnCards.length; i++) {
        if (gameState.hoverCardIndex === i) continue; // Skip hovered card for now
        
        const card = gameState.drawnCards[i];
        const row = Math.floor(i / cardsPerRow);
        const col = i % cardsPerRow;
        const cardX = cardStartX + col * (cardWidth + cardSpacing);
        const cardY = cardStartY + row * (cardHeight + cardSpacing);

        // Apply white shadow
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        this.ctx.shadowBlur = 25;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Use CardRenderer for visual cards
        this.cardRenderer.renderCard(this.ctx, card, cardX, cardY, cardWidth, cardHeight);
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
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

        // No shadow for hovered card - enlargement is enough highlight
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

    // Autoplace button (for testing - remove later)
    if (gameState.phase === 'placement' && (gameState.humanDeck.length > 0 || gameState.alienDeck.length > 0)) {
      const autoButtonWidth = 200;
      const autoButtonHeight = 50;
      const autoButtonX = boardWidth - autoButtonWidth - 20;
      const autoButtonY = 20;

      this.ctx.fillStyle = '#4a4a4a';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.roundedRect(this.ctx, autoButtonX, autoButtonY, autoButtonWidth, autoButtonHeight, 8);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 18px Quicksand, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('AUTOPLACE ALL', autoButtonX + autoButtonWidth / 2, autoButtonY + autoButtonHeight / 2);
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'alphabetic';
    }

    // Battle button if all cards are placed
    if (game && game.allCardsPlaced && game.allCardsPlaced() && gameState.phase === 'placement') {
      console.log('Showing battle button');
      const buttonWidth = 300;
      const buttonHeight = 80;
      const buttonX = uiX + (uiWidth - buttonWidth) / 2;
      const buttonY = this.canvas.height / 2 - buttonHeight / 2;

      // Draw button background with hover effect
      this.ctx.fillStyle = gameState.hoverBattleButton ? '#6B0A0A' : '#8B1A1A';
      this.ctx.strokeStyle = '#F0D4A8';
      this.ctx.lineWidth = 4;
      this.roundedRect(this.ctx, buttonX, buttonY, buttonWidth, buttonHeight, 10);
      this.ctx.fill();
      this.ctx.stroke();

      // Draw button text
      this.ctx.fillStyle = '#F0D4A8';
      this.ctx.font = 'bold 36px "Smooch Sans", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      // Add shadow to text
      this.ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetX = 3;
      this.ctx.shadowOffsetY = 3;
      
      this.ctx.fillText('BATTLE!', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
      
      // Reset shadow
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'alphabetic';
    }

    // Battle log modal in center of board
    if (gameState.phase === 'battleLog') {
      const boardWidth = this.canvas.width * 0.6;
      const modalWidth = 600 * 2.5; // mycket bredare
      const modalHeight = 400 * 2.2 * 1.1;
      const modalX = (boardWidth - modalWidth) / 2;
      const modalY = (this.canvas.height - modalHeight) / 2;

      // Draw semi-transparent backdrop
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, boardWidth, this.canvas.height);

      // Draw modal background
      this.ctx.fillStyle = '#2a1810';
      this.ctx.strokeStyle = '#F0D4A8';
      this.ctx.lineWidth = 6;
      this.roundedRect(this.ctx, modalX, modalY, modalWidth, modalHeight, 20);
      this.ctx.fill();
      this.ctx.stroke();

      // Draw title
      this.ctx.fillStyle = '#F0D4A8';
      this.ctx.font = 'bold 48px "Smooch Sans", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetX = 3;
      this.ctx.shadowOffsetY = 3;
      this.ctx.fillText('BATTLE LOG', modalX + modalWidth / 2, modalY + 70);

      // Draw log lines
      this.ctx.font = '19px Quicksand, sans-serif';
      this.ctx.fillStyle = '#F0D4A8';
      this.ctx.textAlign = 'left';
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      let y = modalY + 120;
      const lineHeight = 32;
      const colWidth = (modalWidth - 60) / 2;
      let col = 0;
      let linesDrawn = 0;
      if (gameState.battleLog) {
        for (const line of gameState.battleLog) {
          this.ctx.fillText(line, modalX + 30 + col * colWidth, y);
          y += lineHeight;
          linesDrawn++;
          // Om vi når botten av första kolumnen, byt till nästa
          if (y > modalY + modalHeight - 40) {
            col++;
            y = modalY + 120;
          }
        }
      }

      // Reset alignment
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'alphabetic';

        // Draw 'Continue' button at the bottom center of the modal
        const continueBtnWidth = 260;
        const continueBtnHeight = 60;
        const continueBtnX = modalX + (modalWidth - continueBtnWidth) / 2;
        const continueBtnY = modalY + modalHeight - continueBtnHeight - 20;
        // Button background
        this.ctx.fillStyle = gameState.hoverContinueButton ? '#3A7A2A' : '#4CAF50';
        this.roundedRect(this.ctx, continueBtnX, continueBtnY, continueBtnWidth, continueBtnHeight, 12);
        this.ctx.fill();
        // Button text
        this.ctx.font = 'bold 32px "Smooch Sans", sans-serif';
        this.ctx.fillStyle = '#F0D4A8';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        this.ctx.shadowBlur = 6;
        this.ctx.fillText('Continue', continueBtnX + continueBtnWidth / 2, continueBtnY + continueBtnHeight / 2);
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
    }
  }

  private roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
