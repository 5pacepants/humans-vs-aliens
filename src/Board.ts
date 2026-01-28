// Board class for hex-grid rendering

import type { Hex, GameState, HexTerrain } from './types';
import { TextureLoader } from './TextureLoader';
import { CardRenderer } from './CardRenderer';

export class Board {
  private hexes: Hex[] = [];
  private hexSize = 100;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private textureLoader: TextureLoader;
  private cardRenderer: CardRenderer;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private backgroundImage: HTMLImageElement;

  constructor(canvas: HTMLCanvasElement, gameState: GameState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gameState = gameState;
    this.textureLoader = new TextureLoader();
    this.cardRenderer = new CardRenderer();
    
    // Create offscreen canvas for high-quality terrain rendering
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.offscreenCtx.imageSmoothingEnabled = true;
    this.offscreenCtx.imageSmoothingQuality = 'high';
    
    // Load background image
    this.backgroundImage = new Image();
    this.backgroundImage.src = '/background-hex-4.png';
    
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
    const boardWidth = this.canvas.width * 0.6;
    
    // Save context and clip to board area only (left 60%)
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, 0, boardWidth, this.canvas.height);
    this.ctx.clip();
    
    // Draw background image on left 60%
    if (this.backgroundImage.complete) {
      this.ctx.drawImage(this.backgroundImage, 0, 0, boardWidth, this.canvas.height);
    }
    
    // Create very soft gradient transition between hex side and card side
    const dividerX = boardWidth;
    const gradientWidth = 100; // Much wider gradient for smoother blend
    
    // Create subtle gradient overlay
    const gradient = this.ctx.createLinearGradient(dividerX - gradientWidth, 0, dividerX + gradientWidth, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.4, 'rgba(50, 45, 60, 0.08)');
    gradient.addColorStop(0.5, 'rgba(50, 45, 60, 0.12)');
    gradient.addColorStop(0.6, 'rgba(50, 45, 60, 0.08)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(dividerX - gradientWidth, 0, gradientWidth * 2, this.canvas.height);
    
    // Draw hex info box at top right of board area (only when hovering over a hex)
    if (this.gameState.hoverHex) {
      const infoBoxWidth = 470;
      const infoBoxHeight = 200; // Increased to fit Damage stat
      const infoBoxX = boardWidth - infoBoxWidth - 10;
      const infoBoxY = 10;
      const cornerRadius = 8;
      
      // Draw rounded rectangle background
      this.ctx.fillStyle = 'gray';
      this.ctx.beginPath();
      this.ctx.roundRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, cornerRadius);
      this.ctx.fill();
      
      // Draw thin off-white border with slight purple tint
      this.ctx.strokeStyle = '#f5f2f8';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.roundRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, cornerRadius);
      this.ctx.stroke();
      
      this.ctx.fillStyle = 'white';
      this.ctx.font = '16px Quicksand, sans-serif';
      
