// Combat Animation Queue - manages sequential playback of combat events

import type { Hex, PlacedCharacter, GameState } from './types';

// Event types for combat animation
export type CombatEventType = 'ability' | 'attack' | 'damage' | 'block' | 'death' | 'resurrect' | 'result';

export interface CombatEvent {
  type: CombatEventType;
  message: string; // For battle log display
}

export interface AbilityEvent extends CombatEvent {
  type: 'ability';
  source: PlacedCharacter;
  target: PlacedCharacter;
  abilityName: string;
  statAffected: string;
  value: number;
  isMultiplier: boolean;
}

export interface AttackEvent extends CombatEvent {
  type: 'attack';
  attacker: PlacedCharacter;
  attackerHex: Hex;
  target: PlacedCharacter;
  targetHex: Hex;
  damage: number;
  bonusDamage?: number;
}

export interface DamageEvent extends CombatEvent {
  type: 'damage';
  target: PlacedCharacter;
  targetHex: Hex;
  damage: number;
  remainingHealth: number;
}

export interface BlockEvent extends CombatEvent {
  type: 'block';
  blocker: PlacedCharacter;
  blockerHex: Hex;
}

export interface DeathEvent extends CombatEvent {
  type: 'death';
  target: PlacedCharacter;
  targetHex: Hex;
}

export interface ResurrectEvent extends CombatEvent {
  type: 'resurrect';
  target: PlacedCharacter;
  targetHex: Hex;
  healer: PlacedCharacter;
  healerHex: Hex;
}

export interface ResultEvent extends CombatEvent {
  type: 'result';
  humanScore: number;
  alienScore: number;
  winner: 'human' | 'alien' | 'tie';
}

export type AnyCombatEvent = AbilityEvent | AttackEvent | DamageEvent | BlockEvent | DeathEvent | ResurrectEvent | ResultEvent;

// Animation state for rendering
export interface AnimationState {
  isPlaying: boolean;
  isPaused: boolean;
  currentEventIndex: number;
  currentPhase: 'idle' | 'highlight_attacker' | 'highlight_target' | 'move_attack' | 'show_damage' | 'show_effect' | 'fade_death';
  phaseProgress: number; // 0-1
  phaseStartTime: number;

  // Current animation targets
  highlightedHexes: Array<{
    hex: Hex;
    color: 'blue' | 'red' | 'orange' | 'green';
    intensity: number; // 0-1
  }>;

  // Sprite offset for attack animation
  spriteOffset?: {
    character: PlacedCharacter;
    offsetX: number;
    offsetY: number;
  };

  // Floating damage number
  floatingDamage?: {
    hex: Hex;
    damage: number;
    offsetY: number;
    opacity: number;
  };

  // Death animation
  deathAnimation?: {
    hex: Hex;
    opacity: number; // For X fade-in
    spriteOpacity: number; // For sprite fade-out
  };
}

// Timing configuration (in milliseconds)
export interface AnimationTiming {
  highlightDuration: number;
  attackMoveDuration: number;
  damageDuration: number;
  deathDuration: number;
  delayBetweenEvents: number;
}

const DEFAULT_TIMING: AnimationTiming = {
  highlightDuration: 600,      // Was 300
  attackMoveDuration: 800,     // Was 400
  damageDuration: 1000,        // Was 500
  deathDuration: 1600,         // Was 800
  delayBetweenEvents: 400,     // Was 200
};

export class CombatAnimationQueue {
  private events: AnyCombatEvent[] = [];
  private timing: AnimationTiming;
  private animationState: AnimationState;
  private onUpdate: () => void;
  private onComplete: () => void;
  private animationFrameId: number | null = null;
  private gameState?: GameState;

  constructor(onUpdate: () => void, onComplete: () => void, timing?: Partial<AnimationTiming>) {
    this.timing = { ...DEFAULT_TIMING, ...timing };
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.animationState = this.createInitialState();
  }

  setGameState(gameState: GameState): void {
    this.gameState = gameState;
  }

  /**
   * Trigger screen shake effect
   */
  private triggerScreenShake(intensity: number = 8, duration: number = 300): void {
    if (!this.gameState) return;

    this.gameState.screenShake = {
      intensity,
      offsetX: 0,
      offsetY: 0,
      startTime: performance.now(),
      duration
    };
  }

  private createInitialState(): AnimationState {
    return {
      isPlaying: false,
      isPaused: false,
      currentEventIndex: -1,
      currentPhase: 'idle',
      phaseProgress: 0,
      phaseStartTime: 0,
      highlightedHexes: [],
    };
  }

  setEvents(events: AnyCombatEvent[]): void {
    this.events = events;
    this.animationState = this.createInitialState();
  }

