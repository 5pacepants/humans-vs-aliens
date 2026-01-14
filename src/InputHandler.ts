// InputHandler class for mouse clicks

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private game: any;

  constructor(canvas: HTMLCanvasElement, game: any) {
    this.canvas = canvas;
    this.game = game;
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
  }

  private handleMouseMove(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.game.state.mouseX = x;
    this.game.state.mouseY = y;

    // Reset hover
    this.game.state.hoverPile = undefined;
    this.game.state.hoverCardIndex = undefined;
    this.game.state.hoverHex = undefined;
    this.game.state.hoverDrawnEvent = false;
    this.game.state.hoverSkip = false;

    const boardWidth = this.canvas.width * 0.6;
    const uiX = boardWidth; // Right 40% starts here

    if (x > uiX) {
      // UI area (right 40%)
      if (y > 50 && y < 130) {
        this.game.state.hoverPile = 'human';
      } else if (y > 150 && y < 230) {
        this.game.state.hoverPile = 'alien';
      } else if (y > 210 && y < 280) {
        this.game.state.hoverPile = 'event';
      } else if (y > 290 && y < 340 && this.game.state.drawnEvent) {
        this.game.state.hoverDrawnEvent = true;
      } else if (y > 350 && y < 380 && this.game.state.drawnEvent) {
        this.game.state.hoverSkip = true;
      } else if (y > 280) {
        // Drawn cards in 3-card grid (hover detection)
        const cardWidth = 304;
        const cardHeight = 487;
        const cardsPerRow = 3;
        const startX = uiX + 10;
        const startY = 320;
        const spacing = 21;

        for (let i = 0; i < this.game.state.drawnCards.length; i++) {
          const row = Math.floor(i / cardsPerRow);
          const col = i % cardsPerRow;
          const cardX = startX + col * (cardWidth + spacing);
          const cardY = startY + row * (cardHeight + spacing);

          if (x >= cardX && x < cardX + cardWidth && y >= cardY && y < cardY + cardHeight) {
            this.game.state.hoverCardIndex = i;
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
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // If an event is pending, only allow resolve/skip clicks
    const hasEvent = this.game.state.drawnEvent !== undefined;

    const boardWidth = this.canvas.width * 0.6;
    const uiX = boardWidth;

    // Check if click on UI area (right 40%)
    if (x > uiX) {
      if (y > 50 && y < 130) {
        // Human deck
        if (!hasEvent && this.game.state.currentPlayer === 'human') {
          this.game.drawCards();
        }
      } else if (y > 150 && y < 230) {
        // Alien deck
        if (!hasEvent && this.game.state.currentPlayer === 'alien') {
          this.game.drawCards();
        }
      } else if (y > 210 && y < 280) {
        // Event deck
        // TODO: handle event draw
      } else if (y > 290 && y < 340 && this.game.state.drawnEvent) {
        // Drawn event - resolve
        this.game.resolveEvent();
      } else if (y > 350 && y < 380 && this.game.state.drawnEvent) {
        // Skip button
        this.game.skipEvent();
      } else if (y > 280) {
        // Drawn cards - handle card selection/placement
        const cardWidth = 304;
        const cardHeight = 487;
        const cardsPerRow = 3;
        const startX = uiX + 10;
        const startY = 320;
        const spacing = 21;

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

  private hexToPixel(q: number, r: number): { x: number; y: number } {
    const hexSize = 60;
    const x = hexSize * (3/2 * q);
    const y = hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    const boardWidth = this.canvas.width * 0.6; // Left 60%
    const boardHeight = this.canvas.height;
    return { x: x + boardWidth / 2, y: y + boardHeight / 2 };
  }
}