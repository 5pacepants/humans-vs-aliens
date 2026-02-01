// Music Manager - handles background music playback

export class MusicManager {
  private audio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.3; // Default volume (30%)
  private hasUserInteracted: boolean = false;

  constructor() {
    // Create audio element
    this.audio = new Audio('/music/game-music.mp3');
    this.audio.loop = true;
    this.audio.volume = this.volume;

    // Listen for user interaction to enable autoplay
    this.setupAutoplayOnInteraction();
  }

  /**
   * Browsers require user interaction before playing audio.
   * This sets up listeners to start music on first click/keypress.
   */
  private setupAutoplayOnInteraction(): void {
    const startOnInteraction = () => {
      if (!this.hasUserInteracted) {
        this.hasUserInteracted = true;
        this.play();
      }
    };

    // Listen for any user interaction
    document.addEventListener('click', startOnInteraction, { once: false });
    document.addEventListener('keydown', startOnInteraction, { once: false });
    document.addEventListener('touchstart', startOnInteraction, { once: false });
  }

  /**
   * Start playing the background music
   */
  play(): void {
    if (!this.audio || this.isPlaying) return;

    this.audio.play()
      .then(() => {
        this.isPlaying = true;
      })
      .catch(() => {
        // Autoplay was prevented - will retry on next user interaction
        console.log('Music autoplay prevented, waiting for user interaction');
      });
  }

  /**
   * Pause the music
   */
  pause(): void {
    if (!this.audio || !this.isPlaying) return;

    this.audio.pause();
    this.isPlaying = false;
  }

  /**
   * Toggle music on/off
   */
  toggle(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Check if music is currently playing
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Fade out music over duration (in ms)
   */
  fadeOut(duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audio || !this.isPlaying) {
        resolve();
        return;
      }

      const startVolume = this.audio.volume;
      const startTime = performance.now();

      const fade = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        if (this.audio) {
          this.audio.volume = startVolume * (1 - progress);
        }

        if (progress < 1) {
          requestAnimationFrame(fade);
        } else {
          this.pause();
          if (this.audio) {
            this.audio.volume = this.volume; // Reset to original volume
          }
          resolve();
        }
      };

      requestAnimationFrame(fade);
    });
  }

  /**
   * Fade in music over duration (in ms)
   */
  fadeIn(duration: number = 1000): void {
    if (!this.audio) return;

    this.audio.volume = 0;
    this.play();

    const targetVolume = this.volume;
    const startTime = performance.now();

    const fade = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (this.audio) {
        this.audio.volume = targetVolume * progress;
      }

      if (progress < 1) {
        requestAnimationFrame(fade);
      }
    };

    requestAnimationFrame(fade);
  }
}

// Singleton instance
let musicManagerInstance: MusicManager | null = null;

export function getMusicManager(): MusicManager {
  if (!musicManagerInstance) {
    musicManagerInstance = new MusicManager();
  }
  return musicManagerInstance;
}
