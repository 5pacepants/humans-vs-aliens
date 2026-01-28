// Render character cards and event cards

import type { CharacterCard, EventCard } from './types';
import { CardAssetLoader } from './CardAssetLoader';

export class CardRenderer {
  private assetLoader: CardAssetLoader;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private readonly SUPERSAMPLING_SCALE = 4; // 4x rendering for better quality when downscaling high-res images

  constructor() {
    this.assetLoader = new CardAssetLoader();
    this.assetLoader.preloadAll();
    
    // Create offscreen canvas for high-quality rendering
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.offscreenCtx.imageSmoothingEnabled = true;
    this.offscreenCtx.imageSmoothingQuality = 'high';
  }

  renderCard(ctx: CanvasRenderingContext2D, card: CharacterCard | EventCard, x: number, y: number, width: number, height: number, abilityFontSize: number = 17) {
    // Set up offscreen canvas with supersampling scale
    const scale = this.SUPERSAMPLING_SCALE;
    this.offscreenCanvas.width = width * scale;
    this.offscreenCanvas.height = height * scale;
    
    // Clear canvas and reset transformation
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    this.offscreenCtx.setTransform(scale, 0, 0, scale, 0, 0);

    // Check if it's an EventCard or CharacterCard
    if ('effect' in card) {
      // It's an EventCard
      this.renderEventCardToContext(this.offscreenCtx, card, 0, 0, width, height);
    } else {
      // It's a CharacterCard
      this.renderCardToContext(this.offscreenCtx, card, 0, 0, width, height, abilityFontSize);
    }

    // Draw scaled-down result to main canvas
    ctx.drawImage(this.offscreenCanvas, x, y, width, height);
  }

  // Render only frame and character image (for dragging preview)
  renderFrameAndCharacter(ctx: CanvasRenderingContext2D, card: CharacterCard, x: number, y: number, width: number, height: number) {
    const scale = this.SUPERSAMPLING_SCALE;
    this.offscreenCanvas.width = width * scale;
    this.offscreenCanvas.height = height * scale;
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    this.offscreenCtx.setTransform(scale, 0, 0, scale, 0, 0);

    const isHuman = card.faction === 'human';
    const contentWidth = width * 0.85; // Approximate content area
    const contentHeight = height * 0.85;
    const imageAreaPadding = 8;
    
    // Calculate image area dimensions
    const imageHeight = contentHeight * 0.6;
    const baseImageW = contentWidth - imageAreaPadding * 2;
    const baseImageH = imageHeight - 14;
    const imageW = baseImageW * 1.15;
    const imageH = baseImageH * 1.15;
    
    // Center the image
    const imageX = (width - imageW) / 2;
    const imageY = height * 0.05;
    
    // Frame dimensions
    const frameY = isHuman ? imageY : imageY + (height * 0.072);
    const frameH = isHuman ? imageH : imageH - (height * 0.144);
    
    // Clip and draw character image
    this.offscreenCtx.save();
    this.offscreenCtx.beginPath();
    this.offscreenCtx.rect(imageX, imageY, imageW, imageH - (height * 0.164));
    this.offscreenCtx.clip();
    this.drawCharacterImage(this.offscreenCtx, imageX, imageY, imageW, imageH, card);
    this.offscreenCtx.restore();
    
    // Draw frame
    this.drawFrame(this.offscreenCtx, imageX, frameY, imageW, frameH, card.faction);
    
    // Draw to main canvas
    ctx.drawImage(this.offscreenCanvas, x, y, width, height);
  }

