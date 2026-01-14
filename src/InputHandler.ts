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

    if (x > this.canvas.width - 200) {
      if (y > 50 && y < 150) {
        this.game.state.hoverPile = 'human';
      } else if (y > 200 && y < 300) {
        this.game.state.hoverPile = 'alien';
      } else if (y > 350 && y < 450) {
        this.game.state.hoverPile = 'event';
      } else if (y > 470 && y < 520 && this.game.state.drawnEvent) {
        this.game.state.hoverDrawnEvent = true;
      } else if (y > 530 && y < 560 && this.game.state.drawnEvent) {
        this.game.state.hoverSkip = true;
      } else if (y > 560 && y < 740) {
        const index = Math.floor((y - 560) / 60);
        if (index < this.game.state.drawnCards.length) {
          this.game.state.hoverCardIndex = index;
        }
      }
    } else {
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

    // Check if click on card piles (right side)
    if (x > this.canvas.width - 200) {
      if (y > 50 && y < 150) {
        // Human deck
        if (!hasEvent && this.game.state.currentPlayer === 'human') {
          this.game.drawCards();
        }
      } else if (y > 200 && y < 300) {
        // Alien deck
        if (!hasEvent && this.game.state.currentPlayer === 'alien') {
          this.game.drawCards();
        }
      } else if (y > 350 && y < 450) {
        // Event deck
        // TODO: handle event draw
      } else if (y > 470 && y < 520 && this.game.state.drawnEvent) {
        // Drawn event - resolve
        this.game.resolveEvent();
      } else if (y > 530 && y < 560 && this.game.state.drawnEvent) {
        // Skip button
        this.game.skipEvent();
      } else if (y > 560 && y < 740) {
        // Drawn cards
        if (!hasEvent) {
          const index = Math.floor((y - 560) / 60);
          if (index < this.game.state.drawnCards.length) {
            this.game.selectCard(this.game.state.drawnCards[index]);
          }
        }
      }
    } else {
      // Check if click on hex
      const hex = this.getHexAt(x, y);
      if (hex && !hasEvent) {
        if (this.game.state.phase === 'placement' && this.game.state.selectedCard) {
          this.game.placeCharacter(hex.q, hex.r);
        } else if (this.game.state.phase === 'combat') {
          if (this.game.state.selectedAttacker) {
            this.game.attackTarget(hex.q, hex.r);
          } else {
            this.game.selectAttacker(hex.q, hex.r);
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
    const hexSize = 30;
    const x = hexSize * (3/2 * q);
    const y = hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x: x + this.canvas.width / 2, y: y + this.canvas.height / 2 };
  }
}