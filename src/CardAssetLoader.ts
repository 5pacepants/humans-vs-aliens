// Load card assets (frames, icons, character images)

interface CardAssets {
  frameHuman?: HTMLImageElement;
  healthIconHuman?: HTMLImageElement;
  costIconHuman?: HTMLImageElement;
  frameAlien?: HTMLImageElement;
  healthIconAlien?: HTMLImageElement;
  costIconAlien?: HTMLImageElement;
  frameEvent?: HTMLImageElement;
  characterPlaceholder?: HTMLImageElement;
  characterAlienPlaceholder?: HTMLImageElement;
  characterEventPlaceholder?: HTMLImageElement;
  skipButton?: HTMLImageElement;
}

export class CardAssetLoader {
  private assets: CardAssets = {};
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  async loadAsset(assetKey: string): Promise<HTMLImageElement> {
    if (this.assets[assetKey as keyof CardAssets]) {
      return this.assets[assetKey as keyof CardAssets]!;
    }

    if (this.loadingPromises.has(assetKey)) {
      return this.loadingPromises.get(assetKey)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const filename = this.getAssetFilename(assetKey);
      img.src = `/cards/${filename}`;

      img.onload = async () => {
        try {
          // Pre-scale image to optimal size for better quality
          const scaled = await this.preScaleImage(img, assetKey);
          this.assets[assetKey as keyof CardAssets] = scaled;
          this.loadingPromises.delete(assetKey);
          resolve(scaled);
        } catch (err) {
          this.loadingPromises.delete(assetKey);
          reject(err);
        }
      };

      img.onerror = () => {
        this.loadingPromises.delete(assetKey);
        reject(new Error(`Failed to load card asset: ${filename}`));
      };
    });

    this.loadingPromises.set(assetKey, promise);
    return promise;
  }

  private async preScaleImage(sourceImg: HTMLImageElement, assetKey: string): Promise<HTMLImageElement> {
    // Determine target size based on asset type
    // Icons are drawn at ~54px, frames at ~300-400px, character images at ~300px
    const targetSizes: Record<string, number> = {
      healthIconHuman: 256,
      healthIconAlien: 256,
      costIconHuman: 256,
      costIconAlien: 256,
      frameHuman: 800,
      frameAlien: 800,
      frameEvent: 800,
      characterPlaceholder: 800,
      characterAlienPlaceholder: 800,
      characterEventPlaceholder: 800,
      skipButton: 512
    };

    // Default to 800px for unknown images (likely character images)
    const targetSize = targetSizes[assetKey] || 800;

    // If image is already close to target size, don't scale
    if (sourceImg.width <= targetSize * 1.2) {
      return sourceImg;
    }

    // Create canvas for high-quality downscaling
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Calculate scaled dimensions maintaining aspect ratio
    const scale = targetSize / Math.max(sourceImg.width, sourceImg.height);
    canvas.width = Math.floor(sourceImg.width * scale);
    canvas.height = Math.floor(sourceImg.height * scale);

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw scaled image
    ctx.drawImage(sourceImg, 0, 0, canvas.width, canvas.height);

    // Convert canvas to image asynchronously
    return new Promise((resolve, reject) => {
      const scaledImg = new Image();
      scaledImg.onload = () => resolve(scaledImg);
      scaledImg.onerror = () => reject(new Error('Failed to create scaled image'));
      scaledImg.src = canvas.toDataURL('image/png');
    });
  }

  private getAssetFilename(assetKey: string): string {
    const filenames: Record<string, string> = {
      frameHuman: 'frame-human.png',
      healthIconHuman: 'health-icon-human.png',
      costIconHuman: 'cost-icon-human.png',
      frameAlien: 'frame-alien.png',
      healthIconAlien: 'health-icon-alien.png',
      costIconAlien: 'cost-icon-alien.png',
      frameEvent: 'frame-event.png',
      characterPlaceholder: 'character-human-placeholder.png',
      characterAlienPlaceholder: 'character-alien-placeholder.png',
      characterEventPlaceholder: 'character-event-placeholder.png',
      skipButton: 'skip-button.png'
    };
    // If not a predefined asset, assume it's a character image filename
    if (filenames[assetKey]) {
      return filenames[assetKey];
    }
    // Add .png extension if not present
    return assetKey.endsWith('.png') ? assetKey : `${assetKey}.png`;
  }

  getAsset(assetKey: string): HTMLImageElement | undefined {
    return this.assets[assetKey as keyof CardAssets];
  }

  preloadAll() {
    const keys = ['frameHuman', 'healthIconHuman', 'costIconHuman', 'frameAlien', 'healthIconAlien', 'costIconAlien', 'frameEvent', 'characterPlaceholder', 'characterAlienPlaceholder', 'characterEventPlaceholder', 'skipButton'];
    keys.forEach(key => {
      this.loadAsset(key).catch(err => console.warn(err));
    });
  }
}
