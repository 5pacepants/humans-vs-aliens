"use strict";
(() => {
  // src/TextureLoader.ts
  var TextureLoader = class {
    cache = {};
    loadingPromises = /* @__PURE__ */ new Map();
    async loadTexture(terrain) {
      if (this.cache[terrain]) {
        return this.cache[terrain];
      }
      if (this.loadingPromises.has(terrain)) {
        return this.loadingPromises.get(terrain);
      }
      const promise = new Promise((resolve, reject) => {
        const img = new Image();
        const filename = this.getImageFilename(terrain);
        img.src = `/textures/${filename}`;
        img.onload = () => {
          this.cache[terrain] = img;
          this.loadingPromises.delete(terrain);
          resolve(img);
        };
        img.onerror = () => {
          this.loadingPromises.delete(terrain);
          reject(new Error(`Failed to load texture: ${filename}`));
        };
      });
      this.loadingPromises.set(terrain, promise);
      return promise;
    }
    getImageFilename(terrain) {
      const filenames = {
        grass: "grass.png",
        water: "water.png",
        forest: "forest.png",
        toxic: "toxic.png",
        mountain: "mountain.png"
      };
      return filenames[terrain];
    }
    getTexture(terrain) {
      return this.cache[terrain];
    }
  };

  // src/CardAssetLoader.ts
  var CardAssetLoader = class {
    assets = {};
    loadingPromises = /* @__PURE__ */ new Map();
    async loadAsset(assetKey) {
      if (this.assets[assetKey]) {
        return this.assets[assetKey];
      }
      if (this.loadingPromises.has(assetKey)) {
        return this.loadingPromises.get(assetKey);
      }
      const promise = new Promise((resolve, reject) => {
        const img = new Image();
        const filename = this.getAssetFilename(assetKey);
        img.src = `/cards/${filename}`;
        img.onload = () => {
          this.assets[assetKey] = img;
          this.loadingPromises.delete(assetKey);
          resolve(img);
        };
        img.onerror = () => {
          this.loadingPromises.delete(assetKey);
          reject(new Error(`Failed to load card asset: ${filename}`));
        };
      });
      this.loadingPromises.set(assetKey, promise);
      return promise;
    }
    getAssetFilename(assetKey) {
      const filenames = {
        frameHuman: "frame-human.png",
        healthIconHuman: "health-icon-human.png",
        costIconHuman: "cost-icon-human.png",
        frameAlien: "frame-alien.png",
        healthIconAlien: "health-icon-alien.png",
        costIconAlien: "cost-icon-alien.png",
        frameEvent: "frame-event.png",
        characterPlaceholder: "character-human-placeholder.png",
        characterAlienPlaceholder: "character-alien-placeholder.png",
        characterEventPlaceholder: "character-event-placeholder.png",
        skipButton: "skip-button.png"
      };
      return filenames[assetKey] || assetKey;
    }
    getAsset(assetKey) {
      return this.assets[assetKey];
    }
    preloadAll() {
      const keys = ["frameHuman", "healthIconHuman", "costIconHuman", "frameAlien", "healthIconAlien", "costIconAlien", "frameEvent", "characterPlaceholder", "characterAlienPlaceholder", "characterEventPlaceholder", "skipButton"];
      keys.forEach((key) => {
        this.loadAsset(key).catch((err) => console.warn(err));
      });
    }
  };

  // src/CardRenderer.ts
  var CardRenderer = class {
    assetLoader;
    offscreenCanvas;
    offscreenCtx;
    SUPERSAMPLING_SCALE = 2;
    // 2x rendering for better quality
    constructor() {
      this.assetLoader = new CardAssetLoader();
      this.assetLoader.preloadAll();
      this.offscreenCanvas = document.createElement("canvas");
      this.offscreenCtx = this.offscreenCanvas.getContext("2d");
      this.offscreenCtx.imageSmoothingEnabled = true;
      this.offscreenCtx.imageSmoothingQuality = "high";
    }
    renderCard(ctx2, card, x, y, width, height, abilityFontSize = 17) {
      const scale = this.SUPERSAMPLING_SCALE;
      this.offscreenCanvas.width = width * scale;
      this.offscreenCanvas.height = height * scale;
      this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
      this.offscreenCtx.setTransform(scale, 0, 0, scale, 0, 0);
      if ("effect" in card) {
        this.renderEventCardToContext(this.offscreenCtx, card, 0, 0, width, height);
      } else {
        this.renderCardToContext(this.offscreenCtx, card, 0, 0, width, height, abilityFontSize);
      }
      ctx2.drawImage(this.offscreenCanvas, x, y, width, height);
    }
    // Render only frame and character image (for dragging preview)
    renderFrameAndCharacter(ctx2, card, x, y, width, height) {
      const scale = this.SUPERSAMPLING_SCALE;
      this.offscreenCanvas.width = width * scale;
      this.offscreenCanvas.height = height * scale;
      this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
      this.offscreenCtx.setTransform(scale, 0, 0, scale, 0, 0);
      const isHuman = card.faction === "human";
      const contentWidth = width * 0.85;
      const contentHeight = height * 0.85;
      const imageAreaPadding = 8;
      const imageHeight = contentHeight * 0.6;
      const baseImageW = contentWidth - imageAreaPadding * 2;
      const baseImageH = imageHeight - 14;
      const imageW = baseImageW * 1.15;
      const imageH = baseImageH * 1.15;
      const imageX = (width - imageW) / 2;
      const imageY = height * 0.05;
      const frameY = isHuman ? imageY : imageY + height * 0.072;
      const frameH = isHuman ? imageH : imageH - height * 0.144;
      this.offscreenCtx.save();
      this.offscreenCtx.beginPath();
      this.offscreenCtx.rect(imageX, imageY, imageW, imageH - height * 0.164);
      this.offscreenCtx.clip();
      this.drawCharacterImage(this.offscreenCtx, imageX, imageY, imageW, imageH, card.faction);
      this.offscreenCtx.restore();
      this.drawFrame(this.offscreenCtx, imageX, frameY, imageW, frameH, card.faction);
      ctx2.drawImage(this.offscreenCanvas, x, y, width, height);
    }
    renderCardToContext(ctx2, card, x, y, width, height, abilityFontSize = 17) {
      const isHuman = card.faction === "human";
      const borderColor = isHuman ? "#2a3a4d" : "#5a4570";
      const bgColor = isHuman ? "#DED9CE" : "#233628";
      const darkBgColor = isHuman ? "#bab29f" : "#141f18";
      const borderWidth = 4;
      const cardPadding = 14;
      const imageAreaPadding = 8;
      const cornerRadius = 12;
      const outlineColor = isHuman ? "#2a3a4d" : "#5a4570";
      ctx2.strokeStyle = outlineColor;
      ctx2.lineWidth = 10;
      this.roundedRect(ctx2, x + 5, y + 5, width - 10, height - 10, cornerRadius);
      ctx2.stroke();
      ctx2.fillStyle = borderColor;
      this.roundedRect(ctx2, x, y, width, height, cornerRadius);
      ctx2.fill();
      ctx2.fillStyle = bgColor;
      this.roundedRect(ctx2, x + borderWidth, y + borderWidth, width - borderWidth * 2, height - borderWidth * 2, cornerRadius - borderWidth);
      ctx2.fill();
      ctx2.fillStyle = darkBgColor;
      const iconBgHeight = 55;
      ctx2.save();
      ctx2.beginPath();
      this.roundedRect(ctx2, x + borderWidth, y + borderWidth, width - borderWidth * 2, iconBgHeight, cornerRadius - borderWidth);
      ctx2.clip();
      ctx2.fillRect(x + borderWidth, y + borderWidth, width - borderWidth * 2, iconBgHeight);
      ctx2.restore();
      ctx2.fillStyle = isHuman ? "#000000" : "#ffffff";
      ctx2.font = "500 15px Quicksand, sans-serif";
      const factionText = card.faction.charAt(0).toUpperCase() + card.faction.slice(1);
      const factionWidth = ctx2.measureText(factionText).width;
      const factionX = x + (width - factionWidth) / 2;
      const factionY = y + borderWidth + iconBgHeight - 5;
      ctx2.fillText(factionText, factionX, factionY);
      const statsBgWidth = (width - borderWidth * 2) * 0.5 - 35;
      const statsBgHeight = 58;
      const statsBgX = x + borderWidth + 5;
      const statsBgY = y + height - borderWidth - cardPadding - statsBgHeight;
      ctx2.fillStyle = darkBgColor;
      this.roundedRect(ctx2, statsBgX, statsBgY, statsBgWidth, statsBgHeight, 6);
      ctx2.fill();
      const contentX = x + borderWidth + cardPadding;
      const contentY = y + borderWidth + cardPadding;
      const contentWidth = width - borderWidth * 2 - cardPadding * 2;
      const contentHeight = height - borderWidth * 2 - cardPadding * 2;
      const imageHeight = contentHeight * 0.6;
      const baseImageW = contentWidth - imageAreaPadding * 2;
      const baseImageH = imageHeight - 14;
      const imageW = baseImageW * 1.15;
      const imageH = baseImageH * 1.15;
      const imageX = contentX + imageAreaPadding - (imageW - baseImageW) / 2;
      const imageY = contentY - height * 0.02;
      const frameY = isHuman ? imageY : imageY + height * 0.072;
      const frameH = isHuman ? imageH : imageH - height * 0.144;
      ctx2.save();
      ctx2.beginPath();
      ctx2.rect(imageX, imageY, imageW, imageH - height * 0.164);
      ctx2.clip();
      this.drawCharacterImage(ctx2, imageX, imageY, imageW, imageH, card.faction);
      ctx2.restore();
      this.drawFrame(ctx2, imageX, frameY, imageW, frameH, card.faction);
      this.drawHealthIcons(ctx2, contentX - width * 0.053, contentY - height * 0.039, card.stats.health, card.faction);
      this.drawAttackIcons(ctx2, contentX + contentWidth + width * 0.053, contentY - height * 0.039, card.stats.attacks, card.faction);
      const textY = imageY + imageHeight - 42;
      const textHeight = contentHeight - imageHeight - 16;
      this.drawCardText(ctx2, card, contentX, textY, contentWidth, textHeight, abilityFontSize);
    }
    renderEventCardToContext(ctx2, card, x, y, width, height) {
      const borderColor = "#8B1A1A";
      const bgColor = "#F0D4A8";
      const darkBgColor = "#E8A04D";
      const borderWidth = 4;
      const cardPadding = 14;
      const imageAreaPadding = 8;
      const cornerRadius = 12;
      ctx2.strokeStyle = "#8B1A1A";
      ctx2.lineWidth = 10;
      this.roundedRect(ctx2, x + 5, y + 5, width - 10, height - 10, cornerRadius);
      ctx2.stroke();
      ctx2.fillStyle = borderColor;
      this.roundedRect(ctx2, x, y, width, height, cornerRadius);
      ctx2.fill();
      ctx2.fillStyle = bgColor;
      this.roundedRect(ctx2, x + borderWidth, y + borderWidth, width - borderWidth * 2, height - borderWidth * 2, cornerRadius - borderWidth);
      ctx2.fill();
      ctx2.fillStyle = darkBgColor;
      const headerBgHeight = 55;
      ctx2.save();
      ctx2.beginPath();
      this.roundedRect(ctx2, x + borderWidth, y + borderWidth, width - borderWidth * 2, headerBgHeight, cornerRadius - borderWidth);
      ctx2.clip();
      ctx2.fillRect(x + borderWidth, y + borderWidth, width - borderWidth * 2, headerBgHeight);
      ctx2.restore();
      ctx2.fillStyle = "#000000";
      ctx2.font = '700 32px "Smooch Sans", sans-serif';
      const nameWidth = ctx2.measureText(card.name).width;
      const nameX = x + (width - nameWidth) / 2;
      const nameY = y + borderWidth + headerBgHeight - 10;
      ctx2.fillText(card.name, nameX, nameY);
      const contentX = x + borderWidth + cardPadding;
      const contentY = y + borderWidth + cardPadding;
      const contentWidth = width - borderWidth * 2 - cardPadding * 2;
      const contentHeight = height - borderWidth * 2 - cardPadding * 2;
      const imageHeight = contentHeight * 0.6;
      const baseImageW = contentWidth - imageAreaPadding * 2;
      const baseImageH = imageHeight - 14;
      const imageW = baseImageW * 1.15;
      const imageH = baseImageH * 1.15;
      const imageX = contentX + imageAreaPadding - (imageW - baseImageW) / 2;
      const imageY = contentY - height * 0.02 + 15;
      const frameY = imageY + 35;
      const frameH = imageH - 75;
      ctx2.save();
      ctx2.beginPath();
      ctx2.rect(imageX, imageY, imageW, imageH - height * 0.164);
      ctx2.clip();
      this.drawEventImage(ctx2, imageX, imageY, imageW, imageH);
      ctx2.restore();
      this.drawEventFrame(ctx2, imageX, frameY, imageW, frameH);
      const textY = imageY + imageHeight - 42;
      const textHeight = contentHeight - imageHeight - 16;
      this.drawEventText(ctx2, card, contentX, textY, contentWidth, textHeight);
    }
    drawCharacterImage(ctx2, x, y, width, height, faction) {
      const assetKey = faction === "human" ? "characterPlaceholder" : "characterAlienPlaceholder";
      const img = this.assetLoader.getAsset(assetKey);
      if (img && img.complete) {
        const imgAspect = img.width / img.height;
        const frameAspect = width / height;
        let charW, charH;
        if (imgAspect > frameAspect) {
          charW = width * 0.8;
          charH = charW / imgAspect;
        } else {
          charH = height * 0.8;
          charW = charH * imgAspect;
        }
        const charX = x + (width - charW) / 2;
        const charY = y + (height - charH) / 2;
        ctx2.drawImage(img, charX, charY, charW, charH);
      } else {
        ctx2.fillStyle = "#cccccc";
        ctx2.fillRect(x, y, width, height);
      }
    }
    drawEventImage(ctx2, x, y, width, height) {
      const img = this.assetLoader.getAsset("characterEventPlaceholder");
      if (img && img.complete) {
        const imgAspect = img.width / img.height;
        const frameAspect = width / height;
        let charW, charH;
        if (imgAspect > frameAspect) {
          charW = width * 0.8;
          charH = charW / imgAspect;
        } else {
          charH = height * 0.8;
          charW = charH * imgAspect;
        }
        const charX = x + (width - charW) / 2;
        const charY = y + (height - charH) / 2;
        ctx2.drawImage(img, charX, charY, charW, charH);
      } else {
        ctx2.fillStyle = "#cccccc";
        ctx2.fillRect(x, y, width, height);
      }
    }
    drawFrame(ctx2, x, y, width, height, faction) {
      const frameKey = faction === "human" ? "frameHuman" : "frameAlien";
      const frame = this.assetLoader.getAsset(frameKey);
      if (frame && frame.complete) {
        ctx2.drawImage(frame, x, y, width, height);
      } else {
        ctx2.strokeStyle = "#b8860b";
        ctx2.lineWidth = 3;
        ctx2.strokeRect(x, y, width, height);
      }
    }
    drawEventFrame(ctx2, x, y, width, height) {
      const frame = this.assetLoader.getAsset("frameEvent");
      if (frame && frame.complete) {
        ctx2.drawImage(frame, x, y, width, height);
      } else {
        ctx2.strokeStyle = "#9b59b6";
        ctx2.lineWidth = 3;
        ctx2.strokeRect(x, y, width, height);
      }
    }
    drawHealthIcons(ctx2, x, y, health, faction) {
      const iconKey = faction === "human" ? "healthIconHuman" : "healthIconAlien";
      const icon = this.assetLoader.getAsset(iconKey);
      const iconSize = 54;
      const gap = -24;
      const count = Math.max(0, Math.min(health, 6));
      for (let i = 0; i < count; i++) {
        const drawX = x + i * (iconSize + gap);
        if (icon && icon.complete) {
          ctx2.drawImage(icon, drawX, y, iconSize, iconSize);
        } else {
          ctx2.fillStyle = "#cc0000";
          ctx2.beginPath();
          ctx2.arc(drawX + iconSize / 2, y + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
          ctx2.fill();
        }
      }
    }
    drawAttackIcons(ctx2, rightX, y, attacks, faction) {
      const iconKey = faction === "human" ? "costIconHuman" : "costIconAlien";
      const icon = this.assetLoader.getAsset(iconKey);
      const iconSize = 54;
      const gap = -24;
      const count = Math.max(0, Math.min(attacks, 6));
      const totalWidth = count * iconSize + Math.max(0, count - 1) * gap;
      const startX = rightX - totalWidth;
      for (let i = 0; i < count; i++) {
        const drawX = startX + i * (iconSize + gap);
        if (icon && icon.complete) {
          ctx2.drawImage(icon, drawX, y, iconSize, iconSize);
        } else {
          ctx2.fillStyle = "#222222";
          ctx2.beginPath();
          ctx2.arc(drawX + iconSize / 2, y + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
          ctx2.fill();
        }
      }
    }
    drawCardText(ctx2, card, x, y, width, height, abilityFontSize = 17) {
      const isHuman = card.faction === "human";
      const offset = isHuman ? 0 : 5;
      const textColor = isHuman ? "#000000" : "#ffffff";
      const typeColor = isHuman ? "#555555" : "#dddddd";
      const abilityColor = isHuman ? "#333333" : "#eeeeee";
      ctx2.fillStyle = textColor;
      ctx2.font = '700 32px "Smooch Sans", sans-serif';
      const nameWidth = ctx2.measureText(card.name).width;
      const nameX = x + (width - nameWidth) / 2;
      ctx2.fillText(card.name, nameX, y + 18 + offset);
      ctx2.strokeStyle = "#999999";
      ctx2.lineWidth = 1;
      ctx2.beginPath();
      ctx2.moveTo(x + 10, y + 28 + offset);
      ctx2.lineTo(x + width - 10, y + 28 + offset);
      ctx2.stroke();
      ctx2.font = "500 15px Quicksand, sans-serif";
      ctx2.fillStyle = typeColor;
      const typeWidth = ctx2.measureText(card.type).width;
      const typeX = x + (width - typeWidth) / 2;
      ctx2.fillText(card.type, typeX, y + 46 + offset);
      ctx2.font = `${abilityFontSize}px Quicksand, sans-serif`;
      ctx2.fillStyle = abilityColor;
      const ability = card.stats.ability || "No ability";
      const wrappedText = this.wrapText(ability, width - 10, ctx2);
      let textY = y + 72 + offset;
      wrappedText.forEach((line) => {
        ctx2.fillText(line, x + 4, textY);
        textY += 22;
      });
      ctx2.font = "16px Quicksand, sans-serif";
      ctx2.fillStyle = isHuman ? "#000000" : "#ffffff";
      const statsLines = [
        `Range: ${card.stats.range}`,
        `Attacks: ${card.stats.attacks}`,
        `Points: ${card.stats.points}`
      ];
      let statsY = y + height + 29;
      statsLines.forEach((line) => {
        ctx2.fillText(line, x + 4, statsY);
        statsY += 14;
      });
    }
    drawEventText(ctx2, card, x, y, width, height) {
      const textColor = "#000000";
      const effectColor = "#333333";
      ctx2.fillStyle = textColor;
      ctx2.font = "500 15px Quicksand, sans-serif";
      const eventText = "Event";
      const eventWidth = ctx2.measureText(eventText).width;
      const eventX = x + (width - eventWidth) / 2;
      ctx2.fillText(eventText, eventX, y + 33);
      ctx2.strokeStyle = "#999999";
      ctx2.lineWidth = 1;
      ctx2.beginPath();
      ctx2.moveTo(x + 10, y + 43);
      ctx2.lineTo(x + width - 10, y + 43);
      ctx2.stroke();
      ctx2.font = "22px Quicksand, sans-serif";
      ctx2.fillStyle = effectColor;
      const wrappedText = this.wrapText(card.effect, width - 10, ctx2);
      let textY = y + 71;
      wrappedText.forEach((line) => {
        if (textY < y + height) {
          ctx2.fillText(line, x + 4, textY);
          textY += 24;
        }
      });
    }
    wrapText(text, maxWidth, ctx2) {
      const words = text.split(" ");
      const lines = [];
      let currentLine = "";
      words.forEach((word) => {
        const testLine = currentLine ? currentLine + " " + word : word;
        const metrics = ctx2.measureText(testLine);
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
    roundedRect(ctx2, x, y, width, height, radius) {
      ctx2.beginPath();
      ctx2.moveTo(x + radius, y);
      ctx2.lineTo(x + width - radius, y);
      ctx2.arcTo(x + width, y, x + width, y + radius, radius);
      ctx2.lineTo(x + width, y + height - radius);
      ctx2.arcTo(x + width, y + height, x + width - radius, y + height, radius);
      ctx2.lineTo(x + radius, y + height);
      ctx2.arcTo(x, y + height, x, y + height - radius, radius);
      ctx2.lineTo(x, y + radius);
      ctx2.arcTo(x, y, x + radius, y, radius);
      ctx2.closePath();
    }
  };

  // src/abilities/abilities.ts
  function hexDistance(a, b) {
    return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(-a.q - a.r - (-b.q - b.r)));
  }
  var abilities = [
    {
      id: "general_johnson_leadership",
      triggers: ["onDerivedStats"],
      description: "All adjacent humans has +1 attack",
      condition: (unit, state) => {
        return unit.card?.name === "General Johnson";
      },
      effect: (unit, state) => {
        const effects = [];
        for (const pc of state.placedCharacters) {
          if (pc.card.faction === "human" && pc !== unit && hexDistance(pc.hex, unit.hex) === 1) {
            effects.push({ stat: "attacks", value: 1, type: "modifier", description: "Johnson leadership", target: pc });
          }
        }
        return effects;
      }
    }
  ];

  // src/abilities/AbilityEngine.ts
  function applyAbilities(state, trigger) {
    for (const unit of state.placedCharacters) {
      for (const ability of abilities) {
        if (ability.triggers.includes(trigger) && ability.condition(unit, state)) {
          const effect = ability.effect(unit, state);
          if (Array.isArray(effect)) {
            for (const eff of effect) {
              const target = eff.target || unit;
              if (!target.modifiers) target.modifiers = [];
              target.modifiers.push(eff);
            }
          } else {
            const target = effect.target || unit;
            if (!target.modifiers) target.modifiers = [];
            target.modifiers.push(effect);
          }
        }
      }
    }
  }
  function computeDerivedStats(state) {
    for (const unit of state.placedCharacters) {
      unit.modifiers = [];
    }
    applyAbilities(state, "onDerivedStats");
    for (const unit of state.placedCharacters) {
      unit.derived = { ...unit.card.stats };
      for (const mod of unit.modifiers) {
        if (mod.stat && typeof mod.value === "number") {
          unit.derived[mod.stat] = (unit.derived[mod.stat] || 0) + mod.value;
        }
      }
    }
  }

  // src/Board.ts
  var Board = class {
    hexes = [];
    hexSize = 100;
    canvas;
    ctx;
    gameState;
    textureLoader;
    cardRenderer;
    offscreenCanvas;
    offscreenCtx;
    SUPERSAMPLING_SCALE = 2;
    // 2x rendering for better quality
    backgroundImage;
    constructor(canvas2, gameState) {
      this.canvas = canvas2;
      this.ctx = canvas2.getContext("2d");
      this.gameState = gameState;
      this.textureLoader = new TextureLoader();
      this.cardRenderer = new CardRenderer();
      this.offscreenCanvas = document.createElement("canvas");
      this.offscreenCtx = this.offscreenCanvas.getContext("2d");
      this.offscreenCtx.imageSmoothingEnabled = true;
      this.offscreenCtx.imageSmoothingQuality = "high";
      this.backgroundImage = new Image();
      this.backgroundImage.src = "/background-hex-4.png";
      this.generateHexes();
      this.gameState.board = this.hexes;
      this.preloadTextures();
    }
    preloadTextures() {
      const terrains = ["grass", "water", "forest", "toxic", "mountain"];
      terrains.forEach((terrain) => {
        this.textureLoader.loadTexture(terrain).catch((err) => console.warn(err));
      });
    }
    generateHexes() {
      const maxRadius = 3;
      for (let q = -maxRadius; q <= maxRadius; q++) {
        for (let r = -maxRadius; r <= maxRadius; r++) {
          if (Math.abs(q + r) <= maxRadius) {
            const distance = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
            let value = 0;
            if (distance <= 2) {
              value = Math.floor(Math.random() * 5) + 1;
            }
            this.hexes.push({ q, r, value, isMountain: false, terrain: "grass" });
          }
        }
      }
      const pickRandom = (pool, count) => {
        const selected = [];
        for (let i = 0; i < count && pool.length > 0; i++) {
          const idx = Math.floor(Math.random() * pool.length);
          selected.push(pool.splice(idx, 1)[0]);
        }
        return selected;
      };
      const centralHexes = this.hexes.filter((h) => h.value > 0);
      pickRandom(centralHexes, 3).forEach((hex) => {
        hex.isMountain = true;
        hex.value = 0;
        hex.terrain = "mountain";
      });
      const available = this.hexes.filter((h) => !h.isMountain);
      pickRandom(available, 2).forEach((hex) => {
        hex.terrain = "water";
      });
      pickRandom(available, 2).forEach((hex) => {
        hex.terrain = "forest";
      });
      pickRandom(available, 2).forEach((hex) => {
        hex.terrain = "toxic";
      });
    }
    hexToPixel(q, r) {
      const x = this.hexSize * (3 / 2 * q);
      const y = this.hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
      const boardWidth = this.canvas.width * 0.6;
      const boardHeight = this.canvas.height;
      return { x: x + boardWidth / 2, y: y + boardHeight / 2 };
    }
    render() {
      computeDerivedStats(this.gameState);
      const boardWidth = this.canvas.width * 0.6;
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(0, 0, boardWidth, this.canvas.height);
      this.ctx.clip();
      if (this.backgroundImage.complete) {
        this.ctx.drawImage(this.backgroundImage, 0, 0, boardWidth, this.canvas.height);
      }
      const dividerX = boardWidth;
      const gradientWidth = 100;
      const gradient = this.ctx.createLinearGradient(dividerX - gradientWidth, 0, dividerX + gradientWidth, 0);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(0.4, "rgba(50, 45, 60, 0.08)");
      gradient.addColorStop(0.5, "rgba(50, 45, 60, 0.12)");
      gradient.addColorStop(0.6, "rgba(50, 45, 60, 0.08)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(dividerX - gradientWidth, 0, gradientWidth * 2, this.canvas.height);
      if (this.gameState.hoverHex) {
        const infoBoxWidth = 470;
        const infoBoxHeight = 180;
        const infoBoxX = boardWidth - infoBoxWidth - 10;
        const infoBoxY = 10;
        const cornerRadius = 8;
        this.ctx.fillStyle = "gray";
        this.ctx.beginPath();
        this.ctx.roundRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, cornerRadius);
        this.ctx.fill();
        this.ctx.strokeStyle = "#f5f2f8";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, cornerRadius);
        this.ctx.stroke();
        this.ctx.fillStyle = "white";
        this.ctx.font = "16px Quicksand, sans-serif";
        const hoveredHex = this.gameState.board.find((h) => h.q === this.gameState.hoverHex.q && h.r === this.gameState.hoverHex.r);
        if (hoveredHex) {
          const terrainNames = {
            grass: "Grass",
            water: "Water",
            forest: "Forest",
            toxic: "Toxic Swamp",
            mountain: "Mountain"
          };
          const terrainExplanations = {
            grass: "Neutral terrain without effects",
            water: "Water terrain",
            forest: "Forest terrain",
            toxic: "Toxic swamp terrain",
            mountain: "Impassable terrain"
          };
          let yPos = infoBoxY + 25;
          this.ctx.font = '700 18px "Smooch Sans", sans-serif';
          this.ctx.fillText(`Environment: ${terrainNames[hoveredHex.terrain]}`, infoBoxX + 10, yPos);
          yPos += 20;
          this.ctx.font = "16px Quicksand, sans-serif";
          this.ctx.fillText(terrainExplanations[hoveredHex.terrain], infoBoxX + 10, yPos);
          yPos += 25;
          const placedChar = this.gameState.placedCharacters.find((pc) => pc.hex.q === hoveredHex.q && pc.hex.r === hoveredHex.r);
          if (placedChar) {
            this.ctx.font = '700 22px "Smooch Sans", sans-serif';
            this.ctx.fillText(placedChar.card.name, infoBoxX + 10, yPos);
            yPos += 20;
            this.ctx.font = '700 18px "Smooch Sans", sans-serif';
            this.ctx.fillText(`Type: ${placedChar.card.type}`, infoBoxX + 10, yPos);
            yPos += 20;
            this.ctx.font = "16px Quicksand, sans-serif";
            const derived = placedChar.derived || placedChar.card.stats;
            let attacksBase = placedChar.card.stats.attacks;
            let attacksBonus = (derived.attacks ?? attacksBase) - attacksBase;
            let attacksText = attacksBonus > 0 ? `Attacks: ${derived.attacks} (${attacksBase}+${attacksBonus})` : `Attacks: ${derived.attacks ?? attacksBase}`;
            this.ctx.fillText(`Range: ${derived.range ?? placedChar.card.stats.range}`, infoBoxX + 10, yPos);
            yPos += 18;
            this.ctx.fillText(attacksText, infoBoxX + 10, yPos);
            yPos += 18;
            this.ctx.fillText(`Health: ${derived.health ?? placedChar.card.stats.health}`, infoBoxX + 10, yPos);
            yPos += 20;
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
      this.ctx.strokeStyle = "white";
      this.ctx.lineWidth = 2;
      this.ctx.font = "30px Quicksand, sans-serif";
      for (const hex of this.hexes) {
        const { x, y } = this.hexToPixel(hex.q, hex.r);
        this.drawTerrainHex(x, y, hex);
        if (this.gameState.hoverHex && this.gameState.hoverHex.q === hex.q && this.gameState.hoverHex.r === hex.r) {
          this.ctx.strokeStyle = "yellow";
          this.ctx.lineWidth = 3;
          this.drawHexOutline(x, y);
          this.ctx.strokeStyle = "white";
          this.ctx.lineWidth = 2;
        }
        const placed = this.gameState.placedCharacters.find((pc) => pc.hex.q === hex.q && pc.hex.r === hex.r);
        if (placed) {
          this.ctx.strokeStyle = placed.card.faction === "human" ? "blue" : "red";
          this.ctx.lineWidth = 3;
          this.drawHex(x, y);
          this.ctx.strokeStyle = "white";
          this.ctx.lineWidth = 2;
          if (this.gameState.phase === "combat" && this.gameState.combatOrder[this.gameState.currentCombatIndex] === placed) {
            this.ctx.strokeStyle = "yellow";
            this.ctx.lineWidth = 4;
            this.drawHexOutline(x, y);
            this.ctx.strokeStyle = "white";
            this.ctx.lineWidth = 2;
          }
          if (this.gameState.selectedAttacker === placed) {
            const color = placed.card.faction === "human" ? "blue" : "red";
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 4;
            this.drawHexOutline(x, y);
            this.ctx.strokeStyle = "white";
            this.ctx.lineWidth = 2;
          }
        } else if (this.gameState.selectedCard && this.gameState.hoverHex && this.gameState.hoverHex.q === hex.q && this.gameState.hoverHex.r === hex.r) {
          const color = this.gameState.selectedCard.faction === "human" ? "blue" : "red";
          const canPlace = this.canPlaceAt(hex);
          this.ctx.strokeStyle = canPlace ? color : "orange";
          this.ctx.lineWidth = 4;
          this.drawHex(x, y);
          this.ctx.strokeStyle = "white";
          this.ctx.lineWidth = 2;
        }
        if (!hex.isMountain && hex.value > 0) {
          this.ctx.shadowColor = "rgba(0, 0, 0, 1.0)";
          this.ctx.shadowBlur = 20;
          this.ctx.shadowOffsetX = 4;
          this.ctx.shadowOffsetY = 4;
          this.ctx.strokeStyle = "black";
          this.ctx.lineWidth = 6;
          this.ctx.strokeText(hex.value.toString(), x - 5, y + 5);
          this.ctx.fillStyle = "white";
          this.ctx.fillText(hex.value.toString(), x - 5, y + 5);
          this.ctx.shadowColor = "transparent";
          this.ctx.shadowBlur = 0;
          this.ctx.shadowOffsetX = 0;
          this.ctx.shadowOffsetY = 0;
        }
      }
      if (this.gameState.hoverHex && !this.gameState.selectedCard) {
        const hoveredPlaced = this.gameState.placedCharacters.find(
          (pc) => pc.hex.q === this.gameState.hoverHex.q && pc.hex.r === this.gameState.hoverHex.r
        );
        if (hoveredPlaced) {
          const previewWidth = 250;
          const previewHeight = 400;
          const mouseX = this.gameState.mouseX;
          const mouseY = this.gameState.mouseY;
          const boardWidth2 = this.canvas.width * 0.6;
          const boardCenterX = boardWidth2 / 2;
          let previewX;
          let previewY = mouseY - previewHeight / 2;
          if (mouseX < boardCenterX) {
            previewX = mouseX + 30;
          } else {
            previewX = mouseX - previewWidth - 30;
          }
          previewX = Math.max(10, Math.min(previewX, boardWidth2 - previewWidth - 10));
          previewY = Math.max(10, Math.min(previewY, this.canvas.height - previewHeight - 10));
          this.cardRenderer.renderCard(this.ctx, hoveredPlaced.card, previewX, previewY, previewWidth, previewHeight, 13);
        }
      }
      this.ctx.restore();
    }
    drawHexOutline(x, y) {
      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i;
        const hx = x + this.hexSize * Math.cos(angle);
        const hy = y + this.hexSize * Math.sin(angle);
        if (i === 0) this.ctx.moveTo(hx, hy);
        else this.ctx.lineTo(hx, hy);
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }
    drawTerrainHex(x, y, hex) {
      const placed = this.gameState.placedCharacters.find((pc) => pc.hex.q === hex.q && pc.hex.r === hex.r);
      const texture = this.textureLoader.getTexture(hex.terrain);
      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i;
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
        const colorMap = {
          grass: "#7ba428",
          water: "#2a5a8a",
          forest: "#2d5a1a",
          toxic: "#7a3a7a",
          mountain: "#666666"
        };
        this.ctx.fillStyle = colorMap[hex.terrain];
        this.ctx.fill();
      }
      if (placed) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(x - this.hexSize, y);
        const angle240 = 4 * Math.PI / 3;
        this.ctx.lineTo(x + this.hexSize * Math.cos(angle240), y + this.hexSize * Math.sin(angle240));
        const angle300 = 5 * Math.PI / 3;
        this.ctx.lineTo(x + this.hexSize * Math.cos(angle300), y + this.hexSize * Math.sin(angle300));
        this.ctx.lineTo(x + this.hexSize, y);
        this.ctx.closePath();
        this.ctx.clip();
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        this.ctx.fill();
        const charImage = this.cardRenderer["assetLoader"].getAsset(
          placed.card.faction === "human" ? "characterPlaceholder" : "characterAlienPlaceholder"
        );
        console.log("Drawing character:", {
          hasImage: !!charImage,
          complete: charImage?.complete,
          faction: placed.card.faction,
          x,
          y
        });
        if (charImage && charImage.complete) {
          const aspectRatio = charImage.width / charImage.height;
          const imageHeight = this.hexSize * 2;
          const imageWidth = imageHeight * aspectRatio;
          const imageX = x - imageWidth / 2;
          const imageY = y + this.hexSize * 0.1 - imageHeight / 2;
          this.ctx.drawImage(charImage, imageX, imageY, imageWidth, imageHeight);
        }
        this.ctx.restore();
      }
      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i;
        const hx = x + this.hexSize * Math.cos(angle);
        const hy = y + this.hexSize * Math.sin(angle);
        if (i === 0) this.ctx.moveTo(hx, hy);
        else this.ctx.lineTo(hx, hy);
      }
      this.ctx.closePath();
      this.ctx.strokeStyle = "white";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
    canPlaceAt(hex) {
      if (this.gameState.placedCharacters.length === 0) return true;
      return this.gameState.placedCharacters.some(
        (pc) => Math.abs(pc.hex.q - hex.q) <= 1 && Math.abs(pc.hex.r - hex.r) <= 1 && Math.abs(pc.hex.q + pc.hex.r - (hex.q + hex.r)) <= 1
      );
    }
    drawHex(x, y) {
      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i;
        const hx = x + this.hexSize * Math.cos(angle);
        const hy = y + this.hexSize * Math.sin(angle);
        if (i === 0) this.ctx.moveTo(hx, hy);
        else this.ctx.lineTo(hx, hy);
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }
    renderSplitHex(x, y, hex, card) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - this.hexSize);
      const angle330 = -Math.PI / 6;
      this.ctx.lineTo(x + this.hexSize * Math.cos(angle330), y + this.hexSize * Math.sin(angle330));
      this.ctx.lineTo(x + this.hexSize, y);
      this.ctx.lineTo(x - this.hexSize, y);
      const angle210 = -5 * Math.PI / 6;
      this.ctx.lineTo(x + this.hexSize * Math.cos(angle210), y + this.hexSize * Math.sin(angle210));
      this.ctx.closePath();
      this.ctx.clip();
      const charImage = this.cardRenderer["assetLoader"].getAsset(
        card.faction === "human" ? "characterPlaceholder" : "characterAlienPlaceholder"
      );
      if (charImage && charImage.complete) {
        const imageSize = this.hexSize * 2;
        const imageX = x - imageSize / 2;
        const imageY = y - imageSize;
        this.ctx.drawImage(charImage, imageX, imageY, imageSize, imageSize);
      }
      this.ctx.restore();
    }
  };

  // src/GameUI.ts
  var GameUI = class {
    canvas;
    ctx;
    cardRenderer;
    backgroundImage;
    cardbackHuman;
    cardbackAlien;
    cardbackEvent;
    constructor(canvas2) {
      this.canvas = canvas2;
      this.ctx = canvas2.getContext("2d");
      this.cardRenderer = new CardRenderer();
      this.backgroundImage = new Image();
      this.backgroundImage.src = "/background-cards-2.png";
      this.cardbackHuman = new Image();
      this.cardbackHuman.src = "/cardback-human.png";
      this.cardbackAlien = new Image();
      this.cardbackAlien.src = "/cardback-alien.png";
      this.cardbackEvent = new Image();
      this.cardbackEvent.src = "/cardback-event.png";
    }
    render(gameState, game2) {
      const boardWidth = this.canvas.width * 0.6;
      const uiX = boardWidth;
      const uiWidth = this.canvas.width - boardWidth;
      if (this.backgroundImage.complete) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(uiX, 0, uiWidth, this.canvas.height);
        this.ctx.clip();
        this.ctx.drawImage(this.backgroundImage, uiX, 0, uiWidth, this.canvas.height);
        const gradientWidth = 120;
        const fadeGradient = this.ctx.createLinearGradient(uiX, 0, uiX + gradientWidth, 0);
        fadeGradient.addColorStop(0, "rgba(74, 84, 98, 0.6)");
        fadeGradient.addColorStop(0.5, "rgba(74, 84, 98, 0.2)");
        fadeGradient.addColorStop(1, "rgba(74, 84, 98, 0)");
        this.ctx.fillStyle = fadeGradient;
        this.ctx.fillRect(uiX, 0, gradientWidth, this.canvas.height);
        this.ctx.restore();
      } else {
        this.ctx.fillStyle = "#4a4a4a";
        this.ctx.fillRect(uiX, 0, uiWidth, this.canvas.height);
      }
      this.ctx.fillStyle = "white";
      this.ctx.font = "20px Quicksand, sans-serif";
      this.ctx.fillText(`Phase: ${gameState.phase.toUpperCase()}`, 50, 50);
      this.ctx.fillText(`Player: ${gameState.currentPlayer}`, 50, 80);
      if (gameState.phase === "combat") {
        this.ctx.fillText(`Combat Turn: ${gameState.currentCombatIndex + 1}/${gameState.combatOrder.length}`, 50, 110);
        if (gameState.selectedAttacker) {
          this.ctx.fillText("Select target to attack", 50, 140);
        } else {
          this.ctx.fillText("Select your unit to attack", 50, 140);
        }
      }
      const cardbackWidth = 304 * 1.02;
      const cardbackHeight = 487 * 1.02;
      const cardbackSpacing = 10;
      const cardbackStartY = 50;
      const totalCardbackWidth = cardbackWidth * 3 + cardbackSpacing * 2;
      const cardbackStartX = uiX + (uiWidth - totalCardbackWidth) / 2;
      let activeCardback = null;
      if (gameState.drawnEvent) {
        activeCardback = "event";
      } else if (gameState.currentPlayer === "human") {
        activeCardback = "human";
      } else if (gameState.currentPlayer === "alien") {
        activeCardback = "alien";
      }
      const enlargeScale = 1.15;
      if (this.cardbackHuman.complete) {
        const isActive = activeCardback === "human";
        const scale = isActive ? enlargeScale : 1;
        const w = cardbackWidth * scale;
        const h = cardbackHeight * scale;
        const x = cardbackStartX - (w - cardbackWidth) / 2;
        const y = cardbackStartY - (h - cardbackHeight) / 2;
        if (!isActive) {
          this.ctx.filter = "brightness(0.6) saturate(0.3)";
        }
        if (gameState.hoverPile === "human") {
          if (isActive) {
            this.ctx.shadowColor = "rgba(255, 50, 50, 1.0)";
          } else {
            this.ctx.shadowColor = "rgba(128, 128, 128, 1.0)";
          }
          this.ctx.shadowBlur = 30;
        } else {
          this.ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
          this.ctx.shadowBlur = 20;
        }
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.drawImage(this.cardbackHuman, x, y, w, h);
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        this.ctx.filter = "none";
        this.ctx.fillStyle = "white";
        this.ctx.font = '700 24px "Smooch Sans", sans-serif';
        this.ctx.shadowColor = "rgba(0, 0, 0, 1.0)";
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 4;
        this.ctx.shadowOffsetY = 4;
        const humanText = `${gameState.humanDeck.length} cards`;
        const humanTextWidth = this.ctx.measureText(humanText).width;
        const humanTextX = cardbackStartX + (cardbackWidth - humanTextWidth) / 2;
        const humanTextY = cardbackStartY + cardbackHeight - 25;
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 6;
        this.ctx.strokeText(humanText, humanTextX, humanTextY);
        this.ctx.fillText(humanText, humanTextX, humanTextY);
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
      }
      if (this.cardbackAlien.complete) {
        const isActive = activeCardback === "alien";
        const scale = isActive ? enlargeScale : 1;
        const w = cardbackWidth * scale;
        const h = cardbackHeight * scale;
        const baseX = cardbackStartX + cardbackWidth + cardbackSpacing;
        const x = baseX - (w - cardbackWidth) / 2;
        const y = cardbackStartY - (h - cardbackHeight) / 2;
        if (!isActive) {
          this.ctx.filter = "brightness(0.6) saturate(0.3)";
        }
        if (gameState.hoverPile === "alien") {
          if (isActive) {
            this.ctx.shadowColor = "rgba(255, 50, 50, 1.0)";
          } else {
            this.ctx.shadowColor = "rgba(128, 128, 128, 1.0)";
          }
          this.ctx.shadowBlur = 30;
        } else {
          this.ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
          this.ctx.shadowBlur = 20;
        }
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.drawImage(this.cardbackAlien, x, y, w, h);
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        this.ctx.filter = "none";
        this.ctx.fillStyle = "white";
        this.ctx.font = '700 24px "Smooch Sans", sans-serif';
        this.ctx.shadowColor = "rgba(0, 0, 0, 1.0)";
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 4;
        this.ctx.shadowOffsetY = 4;
        const alienText = `${gameState.alienDeck.length} cards`;
        const alienTextWidth = this.ctx.measureText(alienText).width;
        const alienTextX = baseX + (cardbackWidth - alienTextWidth) / 2;
        const alienTextY = cardbackStartY + cardbackHeight - 25;
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 6;
        this.ctx.strokeText(alienText, alienTextX, alienTextY);
        this.ctx.fillText(alienText, alienTextX, alienTextY);
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
      }
      if (this.cardbackEvent.complete) {
        const isActive = activeCardback === "event";
        const scale = isActive ? enlargeScale : 1;
        const w = cardbackWidth * scale;
        const h = cardbackHeight * scale;
        const baseX = cardbackStartX + (cardbackWidth + cardbackSpacing) * 2;
        const x = baseX - (w - cardbackWidth) / 2;
        const y = cardbackStartY - (h - cardbackHeight) / 2;
        if (!isActive) {
          this.ctx.filter = "brightness(0.6) saturate(0.3)";
        }
        if (gameState.hoverPile === "event") {
          if (isActive) {
            this.ctx.shadowColor = "rgba(255, 50, 50, 1.0)";
          } else {
            this.ctx.shadowColor = "rgba(128, 128, 128, 1.0)";
          }
          this.ctx.shadowBlur = 30;
        } else {
          this.ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
          this.ctx.shadowBlur = 20;
        }
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.drawImage(this.cardbackEvent, x, y, w, h);
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        this.ctx.filter = "none";
        this.ctx.fillStyle = "white";
        this.ctx.font = '700 24px "Smooch Sans", sans-serif';
        this.ctx.shadowColor = "rgba(0, 0, 0, 1.0)";
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 4;
        this.ctx.shadowOffsetY = 4;
        const eventText = `${gameState.eventDeck.length} cards`;
        const eventTextWidth = this.ctx.measureText(eventText).width;
        const eventTextX = baseX + (cardbackWidth - eventTextWidth) / 2;
        const eventTextY = cardbackStartY + cardbackHeight - 25;
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 6;
        this.ctx.strokeText(eventText, eventTextX, eventTextY);
        this.ctx.fillText(eventText, eventTextX, eventTextY);
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
      }
      const deckX = uiX + 10;
      const deckWidth = uiWidth - 20;
      const deckStartY = cardbackStartY + cardbackHeight + 20;
      if (gameState.drawnEvent) {
        const eventCardWidth = 274;
        const eventCardHeight = 438;
        const eventCardX = deckX + (deckWidth - eventCardWidth) / 2;
        const eventCardY = deckStartY;
        const isHovered = gameState.hoverDrawnEvent;
        this.ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
        this.ctx.shadowBlur = 25;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        const targetScale = isHovered ? 1.2 : 1;
        const animationDuration = 300;
        if (gameState.hoverStartTime === void 0 && isHovered) {
          gameState.hoverStartTime = Date.now();
          gameState.hoverCardScale = 1;
        } else if (!isHovered) {
          gameState.hoverStartTime = void 0;
          gameState.hoverCardScale = 1;
        }
        if (gameState.hoverStartTime !== void 0) {
          const elapsed = Date.now() - gameState.hoverStartTime;
          const progress = Math.min(elapsed / animationDuration, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          gameState.hoverCardScale = 1 + (targetScale - 1) * easedProgress;
          if (progress < 1) {
            requestAnimationFrame(() => this.render(gameState));
          }
        }
        const currentScale = gameState.hoverCardScale ?? 1;
        const scaledWidth = eventCardWidth * currentScale;
        const scaledHeight = eventCardHeight * currentScale;
        const scaledX = eventCardX - (scaledWidth - eventCardWidth) / 2;
        const scaledY = eventCardY - (scaledHeight - eventCardHeight) / 2;
        this.cardRenderer.renderCard(this.ctx, gameState.drawnEvent, scaledX, scaledY, scaledWidth, scaledHeight);
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        const skipY = eventCardY + eventCardHeight + 20;
        const skipButton = this.cardRenderer["assetLoader"].getAsset("skipButton");
        if (skipButton && skipButton.complete) {
          const originalAspect = skipButton.width / skipButton.height;
          const skipHeight = 180;
          const skipWidth = skipHeight * originalAspect;
          const skipX = deckX + (deckWidth - skipWidth) / 2;
          const hoverScale = gameState.hoverSkip ? 1.05 : 1;
          const scaledSkipWidth = skipWidth * hoverScale;
          const scaledSkipHeight = skipHeight * hoverScale;
          const scaledSkipX = skipX - (scaledSkipWidth - skipWidth) / 2;
          const scaledSkipY = skipY - (scaledSkipHeight - skipHeight) / 2;
          this.ctx.shadowColor = "rgba(0, 0, 0, 1.0)";
          this.ctx.shadowBlur = 40;
          this.ctx.shadowOffsetX = 8;
          this.ctx.shadowOffsetY = 8;
          this.ctx.drawImage(skipButton, scaledSkipX, scaledSkipY, scaledSkipWidth, scaledSkipHeight);
          this.ctx.shadowColor = "transparent";
          this.ctx.shadowBlur = 0;
          const baseFontSize = 20;
          const scaledFontSize = baseFontSize * hoverScale;
          this.ctx.font = `bold ${scaledFontSize}px Quicksand, sans-serif`;
          this.ctx.shadowColor = "rgba(0, 0, 0, 1.0)";
          this.ctx.shadowBlur = 20;
          this.ctx.shadowOffsetX = 4;
          this.ctx.shadowOffsetY = 4;
          this.ctx.strokeStyle = "black";
          this.ctx.lineWidth = 6;
          const skips = gameState.currentPlayer === "human" ? gameState.humanEventSkips : gameState.alienEventSkips;
          const skipText = `Skip: (${skips})`;
          const skipTextWidth = this.ctx.measureText(skipText).width;
          const textX = skipX + (skipWidth - skipTextWidth) / 2;
          const textY = skipY + 89;
          this.ctx.strokeText(skipText, textX, textY);
          this.ctx.fillStyle = "white";
          this.ctx.fillText(skipText, textX, textY);
          this.ctx.shadowColor = "transparent";
          this.ctx.shadowBlur = 0;
          this.ctx.shadowOffsetX = 0;
          this.ctx.shadowOffsetY = 0;
        } else {
          const skipColor = gameState.hoverSkip ? "darkgray" : "gray";
          this.ctx.fillStyle = skipColor;
          const skipWidth = 70;
          this.ctx.fillRect(deckX, skipY, skipWidth, 30);
          this.ctx.fillStyle = "white";
          this.ctx.font = "14px Quicksand, sans-serif";
          const skips = gameState.currentPlayer === "human" ? gameState.humanEventSkips : gameState.alienEventSkips;
          this.ctx.fillText("Skip", deckX + 10, skipY + 18);
          this.ctx.fillText(`(${skips})`, deckX + skipWidth + 5, skipY + 18);
        }
      }
      if (gameState.drawnCards.length > 0) {
        const cardsPerRow = 3;
        const cardSpacing = 21;
        const cardWidth = 274;
        const cardHeight = 438;
        const totalCardsWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * cardSpacing;
        const cardStartX = uiX + (uiWidth - totalCardsWidth) / 2;
        const cardStartY = deckStartY + 170;
        for (let i = 0; i < gameState.drawnCards.length; i++) {
          if (gameState.hoverCardIndex === i) continue;
          const card = gameState.drawnCards[i];
          const row = Math.floor(i / cardsPerRow);
          const col = i % cardsPerRow;
          const cardX = cardStartX + col * (cardWidth + cardSpacing);
          const cardY = cardStartY + row * (cardHeight + cardSpacing);
          this.ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
          this.ctx.shadowBlur = 25;
          this.ctx.shadowOffsetX = 0;
          this.ctx.shadowOffsetY = 0;
          this.cardRenderer.renderCard(this.ctx, card, cardX, cardY, cardWidth, cardHeight);
          this.ctx.shadowColor = "transparent";
          this.ctx.shadowBlur = 0;
        }
        if (gameState.hoverCardIndex !== void 0) {
          const i = gameState.hoverCardIndex;
          const card = gameState.drawnCards[i];
          const row = Math.floor(i / cardsPerRow);
          const col = i % cardsPerRow;
          const baseCardX = cardStartX + col * (cardWidth + cardSpacing);
          const baseCardY = cardStartY + row * (cardHeight + cardSpacing);
          const targetScale = 1.2;
          const animationDuration = 300;
          if (gameState.hoverStartTime !== void 0) {
            const elapsed = Date.now() - gameState.hoverStartTime;
            const progress = Math.min(elapsed / animationDuration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            gameState.hoverCardScale = 1 + (targetScale - 1) * easedProgress;
            if (progress < 1) {
              requestAnimationFrame(() => this.render(gameState));
            }
          }
          const currentScale = gameState.hoverCardScale ?? 1;
          const hoverWidth = cardWidth * currentScale;
          const hoverHeight = cardHeight * currentScale;
          const hoverX = baseCardX - (hoverWidth - cardWidth) / 2;
          const hoverY = baseCardY - (hoverHeight - cardHeight) / 2;
          this.cardRenderer.renderCard(this.ctx, card, hoverX, hoverY, hoverWidth, hoverHeight);
        }
      }
      if (gameState.selectedCard !== void 0) {
        const boardWidth2 = this.canvas.width * 0.6;
        const isOverBoard = gameState.mouseX < boardWidth2;
        const targetScale = isOverBoard ? 0.5 : 1;
        if (gameState.previewTargetScale !== targetScale) {
          gameState.previewTargetScale = targetScale;
          gameState.previewScaleStartTime = Date.now();
          if (gameState.previewScale === void 0) {
            gameState.previewScale = targetScale;
          }
        }
        const animationDuration = 300;
        if (gameState.previewScaleStartTime !== void 0 && gameState.previewScale !== void 0) {
          const elapsed = Date.now() - gameState.previewScaleStartTime;
          const progress = Math.min(elapsed / animationDuration, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          const startScale = gameState.previewScale;
          gameState.previewScale = startScale + (targetScale - startScale) * easedProgress;
          if (progress < 1) {
            requestAnimationFrame(() => this.render(gameState));
          }
        }
        const currentScale = gameState.previewScale ?? 1;
        const previewWidth = 200 * currentScale;
        const previewHeight = 320 * currentScale;
        const previewX = gameState.mouseX - previewWidth / 2;
        const previewY = gameState.mouseY - previewHeight * 0.3;
        this.cardRenderer.renderFrameAndCharacter(this.ctx, gameState.selectedCard, previewX, previewY, previewWidth, previewHeight);
      }
      if (gameState.phase === "placement" && (gameState.humanDeck.length > 0 || gameState.alienDeck.length > 0)) {
        const autoButtonWidth = 200;
        const autoButtonHeight = 50;
        const autoButtonX = boardWidth - autoButtonWidth - 20;
        const autoButtonY = 20;
        this.ctx.fillStyle = "#4a4a4a";
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 2;
        this.roundedRect(this.ctx, autoButtonX, autoButtonY, autoButtonWidth, autoButtonHeight, 8);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "bold 18px Quicksand, sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("AUTOPLACE ALL", autoButtonX + autoButtonWidth / 2, autoButtonY + autoButtonHeight / 2);
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "alphabetic";
      }
      if (game2 && game2.allCardsPlaced && game2.allCardsPlaced() && gameState.phase === "placement") {
        console.log("Showing battle button");
        const buttonWidth = 300;
        const buttonHeight = 80;
        const buttonX = uiX + (uiWidth - buttonWidth) / 2;
        const buttonY = this.canvas.height / 2 - buttonHeight / 2;
        this.ctx.fillStyle = gameState.hoverBattleButton ? "#6B0A0A" : "#8B1A1A";
        this.ctx.strokeStyle = "#F0D4A8";
        this.ctx.lineWidth = 4;
        this.roundedRect(this.ctx, buttonX, buttonY, buttonWidth, buttonHeight, 10);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = "#F0D4A8";
        this.ctx.font = 'bold 36px "Smooch Sans", sans-serif';
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.shadowColor = "rgba(0, 0, 0, 1.0)";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 3;
        this.ctx.shadowOffsetY = 3;
        this.ctx.fillText("BATTLE!", buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "alphabetic";
      }
      if (gameState.phase === "battleLog") {
        const boardWidth2 = this.canvas.width * 0.6;
        const modalWidth = 600 * 2.5;
        const modalHeight = 400 * 2.2 * 1.1;
        const modalX = (boardWidth2 - modalWidth) / 2;
        const modalY = (this.canvas.height - modalHeight) / 2;
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillRect(0, 0, boardWidth2, this.canvas.height);
        this.ctx.fillStyle = "#2a1810";
        this.ctx.strokeStyle = "#F0D4A8";
        this.ctx.lineWidth = 6;
        this.roundedRect(this.ctx, modalX, modalY, modalWidth, modalHeight, 20);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = "#F0D4A8";
        this.ctx.font = 'bold 48px "Smooch Sans", sans-serif';
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.shadowColor = "rgba(0, 0, 0, 1.0)";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 3;
        this.ctx.shadowOffsetY = 3;
        this.ctx.fillText("BATTLE LOG", modalX + modalWidth / 2, modalY + 70);
        this.ctx.font = "19px Quicksand, sans-serif";
        this.ctx.fillStyle = "#F0D4A8";
        this.ctx.textAlign = "left";
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        let y = modalY + 120;
        const lineHeight = 32;
        const colWidth = (modalWidth - 60) / 2;
        let col = 0;
        let linesDrawn = 0;
        if (gameState.battleLog) {
          for (const line of gameState.battleLog) {
            this.ctx.fillText(line, modalX + 30 + col * colWidth, y);
            y += lineHeight;
            linesDrawn++;
            if (y > modalY + modalHeight - 40) {
              col++;
              y = modalY + 120;
            }
          }
        }
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "alphabetic";
        const continueBtnWidth = 260;
        const continueBtnHeight = 60;
        const continueBtnX = modalX + (modalWidth - continueBtnWidth) / 2;
        const continueBtnY = modalY + modalHeight - continueBtnHeight - 20;
        this.ctx.fillStyle = gameState.hoverContinueButton ? "#3A7A2A" : "#4CAF50";
        this.roundedRect(this.ctx, continueBtnX, continueBtnY, continueBtnWidth, continueBtnHeight, 12);
        this.ctx.fill();
        this.ctx.font = 'bold 32px "Smooch Sans", sans-serif';
        this.ctx.fillStyle = "#F0D4A8";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
        this.ctx.shadowBlur = 6;
        this.ctx.fillText("Continue", continueBtnX + continueBtnWidth / 2, continueBtnY + continueBtnHeight / 2);
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "alphabetic";
      }
      if (gameState.phase === "scoring") {
        const boardWidth2 = this.canvas.width * 0.6;
        const modalWidth = 600 * 2.5;
        const modalHeight = 350 * 2.2;
        const modalX = (boardWidth2 - modalWidth) / 2;
        const modalY = (this.canvas.height - modalHeight) / 2;
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillRect(0, 0, boardWidth2, this.canvas.height);
        this.ctx.fillStyle = "#2a1810";
        this.ctx.strokeStyle = "#F0D4A8";
        this.ctx.lineWidth = 6;
        this.roundedRect(this.ctx, modalX, modalY, modalWidth, modalHeight, 20);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = "#F0D4A8";
        this.ctx.font = 'bold 48px "Smooch Sans", sans-serif';
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.shadowColor = "rgba(0, 0, 0, 1.0)";
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 3;
        this.ctx.shadowOffsetY = 3;
        this.ctx.fillText("RESULT", modalX + modalWidth / 2, modalY + 70);
        this.ctx.font = "bold 38px Quicksand, sans-serif";
        this.ctx.fillStyle = "#F0D4A8";
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        const scoreY = modalY + 160;
        this.ctx.fillText(`Humans: ${gameState.humanScore} points`, modalX + modalWidth / 2, scoreY);
        this.ctx.fillText(`Aliens: ${gameState.alienScore} points`, modalX + modalWidth / 2, scoreY + 60);
        let winner = "";
        if (gameState.humanScore > gameState.alienScore) winner = "Humans win!";
        else if (gameState.humanScore < gameState.alienScore) winner = "Aliens win!";
        else winner = "Draw!";
        this.ctx.font = 'bold 44px "Smooch Sans", sans-serif';
        this.ctx.fillStyle = "#FFD700";
        this.ctx.fillText(winner, modalX + modalWidth / 2, scoreY + 140);
        const continueBtnWidth = 260;
        const continueBtnHeight = 60;
        const continueBtnX = modalX + (modalWidth - continueBtnWidth) / 2;
        const continueBtnY = modalY + modalHeight - continueBtnHeight - 20;
        this.ctx.fillStyle = gameState.hoverContinueButton ? "#3A7A2A" : "#4CAF50";
        this.roundedRect(this.ctx, continueBtnX, continueBtnY, continueBtnWidth, continueBtnHeight, 12);
        this.ctx.fill();
        this.ctx.font = 'bold 32px "Smooch Sans", sans-serif';
        this.ctx.fillStyle = "#F0D4A8";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
        this.ctx.shadowBlur = 6;
        this.ctx.fillText("Continue", continueBtnX + continueBtnWidth / 2, continueBtnY + continueBtnHeight / 2);
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "alphabetic";
      }
    }
    roundedRect(ctx2, x, y, width, height, radius) {
      ctx2.beginPath();
      ctx2.moveTo(x + radius, y);
      ctx2.lineTo(x + width - radius, y);
      ctx2.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx2.lineTo(x + width, y + height - radius);
      ctx2.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx2.lineTo(x + radius, y + height);
      ctx2.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx2.lineTo(x, y + radius);
      ctx2.quadraticCurveTo(x, y, x + radius, y);
      ctx2.closePath();
    }
  };

  // src/Game.ts
  var Game = class {
    state;
    onUpdate;
    constructor(onUpdate) {
      this.onUpdate = onUpdate;
      this.state = {
        board: [],
        // Will be set by Board
        humanDeck: this.shuffle(this.createHumanDeck()),
        alienDeck: this.shuffle(this.createAlienDeck()),
        eventDeck: this.createEventDeck(),
        placedCharacters: [],
        currentPlayer: "human",
        phase: "placement",
        turn: 0,
        drawnCards: [],
        humanEventSkips: 3,
        alienEventSkips: 3,
        mouseX: 0,
        mouseY: 0,
        combatOrder: [],
        currentCombatIndex: 0,
        humanScore: 0,
        alienScore: 0,
        battleLog: [],
        hoverContinueButton: false
      };
    }
    createHumanDeck() {
      const pool = [
        {
          id: "h_commander",
          faction: "human",
          name: "General Johnson",
          type: "Commander",
          stats: {
            health: 3,
            damage: 2,
            range: 2,
            attacks: 2,
            initiative: 3,
            points: 1,
            rareness: 3,
            ability: "All adjacent humans has +1 attack"
          }
        },
        {
          id: "h_sniper",
          faction: "human",
          name: "Hannah Honor",
          type: "Sniper",
          stats: {
            health: 1,
            damage: 1,
            range: 4,
            attacks: 2,
            initiative: 2,
            points: 2,
            rareness: 4,
            ability: "If only adjacent to one more character, gain +1 damage"
          }
        },
        {
          id: "h_medic",
          faction: "human",
          name: "Nurse Tender",
          type: "Medic",
          stats: {
            health: 5,
            damage: 1,
            range: 1,
            attacks: 1,
            initiative: 4,
            points: 0,
            rareness: 1,
            ability: "Adjacent humans has a 30% chance to ressurect when killed. (Applies one time per adjacent human)"
          }
        },
        {
          id: "h_soldier",
          faction: "human",
          name: "Heavy Gunner Jack",
          type: "Soldier",
          stats: {
            health: 1,
            damage: 4,
            range: 1,
            attacks: 1,
            initiative: 1,
            points: 2,
            rareness: 2
          }
        }
      ];
      const weighted = [];
      for (const card of pool) {
        const weight = 5 - card.stats.rareness;
        for (let i = 0; i < weight; i++) {
          weighted.push(card);
        }
      }
      const deck = [];
      for (let i = 0; i < 20; i++) {
        const idx = Math.floor(Math.random() * weighted.length);
        const base = weighted[idx];
        deck.push({
          ...base,
          id: base.id + "_" + i
        });
      }
      return deck;
    }
    createAlienDeck() {
      const pool = [
        {
          id: "a_soldier",
          faction: "alien",
          name: "Pilot Frnuhuh",
          type: "Soldier",
          stats: {
            health: 2,
            damage: 3,
            range: 1,
            attacks: 2,
            initiative: 2,
            points: 1,
            rareness: 1,
            ability: "If Frnuhuh has no adjacent aliens, he gains double the number of attacks"
          }
        },
        {
          id: "a_commander",
          faction: "alien",
          name: "Elder K'tharr",
          type: "Commander",
          stats: {
            health: 3,
            damage: 2,
            range: 1,
            attacks: 1,
            initiative: 1,
            points: 2,
            rareness: 4,
            ability: "All adjacent enemies lose 1 range due to psychic interference."
          }
        },
        {
          id: "a_medic",
          faction: "alien",
          name: "Mutant Vor",
          type: "Medic",
          stats: {
            health: 2,
            damage: 3,
            range: 1,
            attacks: 1,
            initiative: 4,
            points: 2,
            rareness: 3,
            ability: "Heals the first attack he receives"
          }
        },
        {
          id: "a_sniper",
          faction: "alien",
          name: "Warlord Vekkor",
          type: "Sniper",
          stats: {
            health: 2,
            damage: 3,
            range: 5,
            attacks: 1,
            initiative: 3,
            points: 0,
            rareness: 2,
            ability: "Increases the range of adjacent friendly aliens by +1."
          }
        }
      ];
      const weighted = [];
      for (const card of pool) {
        const weight = 5 - card.stats.rareness;
        for (let i = 0; i < weight; i++) {
          weighted.push(card);
        }
      }
      const deck = [];
      for (let i = 0; i < 20; i++) {
        const idx = Math.floor(Math.random() * weighted.length);
        const base = weighted[idx];
        deck.push({
          ...base,
          id: base.id + "_" + i
        });
      }
      return deck;
    }
    drawCards() {
      if (this.state.drawnEvent) return;
      const deck = this.state.currentPlayer === "human" ? this.state.humanDeck : this.state.alienDeck;
      if (deck.length > 0) {
        const numToDraw = Math.min(3, deck.length);
        this.state.drawnCards = deck.splice(0, numToDraw);
        this.onUpdate();
      }
    }
    selectCard(index) {
      const card = this.state.drawnCards[index];
      if (card) {
        this.state.selectedCard = card;
        this.state.drawnCardsBackup = [...this.state.drawnCards];
        this.state.drawnCards = [];
        this.onUpdate();
      }
    }
    placeCharacter(q, r) {
      if (!this.state.selectedCard) return;
      const hex = this.state.board.find((h) => h.q === q && h.r === r);
      if (hex && !hex.isMountain && this.canPlaceAt(hex)) {
        this.state.placedCharacters.push({ hex, card: this.state.selectedCard });
        this.state.selectedCard = void 0;
        this.state.drawnCards = [];
        this.state.drawnCardsBackup = void 0;
        this.drawEvent();
        const humanPlaced = this.state.placedCharacters.filter((pc) => pc.card.faction === "human").length;
        const alienPlaced = this.state.placedCharacters.filter((pc) => pc.card.faction === "alien").length;
        if (humanPlaced >= 15 && alienPlaced >= 15) {
          this.state.phase = "combat";
          this.startCombat();
        } else {
          if (!this.state.drawnEvent) {
            this.advanceTurn();
          }
        }
        this.onUpdate();
      }
    }
    drawEvent() {
      if (this.state.eventDeck.length > 0) {
        this.state.drawnEvent = this.state.eventDeck.shift();
      }
    }
    resolveEvent() {
      if (this.state.drawnEvent) {
        this.state.drawnEvent = void 0;
        this.advanceTurn();
        this.onUpdate();
      }
    }
    skipEvent() {
      const skips = this.state.currentPlayer === "human" ? this.state.humanEventSkips : this.state.alienEventSkips;
      if (skips > 0 && this.state.drawnEvent) {
        if (this.state.currentPlayer === "human") {
          this.state.humanEventSkips--;
        } else {
          this.state.alienEventSkips--;
        }
        this.state.drawnEvent = void 0;
        this.advanceTurn();
        this.onUpdate();
      }
    }
    update() {
      this.onUpdate();
    }
    startCombat() {
      this.state.combatOrder = [...this.state.placedCharacters].sort((a, b) => b.card.stats.initiative - a.card.stats.initiative);
      this.state.currentCombatIndex = 0;
    }
    advanceTurn() {
      this.state.currentPlayer = this.state.currentPlayer === "human" ? "alien" : "human";
      this.state.turn++;
    }
    selectAttacker(q, r) {
      if (this.state.phase !== "combat") return;
      const pc = this.state.placedCharacters.find((p) => p.hex.q === q && p.hex.r === r);
      if (pc && pc.card.stats.attacks > 0) {
        this.state.selectedAttacker = pc;
        this.onUpdate();
      }
    }
    attackTarget(q, r) {
      if (!this.state.selectedAttacker) return;
      const attacker = this.state.selectedAttacker;
      const target = this.state.placedCharacters.find((p) => p.hex.q === q && p.hex.r === r);
      if (target && target.card.faction !== attacker.card.faction && this.isInRange(attacker, target)) {
        if (this.state.battleLog) {
          this.state.battleLog.push(`${attacker.card.name} attacks ${target.card.name}.`);
        }
        const damage = attacker.card.stats.attacks;
        target.card.stats.health -= damage;
        if (this.state.battleLog) {
          this.state.battleLog.push(`${target.card.name} loses ${damage} health.`);
        }
        if (target.card.stats.health <= 0) {
          if (this.state.battleLog) {
            this.state.battleLog.push(`${target.card.name} dies.`);
          }
          this.state.placedCharacters = this.state.placedCharacters.filter((p) => p !== target);
          this.state.combatOrder = this.state.combatOrder.filter((co) => co !== target);
          if (this.state.currentCombatIndex >= this.state.combatOrder.length) {
            this.state.currentCombatIndex = this.state.combatOrder.length - 1;
          }
        }
        const humanAlive = this.state.placedCharacters.some((pc) => pc.card.faction === "human");
        const alienAlive = this.state.placedCharacters.some((pc) => pc.card.faction === "alien");
        if (!humanAlive || !alienAlive) {
          this.calculateScores();
          this.state.phase = "scoring";
          this.state.selectedAttacker = void 0;
          this.onUpdate();
          return;
        }
        this.state.selectedAttacker = void 0;
        this.nextCombatTurn();
        this.onUpdate();
      }
    }
    nextCombatTurn() {
      this.state.currentCombatIndex++;
      if (this.state.currentCombatIndex >= this.state.combatOrder.length) {
        this.calculateScores();
        this.state.phase = "scoring";
      }
    }
    calculateScores() {
      this.state.humanScore = 0;
      this.state.alienScore = 0;
      for (const pc of this.state.placedCharacters) {
        const hexPoints = pc.hex.value || 0;
        const cardPoints = pc.card.stats.points || 0;
        const totalPoints = hexPoints + cardPoints;
        if (pc.card.faction === "human") {
          this.state.humanScore += totalPoints;
        } else if (pc.card.faction === "alien") {
          this.state.alienScore += totalPoints;
        }
      }
      if (this.state.humanScore > this.state.alienScore) {
        this.state.winner = "human";
      } else if (this.state.alienScore > this.state.humanScore) {
        this.state.winner = "alien";
      } else {
        this.state.winner = "tie";
      }
    }
    isInRange(attacker, target) {
      const dq = Math.abs(attacker.hex.q - target.hex.q);
      const dr = Math.abs(attacker.hex.r - target.hex.r);
      const ds = Math.abs(attacker.hex.q + attacker.hex.r - (target.hex.q + target.hex.r));
      const distance = Math.max(dq, dr, ds);
      return distance <= attacker.card.stats.range;
    }
    canPlaceAt(hex) {
      if (this.state.placedCharacters.length === 0) return true;
      return this.state.placedCharacters.some(
        (pc) => Math.abs(pc.hex.q - hex.q) <= 1 && Math.abs(pc.hex.r - hex.r) <= 1 && Math.abs(pc.hex.q + pc.hex.r - (hex.q + hex.r)) <= 1
      );
    }
    shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
    createEventDeck() {
      const cards = [];
      for (let i = 0; i < 8; i++) {
        cards.push({ id: `sandstorm_${i}`, name: "Sandstorm", effect: "Reduces visibility or movement" });
      }
      for (let i = 0; i < 6; i++) {
        cards.push({ id: `swap_${i}`, name: "Swap places", effect: "Swap two characters" });
      }
      for (let i = 0; i < 4; i++) {
        cards.push({ id: `friend_${i}`, name: "Call for a friend", effect: "Summon an ally" });
      }
      for (let i = 0; i < 4; i++) {
        cards.push({ id: `thunder_${i}`, name: "Thunderstorm", effect: "Damages units" });
      }
      for (let i = 0; i < 2; i++) {
        cards.push({ id: `execute_${i}`, name: "Execute", effect: "Kill a unit" });
      }
      for (let i = 0; i < 2; i++) {
        cards.push({ id: `armor_${i}`, name: "Heavy armor", effect: "Increase defense" });
      }
      for (let i = 0; i < 2; i++) {
        cards.push({ id: `stealth_${i}`, name: "Stealth", effect: "Become invisible" });
      }
      for (let i = 0; i < 2; i++) {
        cards.push({ id: `berserk_${i}`, name: "Berserk", effect: "Increase attack but reduce defense" });
      }
      return this.shuffle(cards);
    }
    allCardsPlaced() {
      const result = this.state.humanDeck.length === 0 && this.state.alienDeck.length === 0 && this.state.drawnCards.length === 0 && !this.state.drawnEvent;
      console.log("allCardsPlaced check:", {
        humanDeck: this.state.humanDeck.length,
        alienDeck: this.state.alienDeck.length,
        drawnCards: this.state.drawnCards.length,
        drawnEvent: !!this.state.drawnEvent,
        result
      });
      return result;
    }
    autoPlaceAll() {
      while (this.state.humanDeck.length > 0 || this.state.alienDeck.length > 0) {
        this.drawCards();
        if (this.state.drawnCards.length > 0) {
          this.state.selectedCard = this.state.drawnCards[0];
          const availableHexes = this.state.board.filter(
            (h) => !h.isMountain && this.canPlaceAt(h) && !this.state.placedCharacters.some((pc) => pc.hex.q === h.q && pc.hex.r === h.r)
          );
          if (availableHexes.length > 0) {
            const hex = availableHexes[0];
            this.placeCharacter(hex.q, hex.r);
            if (this.state.drawnEvent) {
              this.state.drawnEvent = void 0;
              this.advanceTurn();
            }
          }
        }
      }
      this.onUpdate();
    }
    startBattle() {
      const resultMarkers = ["Result:", "Humans:", "Aliens:", "win!", "Tie!"];
      this.state.battleLog = (this.state.battleLog ?? []).filter((line) => !resultMarkers.some((marker) => line.includes(marker)));
      let humanScore = 0;
      let alienScore = 0;
      for (const placed of this.state.placedCharacters) {
        const hexPoints = placed.hex.value || 0;
        const cardPoints = placed.card.stats.points;
        const totalPoints = hexPoints + cardPoints;
        if (placed.card.faction === "human") {
          humanScore += totalPoints;
        } else {
          alienScore += totalPoints;
        }
      }
      let winner = "";
      if (humanScore > alienScore) {
        winner = "Humans win!";
      } else if (alienScore > humanScore) {
        winner = "Aliens win!";
      } else {
        winner = "Tie!";
      }
      this.state.battleLog.push("");
      this.state.battleLog.push("Result:");
      this.state.battleLog.push(`Humans: ${humanScore} points`);
      this.state.battleLog.push(`Aliens: ${alienScore} points`);
      this.state.battleLog.push(winner);
      this.state.battleLog = [];
      const nameCount = {};
      const nameMap = /* @__PURE__ */ new Map();
      for (const placed of this.state.placedCharacters) {
        const baseName = placed.card.name;
        nameCount[baseName] = (nameCount[baseName] || 0) + 1;
        nameMap.set(placed.card, `${baseName} (${nameCount[baseName]})`);
      }
      for (const placed of this.state.placedCharacters) {
        if (placed.card.name === "General Johnson") {
          for (const target of this.state.placedCharacters) {
            if (target.card.faction === "human" && target !== placed && this.hexDistance(placed.hex, target.hex) === 1) {
              this.state.battleLog.push(`${nameMap.get(placed.card)} gives ${nameMap.get(target.card)} +1 attack.`);
              if (!(" _originalAttacks" in target.card.stats)) {
                target.card.stats._originalAttacks = target.card.stats.attacks;
              }
              target.card.stats.attacks += 1;
            }
          }
        }
      }
      let combatOrder = [...this.state.placedCharacters].sort((a, b) => b.card.stats.initiative - a.card.stats.initiative);
      for (const attacker of combatOrder) {
        const numAttacks = attacker.card.stats.attacks;
        for (let attackNum = 0; attackNum < numAttacks; attackNum++) {
          const enemies = this.state.placedCharacters.filter((pc) => pc.card.faction !== attacker.card.faction);
          let closestEnemy = null;
          let minDist = Infinity;
          for (const enemy of enemies) {
            const dist = this.hexDistance(attacker.hex, enemy.hex);
            if (dist <= attacker.card.stats.range && dist < minDist) {
              minDist = dist;
              closestEnemy = enemy;
            }
          }
          if (closestEnemy) {
            const damage = attacker.card.stats.damage ?? attacker.card.stats.attacks;
            this.state.battleLog.push(`${nameMap.get(attacker.card)} attacks ${nameMap.get(closestEnemy.card)} for ${damage} damage.`);
            closestEnemy.card.stats.health -= damage;
            this.state.battleLog.push(`${nameMap.get(closestEnemy.card)} loses ${damage} health.`);
            if (closestEnemy.card.stats.health <= 0) {
              this.state.battleLog.push(`${nameMap.get(closestEnemy.card)} dies.`);
              this.state.placedCharacters = this.state.placedCharacters.filter((pc) => pc !== closestEnemy);
            } else {
              this.state.battleLog.push(`${nameMap.get(closestEnemy.card)} has ${closestEnemy.card.stats.health} health remaining.`);
            }
          }
          if (this.state.placedCharacters.filter((pc) => pc.card.faction !== attacker.card.faction).length === 0) {
            break;
          }
        }
      }
      for (const placed of this.state.placedCharacters) {
        if (placed.card.stats._originalAttacks !== void 0) {
          placed.card.stats.attacks = placed.card.stats._originalAttacks;
          delete placed.card.stats._originalAttacks;
        }
      }
      this.state.phase = "battleLog";
      this.onUpdate();
    }
    hexDistance(a, b) {
      return Math.max(
        Math.abs(a.q - b.q),
        Math.abs(a.r - b.r),
        Math.abs(-a.q - a.r - (-b.q - b.r))
      );
    }
  };

  // src/InputHandler.ts
  var InputHandler = class {
    canvas;
    game;
    constructor(canvas2, game2) {
      this.canvas = canvas2;
      this.game = game2;
      this.canvas.addEventListener("click", this.handleClick.bind(this));
      this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
      this.canvas.addEventListener("contextmenu", this.handleRightClick.bind(this));
    }
    handleMouseMove(event) {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.game.state.mouseX = x;
      this.game.state.mouseY = y;
      const previousHoverIndex = this.game.state.hoverCardIndex;
      this.game.state.hoverPile = void 0;
      this.game.state.hoverCardIndex = void 0;
      this.game.state.hoverHex = void 0;
      this.game.state.hoverDrawnEvent = false;
      this.game.state.hoverSkip = false;
      this.game.state.hoverBattleButton = false;
      const boardWidth = this.canvas.width * 0.6;
      const uiX = boardWidth;
      if (x > uiX) {
        if (this.game.state.phase === "placement" && this.game.allCardsPlaced && this.game.allCardsPlaced()) {
          const buttonWidth = 300;
          const buttonHeight = 80;
          const uiWidth2 = this.canvas.width - boardWidth;
          const buttonX = uiX + (uiWidth2 - buttonWidth) / 2;
          const buttonY = this.canvas.height / 2 - buttonHeight / 2;
          if (x >= buttonX && x < buttonX + buttonWidth && y >= buttonY && y < buttonY + buttonHeight) {
            this.game.state.hoverBattleButton = true;
          }
        }
        if (this.game.state.phase === "battleLog") {
          const modalWidth = 600 * 2.5;
          const modalHeight = 400 * 2.2 * 1.1;
          const modalX = (boardWidth - modalWidth) / 2;
          const modalY = (this.canvas.height - modalHeight) / 2;
          const continueBtnWidth = 260;
          const continueBtnHeight = 60;
          const continueBtnX = modalX + (modalWidth - continueBtnWidth) / 2;
          const continueBtnY = modalY + modalHeight - continueBtnHeight - 20;
          if (x >= continueBtnX && x < continueBtnX + continueBtnWidth && y >= continueBtnY && y < continueBtnY + continueBtnHeight) {
            this.game.state.hoverContinueButton = true;
          } else {
            this.game.state.hoverContinueButton = false;
          }
        }
        const cardbackWidth = 304 * 1.02;
        const cardbackHeight = 487 * 1.02;
        const cardbackSpacing = 10;
        const cardbackStartY = 50;
        const uiWidth = this.canvas.width - boardWidth;
        const totalCardbackWidth = cardbackWidth * 3 + cardbackSpacing * 2;
        const cardbackStartX = uiX + (uiWidth - totalCardbackWidth) / 2;
        if (y >= cardbackStartY && y < cardbackStartY + cardbackHeight) {
          if (x >= cardbackStartX && x < cardbackStartX + cardbackWidth) {
            this.game.state.hoverPile = "human";
          } else if (x >= cardbackStartX + cardbackWidth + cardbackSpacing && x < cardbackStartX + cardbackWidth * 2 + cardbackSpacing) {
            this.game.state.hoverPile = "alien";
          } else if (x >= cardbackStartX + (cardbackWidth + cardbackSpacing) * 2 && x < cardbackStartX + cardbackWidth * 3 + cardbackSpacing * 2) {
            this.game.state.hoverPile = "event";
          }
        }
        const deckStartY = cardbackStartY + cardbackHeight + 20;
        const eventCardWidth = 274;
        const eventCardHeight = 438;
        const deckX = uiX + 10;
        const deckWidth = uiWidth - 20;
        const eventCardX = deckX + (deckWidth - eventCardWidth) / 2;
        const eventCardY = deckStartY;
        const skipY = eventCardY + eventCardHeight + 20;
        const skipHeight = 180;
        const skipButtonImg = this.game.ui?.cardRenderer?.assetLoader?.getAsset("skipButton");
        let skipWidth = 180 * 1.5;
        if (skipButtonImg && skipButtonImg.complete && skipButtonImg.width > 0) {
          skipWidth = skipHeight * (skipButtonImg.width / skipButtonImg.height);
        }
        const skipX = deckX + (deckWidth - skipWidth) / 2;
        const skipHitHeight = 140;
        const skipHitY = skipY + (skipHeight - skipHitHeight) / 2;
        if (x >= eventCardX && x < eventCardX + eventCardWidth && y >= eventCardY && y < eventCardY + eventCardHeight && this.game.state.drawnEvent) {
          this.game.state.hoverDrawnEvent = true;
        } else if (x >= skipX && x < skipX + skipWidth && y >= skipHitY && y < skipHitY + skipHitHeight && this.game.state.drawnEvent) {
          this.game.state.hoverSkip = true;
        } else if (y > deckStartY + 100) {
          const cardWidth = 274;
          const cardHeight = 438;
          const cardsPerRow = 3;
          const spacing = 21;
          const totalCardsWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * spacing;
          const startX = uiX + (uiWidth - totalCardsWidth) / 2;
          const startY = deckStartY + 170;
          for (let i = 0; i < this.game.state.drawnCards.length; i++) {
            const row = Math.floor(i / cardsPerRow);
            const col = i % cardsPerRow;
            const cardX = startX + col * (cardWidth + spacing);
            const cardY = startY + row * (cardHeight + spacing);
            if (x >= cardX && x < cardX + cardWidth && y >= cardY && y < cardY + cardHeight) {
              this.game.state.hoverCardIndex = i;
              if (previousHoverIndex !== i) {
                this.game.state.hoverStartTime = Date.now();
                this.game.state.hoverCardScale = 1;
              }
              break;
            }
          }
        }
      } else {
        const hex = this.getHexAt(x, y);
        if (hex) {
          this.game.state.hoverHex = hex;
        }
      }
      this.game.update();
    }
    handleClick(event) {
      console.log("Canvas click event:", event.clientX, event.clientY);
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hasEvent = this.game.state.drawnEvent !== void 0;
      const boardWidth = this.canvas.width * 0.6;
      const uiX = boardWidth;
      if (this.game.state.phase === "placement") {
        const autoButtonWidth = 200;
        const autoButtonHeight = 50;
        const autoButtonX = boardWidth - autoButtonWidth - 20;
        const autoButtonY = 20;
        if (x >= autoButtonX && x < autoButtonX + autoButtonWidth && y >= autoButtonY && y < autoButtonY + autoButtonHeight) {
          this.game.autoPlaceAll();
          return;
        }
      }
      if (this.game.state.phase === "battleLog") {
        const modalWidth = 600 * 2.5;
        const modalHeight = 400 * 2.2 * 1.1;
        const modalX = (boardWidth - modalWidth) / 2;
        const modalY = (this.canvas.height - modalHeight) / 2;
        const continueBtnWidth = 260;
        const continueBtnHeight = 60;
        const continueBtnX = modalX + (modalWidth - continueBtnWidth) / 2;
        const continueBtnY = modalY + modalHeight - continueBtnHeight - 20;
        console.log("Continue button bounds:", continueBtnX, continueBtnY, continueBtnWidth, continueBtnHeight);
        console.log("Mouse click:", x, y);
        if (x >= continueBtnX && x < continueBtnX + continueBtnWidth && y >= continueBtnY && y < continueBtnY + continueBtnHeight) {
          console.log("Continue button clicked!");
          this.game.state.hoverContinueButton = true;
          this.game.state.phase = "scoring";
          if (typeof this.game.calculateScores === "function") {
            this.game.calculateScores();
          }
          this.game.update();
          return;
        }
      }
      if (this.game.state.phase === "scoring") {
        const modalWidth = 600 * 2.5;
        const modalHeight = 350 * 2.2;
        const modalX = (boardWidth - modalWidth) / 2;
        const modalY = (this.canvas.height - modalHeight) / 2;
        const continueBtnWidth = 260;
        const continueBtnHeight = 60;
        const continueBtnX = modalX + (modalWidth - continueBtnWidth) / 2;
        const continueBtnY = modalY + modalHeight - continueBtnHeight - 20;
        if (x >= continueBtnX && x < continueBtnX + continueBtnWidth && y >= continueBtnY && y < continueBtnY + continueBtnHeight) {
          this.game.state.phase = "placement";
          this.game.update();
          return;
        }
      }
      if (x > uiX) {
        if (this.game.state.phase === "placement" && this.game.allCardsPlaced && this.game.allCardsPlaced()) {
          const buttonWidth = 300;
          const buttonHeight = 80;
          const uiWidth2 = this.canvas.width - boardWidth;
          const buttonX = uiX + (uiWidth2 - buttonWidth) / 2;
          const buttonY = this.canvas.height / 2 - buttonHeight / 2;
          if (x >= buttonX && x < buttonX + buttonWidth && y >= buttonY && y < buttonY + buttonHeight) {
            this.game.state.hoverBattleButton = true;
            this.game.startBattle();
            return;
          }
        }
        const cardbackWidth = 304 * 1.02;
        const cardbackHeight = 487 * 1.02;
        const cardbackSpacing = 10;
        const cardbackStartY = 50;
        const uiWidth = this.canvas.width - boardWidth;
        const totalCardbackWidth = cardbackWidth * 3 + cardbackSpacing * 2;
        const cardbackStartX = uiX + (uiWidth - totalCardbackWidth) / 2;
        if (y >= cardbackStartY && y < cardbackStartY + cardbackHeight) {
          if (x >= cardbackStartX && x < cardbackStartX + cardbackWidth) {
            if (!hasEvent && this.game.state.currentPlayer === "human") {
              this.game.drawCards();
            }
          } else if (x >= cardbackStartX + cardbackWidth + cardbackSpacing && x < cardbackStartX + cardbackWidth * 2 + cardbackSpacing) {
            if (!hasEvent && this.game.state.currentPlayer === "alien") {
              this.game.drawCards();
            }
          } else if (x >= cardbackStartX + (cardbackWidth + cardbackSpacing) * 2 && x < cardbackStartX + cardbackWidth * 3 + cardbackSpacing * 2) {
            if (!hasEvent) {
              this.game.drawEvent();
            }
          }
        }
        const deckStartY = cardbackStartY + cardbackHeight + 20;
        const eventCardWidth = 274;
        const eventCardHeight = 438;
        const deckX = uiX + 10;
        const deckWidth = uiWidth - 20;
        const eventCardX = deckX + (deckWidth - eventCardWidth) / 2;
        const eventCardY = deckStartY;
        const skipY = eventCardY + eventCardHeight + 20;
        const skipHeight = 180;
        const skipButtonImg = this.game.ui?.cardRenderer?.assetLoader?.getAsset("skipButton");
        const skipWidth = skipButtonImg && skipButtonImg.complete ? skipHeight * (skipButtonImg.width / skipButtonImg.height) : skipHeight * 1.5;
        const skipX = deckX + (deckWidth - skipWidth) / 2;
        const skipHitHeight = 140;
        const skipHitY = skipY + (skipHeight - skipHitHeight) / 2;
        if (x >= eventCardX && x < eventCardX + eventCardWidth && y >= eventCardY && y < eventCardY + eventCardHeight && this.game.state.drawnEvent) {
          this.game.state.drawnEvent = void 0;
          this.game.advanceTurn();
          this.game.onUpdate();
        } else if (x >= skipX && x < skipX + skipWidth && y >= skipHitY && y < skipHitY + skipHitHeight && this.game.state.drawnEvent) {
          this.game.skipEvent();
        } else if (y > deckStartY + 100) {
          const cardWidth = 274;
          const cardHeight = 438;
          const cardsPerRow = 3;
          const spacing = 21;
          const totalCardsWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * spacing;
          const startX = uiX + (uiWidth - totalCardsWidth) / 2;
          const startY = deckStartY + 170;
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
        if (this.game.state.phase === "placement") {
          if (this.game.state.selectedCard !== void 0 && !hasEvent) {
            const hex = this.getHexAt(x, y);
            if (hex) {
              this.game.placeCharacter(hex.q, hex.r);
            }
          }
        } else if (this.game.state.phase === "combat") {
          const hex = this.getHexAt(x, y);
          if (hex) {
            const placed = this.game.state.placedCharacters.find((pc) => pc.hex.q === hex.q && pc.hex.r === hex.r);
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
    getHexAt(x, y) {
      let closestHex;
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
    handleRightClick(event) {
      event.preventDefault();
      if (this.game.state.selectedCard !== void 0) {
        this.game.state.selectedCard = void 0;
        if (this.game.state.drawnCardsBackup) {
          this.game.state.drawnCards = [...this.game.state.drawnCardsBackup];
          this.game.state.drawnCardsBackup = void 0;
        }
        this.game.update();
      }
    }
    hexToPixel(q, r) {
      const hexSize = 100;
      const x = hexSize * (3 / 2 * q);
      const y = hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
      const boardWidth = this.canvas.width * 0.6;
      const boardHeight = this.canvas.height;
      return { x: x + boardWidth / 2, y: y + boardHeight / 2 };
    }
  };

  // src/main.ts
  var canvas = document.getElementById("game");
  var dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  window.addEventListener("resize", () => {
    const dpr2 = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr2;
    canvas.height = window.innerHeight * dpr2;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    render();
  });
  var ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(dpr, dpr);
  var game = new Game(render);
  var board = new Board(canvas, game.state);
  var ui = new GameUI(canvas);
  new InputHandler(canvas, game);
  function render() {
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr2 = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    board.render();
    ui.render(game.state, game);
  }
  render();
})();