  private renderCardToContext(ctx: CanvasRenderingContext2D, card: CharacterCard, x: number, y: number, width: number, height: number, abilityFontSize: number = 17) {
    // Card colors and dimensions based on faction
    const isHuman = card.faction === 'human';
    const borderColor = isHuman ? '#2a3a4d' : '#5a4570'; // Blue border for human, dark purple for alien
    const bgColor = isHuman ? '#DED9CE' : '#233628'; // Darker green background for alien
    const darkBgColor = isHuman ? '#bab29f' : '#141f18'; // Darker green for stats/faction areas on alien
    const borderWidth = 4;
    const cardPadding = 14;
    const imageAreaPadding = 8;
    const cornerRadius = 12; // Rounded corners like Magic cards

    // Draw thin outline around entire card with rounded corners first
    const outlineColor = isHuman ? '#2a3a4d' : '#5a4570'; // Dark purple for alien
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 10;
    this.roundedRect(ctx, x + 5, y + 5, width - 10, height - 10, cornerRadius);
    ctx.stroke();

    // Draw outer border with rounded corners
    ctx.fillStyle = borderColor;
    this.roundedRect(ctx, x, y, width, height, cornerRadius);
    ctx.fill();

    // Draw background with rounded corners
    ctx.fillStyle = bgColor;
    this.roundedRect(ctx, x + borderWidth, y + borderWidth, width - borderWidth * 2, height - borderWidth * 2, cornerRadius - borderWidth);
    ctx.fill();

    // Draw darker background section for health/strength icons at top
    ctx.fillStyle = darkBgColor;
    const iconBgHeight = 55;
    ctx.save();
    ctx.beginPath();
    // Clip to rounded top section
    this.roundedRect(ctx, x + borderWidth, y + borderWidth, width - borderWidth * 2, iconBgHeight, cornerRadius - borderWidth);
    ctx.clip();
    ctx.fillRect(x + borderWidth, y + borderWidth, width - borderWidth * 2, iconBgHeight);
    ctx.restore();

    // Draw faction text in the dark top section
    ctx.fillStyle = isHuman ? '#000000' : '#ffffff';
    ctx.font = '500 15px Quicksand, sans-serif';
    const factionText = card.faction.charAt(0).toUpperCase() + card.faction.slice(1); // Capitalize
    const factionWidth = ctx.measureText(factionText).width;
    const factionX = x + (width - factionWidth) / 2;
    const factionY = y + borderWidth + iconBgHeight - 5; // 5px from bottom of dark section
    ctx.fillText(factionText, factionX, factionY);

    // Draw darker background section for stats in lower left corner
    // Make it wider for preview cards (when abilityFontSize is 13)
    const isPreview = abilityFontSize === 13;
    const statsBgWidth = (width - borderWidth * 2) * 0.5 - 35 + (isPreview ? 18 : 0);
    const statsBgHeight = 85; // Increased to fit Init stat
    const statsBgX = x + borderWidth + 5;
    // Moved up 15px to accommodate additional stat line
    const statsBgY = y + height - borderWidth - cardPadding - 73;
    ctx.fillStyle = darkBgColor;
    this.roundedRect(ctx, statsBgX, statsBgY, statsBgWidth, statsBgHeight, 6);
    ctx.fill();

    // Content area (inside border and padding)
    const contentX = x + borderWidth + cardPadding;
    const contentY = y + borderWidth + cardPadding;
    const contentWidth = width - borderWidth * 2 - cardPadding * 2;
    const contentHeight = height - borderWidth * 2 - cardPadding * 2;

    // Draw character image area (about 60% height)
    const imageHeight = contentHeight * 0.6;
    const baseImageW = contentWidth - imageAreaPadding * 2;
    const baseImageH = imageHeight - 14;
    // Make frame 15% larger
    const imageW = baseImageW * 1.15;
    const imageH = baseImageH * 1.15;
    // Center the larger frame and move closer to icons - scale with card size
    const imageX = contentX + imageAreaPadding - (imageW - baseImageW) / 2;
    const imageY = contentY - (height * 0.02); // Scale with height (was -10px at 487px)

    // Frame dimensions - compressed for aliens, normal for humans - scale with size
    const frameY = isHuman ? imageY : imageY + (height * 0.072); // Scale with height (was 35px at 487px)
    const frameH = isHuman ? imageH : imageH - (height * 0.144); // Scale with height (was -70px at 487px)

    // Clip to frame area so image cannot overflow - scale crop with size
    ctx.save();
    ctx.beginPath();
    ctx.rect(imageX, imageY, imageW, imageH - (height * 0.164)); // Scale with height (was -80px at 487px)
    ctx.clip();
    this.drawCharacterImage(ctx, imageX, imageY, imageW, imageH, card);
    ctx.restore();

    // Draw frame around image
    this.drawFrame(ctx, imageX, frameY, imageW, frameH, card.faction);

    // Draw icons at top (pips instead of numbers) - scale positions with size
    this.drawHealthIcons(ctx, contentX - (width * 0.053), contentY - (height * 0.039), card.stats.health, card.faction);
    this.drawAttackIcons(ctx, contentX + contentWidth + (width * 0.053), contentY - (height * 0.039), card.stats.attacks, card.faction);

    // Draw text info at bottom
    const textY = imageY + imageHeight - 42; // Moved up 50 pixels from original position
    const textHeight = contentHeight - imageHeight - 16;
    this.drawCardText(ctx, card, contentX, textY, contentWidth, textHeight, abilityFontSize);
  }

