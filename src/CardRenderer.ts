// Render character cards

import type { CharacterCard } from './types';
import { CardAssetLoader } from './CardAssetLoader';

export class CardRenderer {
  private assetLoader: CardAssetLoader;

  constructor() {
    this.assetLoader = new CardAssetLoader();
    this.assetLoader.preloadAll();
  }

  renderCard(ctx: CanvasRenderingContext2D, card: CharacterCard, x: number, y: number, width: number, height: number) {
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
    const imageY = contentY + 12;
    const imageX = contentX + imageAreaPadding;
    const imageW = contentWidth - imageAreaPadding * 2;
    const imageH = imageHeight - 14;

    // Clip to frame area so image cannot overflow
    ctx.save();
    ctx.beginPath();
    ctx.rect(imageX, imageY, imageW, imageH);
    ctx.clip();
    this.drawCharacterImage(ctx, imageX, imageY, imageW, imageH);
    ctx.restore();

    // Draw frame around image
    this.drawFrame(ctx, imageX, imageY, imageW, imageH);

    // Draw icons and stats at top
    const iconSize = 32;
    // Health icon + value (top left)
    this.drawHealthStat(ctx, contentX + 2, contentY - 6, iconSize, card.stats.health);

    // Cost icon + value (top right)
    this.drawCostStat(ctx, contentX + contentWidth - iconSize - 2, contentY - 6, iconSize, card.stats.attacks);

    // Draw text info at bottom
    const textY = imageY + imageHeight + 8;
    const textHeight = contentHeight - imageHeight - 16;
    this.drawCardText(ctx, card, contentX, textY, contentWidth, textHeight);
  }

  private drawCharacterImage(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    const img = this.assetLoader.getAsset('characterPlaceholder');
    if (img && img.complete) {
      ctx.drawImage(img, x, y, width, height);
    } else {
      // Fallback placeholder color
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(x, y, width, height);
    }
  }

  private drawFrame(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    const frame = this.assetLoader.getAsset('frameHuman');
    if (frame && frame.complete) {
      ctx.drawImage(frame, x, y, width, height);
    } else {
      // Fallback: simple border
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
    }
  }

  private drawHealthStat(ctx: CanvasRenderingContext2D, x: number, y: number, iconSize: number, health: number) {
    const icon = this.assetLoader.getAsset('healthIconHuman');
    if (icon && icon.complete) {
      ctx.drawImage(icon, x, y, iconSize, iconSize);
    }
    
    // Draw health value
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(health.toString(), x + iconSize + 5, y + iconSize - 4);
  }

  private drawCostStat(ctx: CanvasRenderingContext2D, x: number, y: number, iconSize: number, cost: number) {
    const icon = this.assetLoader.getAsset('costIconHuman');
    if (icon && icon.complete) {
      ctx.drawImage(icon, x, y, iconSize, iconSize);
    }
    
    // Draw cost value
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(cost.toString(), x + iconSize + 5, y + iconSize - 4);
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
