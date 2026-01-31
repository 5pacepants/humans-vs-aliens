// Board class for hex-grid rendering

import type { Hex, GameState, HexTerrain } from './types';
import type { AnimationState } from './CombatAnimationQueue';
import { TextureLoader } from './TextureLoader';
import { CardRenderer } from './CardRenderer';
import { getHexSize, getScale } from './Scale';

export class Board {
  private hexes: Hex[] = [];
  private ctx: CanvasRenderingContext2D;

  // Dynamic hexSize getter
  private get hexSize(): number {
    return getHexSize();
  }
  private gameState: GameState;
  private textureLoader: TextureLoader;
  private cardRenderer: CardRenderer;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private backgroundImage: HTMLImageElement;

  constructor(canvas: HTMLCanvasElement, gameState: GameState) {
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
    const boardWidth = window.innerWidth * 0.6; // Left 60% of screen
    const boardHeight = window.innerHeight;
    return { x: x + boardWidth / 2, y: y + boardHeight / 2 };
  }

  render() {
    // Don't render board during menu phase
    if (this.gameState.phase === 'menu') {
      return;
    }

    // Don't clear here - main.ts clears the whole canvas
    const boardWidth = window.innerWidth * 0.6;
    
    // Save context and clip to board area only (left 60%)
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, 0, boardWidth, window.innerHeight);
    this.ctx.clip();
    
    // Draw background image on left 60%
    if (this.backgroundImage.complete) {
      this.ctx.drawImage(this.backgroundImage, 0, 0, boardWidth, window.innerHeight);
    }
    
    // Create very soft gradient transition between hex side and card side
    const scale = getScale();
    const dividerX = boardWidth;
    const gradientWidth = 100 * scale; // Much wider gradient for smoother blend
    
    // Create subtle gradient overlay
    const gradient = this.ctx.createLinearGradient(dividerX - gradientWidth, 0, dividerX + gradientWidth, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.4, 'rgba(50, 45, 60, 0.08)');
    gradient.addColorStop(0.5, 'rgba(50, 45, 60, 0.12)');
    gradient.addColorStop(0.6, 'rgba(50, 45, 60, 0.08)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(dividerX - gradientWidth, 0, gradientWidth * 2, window.innerHeight);
    
    // Draw hex info box at top right of board area (only when hovering over a hex) - 80% size
    if (this.gameState.hoverHex) {
      const infoBoxWidth = 376 * scale;
      const infoBoxHeight = 160 * scale;
      const infoBoxX = boardWidth - infoBoxWidth - 8 * scale;
      const infoBoxY = 8 * scale;
      const cornerRadius = 6 * scale;

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
      this.ctx.font = `${13 * scale}px Quicksand, sans-serif`;

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

        let yPos = infoBoxY + 20 * scale;

        // Environment (namefonten)
        this.ctx.font = `700 ${14 * scale}px "Smooch Sans", sans-serif`;
        this.ctx.fillText(`Environment: ${terrainNames[hoveredHex.terrain]}`, infoBoxX + 8 * scale, yPos);
        yPos += 16 * scale;

        // Explanation (abilityfonten)
        this.ctx.font = `${13 * scale}px Quicksand, sans-serif`;
        this.ctx.fillText(terrainExplanations[hoveredHex.terrain], infoBoxX + 8 * scale, yPos);
        yPos += 20 * scale;

        // Check if a character is placed on this hex
        const placedChar = this.gameState.placedCharacters.find(pc => pc.hex.q === hoveredHex.q && pc.hex.r === hoveredHex.r);

        if (placedChar) {
          // Card name (namefonten)
          this.ctx.font = `700 ${18 * scale}px "Smooch Sans", sans-serif`;
          this.ctx.fillText(placedChar.card.name, infoBoxX + 8 * scale, yPos);
          yPos += 16 * scale;

          // Type (namefonten)
          this.ctx.font = `700 ${14 * scale}px "Smooch Sans", sans-serif`;
          this.ctx.fillText(`Type: ${placedChar.card.type}`, infoBoxX + 8 * scale, yPos);
          yPos += 16 * scale;

          // Stats (abilityfonten) - show derived stats with breakdown if modified
          this.ctx.font = `${13 * scale}px Quicksand, sans-serif`;

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

          this.ctx.fillText(formatStat('Range', 'range', placedChar.card.stats.range, placedChar.derived?.range), infoBoxX + 8 * scale, yPos);
          yPos += 14 * scale;
          this.ctx.fillText(formatStat('Attacks', 'attacks', placedChar.card.stats.attacks, placedChar.derived?.attacks), infoBoxX + 8 * scale, yPos);
          yPos += 14 * scale;
          this.ctx.fillText(formatStat('Damage', 'damage', placedChar.card.stats.damage, placedChar.derived?.damage), infoBoxX + 8 * scale, yPos);
          yPos += 14 * scale;
          this.ctx.fillText(formatStat('Health', 'health', placedChar.card.stats.health, placedChar.derived?.health), infoBoxX + 8 * scale, yPos);
          yPos += 16 * scale;

          // Points calculation (abilityfonten)
          const hexPoints = hoveredHex.value;
          const cardPoints = placedChar.card.stats.points;
          const totalPoints = hexPoints + cardPoints;

          if (hexPoints > 0) {
            this.ctx.fillText(`Points: ${totalPoints} (${cardPoints}+${hexPoints})`, infoBoxX + 8 * scale, yPos);
          } else {
            this.ctx.fillText(`Points: ${cardPoints}`, infoBoxX + 8 * scale, yPos);
          }
        }
      }
    }
    
