// Load card assets (frames, icons, character images)

interface CardAssets {
  frameHuman?: HTMLImageElement;
  healthIconHuman?: HTMLImageElement;
  costIconHuman?: HTMLImageElement;
  frameAlien?: HTMLImageElement;
  healthIconAlien?: HTMLImageElement;
  costIconAlien?: HTMLImageElement;
  characterPlaceholder?: HTMLImageElement;
  characterAlienPlaceholder?: HTMLImageElement;
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

      img.onload = () => {
        this.assets[assetKey as keyof CardAssets] = img;
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

  private getAssetFilename(assetKey: string): string {
    const filenames: Record<string, string> = {
      frameHuman: 'frame-human.png',
      healthIconHuman: 'health-icon-human.png',
      costIconHuman: 'cost-icon-human.png',
      frameAlien: 'frame-alien.png',
      healthIconAlien: 'health-icon-alien.png',
      costIconAlien: 'cost-icon-alien.png',
      characterPlaceholder: 'character-human-placeholder.png',
      characterAlienPlaceholder: 'character-alien-placeholder.png'
    };
    return filenames[assetKey] || assetKey;
  }

  getAsset(assetKey: string): HTMLImageElement | undefined {
    return this.assets[assetKey as keyof CardAssets];
  }

  preloadAll() {
    const keys = ['frameHuman', 'healthIconHuman', 'costIconHuman', 'frameAlien', 'healthIconAlien', 'costIconAlien', 'characterPlaceholder', 'characterAlienPlaceholder'];
    keys.forEach(key => {
      this.loadAsset(key).catch(err => console.warn(err));
    });
  }
}