  getEvents(): AnyCombatEvent[] {
    return this.events;
  }

  getState(): AnimationState {
    return this.animationState;
  }

  play(): void {
    if (this.events.length === 0) {
      this.onComplete();
      return;
    }

    this.animationState.isPlaying = true;
    this.animationState.isPaused = false;

    if (this.animationState.currentEventIndex < 0) {
      this.animationState.currentEventIndex = 0;
      this.startEventAnimation(this.events[0]);
    }

    this.tick();
  }

  pause(): void {
    this.animationState.isPaused = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume(): void {
    if (this.animationState.isPlaying) {
      this.animationState.isPaused = false;
      this.animationState.phaseStartTime = performance.now() - (this.animationState.phaseProgress * this.getCurrentPhaseDuration());
      this.tick();
    }
  }

  skip(): void {
    // Skip to end - show battle log immediately
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.animationState = this.createInitialState();
    this.onComplete();
  }

  skipCurrentEvent(): void {
    this.advanceToNextEvent();
  }

  private tick = (): void => {
    if (!this.animationState.isPlaying || this.animationState.isPaused) {
      return;
    }

    const now = performance.now();
    const elapsed = now - this.animationState.phaseStartTime;
    const duration = this.getCurrentPhaseDuration();

    this.animationState.phaseProgress = Math.min(elapsed / duration, 1);

    // Update animation values based on current phase
    this.updateAnimationValues();

    // Trigger render
    this.onUpdate();

    // Check if phase is complete
    if (this.animationState.phaseProgress >= 1) {
      this.advancePhase();
    } else {
      this.animationFrameId = requestAnimationFrame(this.tick);
    }
  };

  private getCurrentPhaseDuration(): number {
    const event = this.events[this.animationState.currentEventIndex];
    if (!event) return this.timing.delayBetweenEvents;

    switch (this.animationState.currentPhase) {
      case 'highlight_attacker':
      case 'highlight_target':
        return this.timing.highlightDuration;
      case 'move_attack':
        return this.timing.attackMoveDuration;
      case 'show_damage':
        return this.timing.damageDuration;
      case 'show_effect':
        return this.timing.highlightDuration;
      case 'fade_death':
        return this.timing.deathDuration;
      case 'idle':
      default:
        return this.timing.delayBetweenEvents;
    }
  }

  private startEventAnimation(event: AnyCombatEvent): void {
    this.animationState.phaseStartTime = performance.now();
    this.animationState.phaseProgress = 0;
    this.animationState.highlightedHexes = [];
    this.animationState.spriteOffset = undefined;
    this.animationState.floatingDamage = undefined;
    this.animationState.deathAnimation = undefined;

    switch (event.type) {
      case 'ability':
        this.animationState.currentPhase = 'show_effect';
        this.animationState.highlightedHexes = [
          { hex: event.source.hex, color: 'orange', intensity: 0 },
          { hex: event.target.hex, color: 'orange', intensity: 0 },
        ];
        break;

      case 'attack':
        this.animationState.currentPhase = 'highlight_attacker';
        this.animationState.highlightedHexes = [
          { hex: event.attackerHex, color: 'blue', intensity: 0 },
        ];
        break;

      case 'damage':
        this.animationState.currentPhase = 'show_damage';
        this.animationState.highlightedHexes = [
          { hex: event.targetHex, color: 'red', intensity: 0 },
        ];
        this.animationState.floatingDamage = {
          hex: event.targetHex,
          damage: event.damage,
          offsetY: 0,
          opacity: 1,
        };
        // Trigger screen shake - intensity based on damage
        const shakeIntensity = Math.min(event.damage * 3, 15);
        this.triggerScreenShake(shakeIntensity, 250);
        break;

      case 'block':
        this.animationState.currentPhase = 'show_effect';
        this.animationState.highlightedHexes = [
          { hex: event.blockerHex, color: 'blue', intensity: 0 },
        ];
        break;

      case 'death':
        this.animationState.currentPhase = 'fade_death';
        this.animationState.deathAnimation = {
          hex: event.targetHex,
          opacity: 0,
          spriteOpacity: 1,
        };
        break;

      case 'resurrect':
        this.animationState.currentPhase = 'show_effect';
        this.animationState.highlightedHexes = [
          { hex: event.healerHex, color: 'green', intensity: 0 },
          { hex: event.targetHex, color: 'green', intensity: 0 },
        ];
        break;

      case 'result':
        // Result doesn't need animation, just advance
        this.animationState.currentPhase = 'idle';
        break;
    }
  }

  private updateAnimationValues(): void {
    const progress = this.animationState.phaseProgress;
    const event = this.events[this.animationState.currentEventIndex];
    if (!event) return;

    // Easing function (ease-out cubic)
    const eased = 1 - Math.pow(1 - progress, 3);

    // Update highlight intensities
    for (const highlight of this.animationState.highlightedHexes) {
      if (this.animationState.currentPhase === 'show_effect' ||
          this.animationState.currentPhase === 'highlight_attacker' ||
          this.animationState.currentPhase === 'highlight_target') {
        // Pulse effect: fade in then fade out
        highlight.intensity = progress < 0.5
          ? progress * 2
          : (1 - progress) * 2;
      } else {
        highlight.intensity = eased;
      }
    }

    // Update attack move animation
    if (this.animationState.currentPhase === 'move_attack' && event.type === 'attack') {
      const attackEvent = event as AttackEvent;
      // Calculate direction to target
      const dx = attackEvent.targetHex.q - attackEvent.attackerHex.q;
      const dy = attackEvent.targetHex.r - attackEvent.attackerHex.r;

      // Move halfway toward target and back
      const moveProgress = progress < 0.5
        ? progress * 2
        : (1 - progress) * 2;

      // Convert hex offset to pixel offset (approximate)
      const pixelScale = 50; // Adjust based on hex size
      this.animationState.spriteOffset = {
        character: attackEvent.attacker,
        offsetX: dx * moveProgress * pixelScale * 0.5,
        offsetY: dy * moveProgress * pixelScale * 0.3,
      };
    }

    // Update floating damage
    if (this.animationState.floatingDamage) {
      this.animationState.floatingDamage.offsetY = -30 * eased;
      this.animationState.floatingDamage.opacity = 1 - (progress * 0.5);
    }

    // Update death animation
    if (this.animationState.deathAnimation) {
      this.animationState.deathAnimation.opacity = Math.min(progress * 2, 1); // X fades in
      this.animationState.deathAnimation.spriteOpacity = Math.max(1 - progress, 0); // Sprite fades out
    }
  }

  private advancePhase(): void {
    const event = this.events[this.animationState.currentEventIndex];
    if (!event) {
      this.advanceToNextEvent();
      return;
    }

    // Determine next phase based on current phase and event type
    switch (event.type) {
      case 'attack':
        if (this.animationState.currentPhase === 'highlight_attacker') {
          // Move to highlight target
          this.animationState.currentPhase = 'highlight_target';
          this.animationState.phaseStartTime = performance.now();
          this.animationState.phaseProgress = 0;
          this.animationState.highlightedHexes = [
            { hex: (event as AttackEvent).attackerHex, color: 'blue', intensity: 1 },
            { hex: (event as AttackEvent).targetHex, color: 'red', intensity: 0 },
          ];
          this.animationFrameId = requestAnimationFrame(this.tick);
          return;
        } else if (this.animationState.currentPhase === 'highlight_target') {
          // Move to attack animation
          this.animationState.currentPhase = 'move_attack';
          this.animationState.phaseStartTime = performance.now();
          this.animationState.phaseProgress = 0;
          this.animationFrameId = requestAnimationFrame(this.tick);
          return;
        }
        break;
    }

    // Default: advance to next event
    this.advanceToNextEvent();
  }

  private advanceToNextEvent(): void {
    this.animationState.currentEventIndex++;

    if (this.animationState.currentEventIndex >= this.events.length) {
      // All events complete
      this.animationState.isPlaying = false;
      this.animationState.currentPhase = 'idle';
      this.animationState.highlightedHexes = [];
      this.animationState.spriteOffset = undefined;
      this.animationState.floatingDamage = undefined;
      this.animationState.deathAnimation = undefined;
      this.onUpdate();
      this.onComplete();
      return;
    }

    // Start next event with a small delay
    this.animationState.currentPhase = 'idle';
    this.animationState.phaseStartTime = performance.now();
    this.animationState.phaseProgress = 0;
    this.animationState.highlightedHexes = [];

    setTimeout(() => {
      if (this.animationState.isPlaying && !this.animationState.isPaused) {
        this.startEventAnimation(this.events[this.animationState.currentEventIndex]);
        this.animationFrameId = requestAnimationFrame(this.tick);
      }
    }, this.timing.delayBetweenEvents);
  }

  // Get current event for UI display
  getCurrentEvent(): AnyCombatEvent | null {
    if (this.animationState.currentEventIndex >= 0 &&
        this.animationState.currentEventIndex < this.events.length) {
      return this.events[this.animationState.currentEventIndex];
    }
    return null;
  }

  // Get all messages up to current event for running battle log
  getMessagesUpToCurrent(): string[] {
    const messages: string[] = [];
    for (let i = 0; i <= this.animationState.currentEventIndex && i < this.events.length; i++) {
      messages.push(this.events[i].message);
    }
    return messages;
  }
}