    // Render hexes
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2 * scale;
    this.ctx.font = `${21 * scale}px Quicksand, sans-serif`;

    for (const hex of this.hexes) {
      const { x, y } = this.hexToPixel(hex.q, hex.r);
      
      // Draw terrain texture with clipping
      this.drawTerrainHex(x, y, hex);
      
      // Highlight hovered hex
      if (this.gameState.hoverHex && this.gameState.hoverHex.q === hex.q && this.gameState.hoverHex.r === hex.r) {
        this.ctx.strokeStyle = 'yellow';
        this.ctx.lineWidth = 3 * scale;
        this.drawHexOutline(x, y);
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2 * scale;
      }
      // Render character border if placed (use same death visibility logic as drawTerrainHex)
      const animState = this.gameState.combatAnimationState;
      const events = this.gameState.combatEvents || [];
      const currentEventIndex = animState?.currentEventIndex ?? -1;
      const placed = this.gameState.placedCharacters.find(pc =>
        pc.hex.q === hex.q && pc.hex.r === hex.r
      );

      // Check if dead character should still be visible
      let showCharacterBorder = false;
      if (placed) {
        if (!placed.isDead) {
          showCharacterBorder = true;
        } else {
          // Find death event for this character
          const deathEventIndex = events.findIndex(e =>
            e.type === 'death' &&
            'targetHex' in e &&
            (e as any).targetHex.q === hex.q &&
            (e as any).targetHex.r === hex.r
          );
          // Show border until death animation completes
          showCharacterBorder = deathEventIndex !== -1 && currentEventIndex <= deathEventIndex;
        }
      }

      if (showCharacterBorder && placed) {
        this.ctx.strokeStyle = placed.card.faction === 'human' ? 'blue' : 'red';
        this.ctx.lineWidth = 3 * scale;
        this.drawHex(x, y);
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2 * scale;

        // Character image now drawn in drawTerrainHex for proper layering

        // Highlight current active in combat
        if (this.gameState.phase === 'combat' && this.gameState.combatOrder[this.gameState.currentCombatIndex] === placed) {
          this.ctx.strokeStyle = 'yellow';
          this.ctx.lineWidth = 4 * scale;
          this.drawHexOutline(x, y);
          this.ctx.strokeStyle = 'white';
          this.ctx.lineWidth = 2 * scale;
        }
        // Highlight selected attacker
        if (this.gameState.selectedAttacker === placed) {
          const color = placed.card.faction === 'human' ? 'blue' : 'red';
          this.ctx.strokeStyle = color;
          this.ctx.lineWidth = 4 * scale;
          this.drawHexOutline(x, y);
          this.ctx.strokeStyle = 'white';
          this.ctx.lineWidth = 2 * scale;
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
          this.ctx.shadowBlur = 20 * scale;
          this.ctx.strokeStyle = '#FF9900';
          this.ctx.lineWidth = 5 * scale;
          this.drawHexOutline(x, y);
          // Draw again for stronger glow
          this.ctx.shadowBlur = 10 * scale;
          this.drawHexOutline(x, y);
          this.ctx.restore();
        }
      } else if (this.gameState.selectedCard && this.gameState.hoverHex && this.gameState.hoverHex.q === hex.q && this.gameState.hoverHex.r === hex.r) {
        // Preview placement: outline in faction color
        const color = this.gameState.selectedCard.faction === 'human' ? 'blue' : 'red';
        const canPlace = this.canPlaceAt(hex);
        this.ctx.strokeStyle = canPlace ? color : 'orange'; // Orange if can't place
        this.ctx.lineWidth = 4 * scale;
        this.drawHex(x, y);
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2 * scale;
      }
      // Render value last, on top
      if (!hex.isMountain && hex.value > 0) {
        // Add very strong dark shadow for maximum visibility
        this.ctx.shadowColor = 'rgba(0, 0, 0, 1.0)';
        this.ctx.shadowBlur = 20 * scale;
        this.ctx.shadowOffsetX = 4 * scale;
        this.ctx.shadowOffsetY = 4 * scale;

        // Also add a black stroke outline
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 6 * scale;
        this.ctx.strokeText(hex.value.toString(), x - 5 * scale, y + 5 * scale);

        // Then fill with white
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(hex.value.toString(), x - 5 * scale, y + 5 * scale);

        // Reset shadow and stroke
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
      }
    }

