// Sound Manager - handles sound effects playback

import { getMusicManager, setSoundManagerRef } from './MusicManager';

export type SoundEffect =
  // Character selection voices
  | 'alien-voice-1'
  | 'alien-voice-2'
  | 'alien-voice-3'
  | 'alien-voice-4'
  | 'objective-secure'
  | 'watch-your-ammo'
  | 'fire-at-will'
  | 'carepackage-inbound'
  // Attack sounds
  | 'human-automat'
  | 'human-gunshot-2'
  | 'human-gunshot-3'
  | 'human-gunshot-4'
  | 'alien-weapon-1'
  | 'alien-weapon-2'
  | 'alien-weapon-3'
  | 'alien-weapon-4'
  // Game event sounds
  | 'human-death'
  | 'alien-death'
  | 'first-human-placed'
  | 'humans-win'
  | 'humans-lose'
  | 'card-draw'
  | 'card-place'
  | 'ability-trigger'
  | 'click-event';

// Map character names to their selection voice sounds
export const CHARACTER_SOUNDS: Record<string, SoundEffect> = {
  // Aliens
  'Pilot Frnuhuh': 'alien-voice-1',
  'Warlord Vekkor': 'alien-voice-2',
  'Mutant Vor': 'alien-voice-3',
  "Elder K'tharr": 'alien-voice-4',
  // Humans
  'General Johnson': 'objective-secure',
  'Hannah Honor': 'watch-your-ammo',
  'Heavy Gunner Jack': 'fire-at-will',
  'Nurse Tender': 'carepackage-inbound',
};

// Map character names to their attack sounds
export const ATTACK_SOUNDS: Record<string, SoundEffect> = {
  // Humans
  'General Johnson': 'human-automat',
  'Heavy Gunner Jack': 'human-gunshot-2',
  'Hannah Honor': 'human-gunshot-3',
  'Nurse Tender': 'human-gunshot-4',
  // Aliens
  "Elder K'tharr": 'alien-weapon-1',
  'Pilot Frnuhuh': 'alien-weapon-2',
  'Mutant Vor': 'alien-weapon-3',
  'Warlord Vekkor': 'alien-weapon-4',
};

export class SoundManager {
  private sounds: Map<SoundEffect, HTMLAudioElement> = new Map();
  private volume: number = 0.3; // 30% volume

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds(): void {
    const soundFiles: Record<SoundEffect, string> = {
      // Alien voices
      'alien-voice-1': '/sounds/Alien-voice-1.mp3',
      'alien-voice-2': '/sounds/alien-voice-2.mp3',
      'alien-voice-3': '/sounds/alien-voice-3.mp3',
      'alien-voice-4': '/sounds/Alien-voice-4.mp3',
      // Human radio voices
      'objective-secure': '/sounds/Objective-secure.mp3',
      'watch-your-ammo': '/sounds/Watch-your-ammo.mp3',
      'fire-at-will': '/sounds/Fire-at-will.mp3',
      'carepackage-inbound': '/sounds/Carepackage-inbound.mp3',
      // Human attack sounds
      'human-automat': '/sounds/Human-automat.mp3',
      'human-gunshot-2': '/sounds/Human-gunshot-2.mp3',
      'human-gunshot-3': '/sounds/Human-gunshot-3.mp3',
      'human-gunshot-4': '/sounds/Human-gunshot-4.mp3',
      // Alien attack sounds
      'alien-weapon-1': '/sounds/alien-weapon-1.mp3',
      'alien-weapon-2': '/sounds/alien-weapon-2.mp3',
      'alien-weapon-3': '/sounds/Alien-weapon-3.mp3',
      'alien-weapon-4': '/sounds/Alien-weapon-4.mp3',
      // Game event sounds
      'human-death': '/sounds/Were-loosing-ground.mp3',
      'alien-death': '/sounds/Objective-secure.mp3',
      'first-human-placed': '/sounds/Youre-on-your-own-good-luck.mp3',
      'humans-win': '/sounds/Mission-accomplished.mp3',
      'humans-lose': '/sounds/Objective-lost.mp3',
      'card-draw': '/sounds/Cardflip.mp3',
      'card-place': '/sounds/Place-card.mp3',
      'ability-trigger': '/sounds/Event.mp3',
      'click-event': '/sounds/Click-on-stuff.mp3',
    };

    for (const [key, path] of Object.entries(soundFiles)) {
      const audio = new Audio(path);
      audio.volume = this.volume;
      audio.preload = 'auto';
      this.sounds.set(key as SoundEffect, audio);
    }
  }

  /**
   * Play a sound effect
   */
  play(sound: SoundEffect): void {
    const audio = this.sounds.get(sound);
    if (audio) {
      // Duck the music while sound plays (minimal buffer after sound ends)
      const duration = (audio.duration || 2) * 1000 + 30;
      getMusicManager().duck(duration);

      // Reset to start if already playing
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Autoplay may be blocked, ignore
      });
    }
  }

  /**
   * Play character selection sound if available
   */
  playCharacterSound(characterName: string): void {
    const sound = CHARACTER_SOUNDS[characterName];
    if (sound) {
      this.play(sound);
    }
  }

  /**
   * Play character attack sound if available
   */
  playAttackSound(characterName: string): void {
    const sound = ATTACK_SOUNDS[characterName];
    if (sound) {
      this.play(sound);
    }
  }

  /**
   * Play sound when a human dies
   */
  playHumanDeathSound(): void {
    this.play('human-death');
  }

  /**
   * Play sound when an alien dies
   */
  playAlienDeathSound(): void {
    this.play('alien-death');
  }

  /**
   * Play sound when first human is placed on the board
   */
  playFirstHumanPlacedSound(): void {
    this.play('first-human-placed');
  }

  /**
   * Play sound when humans win the match
   */
  playHumansWinSound(): void {
    this.play('humans-win');
  }

  /**
   * Play sound when humans lose the match
   */
  playHumansLoseSound(): void {
    this.play('humans-lose');
  }

  /**
   * Play sound when cards are drawn from a deck
   */
  playCardDrawSound(): void {
    this.play('card-draw');
  }

  /**
   * Play sound when a card is placed on the hex board
   */
  playCardPlaceSound(): void {
    this.play('card-place');
  }

  /**
   * Play sound when an ability triggers in battle (orange glow)
   */
  playAbilityTriggerSound(): void {
    this.play('ability-trigger');
  }

  /**
   * Play sound when clicking on event card or skip button
   */
  playClickEventSound(): void {
    this.play('click-event');
  }

  /**
   * Set volume for all sound effects (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    for (const audio of this.sounds.values()) {
      audio.volume = this.volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }
}

// Singleton instance
let soundManagerInstance: SoundManager | null = null;

export function getSoundManager(): SoundManager {
  if (!soundManagerInstance) {
    soundManagerInstance = new SoundManager();
    // Set reference so MusicManager can check effects volume
    setSoundManagerRef(() => soundManagerInstance!);
  }
  return soundManagerInstance;
}
