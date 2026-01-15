// Render character cards

import type { CharacterCard } from './types';
import { CardAssetLoader } from './CardAssetLoader';

export class CardRenderer {
  private assetLoader: CardAssetLoader;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private readonly SUPERSAMPLING_SCALE = 2; // 2x rendering for better quality

  constructor() {
    this.assetLoader = new CardAssetLoader();
    this.assetLoader.preloadAll();
    
    // Create offscreen canvas for high-quality rendering
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.offscreenCtx.imageSmoothingEnabled = true;
    this.offscreenCtx.imageSmoothingQuality = 'high';
  }

  renderCard(ctx: CanvasRenderingContext2D, card: CharacterCard, x: number, y: number, width: number, height: number) {
    // Set up offscreen canvas with supersampling scale
    const scale = this.SUPERSAMPLING_SCALE;
    this.offscreenCanvas.width = width * scale;
    this.offscreenCanvas.height = height * scale;
    this.offscreenCtx.scale(scale, scale);

    // Render to offscreen canvas with scaled coordinates
    this.renderCardToContext(this.offscreenCtx, card, 0, 0, width, height);

    // Draw scaled-down result to main canvas
    ctx.drawImage(this.offscreenCanvas, x, y, width, height);
  }

  private renderCardToContext(ctx: CanvasRenderingContext2D, card: CharacterCard, x: number, y: number, width: number, height: number) {
    // Card colors and dimensions based on faction
    const isHuman = card.faction === 'human';
    const borderColor = isHuman ? '#181610' : '#b39ddb'; // Purple border for alien
    const bgColor = isHuman ? '#DED9CE' : '#141f18'; // Even darker green for alien
    const darkBgColor = isHuman ? '#bab29f' : '#b8c8b0'; // Darker green-tinted for alien
    const borderWidth = 4;
    const cardPadding = 14;
    const imageAreaPadding = 8;
    const cornerRadius = 12; // Rounded corners like Magic cards

    // Draw thin outline around entire card with rounded corners first
    const outlineColor = isHuman ? '#2a3a4d' : '#b39ddb'; // Purple for alien
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
    ctx.fillStyle = '#000000';
    ctx.font = '500 15px Quicksand, sans-serif';
    const factionText = card.faction.charAt(0).toUpperCase() + card.faction.slice(1); // Capitalize
    const factionWidth = ctx.measureText(factionText).width;
    const factionX = x + (width - factionWidth) / 2;
    const factionY = y + borderWidth + iconBgHeight - 5; // 5px from bottom of dark section
    ctx.fillText(factionText, factionX, factionY);

    // Draw darker background section for stats in lower left corner
    const statsBgWidth = (width - borderWidth * 2) * 0.5 - 45;
    const statsBgHeight = 58;
    const statsBgX = x + borderWidth + 5;
    const statsBgY = y + height - borderWidth - cardPadding - statsBgHeight;
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
    // Center the larger frame and move closer to icons
    const imageX = contentX + imageAreaPadding - (imageW - baseImageW) / 2;
    const imageY = contentY - 10; // Moved up 10 pixels total

    // Frame dimensions - compressed for aliens, normal for humans
    const frameY = isHuman ? imageY : imageY + 35;
    const frameH = isHuman ? imageH : imageH - 70;

    // Clip to frame area so image cannot overflow
    ctx.save();
    ctx.beginPath();
    ctx.rect(imageX, imageY, imageW, imageH - 80); // Crop 80px from bottom
    ctx.clip();
    this.drawCharacterImage(ctx, imageX, imageY, imageW, imageH, card.faction);
    ctx.restore();

    // Draw frame around image
    this.drawFrame(ctx, imageX, frameY, imageW, frameH, card.faction);

    // Draw icons at top (pips instead of numbers)
    this.drawHealthIcons(ctx, contentX - 16, contentY - 19, card.stats.health, card.faction);
    this.drawAttackIcons(ctx, contentX + contentWidth + 16, contentY - 19, card.stats.attacks, card.faction);

    // Draw text info at bottom
    const textY = imageY + imageHeight - 42; // Moved up 50 pixels from original position
    const textHeight = contentHeight - imageHeight - 16;
    this.drawCardText(ctx, card, contentX, textY, contentWidth, textHeight);
  }

  private drawCharacterImage(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, faction: 'human' | 'alien') {
    const assetKey = faction === 'human' ? 'characterPlaceholder' : 'characterAlienPlaceholder';
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

  private drawCardText(ctx: CanvasRenderingContext2D, card: CharacterCard, x: number, y: number, width: number, height: number) {
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
    ctx.font = '22px Quicksand, sans-serif';
    ctx.fillStyle = abilityColor;
    const ability = card.stats.ability || 'No ability';
    const wrappedText = this.wrapText(ability, width - 10, ctx);
    let textY = y + 72 + offset;
    wrappedText.forEach(line => {
      if (textY < y + height - 40) {
        ctx.fillText(line, x + 4, textY);
        textY += 22;
      }
    });

    // Stats lines
    ctx.font = '16px Quicksand, sans-serif';
    ctx.fillStyle = '#000000';
    const statsLines = [
      `Range: ${card.stats.range}`,
      `Attacks: ${card.stats.attacks}`,
      `Points: ${card.stats.points}`
    ];
    let statsY = y + height + 29;
    statsLines.forEach(line => {
      ctx.fillText(line, x + 4, statsY);
      statsY += 14;
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
