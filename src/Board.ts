// Board class for hex-grid rendering

import type { Hex, GameState } from './types';

export class Board {
  private hexes: Hex[] = [];
  private hexSize = 30;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;

  constructor(canvas: HTMLCanvasElement, gameState: GameState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gameState = gameState;
    this.generateHexes();
    this.gameState.board = this.hexes; // Set board in state
  }

  private generateHexes() {
    // Smaller hex grid for visibility
    const maxRadius = 3; // smaller board
    for (let q = -maxRadius; q <= maxRadius; q++) {
      for (let r = -maxRadius; r <= maxRadius; r++) {
        if (Math.abs(q + r) <= maxRadius) {
          const distance = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
          let value = 0;
          if (distance <= 2) { // central hexes have values
            value = Math.floor(Math.random() * 5) + 1;
          }
          this.hexes.push({ q, r, value, isMountain: false });
        }
      }
    }
    // Set three random hexes as mountains (replace value)
    const centralHexes = this.hexes.filter(h => h.value > 0);
    for (let i = 0; i < 3 && centralHexes.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * centralHexes.length);
      const hex = centralHexes.splice(randomIndex, 1)[0];
      hex.isMountain = true;
      hex.value = 0;
    }
  }

  private hexToPixel(q: number, r: number): { x: number; y: number } {
    const x = this.hexSize * (3/2 * q);
    const y = this.hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x: x + this.canvas.width / 2, y: y + this.canvas.height / 2 };
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.font = '12px sans-serif';

    for (const hex of this.hexes) {
      const { x, y } = this.hexToPixel(hex.q, hex.r);
      if (hex.isMountain) {
        this.drawMountainHex(x, y);
      } else {
        this.drawHex(x, y);
      }
      // Highlight hovered hex
      if (this.gameState.hoverHex && this.gameState.hoverHex.q === hex.q && this.gameState.hoverHex.r === hex.r) {
        this.ctx.strokeStyle = 'yellow';
        this.ctx.lineWidth = 3;
        this.drawHexOutline(x, y);
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
      }
      // Render character if placed
      const placed = this.gameState.placedCharacters.find(pc => pc.hex.q === hex.q && pc.hex.r === hex.r);
      if (placed) {
        this.ctx.strokeStyle = placed.card.faction === 'human' ? 'blue' : 'red';
        this.ctx.lineWidth = 3;
        this.drawHex(x, y);
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(placed.card.name[0], x + 10, y + 3); // Move to side
        // Highlight current active in combat
        if (this.gameState.phase === 'combat' && this.gameState.combatOrder[this.gameState.currentCombatIndex] === placed) {
          this.ctx.strokeStyle = 'yellow';
          this.ctx.lineWidth = 4;
          this.drawHexOutline(x, y);
          this.ctx.strokeStyle = 'white';
          this.ctx.lineWidth = 2;
        }
        // Highlight selected attacker
        if (this.gameState.selectedAttacker === placed) {
          const color = placed.card.faction === 'human' ? 'blue' : 'red';
          this.ctx.strokeStyle = color;
          this.ctx.lineWidth = 4;
          this.drawHexOutline(x, y);
          this.ctx.strokeStyle = 'white';
          this.ctx.lineWidth = 2;
        }
      } else if (this.gameState.selectedCard && this.gameState.hoverHex && this.gameState.hoverHex.q === hex.q && this.gameState.hoverHex.r === hex.r) {
        // Preview placement: outline in faction color
        const color = this.gameState.selectedCard.faction === 'human' ? 'blue' : 'red';
        const canPlace = this.canPlaceAt(hex);
        this.ctx.strokeStyle = canPlace ? color : 'orange'; // Orange if can't place
        this.ctx.lineWidth = 4;
        this.drawHex(x, y);
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(this.gameState.selectedCard.name[0], x + 10, y + 3); // Move to side
      }
      // Render value last, on top
      if (!hex.isMountain && hex.value > 0) {
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(hex.value.toString(), x - 5, y + 5);
      }
    }

    // Draw cursor dot if holding a card - moved to GameUI
  }

  private drawHexOutline(x: number, y: number) {
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + this.hexSize * Math.cos(angle);
      const hy = y + this.hexSize * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(hx, hy);
      else this.ctx.lineTo(hx, hy);
    }
    this.ctx.closePath();
    this.ctx.stroke();
  }

  private drawMountainHex(x: number, y: number) {
    this.ctx.fillStyle = 'gray';
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + this.hexSize * Math.cos(angle);
      const hy = y + this.hexSize * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(hx, hy);
      else this.ctx.lineTo(hx, hy);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  private canPlaceAt(hex: any): boolean {
    if (this.gameState.placedCharacters.length === 0) return true; // First placement anywhere
    // Check adjacency to any existing character
    return this.gameState.placedCharacters.some(pc =>
      Math.abs(pc.hex.q - hex.q) <= 1 &&
      Math.abs(pc.hex.r - hex.r) <= 1 &&
      Math.abs((pc.hex.q + pc.hex.r) - (hex.q + hex.r)) <= 1
    );
  }

  private drawHex(x: number, y: number) {
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + this.hexSize * Math.cos(angle);
      const hy = y + this.hexSize * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(hx, hy);
      else this.ctx.lineTo(hx, hy);
    }
    this.ctx.closePath();
    this.ctx.stroke();
  }
}