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
    // Card colors and dimensions
    const borderColor = '#181610';
    const bgColor = '#DED9CE';
    const borderWidth = 4;
    const cardPadding = 14;
    const imageAreaPadding = 8;

    // Draw outer border
    ctx.fillStyle = borderColor;
    ctx.fillRect(x, y, width, height);

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x + borderWidth, y + borderWidth, width - borderWidth * 2, height - borderWidth * 2);

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

    // Clip to frame area so image cannot overflow
    ctx.save();
    ctx.beginPath();
    ctx.rect(imageX, imageY, imageW, imageH - 80); // Crop 80px from bottom
    ctx.clip();
    this.drawCharacterImage(ctx, imageX, imageY, imageW, imageH);
    ctx.restore();

    // Draw frame around image
    this.drawFrame(ctx, imageX, imageY, imageW, imageH);

    // Draw icons at top (pips instead of numbers)
    this.drawHealthIcons(ctx, contentX + 2, contentY - 6, card.stats.health);
    this.drawAttackIcons(ctx, contentX + contentWidth - 2, contentY - 6, card.stats.attacks);

    // Draw text info at bottom
    const textY = imageY + imageHeight + 8;
    const textHeight = contentHeight - imageHeight - 16;
    this.drawCardText(ctx, card, contentX, textY, contentWidth, textHeight);
  }

  private drawCharacterImage(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    const img = this.assetLoader.getAsset('characterPlaceholder');
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

  private drawFrame(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    const frame = this.assetLoader.getAsset('frameHuman');
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

  private drawHealthIcons(ctx: CanvasRenderingContext2D, x: number, y: number, health: number) {
    const icon = this.assetLoader.getAsset('healthIconHuman');
    const iconSize = 54;
    const gap = -18; // Negative to overlap and compensate for image padding
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

  private drawAttackIcons(ctx: CanvasRenderingContext2D, rightX: number, y: number, attacks: number) {
    const icon = this.assetLoader.getAsset('costIconHuman');
    const iconSize = 54;
    const gap = -18; // Negative to overlap and compensate for image padding
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
    // Card name
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(card.name, x + 4, y + 18);

    // Card description/ability
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#333333';
    const ability = card.stats.ability || 'No ability';
    const wrappedText = this.wrapText(ability, width - 10, ctx);
    let textY = y + 34;
    wrappedText.forEach(line => {
      if (textY < y + height - 40) {
        ctx.fillText(line, x + 4, textY);
        textY += 15;
      }
    });

    // Stats lines
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#666666';
    const statsLines = [
      `Range: ${card.stats.range}`,
      `Attacks: ${card.stats.attacks}`,
      `Points: ${card.stats.points}`
    ];
    let statsY = y + height - 32;
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
}
