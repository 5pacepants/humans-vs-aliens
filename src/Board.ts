// Board class for hex-grid rendering

import type { Hex, GameState, HexTerrain } from './types';
import { TextureLoader } from './TextureLoader';

export class Board {
  private hexes: Hex[] = [];
  private hexSize = 60;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private textureLoader: TextureLoader;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private readonly SUPERSAMPLING_SCALE = 2; // 2x rendering for better quality

  constructor(canvas: HTMLCanvasElement, gameState: GameState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gameState = gameState;
    this.textureLoader = new TextureLoader();
    
    // Create offscreen canvas for high-quality terrain rendering
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.offscreenCtx.imageSmoothingEnabled = true;
    this.offscreenCtx.imageSmoothingQuality = 'high';
    
    this.generateHexes();
    this.gameState.board = this.hexes; // Set board in state
    this.preloadTextures(); // Start loading textures
  }

  private preloadTextures() {
    const terrains: HexTerrain[] = ['grass', 'water', 'forest', 'toxic', 'mountain'];
    terrains.forEach(terrain => {
      this.textureLoader.loadTexture(terrain).catch(err => console.warn(err));
    });
  }

  private generateHexes() {
    // Smaller hex grid for visibility
    const maxRadius = 3; // smaller board
    
    // Step 1: create all hexes as grass with optional value
    for (let q = -maxRadius; q <= maxRadius; q++) {
      for (let r = -maxRadius; r <= maxRadius; r++) {
        if (Math.abs(q + r) <= maxRadius) {
          const distance = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
          let value = 0;
          if (distance <= 2) { // central hexes have values
            value = Math.floor(Math.random() * 5) + 1;
          }
          this.hexes.push({ q, r, value, isMountain: false, terrain: 'grass' });
        }
      }
    }

    // Helper to pick N distinct random hexes from a list
    const pickRandom = (pool: Hex[], count: number): Hex[] => {
      const selected: Hex[] = [];
      for (let i = 0; i < count && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        selected.push(pool.splice(idx, 1)[0]);
      }
      return selected;
    };

    // Step 2: mountains (3) picked from valued central hexes (same behavior as before)
    const centralHexes = this.hexes.filter(h => h.value > 0);
    pickRandom(centralHexes, 3).forEach(hex => {
      hex.isMountain = true;
      hex.value = 0;
      hex.terrain = 'mountain';
    });

    // Step 3: water (2), forest (2), toxic (2) from remaining non-mountains
    const available = this.hexes.filter(h => !h.isMountain);
    pickRandom(available, 2).forEach(hex => { hex.terrain = 'water'; });
    pickRandom(available, 2).forEach(hex => { hex.terrain = 'forest'; });
    pickRandom(available, 2).forEach(hex => { hex.terrain = 'toxic'; });
    // Remaining stay grass
  }

  private hexToPixel(q: number, r: number): { x: number; y: number } {
    const x = this.hexSize * (3/2 * q);
    const y = this.hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    const boardWidth = this.canvas.width * 0.6; // Left 60% of screen
    const boardHeight = this.canvas.height;
    return { x: x + boardWidth / 2, y: y + boardHeight / 2 };
  }

  render() {
    // Don't clear here - main.ts clears the whole canvas
    // Just draw on the left 60%
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.font = '12px sans-serif';

    for (const hex of this.hexes) {
      const { x, y } = this.hexToPixel(hex.q, hex.r);
      
      // Draw terrain texture with clipping
      this.drawTerrainHex(x, y, hex);
      
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

  private drawTerrainHex(x: number, y: number, hex: Hex) {
    // Create hex path for clipping
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + this.hexSize * Math.cos(angle);
      const hy = y + this.hexSize * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(hx, hy);
      else this.ctx.lineTo(hx, hy);
    }
    this.ctx.closePath();

    // Draw texture with clipping
    const texture = this.textureLoader.getTexture(hex.terrain);
    if (texture && texture.complete) {
      this.ctx.save();
      this.ctx.clip();
      
      // Draw image scaled to hex - ensure full coverage
      const imgSize = this.hexSize * 2.2; // Slightly larger to ensure full coverage
      this.ctx.drawImage(texture, x - this.hexSize * 1.1, y - this.hexSize * 1.1, imgSize, imgSize);
      
      this.ctx.restore();
    } else {
      // Fallback: solid color while texture loads
      const colorMap: Record<HexTerrain, string> = {
        grass: '#7ba428',
        water: '#2a5a8a',
        forest: '#2d5a1a',
        toxic: '#7a3a7a',
        mountain: '#666666'
      };
      this.ctx.fillStyle = colorMap[hex.terrain];
      this.ctx.fill();
    }

    // Draw hex outline
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
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