    // Render combat animation effects
    if (this.gameState.phase === 'combatAnimation' && this.gameState.combatAnimationState) {
      this.renderCombatAnimations(this.gameState.combatAnimationState);
    }

    // Show card preview if hovering over a hex with a placed card
    if (this.gameState.hoverHex && !this.gameState.selectedCard) {
      const hoveredPlaced = this.gameState.placedCharacters.find(
        pc => pc.hex.q === this.gameState.hoverHex!.q && pc.hex.r === this.gameState.hoverHex!.r
      );
      if (hoveredPlaced) {
        const previewScale = getScale();
        const previewWidth = 250 * previewScale;
        const previewHeight = 400 * previewScale;
        const eventCardWidth = 220 * previewScale;
        const eventCardHeight = 350 * previewScale;
        const mouseX = this.gameState.mouseX;
        const mouseY = this.gameState.mouseY;
        const boardWidth = window.innerWidth * 0.6;
        const boardCenterX = boardWidth / 2;

        // Calculate total width including event cards
        const numEventCards = hoveredPlaced.eventEffects?.length || 0;
        const eventCardsWidth = numEventCards > 0 ? (eventCardWidth + 10 * previewScale) * numEventCards : 0;
        const totalWidth = previewWidth + eventCardsWidth;

        let previewX: number;
        let previewY = mouseY - previewHeight / 2; // Vertikalt centrerat med musen

        // Bestäm vänster eller höger sida baserat på musens X-position
        if (mouseX < boardCenterX) {
          // Vänster sida av brädet - visa kortet till höger om musen
          previewX = mouseX + 30 * previewScale;
        } else {
          // Höger sida eller mittlinjen - visa kortet till vänster om musen
          previewX = mouseX - totalWidth - 30 * previewScale;
        }

        // Se till att kortet inte går utanför canvas
        previewX = Math.max(10 * previewScale, Math.min(previewX, boardWidth - totalWidth - 10 * previewScale));
        previewY = Math.max(10 * previewScale, Math.min(previewY, window.innerHeight - previewHeight - 10 * previewScale));

        // Render character card
        this.cardRenderer.renderCard(this.ctx, hoveredPlaced.card, previewX, previewY, previewWidth, previewHeight, 13);

        // Render event cards to the right of character card
        if (hoveredPlaced.eventEffects && hoveredPlaced.eventEffects.length > 0) {
          let eventX = previewX + previewWidth + 10 * previewScale;
          const eventY = previewY + (previewHeight - eventCardHeight) / 2; // Center vertically

          for (const eventCard of hoveredPlaced.eventEffects) {
            this.cardRenderer.renderCard(this.ctx, eventCard, eventX, eventY, eventCardWidth, eventCardHeight, 10);
            eventX += eventCardWidth + 10 * previewScale;
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
    const animState = this.gameState.combatAnimationState;
    const events = this.gameState.combatEvents || [];
    const currentEventIndex = animState?.currentEventIndex ?? -1;

    // Find placed character at this hex
    const placed = this.gameState.placedCharacters.find(pc =>
      pc.hex.q === hex.q && pc.hex.r === hex.r
    );

    // Check if this character's death animation has completed
    // A dead character should be hidden only AFTER their death event has finished playing
    let shouldHideDeadCharacter = false;
    let isBeingAnimatedForDeath = false;

    if (placed?.isDead) {
      // Find the death event for this character
      const deathEventIndex = events.findIndex(e =>
        e.type === 'death' &&
        'targetHex' in e &&
        (e as any).targetHex.q === hex.q &&
        (e as any).targetHex.r === hex.r
      );

      if (deathEventIndex !== -1) {
        // Check if we're currently animating this death
        isBeingAnimatedForDeath = currentEventIndex === deathEventIndex &&
          animState?.currentPhase === 'fade_death';

        // Hide if we've moved past the death event
        shouldHideDeadCharacter = currentEventIndex > deathEventIndex;
      } else {
        // No death event found but marked dead - shouldn't happen, but hide anyway
        shouldHideDeadCharacter = true;
      }
    }

    // Skip rendering if death animation is complete
    const characterToRender = shouldHideDeadCharacter ? undefined : placed;
    
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
    
    // If character is placed (and not hidden after death), draw it in upper half
    if (characterToRender) {
      this.ctx.save();

      // Apply fade for death animation
      if (isBeingAnimatedForDeath && animState?.deathAnimation) {
        this.ctx.globalAlpha = animState.deathAnimation.spriteOpacity;
      }

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
      if (characterToRender.card.image) {
        assetKey = characterToRender.card.image;
        // Try to load the custom image if not already loaded
        this.cardRenderer['assetLoader'].loadAsset(assetKey).catch((err: Error) => console.warn(err));
      } else {
        assetKey = characterToRender.card.faction === 'human' ? 'characterPlaceholder' : 'characterAlienPlaceholder';
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

    // Draw glitter effect for rare characters (rareness 3+, enhanced for 4)
    if (characterToRender && characterToRender.card.stats.rareness >= 3) {
      const isLegendary = characterToRender.card.stats.rareness >= 4;
      this.drawHexGlitter(x, y, characterToRender.card.id, isLegendary);
    }

    // Draw HP display in lower-left of hex if character is placed
    if (characterToRender) {
      this.ctx.save();
      const scale = getScale();
      const currentHP = characterToRender.derived?.health ?? characterToRender.card.stats.health;
      const maxHP = characterToRender.card.stats.health;

      // Position in lower-left area of hex (adjusted to be inside hex)
      const hpX = x - this.hexSize * 0.35;
      const hpY = y + this.hexSize * 0.65;

      // Draw background pill shape
      const pillWidth = 32 * scale;
      const pillHeight = 18 * scale;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.beginPath();
      this.ctx.roundRect(hpX - pillWidth / 2, hpY - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
      this.ctx.fill();

      // Draw HP text with color based on health status
      const hpRatio = currentHP / maxHP;
      let hpColor = '#44FF44'; // Green for healthy
      if (hpRatio <= 0.25) {
        hpColor = '#FF4444'; // Red for critical
      } else if (hpRatio <= 0.5) {
        hpColor = '#FFAA00'; // Orange for wounded
      }

      this.ctx.font = `bold ${14 * scale}px "Smooch Sans", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = hpColor;

      // Add heart icon before HP
      this.ctx.fillText(`♥${currentHP}`, hpX, hpY);
      this.ctx.restore();
    }

    // Draw event effect icons in lower half of hex if character has been affected
    if (characterToRender && characterToRender.eventEffects && characterToRender.eventEffects.length > 0) {
      this.ctx.save();
      const iconScale = getScale();
      // Halve icon size if 4 or more effects (reduced to 70% of original)
      const iconSize = (characterToRender.eventEffects.length >= 4 ? 13 : 25) * iconScale;
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

      // Draw icons in lower-right half of hex (moved to avoid HP overlap)
      const icons = characterToRender.eventEffects.map(e => eventIcons[e.name] || '✦').join('');
      this.ctx.fillText(icons, x + this.hexSize * 0.3, y + this.hexSize * 0.55);
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
    this.ctx.lineWidth = 2 * getScale();
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

  private renderCombatAnimations(animState: AnimationState): void {
    // Render highlighted hexes with neon glow
    for (const highlight of animState.highlightedHexes) {
      const { x, y } = this.hexToPixel(highlight.hex.q, highlight.hex.r);
      this.renderHexGlow(x, y, highlight.color, highlight.intensity);
    }

    // Render floating damage number
    if (animState.floatingDamage) {
      const { x, y } = this.hexToPixel(animState.floatingDamage.hex.q, animState.floatingDamage.hex.r);
      this.renderFloatingDamage(
        x,
        y + animState.floatingDamage.offsetY,
        animState.floatingDamage.damage,
        animState.floatingDamage.opacity
      );
    }

    // Render death animation (red X)
    if (animState.deathAnimation) {
      const { x, y } = this.hexToPixel(animState.deathAnimation.hex.q, animState.deathAnimation.hex.r);
      this.renderDeathX(x, y, animState.deathAnimation.opacity);
    }

    // Combat message now displayed in right panel (GameUI.renderCombatLogPanel)
    // No longer rendering message box at bottom of board
  }

  private renderHexGlow(x: number, y: number, color: 'blue' | 'red' | 'orange' | 'green', intensity: number): void {
    const scale = getScale();
    const colorMap = {
      blue: '#00AAFF',
      red: '#FF4444',
      orange: '#FF9900',
      green: '#44FF44',
    };

    this.ctx.save();
    this.ctx.globalAlpha = intensity;
    this.ctx.shadowColor = colorMap[color];
    this.ctx.shadowBlur = 30 * scale * intensity;
    this.ctx.strokeStyle = colorMap[color];
    this.ctx.lineWidth = 5 * scale;

    // Draw hex outline with glow
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

    // Draw again for stronger glow
    this.ctx.shadowBlur = 50 * scale * intensity;
    this.ctx.stroke();

    this.ctx.restore();
  }

  private renderFloatingDamage(x: number, y: number, damage: number, opacity: number): void {
    const scale = getScale();

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.fillStyle = '#FF4444';
    this.ctx.font = `bold ${36 * scale}px "Smooch Sans", sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Shadow for visibility
    this.ctx.shadowColor = 'black';
    this.ctx.shadowBlur = 8 * scale;
    this.ctx.shadowOffsetX = 2 * scale;
    this.ctx.shadowOffsetY = 2 * scale;

    // Draw damage number with minus sign
    this.ctx.fillText(`-${damage}`, x, y);

    this.ctx.restore();
  }

  private renderDeathX(x: number, y: number, opacity: number): void {
    const scale = getScale();
    const size = this.hexSize * 0.6;

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 8 * scale;
    this.ctx.lineCap = 'round';

    // Shadow for visibility
    this.ctx.shadowColor = '#FF0000';
    this.ctx.shadowBlur = 20 * scale;

    // Draw X
    this.ctx.beginPath();
    this.ctx.moveTo(x - size, y - size);
    this.ctx.lineTo(x + size, y + size);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x + size, y - size);
    this.ctx.lineTo(x - size, y + size);
    this.ctx.stroke();

    this.ctx.restore();
  }

  // Glitter particles cache for hex characters
  private hexGlitterParticles: Map<string, { x: number; y: number; size: number; phase: number; speed: number }[]> = new Map();

  /**
   * Draw glitter effect on hex for rare characters
   * @param isLegendary - if true, uses enhanced rainbow effect for rareness 4
   */
  private drawHexGlitter(hexX: number, hexY: number, cardId: string, isLegendary: boolean = false): void {
    const scale = getScale();
    const particleCount = isLegendary ? 12 : 8; // More particles for legendary

    // Get or create particles for this card
    const cacheKey = cardId + (isLegendary ? '_legendary' : '');
    if (!this.hexGlitterParticles.has(cacheKey)) {
      const particles = [];
      for (let i = 0; i < particleCount; i++) {
        // Distribute particles around the hex
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = this.hexSize * (0.3 + Math.random() * 0.5);
        particles.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          size: isLegendary ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
          phase: Math.random() * Math.PI * 2,
          speed: 0.8 + Math.random() * 1.2
        });
      }
      this.hexGlitterParticles.set(cacheKey, particles);
    }

    const particles = this.hexGlitterParticles.get(cacheKey)!;
    const time = performance.now() / 1000;

    this.ctx.save();

    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      // Animated opacity with sine wave
      const opacity = (Math.sin(time * particle.speed + particle.phase) + 1) / 2 * 0.8;

      if (opacity > 0.15) {
        const px = hexX + particle.x;
        const py = hexY + particle.y;

        // Glow effect - rainbow for legendary, gold for rare
        if (isLegendary) {
          const hue = (time * 50 + i * 30) % 360;
          this.ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${opacity})`;
          this.ctx.shadowBlur = particle.size * 5 * scale;
        } else {
          this.ctx.shadowColor = `rgba(255, 215, 100, ${opacity})`;
          this.ctx.shadowBlur = particle.size * 4 * scale;
        }

        // Core sparkle
        this.ctx.beginPath();
        this.ctx.arc(px, py, particle.size * scale, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        this.ctx.fill();

        // Star burst for bright particles
        if (opacity > 0.5) {
          this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
          this.ctx.lineWidth = (isLegendary ? 1.5 : 1) * scale;
          const crossSize = particle.size * 2 * scale;

          this.ctx.beginPath();
          this.ctx.moveTo(px - crossSize, py);
          this.ctx.lineTo(px + crossSize, py);
          this.ctx.stroke();

          this.ctx.beginPath();
          this.ctx.moveTo(px, py - crossSize);
          this.ctx.lineTo(px, py + crossSize);
          this.ctx.stroke();

          // Diagonal lines for legendary (8-point star)
          if (isLegendary) {
            const diagSize = crossSize * 0.7;
            this.ctx.beginPath();
            this.ctx.moveTo(px - diagSize, py - diagSize);
            this.ctx.lineTo(px + diagSize, py + diagSize);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(px + diagSize, py - diagSize);
            this.ctx.lineTo(px - diagSize, py + diagSize);
            this.ctx.stroke();
          }
        }
      }
    }

    this.ctx.restore();
  }

}