      // Find the hex being hovered
      const hoveredHex = this.gameState.board.find(h => h.q === this.gameState.hoverHex!.q && h.r === this.gameState.hoverHex!.r);
      if (hoveredHex) {
        // Terrain type names and explanations
        const terrainNames: Record<HexTerrain, string> = {
          grass: 'Grass',
          water: 'Water',
          forest: 'Forest',
          toxic: 'Toxic Swamp',
          mountain: 'Mountain'
        };
        
        const terrainExplanations: Record<HexTerrain, string> = {
          grass: 'Neutral terrain without effects',
          water: 'Character loses 1 health (min 1)',
          forest: 'Humans gain 1 range. Aliens lose 1 range (min 1)',
          toxic: 'Aliens gain 1 damage. Humans lose 1 damage (min 1)',
          mountain: 'Impassable terrain'
        };
        
        let yPos = infoBoxY + 25;
        
        // Environment (namefonten)
        this.ctx.font = '700 18px "Smooch Sans", sans-serif';
        this.ctx.fillText(`Environment: ${terrainNames[hoveredHex.terrain]}`, infoBoxX + 10, yPos);
        yPos += 20;
        
        // Explanation (abilityfonten)
        this.ctx.font = '16px Quicksand, sans-serif';
        this.ctx.fillText(terrainExplanations[hoveredHex.terrain], infoBoxX + 10, yPos);
        yPos += 25;
        
        // Check if a character is placed on this hex
        const placedChar = this.gameState.placedCharacters.find(pc => pc.hex.q === hoveredHex.q && pc.hex.r === hoveredHex.r);
        
        if (placedChar) {
          // Card name (namefonten)
          this.ctx.font = '700 22px "Smooch Sans", sans-serif';
          this.ctx.fillText(placedChar.card.name, infoBoxX + 10, yPos);
          yPos += 20;
          
          // Type (namefonten)
          this.ctx.font = '700 18px "Smooch Sans", sans-serif';
          this.ctx.fillText(`Type: ${placedChar.card.type}`, infoBoxX + 10, yPos);
          yPos += 20;
          
          // Stats (abilityfonten) - show derived stats with breakdown if modified
          this.ctx.font = '16px Quicksand, sans-serif';

          // Helper function to format stat with breakdown
          const formatStat = (statName: string, statKey: string, original: number, derived?: number) => {
            // Special handling for health with event damage
            if (statKey === 'health' && placedChar.eventDamage && placedChar.eventDamage > 0) {
              // Show event damage in breakdown
              const originalHealth = original + placedChar.eventDamage;
              return `${statName}: ${original} (${originalHealth}-${placedChar.eventDamage})`;
            }

            if (derived !== undefined && derived !== original && placedChar.modifiers) {
              // Get modifiers for this stat
              const statModifiers = placedChar.modifiers.filter((m: any) => m.stat === statKey);
              const additiveSum = statModifiers
                .filter((m: any) => m.type === 'modifier')
                .reduce((sum: number, m: any) => sum + (m.value || 0), 0);
              const multipliers = statModifiers.filter((m: any) => m.type === 'multiplier');

              // Build breakdown string
              if (additiveSum !== 0 && multipliers.length > 0) {
                // Both additive and multiplicative
                const multValue = multipliers[0].value || 1;
                return `${statName}: ${derived} ((${original}${additiveSum > 0 ? '+' : ''}${additiveSum})×${multValue})`;
              } else if (multipliers.length > 0) {
                // Only multiplicative
                const multValue = multipliers[0].value || 1;
                return `${statName}: ${derived} (${original}×${multValue})`;
              } else if (additiveSum !== 0) {
                // Only additive
                return `${statName}: ${derived} (${original}${additiveSum > 0 ? '+' : ''}${additiveSum})`;
              }
            }
            return `${statName}: ${original}`;
          };

          this.ctx.fillText(formatStat('Range', 'range', placedChar.card.stats.range, placedChar.derived?.range), infoBoxX + 10, yPos);
          yPos += 18;
          this.ctx.fillText(formatStat('Attacks', 'attacks', placedChar.card.stats.attacks, placedChar.derived?.attacks), infoBoxX + 10, yPos);
          yPos += 18;
          this.ctx.fillText(formatStat('Damage', 'damage', placedChar.card.stats.damage, placedChar.derived?.damage), infoBoxX + 10, yPos);
          yPos += 18;
          this.ctx.fillText(formatStat('Health', 'health', placedChar.card.stats.health, placedChar.derived?.health), infoBoxX + 10, yPos);
          yPos += 20;
          
          // Points calculation (abilityfonten)
          const hexPoints = hoveredHex.value;
          const cardPoints = placedChar.card.stats.points;
          const totalPoints = hexPoints + cardPoints;
          
          if (hexPoints > 0) {
            this.ctx.fillText(`Points: ${totalPoints} (${cardPoints}+${hexPoints})`, infoBoxX + 10, yPos);
          } else {
            this.ctx.fillText(`Points: ${cardPoints}`, infoBoxX + 10, yPos);
          }
        }
      }
    }
    
    // Render hexes
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.font = '30px Quicksand, sans-serif';

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

        // Character image now drawn in drawTerrainHex for proper layering

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
        // Highlight swap targets with orange neon glow
        const isSwapFirst = this.gameState.swapFirstTarget &&
          this.gameState.swapFirstTarget.q === hex.q && this.gameState.swapFirstTarget.r === hex.r;
        const isSwapSecond = this.gameState.swapSecondTarget &&
          this.gameState.swapSecondTarget.q === hex.q && this.gameState.swapSecondTarget.r === hex.r;
        if (isSwapFirst || isSwapSecond) {
          // Orange neon glow effect
          this.ctx.save();
          this.ctx.shadowColor = '#FF6600';
          this.ctx.shadowBlur = 20;
          this.ctx.strokeStyle = '#FF9900';
          this.ctx.lineWidth = 5;
          this.drawHexOutline(x, y);
          // Draw again for stronger glow
          this.ctx.shadowBlur = 10;
          this.drawHexOutline(x, y);
          this.ctx.restore();
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
      }
      // Render value last, on top
      if (!hex.isMountain && hex.value > 0) {
        // Add very strong dark shadow for maximum visibility
        this.ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 4;
        this.ctx.shadowOffsetY = 4;
        
        // Also add a black stroke outline
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 6;
        this.ctx.strokeText(hex.value.toString(), x - 5, y + 5);
        
        // Then fill with white
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(hex.value.toString(), x - 5, y + 5);
        
        // Reset shadow and stroke
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
      }
    }

    // Show card preview if hovering over a hex with a placed card
    if (this.gameState.hoverHex && !this.gameState.selectedCard) {
      const hoveredPlaced = this.gameState.placedCharacters.find(
        pc => pc.hex.q === this.gameState.hoverHex!.q && pc.hex.r === this.gameState.hoverHex!.r
      );
      if (hoveredPlaced) {
        const previewWidth = 250;
        const previewHeight = 400;
        const eventCardWidth = 220;
        const eventCardHeight = 350;
        const mouseX = this.gameState.mouseX;
        const mouseY = this.gameState.mouseY;
        const boardWidth = this.canvas.width * 0.6;
        const boardCenterX = boardWidth / 2;

        // Calculate total width including event cards
        const numEventCards = hoveredPlaced.eventEffects?.length || 0;
        const eventCardsWidth = numEventCards > 0 ? (eventCardWidth + 10) * numEventCards : 0;
        const totalWidth = previewWidth + eventCardsWidth;

        let previewX: number;
        let previewY = mouseY - previewHeight / 2; // Vertikalt centrerat med musen

        // Bestäm vänster eller höger sida baserat på musens X-position
        if (mouseX < boardCenterX) {
          // Vänster sida av brädet - visa kortet till höger om musen
          previewX = mouseX + 30;
        } else {
          // Höger sida eller mittlinjen - visa kortet till vänster om musen
          previewX = mouseX - totalWidth - 30;
        }

        // Se till att kortet inte går utanför canvas
        previewX = Math.max(10, Math.min(previewX, boardWidth - totalWidth - 10));
        previewY = Math.max(10, Math.min(previewY, this.canvas.height - previewHeight - 10));

        // Render character card
        this.cardRenderer.renderCard(this.ctx, hoveredPlaced.card, previewX, previewY, previewWidth, previewHeight, 13);

        // Render event cards to the right of character card
        if (hoveredPlaced.eventEffects && hoveredPlaced.eventEffects.length > 0) {
          let eventX = previewX + previewWidth + 10;
          const eventY = previewY + (previewHeight - eventCardHeight) / 2; // Center vertically

          for (const eventCard of hoveredPlaced.eventEffects) {
            this.cardRenderer.renderCard(this.ctx, eventCard, eventX, eventY, eventCardWidth, eventCardHeight, 10);
            eventX += eventCardWidth + 10;
          }
        }
      }
    }
    
    // Restore context - removes clipping
    this.ctx.restore();

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
    // Check if this hex has a character placed
    const placed = this.gameState.placedCharacters.find(pc => pc.hex.q === hex.q && pc.hex.r === hex.r);
    
    const texture = this.textureLoader.getTexture(hex.terrain);
    
    // Always draw full terrain first
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + this.hexSize * Math.cos(angle);
      const hy = y + this.hexSize * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(hx, hy);
      else this.ctx.lineTo(hx, hy);
    }
    this.ctx.closePath();
    
    if (texture && texture.complete) {
      this.ctx.save();
      this.ctx.clip();
      const imgSize = this.hexSize * 2.2;
      this.ctx.drawImage(texture, x - this.hexSize * 1.1, y - this.hexSize * 1.1, imgSize, imgSize);
      this.ctx.restore();
    } else {
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
    
    // If character is placed, draw it in upper half
    if (placed) {
      this.ctx.save();
      this.ctx.beginPath();
      
      // Left point (angle 180° = π)
      this.ctx.moveTo(x - this.hexSize, y);
      
      // Top-left point (angle 240° = 4π/3) 
      const angle240 = 4 * Math.PI / 3;
      this.ctx.lineTo(x + this.hexSize * Math.cos(angle240), y + this.hexSize * Math.sin(angle240));
      
      // Top-right point (angle 300° = 5π/3)
      const angle300 = 5 * Math.PI / 3;
      this.ctx.lineTo(x + this.hexSize * Math.cos(angle300), y + this.hexSize * Math.sin(angle300));
      
      // Right point (angle 0° = 0)
      this.ctx.lineTo(x + this.hexSize, y);
      
      this.ctx.closePath();
      this.ctx.clip();
      
      // Draw semi-transparent dark background in upper half first (so we can see the area)
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.fill();
      
      // Draw character image - use custom image if specified
      let assetKey: string;
      if (placed.card.image) {
        assetKey = placed.card.image;
        // Try to load the custom image if not already loaded
        this.cardRenderer['assetLoader'].loadAsset(assetKey).catch((err: Error) => console.warn(err));
      } else {
        assetKey = placed.card.faction === 'human' ? 'characterPlaceholder' : 'characterAlienPlaceholder';
      }
      const charImage = this.cardRenderer['assetLoader'].getAsset(assetKey);

      if (charImage && charImage.complete) {
        // Preserve image aspect ratio
        const aspectRatio = charImage.width / charImage.height;
        const imageHeight = this.hexSize * 2.0;
        const imageWidth = imageHeight * aspectRatio;
        const imageX = x - imageWidth / 2;
        // Position image to show upper portion (face area) in the upper half of hex
        const imageY = y + this.hexSize * 0.1 - imageHeight / 2;
        this.ctx.drawImage(charImage, imageX, imageY, imageWidth, imageHeight);
      }
      
      this.ctx.restore();
    }

    // Draw event effect icons in lower half of hex if character has been affected
    if (placed && placed.eventEffects && placed.eventEffects.length > 0) {
      this.ctx.save();
      // Halve icon size if 4 or more effects
      const iconSize = placed.eventEffects.length >= 4 ? 18 : 36;
      this.ctx.font = `${iconSize}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = 'black';
      this.ctx.shadowBlur = 4;

      // Map event names to icons
      const eventIcons: Record<string, string> = {
        'Thunderstorm': '⚡',
        'Sandstorm': '🌪️',
        'Heavy armor': '🛡️',
        'Execute': '💀',
        'Berserk': '😤'
      };

      // Draw icons in lower half of hex
      const icons = placed.eventEffects.map(e => eventIcons[e.name] || '✦').join('');
      this.ctx.fillText(icons, x, y + this.hexSize * 0.55);
      this.ctx.restore();
    }

    // Draw hex outline
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + this.hexSize * Math.cos(angle);
      const hy = y + this.hexSize * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(hx, hy);
      else this.ctx.lineTo(hx, hy);
    }
    this.ctx.closePath();
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