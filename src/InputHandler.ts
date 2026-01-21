// InputHandler class for mouse clicks

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private game: any;

  constructor(canvas: HTMLCanvasElement, game: any) {
    this.canvas = canvas;
    this.game = game;
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('contextmenu', this.handleRightClick.bind(this));
  }

  private handleMouseMove(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.game.state.mouseX = x;
    this.game.state.mouseY = y;

    // Reset hover
    const previousHoverIndex = this.game.state.hoverCardIndex;
    this.game.state.hoverPile = undefined;
    this.game.state.hoverCardIndex = undefined;
    this.game.state.hoverHex = undefined;
    this.game.state.hoverDrawnEvent = false;
    this.game.state.hoverSkip = false;
    this.game.state.hoverBattleButton = false;

    const boardWidth = this.canvas.width * 0.6;
    const uiX = boardWidth; // Right 40% starts here

    if (x > uiX) {
      // UI area (right 40%)
      // Check for Battle button hover
      if (this.game.state.phase === 'placement' && (this.game as any).allCardsPlaced && (this.game as any).allCardsPlaced()) {
        const buttonWidth = 300;
        const buttonHeight = 80;
        const uiWidth = this.canvas.width - boardWidth;
        const buttonX = uiX + (uiWidth - buttonWidth) / 2;
        const buttonY = this.canvas.height / 2 - buttonHeight / 2;

        if (x >= buttonX && x < buttonX + buttonWidth && y >= buttonY && y < buttonY + buttonHeight) {
          this.game.state.hoverBattleButton = true;
        }
      }

        // Battle log 'Continue' button hover
        if (this.game.state.phase === 'battleLog') {
          const modalWidth = 600 * 2.5;
          const modalHeight = 400 * 2.2 * 1.1;
          const modalX = (boardWidth - modalWidth) / 2;
          const modalY = (this.canvas.height - modalHeight) / 2;
          const continueBtnWidth = 260;
          const continueBtnHeight = 60;
          const continueBtnX = modalX + (modalWidth - continueBtnWidth) / 2;
          const continueBtnY = modalY + modalHeight - continueBtnHeight - 20;
          if (x >= continueBtnX && x < continueBtnX + continueBtnWidth && y >= continueBtnY && y < continueBtnY + continueBtnHeight) {
            this.game.state.hoverContinueButton = true;
          } else {
            this.game.state.hoverContinueButton = false;
          }
        }

      // Cardback dimensions and positions
      const cardbackWidth = 304 * 1.02;
      const cardbackHeight = 487 * 1.02;
      const cardbackSpacing = 10;
      const cardbackStartY = 50;
      const uiWidth = this.canvas.width - boardWidth;
      const totalCardbackWidth = cardbackWidth * 3 + cardbackSpacing * 2;
      const cardbackStartX = uiX + (uiWidth - totalCardbackWidth) / 2;
      
      // Check hover on cardbacks
      if (y >= cardbackStartY && y < cardbackStartY + cardbackHeight) {
        // Human cardback
        if (x >= cardbackStartX && x < cardbackStartX + cardbackWidth) {
          this.game.state.hoverPile = 'human';
        }
        // Alien cardback
        else if (x >= cardbackStartX + cardbackWidth + cardbackSpacing && x < cardbackStartX + cardbackWidth * 2 + cardbackSpacing) {
          this.game.state.hoverPile = 'alien';
        }
        // Event cardback
        else if (x >= cardbackStartX + (cardbackWidth + cardbackSpacing) * 2 && x < cardbackStartX + cardbackWidth * 3 + cardbackSpacing * 2) {
          this.game.state.hoverPile = 'event';
        }
      }
      
      const deckStartY = cardbackStartY + cardbackHeight + 20;
      
      // Event card hover detection (now a full card, not just a rectangle)
      const eventCardWidth = 274;
      const eventCardHeight = 438;
      const deckX = uiX + 10; // Match GameUI
      const deckWidth = uiWidth - 20; // Match GameUI
      const eventCardX = deckX + (deckWidth - eventCardWidth) / 2;
      const eventCardY = deckStartY;
      const skipY = eventCardY + eventCardHeight + 20;
      // Calculate skip button dimensions to match GameUI exactly
      const skipHeight = 180;
      // Use actual aspect ratio based on loaded image if available
      const skipButtonImg = (this.game as any).ui?.cardRenderer?.assetLoader?.getAsset('skipButton');
      
      // Get real dimensions from GameUI if available, otherwise use correct fallback (1536x1024 = 1.5)
      let skipWidth = 180 * 1.5; // Correct aspect ratio
      if (skipButtonImg && skipButtonImg.complete && skipButtonImg.width > 0) {
        skipWidth = skipHeight * (skipButtonImg.width / skipButtonImg.height);
      }
      const skipX = deckX + (deckWidth - skipWidth) / 2; // Match GameUI
      
      // Tighter vertical bounds for click detection (skip decorative parts)
      const skipHitHeight = 140;
      const skipHitY = skipY + (skipHeight - skipHitHeight) / 2;
      
      if (x >= eventCardX && x < eventCardX + eventCardWidth && y >= eventCardY && y < eventCardY + eventCardHeight && this.game.state.drawnEvent) {
        this.game.state.hoverDrawnEvent = true;
      } else if (x >= skipX && x < skipX + skipWidth && y >= skipHitY && y < skipHitY + skipHitHeight && this.game.state.drawnEvent) {
        this.game.state.hoverSkip = true;
      } else if (y > deckStartY + 100) {
        // Drawn cards in 3-card grid (hover detection)
        const cardWidth = 274; // 90% of 304
        const cardHeight = 438; // 90% of 487
        const cardsPerRow = 3;
        const spacing = 21;
        const totalCardsWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * spacing;
        const startX = uiX + (uiWidth - totalCardsWidth) / 2;
        const startY = deckStartY + 170;

        for (let i = 0; i < this.game.state.drawnCards.length; i++) {
          const row = Math.floor(i / cardsPerRow);
          const col = i % cardsPerRow;
          const cardX = startX + col * (cardWidth + spacing);
          const cardY = startY + row * (cardHeight + spacing);

          if (x >= cardX && x < cardX + cardWidth && y >= cardY && y < cardY + cardHeight) {
            this.game.state.hoverCardIndex = i;
            // Start animation if hovering a new card
            if (previousHoverIndex !== i) {
              this.game.state.hoverStartTime = Date.now();
              this.game.state.hoverCardScale = 1.0;
            }
            break;
          }
        }
      }
    } else {
      // Board area (left 60%)
      const hex = this.getHexAt(x, y);
      if (hex) {
        this.game.state.hoverHex = hex;
      }
    }
    this.game.update(); // Re-render on hover change
  }

  private handleClick(event: MouseEvent) {
      console.log('Canvas click event:', event.clientX, event.clientY);
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // If an event is pending, only allow resolve/skip clicks
    const hasEvent = this.game.state.drawnEvent !== undefined;

    const boardWidth = this.canvas.width * 0.6;
    const uiX = boardWidth;

    // Check for autoplace button click (testing feature)
    if (this.game.state.phase === 'placement') {
      const autoButtonWidth = 200;
      const autoButtonHeight = 50;
      const autoButtonX = boardWidth - autoButtonWidth - 20;
      const autoButtonY = 20;
      
      if (x >= autoButtonX && x < autoButtonX + autoButtonWidth && 
          y >= autoButtonY && y < autoButtonY + autoButtonHeight) {
        (this.game as any).autoPlaceAll();
        return;
      }
    }

    // Always check for continue button click if phase is 'battleLog'
    if (this.game.state.phase === 'battleLog') {
      const modalWidth = 600 * 2.5;
      const modalHeight = 400 * 2.2 * 1.1;
      const modalX = (boardWidth - modalWidth) / 2;
      const modalY = (this.canvas.height - modalHeight) / 2;
      const continueBtnWidth = 260;
      const continueBtnHeight = 60;
      const continueBtnX = modalX + (modalWidth - continueBtnWidth) / 2;
      const continueBtnY = modalY + modalHeight - continueBtnHeight - 20;
      console.log('Continue button bounds:', continueBtnX, continueBtnY, continueBtnWidth, continueBtnHeight);
      console.log('Mouse click:', x, y);
      if (x >= continueBtnX && x < continueBtnX + continueBtnWidth && y >= continueBtnY && y < continueBtnY + continueBtnHeight) {
        console.log('Continue button clicked!');
        this.game.state.hoverContinueButton = true;
        this.game.state.phase = 'scoring';
        if (typeof this.game.calculateScores === 'function') {
          this.game.calculateScores();
        }
        this.game.update();
        return;
      }
    }
    // Scoring modal 'Continue' button click
    if (this.game.state.phase === 'scoring') {
      const modalWidth = 600 * 2.5;
      const modalHeight = 350 * 2.2;
      const modalX = (boardWidth - modalWidth) / 2;
      const modalY = (this.canvas.height - modalHeight) / 2;
      const continueBtnWidth = 260;
      const continueBtnHeight = 60;
      const continueBtnX = modalX + (modalWidth - continueBtnWidth) / 2;
      const continueBtnY = modalY + modalHeight - continueBtnHeight - 20;
      if (x >= continueBtnX && x < continueBtnX + continueBtnWidth && y >= continueBtnY && y < continueBtnY + continueBtnHeight) {
        // Stäng resultatrutan, visa brädet och kvarvarande karaktärer
        // Gå till "placement" så man ser brädet igen
        this.game.state.phase = 'placement';
        this.game.update();
        return;
      }
    }
    // Check if click on UI area (right 40%)
    if (x > uiX) {
      // Check for Battle button hover and click
      if (this.game.state.phase === 'placement' && (this.game as any).allCardsPlaced && (this.game as any).allCardsPlaced()) {
        const buttonWidth = 300;
        const buttonHeight = 80;
        const uiWidth = this.canvas.width - boardWidth;
        const buttonX = uiX + (uiWidth - buttonWidth) / 2;
        const buttonY = this.canvas.height / 2 - buttonHeight / 2;

        if (x >= buttonX && x < buttonX + buttonWidth && y >= buttonY && y < buttonY + buttonHeight) {
          this.game.state.hoverBattleButton = true;
          (this.game as any).startBattle();
          return;
        }
      }

      // Cardback dimensions and positions
      const cardbackWidth = 304 * 1.02;
      const cardbackHeight = 487 * 1.02;
      const cardbackSpacing = 10;
      const cardbackStartY = 50;
      const uiWidth = this.canvas.width - boardWidth;
      const totalCardbackWidth = cardbackWidth * 3 + cardbackSpacing * 2;
      const cardbackStartX = uiX + (uiWidth - totalCardbackWidth) / 2;
      
      // Check clicks on cardbacks
      if (y >= cardbackStartY && y < cardbackStartY + cardbackHeight) {
        // Human cardback
        if (x >= cardbackStartX && x < cardbackStartX + cardbackWidth) {
          if (!hasEvent && this.game.state.currentPlayer === 'human') {
            this.game.drawCards();
          }
        }
        // Alien cardback
        else if (x >= cardbackStartX + cardbackWidth + cardbackSpacing && x < cardbackStartX + cardbackWidth * 2 + cardbackSpacing) {
          if (!hasEvent && this.game.state.currentPlayer === 'alien') {
            this.game.drawCards();
          }
        }
        // Event cardback
        else if (x >= cardbackStartX + (cardbackWidth + cardbackSpacing) * 2 && x < cardbackStartX + cardbackWidth * 3 + cardbackSpacing * 2) {
          if (!hasEvent) {
            this.game.drawEvent();
          }
        }
      }
      
      const deckStartY = cardbackStartY + cardbackHeight + 20;
      
      // Event card click detection
      const eventCardWidth = 274;
      const eventCardHeight = 438;
      const deckX = uiX + 10; // Match GameUI
      const deckWidth = uiWidth - 20; // Match GameUI
      const eventCardX = deckX + (deckWidth - eventCardWidth) / 2;
      const eventCardY = deckStartY;
      const skipY = eventCardY + eventCardHeight + 20;
      const skipHeight = 180;
      // Use actual aspect ratio based on loaded image if available
      const skipButtonImg = (this.game as any).ui?.cardRenderer?.assetLoader?.getAsset('skipButton');
      const skipWidth = skipButtonImg && skipButtonImg.complete 
        ? skipHeight * (skipButtonImg.width / skipButtonImg.height)
        : skipHeight * 1.5; // Correct aspect ratio (1536x1024)
      const skipX = deckX + (deckWidth - skipWidth) / 2; // Match GameUI
      
      // Tighter vertical bounds for click detection
      const skipHitHeight = 140;
      const skipHitY = skipY + (skipHeight - skipHitHeight) / 2;
      
      // Click on event card to play it
      if (x >= eventCardX && x < eventCardX + eventCardWidth && y >= eventCardY && y < eventCardY + eventCardHeight && this.game.state.drawnEvent) {
        // Play the event (currently does nothing but advances turn)
        this.game.state.drawnEvent = undefined;
        this.game.advanceTurn();
        this.game.onUpdate();
      }
      // Click on skip button
      else if (x >= skipX && x < skipX + skipWidth && y >= skipHitY && y < skipHitY + skipHitHeight && this.game.state.drawnEvent) {
        // Skip button
        this.game.skipEvent();
      } else if (y > deckStartY + 100) {
        // Drawn cards - handle card selection/placement
        const cardWidth = 274; // 90% of 304
        const cardHeight = 438; // 90% of 487
        const cardsPerRow = 3;
        const spacing = 21;
        const totalCardsWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * spacing;
        const startX = uiX + (uiWidth - totalCardsWidth) / 2;
        const startY = deckStartY + 170;

        for (let i = 0; i < this.game.state.drawnCards.length; i++) {
          const row = Math.floor(i / cardsPerRow);
          const col = i % cardsPerRow;
          const cardX = startX + col * (cardWidth + spacing);
          const cardY = startY + row * (cardHeight + spacing);

          if (x >= cardX && x < cardX + cardWidth && y >= cardY && y < cardY + cardHeight) {
            if (!hasEvent) {
              this.game.selectCard(i);
            }
            break;
          }
        }
      }
    } else {
      // Board area clicks - hex placement/combat
      if (this.game.state.phase === 'placement') {
        if (this.game.state.selectedCard !== undefined && !hasEvent) {
          const hex = this.getHexAt(x, y);
          if (hex) {
            this.game.placeCharacter(hex.q, hex.r);
          }
        }
      } else if (this.game.state.phase === 'combat') {
        const hex = this.getHexAt(x, y);
        if (hex) {
          const placed = this.game.state.placedCharacters.find((pc: any) => pc.hex.q === hex.q && pc.hex.r === hex.r);
          if (placed) {
            if (this.game.state.selectedAttacker) {
              this.game.attackTarget(hex.q, hex.r);
            } else {
              this.game.selectAttacker(hex.q, hex.r);
            }
          }
        }
      }
    }
  }

  private getHexAt(x: number, y: number) {
    // Find the closest hex by checking distance to center of each hex
    let closestHex: { q: number; r: number } | undefined;
    let minDist = Infinity;
    for (const hex of this.game.state.board) {
      const { x: hx, y: hy } = this.hexToPixel(hex.q, hex.r);
      const dist = Math.sqrt((x - hx) ** 2 + (y - hy) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closestHex = { q: hex.q, r: hex.r };
      }
    }
    return closestHex;
  }

  private handleRightClick(event: MouseEvent) {
    event.preventDefault(); // Prevent context menu from showing
    
    // Deselect any selected card and restore all drawn cards
    if (this.game.state.selectedCard !== undefined) {
      this.game.state.selectedCard = undefined;
      // Restore all cards from backup
      if (this.game.state.drawnCardsBackup) {
        this.game.state.drawnCards = [...this.game.state.drawnCardsBackup];
        this.game.state.drawnCardsBackup = undefined;
      }
      this.game.update();
    }
  }

  private hexToPixel(q: number, r: number): { x: number; y: number } {
    const hexSize = 100; // Must match Board.ts hexSize
    const x = hexSize * (3/2 * q);
    const y = hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    const boardWidth = this.canvas.width * 0.6; // Left 60%
    const boardHeight = this.canvas.height;
    return { x: x + boardWidth / 2, y: y + boardHeight / 2 };
  }
}