  private renderEventCardToContext(ctx: CanvasRenderingContext2D, card: EventCard, x: number, y: number, width: number, height: number) {
    // Event card colors - red/orange theme
    const borderColor = '#8B1A1A'; // Mörkröd border
    const bgColor = '#F0D4A8'; // Ljusare matt orange bakgrund med låg saturation
    const darkBgColor = '#E8A04D'; // Gul/orange för header
    const borderWidth = 4;
    const cardPadding = 14;
    const imageAreaPadding = 8;
    const cornerRadius = 12;

    // Draw thin outline around entire card with rounded corners
    ctx.strokeStyle = '#8B1A1A';
    ctx.lineWidth = 10;
    this.roundedRect(ctx, x + 5, y + 5, width - 10, height - 10, cornerRadius);
    ctx.stroke();

    // Draw outer border with rounded corners
    ctx.fillStyle = borderColor;
    this.roundedRect(ctx, x, y, width, height, cornerRadius);
    ctx.fill();

    // Draw background with rounded corners
    ctx.fillStyle = bgColor;
    this.roundedRect(ctx, x + borderWidth, y + borderWidth, width - borderWidth * 2, height - borderWidth * 2, cornerRadius - borderWidth);
    ctx.fill();

    // Draw darker background section for header at top
    ctx.fillStyle = darkBgColor;
    const headerBgHeight = 55;
    ctx.save();
    ctx.beginPath();
    this.roundedRect(ctx, x + borderWidth, y + borderWidth, width - borderWidth * 2, headerBgHeight, cornerRadius - borderWidth);
    ctx.clip();
    ctx.fillRect(x + borderWidth, y + borderWidth, width - borderWidth * 2, headerBgHeight);
    ctx.restore();

    // Draw card name in the dark top section
    ctx.fillStyle = '#000000';
    ctx.font = '700 32px "Smooch Sans", sans-serif';
    const nameWidth = ctx.measureText(card.name).width;
    const nameX = x + (width - nameWidth) / 2;
    const nameY = y + borderWidth + headerBgHeight - 10;
    ctx.fillText(card.name, nameX, nameY);

    // Content area
    const contentX = x + borderWidth + cardPadding;
    const contentY = y + borderWidth + cardPadding;
    const contentWidth = width - borderWidth * 2 - cardPadding * 2;
    const contentHeight = height - borderWidth * 2 - cardPadding * 2;

    // Draw event image area (about 60% height, same as character cards)
    const imageHeight = contentHeight * 0.6;
    const baseImageW = contentWidth - imageAreaPadding * 2;
    const baseImageH = imageHeight - 14;
    const imageW = baseImageW * 1.15;
    const imageH = baseImageH * 1.15;
    const imageX = contentX + imageAreaPadding - (imageW - baseImageW) / 2;
    const imageY = contentY - (height * 0.02) + 15; // Flyttad ner 15px

    // Frame dimensions - 35px ner från toppen, 40px upp från botten
    const frameY = imageY + 35;
    const frameH = imageH - 75;

    // Clip to frame area so image cannot overflow
    ctx.save();
    ctx.beginPath();
    ctx.rect(imageX, imageY, imageW, imageH - (height * 0.164));
    ctx.clip();
    this.drawEventImage(ctx, imageX, imageY, imageW, imageH);
    ctx.restore();

    // Draw frame around image (should be on top with transparent center)
    this.drawEventFrame(ctx, imageX, frameY, imageW, frameH);

    // Draw text info at bottom
    const textY = imageY + imageHeight - 42;
    const textHeight = contentHeight - imageHeight - 16;
    this.drawEventText(ctx, card, contentX, textY, contentWidth, textHeight);
  }

