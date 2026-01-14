export type HexTerrain = 'grass' | 'water' | 'forest' | 'toxic' | 'mountain';

interface TextureCache {
  grass?: HTMLImageElement;
  water?: HTMLImageElement;
  forest?: HTMLImageElement;
  toxic?: HTMLImageElement;
  mountain?: HTMLImageElement;
}

export class TextureLoader {
  private cache: TextureCache = {};
  private loadingPromises: Map<HexTerrain, Promise<HTMLImageElement>> = new Map();

  async loadTexture(terrain: HexTerrain): Promise<HTMLImageElement> {
    // Return from cache if available
    if (this.cache[terrain]) {
      return this.cache[terrain]!;
    }

    // Return pending promise if already loading
    if (this.loadingPromises.has(terrain)) {
      return this.loadingPromises.get(terrain)!;
    }

    // Create loading promise
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
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

  private getImageFilename(terrain: HexTerrain): string {
    const filenames: Record<HexTerrain, string> = {
      grass: 'grass.png',
      water: 'water.png',
      forest: 'forest.png',
      toxic: 'toxic.png',
      mountain: 'mountain.png'
    };
    return filenames[terrain];
  }

  getTexture(terrain: HexTerrain): HTMLImageElement | undefined {
    return this.cache[terrain];
  }
}