  private drawCharacterImage(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, card: CharacterCard) {
    // Use custom image if specified, otherwise use placeholder
    let assetKey: string;
    if (card.image) {
      assetKey = card.image;
      // Try to load the custom image if not already loaded
      this.assetLoader.loadAsset(assetKey).catch(err => console.warn(err));
    } else {
      assetKey = card.faction === 'human' ? 'characterPlaceholder' : 'characterAlienPlaceholder';
    }
    const img = this.assetLoader.getAsset(assetKey);
    if (img && img.complete) {
      // Preserve original aspect ratio
      const imgAspect = img.width / img.height;
      const frameAspect = width / height;
      
      let charW, charH;
      if (imgAspect > frameAspect) {
        // Image is wider - fit to width at 80% scale
        charW = width * 0.8;
        charH = charW / imgAspect;
      } else {
        // Image is taller - fit to height at 80% scale
        charH = height * 0.8;
        charW = charH * imgAspect;
      }
      
      const charX = x + (width - charW) / 2;
      const charY = y + (height - charH) / 2;
      ctx.drawImage(img, charX, charY, charW, charH);
    } else {
      // Fallback placeholder color
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(x, y, width, height);
    }
  }

  private drawEventImage(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    const img = this.assetLoader.getAsset('characterEventPlaceholder');
    
    if (img && img.complete) {
      // Preserve original aspect ratio
      const imgAspect = img.width / img.height;
      const frameAspect = width / height;
      
      let charW, charH;
      if (imgAspect > frameAspect) {
        // Image is wider - fit to width at 80% scale
        charW = width * 0.8;
        charH = charW / imgAspect;
      } else {
        // Image is taller - fit to height at 80% scale
        charH = height * 0.8;
        charW = charH * imgAspect;
      }
      
      const charX = x + (width - charW) / 2;
      const charY = y + (height - charH) / 2;
      ctx.drawImage(img, charX, charY, charW, charH);
    } else {
      // Fallback placeholder color
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(x, y, width, height);
    }
  }

  private drawFrame(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, faction: 'human' | 'alien') {
    const frameKey = faction === 'human' ? 'frameHuman' : 'frameAlien';
    const frame = this.assetLoader.getAsset(frameKey);
    if (frame && frame.complete) {
      // Frame is already scaled up via supersampling on offscreen canvas
      ctx.drawImage(frame, x, y, width, height);
    } else {
      // Fallback: simple border
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
    }
  }

  private drawEventFrame(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    const frame = this.assetLoader.getAsset('frameEvent');
    if (frame && frame.complete) {
      ctx.drawImage(frame, x, y, width, height);
    } else {
      // Fallback: simple border
      ctx.strokeStyle = '#9b59b6';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
    }
  }

  private drawHealthIcons(ctx: CanvasRenderingContext2D, x: number, y: number, health: number, faction: 'human' | 'alien') {
    const iconKey = faction === 'human' ? 'healthIconHuman' : 'healthIconAlien';
    const icon = this.assetLoader.getAsset(iconKey);
    const iconSize = 54;
    const gap = -24; // Negative to overlap and compensate for image padding
    const count = Math.max(0, Math.min(health, 6));
    for (let i = 0; i < count; i++) {
      const drawX = x + i * (iconSize + gap);
      if (icon && icon.complete) {
        ctx.drawImage(icon, drawX, y, iconSize, iconSize);
      } else {
        ctx.fillStyle = '#cc0000';
        ctx.beginPath();
        ctx.arc(drawX + iconSize / 2, y + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawAttackIcons(ctx: CanvasRenderingContext2D, rightX: number, y: number, attacks: number, faction: 'human' | 'alien') {
    const iconKey = faction === 'human' ? 'costIconHuman' : 'costIconAlien';
    const icon = this.assetLoader.getAsset(iconKey);
    const iconSize = 54;
    const gap = -24; // Negative to overlap and compensate for image padding
    const count = Math.max(0, Math.min(attacks, 6));
    const totalWidth = count * iconSize + Math.max(0, count - 1) * gap;
    const startX = rightX - totalWidth;
    for (let i = 0; i < count; i++) {
      const drawX = startX + i * (iconSize + gap);
      if (icon && icon.complete) {
        ctx.drawImage(icon, drawX, y, iconSize, iconSize);
      } else {
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(drawX + iconSize / 2, y + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawCardText(ctx: CanvasRenderingContext2D, card: CharacterCard, x: number, y: number, width: number, height: number, abilityFontSize: number = 17) {
    // Offset for alien cards to account for larger frame
    const isHuman = card.faction === 'human';
    const offset = isHuman ? 0 : 5;
    const textColor = isHuman ? '#000000' : '#ffffff'; // White for alien
    const typeColor = isHuman ? '#555555' : '#dddddd'; // Light grey for alien
    const abilityColor = isHuman ? '#333333' : '#eeeeee'; // Very light grey for alien

    // Card name (specific name like "General Johnson") - CENTERED
    ctx.fillStyle = textColor;
    ctx.font = '700 32px "Smooch Sans", sans-serif';
    const nameWidth = ctx.measureText(card.name).width;
    const nameX = x + (width - nameWidth) / 2;
    ctx.fillText(card.name, nameX, y + 18 + offset);

    // Divider line between name and type
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 28 + offset);
    ctx.lineTo(x + width - 10, y + 28 + offset);
    ctx.stroke();

    // Card type (like "Commander", "Soldier", etc.) - CENTERED
    ctx.font = '500 15px Quicksand, sans-serif';
    ctx.fillStyle = typeColor;
    const typeWidth = ctx.measureText(card.type).width;
    const typeX = x + (width - typeWidth) / 2;
    ctx.fillText(card.type, typeX, y + 46 + offset);

    // Card description/ability
    ctx.font = `${abilityFontSize}px Quicksand, sans-serif`;
    ctx.fillStyle = abilityColor;
    const ability = card.stats.ability || 'No ability';
    const wrappedText = this.wrapText(ability, width - 10, ctx);
    let textY = y + 72 + offset;
    wrappedText.forEach(line => {
      ctx.fillText(line, x + 4, textY);
      textY += 22;
    });

    // Stats lines
    ctx.font = '16px Quicksand, sans-serif';
    ctx.fillStyle = isHuman ? '#000000' : '#ffffff';
    const statsLines = [
      `Range: ${card.stats.range}`,
      `Attacks: ${card.stats.attacks}`,
      `Damage: ${card.stats.damage}`,
      `Init: ${card.stats.initiative}`,
      `Points: ${card.stats.points}`
    ];
    let statsY = y + height + 14; // Moved up 15px to fit Init stat
    statsLines.forEach(line => {
      ctx.fillText(line, x + 4, statsY);
      statsY += 14;
    });
  }

  private drawEventText(ctx: CanvasRenderingContext2D, card: EventCard, x: number, y: number, width: number, height: number) {
    const textColor = '#000000';
    const effectColor = '#333333';

    // Scale factor based on reference width of 300px (full-size card)
    const scale = width / 300;

    // "Event" text - CENTERED
    ctx.fillStyle = textColor;
    ctx.font = `500 ${Math.round(15 * scale)}px Quicksand, sans-serif`;
    const eventText = 'Event';
    const eventWidth = ctx.measureText(eventText).width;
    const eventX = x + (width - eventWidth) / 2;
    ctx.fillText(eventText, eventX, y + 33 * scale);

    // Divider line between Event and effect
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 10 * scale, y + 43 * scale);
    ctx.lineTo(x + width - 10 * scale, y + 43 * scale);
    ctx.stroke();

    // Card effect description
    const effectFontSize = Math.round(22 * scale);
    ctx.font = `${effectFontSize}px Quicksand, sans-serif`;
    ctx.fillStyle = effectColor;
    const wrappedText = this.wrapText(card.effect, width - 10 * scale, ctx);
    let textY = y + 71 * scale;
    const lineHeight = Math.round(24 * scale);
    wrappedText.forEach(line => {
      if (textY < y + height) {
        ctx.fillText(line, x + 4 * scale, textY);
        textY += lineHeight;
      }
    });
  }

  private wrapText(text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  private roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }
}
