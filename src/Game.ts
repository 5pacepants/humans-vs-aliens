// Game class to manage state and logic

import type { GameState, CharacterCard, EventCard, Hex, GameMode, AIDifficulty, PlacedCharacter } from './types';
import type { AbilityEvent, AttackEvent, DamageEvent, BlockEvent, DeathEvent, ResurrectEvent, ResultEvent } from './CombatAnimationQueue';
import { CombatAnimationQueue } from './CombatAnimationQueue';
import { computeDerivedStats } from './abilities/AbilityEngine';
import { AIController, AIStrategyMedium } from './ai';

export class Game {
  state: GameState;
  private onUpdate: () => void;
  private aiController?: AIController;
  private combatAnimationQueue?: CombatAnimationQueue;

  constructor(onUpdate: () => void) {
    this.onUpdate = onUpdate;
    this.state = {
      board: [], // Will be set by Board
      humanDeck: this.shuffle(this.createHumanDeck()),
      alienDeck: this.shuffle(this.createAlienDeck()),
      eventDeck: this.createEventDeck(),
      placedCharacters: [],
      currentPlayer: 'human',
      phase: 'menu', // Start at menu to select game mode
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
      eventHistory: [],
      hoverContinueButton: false,
    };
  }

  /**
   * Set game mode and start the game
   */
  setGameMode(mode: GameMode, difficulty?: AIDifficulty): void {
    this.state.gameMode = mode;
    this.state.phase = 'placement';

    if (mode === 'vsComputer') {
      this.state.aiDifficulty = difficulty || 'medium';
      this.state.playerFaction = 'human'; // Player always plays as humans

      // Create AI controller with medium strategy (for now)
      const strategy = new AIStrategyMedium('alien');
      this.aiController = new AIController(strategy, this, 'alien');
    }

    this.onUpdate();
  }

  /**
   * Check if it's the AI's turn
   */
  isAITurn(): boolean {
    return this.state.gameMode === 'vsComputer' &&
           this.aiController?.isAITurn() || false;
  }

  /**
   * Check if AI is currently thinking
   */
  isAIThinking(): boolean {
    return this.aiController?.isThinking() || false;
  }

  /**
   * Trigger AI turn if applicable
   */
  async triggerAITurn(): Promise<void> {
    if (this.aiController && this.isAITurn() && !this.isAIThinking()) {
      this.state.aiThinking = true;
      this.onUpdate();

      await this.aiController.executeTurn();

      this.state.aiThinking = false;

      // Show "Your turn" text after AI completes (only if game is still in placement)
      if (this.state.phase === 'placement' && this.state.currentPlayer === 'human') {
        this.state.aiShowYourTurn = true;
        this.state.aiYourTurnStartTime = Date.now();
        this.onUpdate();

        // Hide after 1.5 seconds
        setTimeout(() => {
          this.state.aiShowYourTurn = false;
          this.state.aiYourTurnStartTime = undefined;
          this.onUpdate();
        }, 1500);
      } else {
        this.onUpdate();
      }
    }
  }

  /**
   * Expose drawEvent for AI controller
   */
  drawEvent(): void {
    this.drawEventInternal();
  }

  private drawEventInternal(): void {
    if (this.state.eventDeck.length > 0) {
      this.state.drawnEvent = this.state.eventDeck.shift()!;
    }
  }

  private createHumanDeck(): CharacterCard[] {
    // Pool av möjliga human-kort
    const pool: CharacterCard[] = [
      {
        id: 'h_commander',
        faction: 'human',
        name: 'General Johnson',
        type: 'Commander',
        image: 'general-johnson',
        stats: {
          health: 3,
          damage: 2,
          range: 2,
          attacks: 2,
          initiative: 3,
          points: 1,
          rareness: 3,
          ability: 'All adjacent humans has +1 attack'
        }
      },
      {
        id: 'h_sniper',
        faction: 'human',
        name: 'Hannah Honor',
        type: 'Sniper',
        image: 'hannah-honor',
        stats: {
          health: 1,
          damage: 1,
          range: 4,
          attacks: 2,
          initiative: 2,
          points: 2,
          rareness: 4,
          ability: 'If only adjacent to one more character, gain +1 damage'
        }
      },
      {
        id: 'h_medic',
        faction: 'human',
        name: 'Nurse Tender',
        type: 'Medic',
        image: 'nurse-tender',
        stats: {
          health: 5,
          damage: 1,
          range: 1,
          attacks: 1,
          initiative: 4,
          points: 0,
          rareness: 1,
          ability: 'Adjacent humans has a 20% chance to ressurect with one HP when killed.'
        }
      },
      {
        id: 'h_soldier',
        faction: 'human',
        name: 'Heavy Gunner Jack',
        type: 'Soldier',
        image: 'heavy-gunner',
        stats: {
          health: 1,
          damage: 4,
          range: 1,
          attacks: 1,
          initiative: 1,
          points: 2,
          rareness: 2,
          ability: 'Has a 50% chance to deal 1 extra damage.'
        }
      }
    ];

    // Skapa en viktad lista baserat på rarity (lägre rarity = vanligare)
    const weighted: CharacterCard[] = [];
    for (const card of pool) {
      // rarity: 1=vanligast, 4=sällsyntast
      const weight = 5 - card.stats.rareness; // 4->1, 1->4
      for (let i = 0; i < weight; i++) {
        weighted.push(card);
      }
    }

    // Dra 20 kort slumpmässigt
    const deck: CharacterCard[] = [];
    for (let i = 0; i < 20; i++) {
      const idx = Math.floor(Math.random() * weighted.length);
      // Kopiera kortet och ge unikt id
      const base = weighted[idx];
      deck.push({
        ...base,
        id: base.id + '_' + i
      });
    }
    return deck;
  }

  private createAlienDeck(): CharacterCard[] {
    // Pool av möjliga alien-kort
    const pool: CharacterCard[] = [
      {
        id: 'a_soldier',
        faction: 'alien',
        name: 'Pilot Frnuhuh',
        type: 'Soldier',
        image: 'Pilot-Frnuhuh',
        stats: {
          health: 2,
          damage: 3,
          range: 1,
          attacks: 2,
          initiative: 2,
          points: 1,
          rareness: 1,
          ability: 'If Frnuhuh has no adjacent aliens, he gains double the number of attacks'
        }
      },
      {
        id: 'a_commander',
        faction: 'alien',
        name: "Elder K'tharr",
        type: 'Commander',
        image: 'elder-ktharr',
        stats: {
          health: 3,
          damage: 2,
          range: 1,
          attacks: 1,
          initiative: 1,
          points: 2,
          rareness: 4,
          ability: 'All adjacent enemies lose 1 range due to psychic interference. (To a minimum of 1 range)'
        }
      },
      {
        id: 'a_medic',
        faction: 'alien',
        name: 'Mutant Vor',
        type: 'Medic',
        image: 'mutant',
        stats: {
          health: 2,
          damage: 3,
          range: 1,
          attacks: 1,
          initiative: 4,
          points: 2,
          rareness: 3,
          ability: 'Blocks the first attack he receives.'
        }
      },
      {
        id: 'a_sniper',
        faction: 'alien',
        name: 'Warlord Vekkor',
        type: 'Sniper',
        image: 'warlord-vekkor',
        stats: {
          health: 2,
          damage: 3,
          range: 5,
          attacks: 1,
          initiative: 3,
          points: 0,
          rareness: 2,
          ability: 'Increases the range of adjacent friendly aliens by +1.'
        }
      }
    ];

    // Skapa en viktad lista baserat på rarity (lägre rarity = vanligare)
    const weighted: CharacterCard[] = [];
    for (const card of pool) {
      const weight = 5 - card.stats.rareness;
      for (let i = 0; i < weight; i++) {
        weighted.push(card);
      }
    }

    // Dra 20 kort slumpmässigt
    const deck: CharacterCard[] = [];
    for (let i = 0; i < 20; i++) {
      const idx = Math.floor(Math.random() * weighted.length);
      const base = weighted[idx];
      deck.push({
        ...base,
        id: base.id + '_' + i
      });
    }
    return deck;
  }

  private getRandomCharacter(faction: 'human' | 'alien'): CharacterCard {
    // Character pools (same as deck creation)
    const humanPool: CharacterCard[] = [
      { id: 'h_commander', faction: 'human', name: 'General Johnson', type: 'Commander', image: 'general-johnson', stats: { health: 3, damage: 2, range: 2, attacks: 2, initiative: 3, points: 1, rareness: 3, ability: 'All adjacent humans has +1 attack' } },
      { id: 'h_sniper', faction: 'human', name: 'Hannah Honor', type: 'Sniper', image: 'hannah-honor', stats: { health: 1, damage: 1, range: 4, attacks: 2, initiative: 2, points: 2, rareness: 4, ability: 'If only adjacent to one more character, gain +1 damage' } },
      { id: 'h_medic', faction: 'human', name: 'Nurse Tender', type: 'Medic', image: 'nurse-tender', stats: { health: 5, damage: 1, range: 1, attacks: 1, initiative: 4, points: 0, rareness: 1, ability: 'Adjacent humans has a 20% chance to ressurect with one HP when killed.' } },
      { id: 'h_soldier', faction: 'human', name: 'Heavy Gunner Jack', type: 'Soldier', image: 'heavy-gunner', stats: { health: 1, damage: 4, range: 1, attacks: 1, initiative: 1, points: 2, rareness: 2, ability: 'Has a 50% chance to deal 1 extra damage.' } }
    ];

    const alienPool: CharacterCard[] = [
      { id: 'a_soldier', faction: 'alien', name: 'Pilot Frnuhuh', type: 'Soldier', image: 'Pilot-Frnuhuh', stats: { health: 2, damage: 3, range: 1, attacks: 2, initiative: 2, points: 1, rareness: 1, ability: 'If Frnuhuh has no adjacent aliens, he gains double the number of attacks' } },
      { id: 'a_commander', faction: 'alien', name: "Elder K'tharr", type: 'Commander', image: 'elder-ktharr', stats: { health: 3, damage: 2, range: 1, attacks: 1, initiative: 1, points: 2, rareness: 4, ability: 'All adjacent enemies lose 1 range due to psychic interference. (To a minimum of 1 range)' } },
      { id: 'a_medic', faction: 'alien', name: 'Mutant Vor', type: 'Medic', image: 'mutant', stats: { health: 2, damage: 3, range: 1, attacks: 1, initiative: 4, points: 2, rareness: 3, ability: 'Blocks the first attack he receives.' } },
      { id: 'a_sniper', faction: 'alien', name: 'Warlord Vekkor', type: 'Sniper', image: 'warlord-vekkor', stats: { health: 2, damage: 3, range: 5, attacks: 1, initiative: 3, points: 0, rareness: 2, ability: 'Increases the range of adjacent friendly aliens by +1.' } }
    ];

    const pool = faction === 'human' ? humanPool : alienPool;

    // Create weighted list based on rarity (lower rarity = more common)
    const weighted: CharacterCard[] = [];
    for (const card of pool) {
      const weight = 5 - card.stats.rareness; // rarity 1->weight 4, rarity 4->weight 1
      for (let i = 0; i < weight; i++) {
        weighted.push(card);
      }
    }

    // Pick random card and create unique copy
    const idx = Math.floor(Math.random() * weighted.length);
    const base = weighted[idx];
    return {
      ...base,
      id: base.id + '_summon_' + Date.now()
    };
  }

  drawCards() {
    // Block drawing new cards while an event is pending
    if (this.state.drawnEvent) return;
    // Block drawing if cards are already drawn
    if (this.state.drawnCards.length > 0) return;
    // Block drawing if a card is already selected
    if (this.state.selectedCard) return;
    const deck = this.state.currentPlayer === 'human' ? this.state.humanDeck : this.state.alienDeck;
    if (deck.length > 0) {
      const numToDraw = Math.min(3, deck.length);
      this.state.drawnCards = deck.splice(0, numToDraw); // Draw up to 3
      this.onUpdate();
    }
  }

  selectCard(index: number) {
    const card = this.state.drawnCards[index];
    if (card) {
      this.state.selectedCard = card;
      this.state.drawnCardsBackup = [...this.state.drawnCards]; // Save backup before clearing
      this.state.drawnCards = []; // Clear drawn after selection
      this.onUpdate();
    }
  }

  placeCharacter(q: number, r: number) {
    if (!this.state.selectedCard) return;
    const hex = this.state.board.find(h => h.q === q && h.r === r);
    if (hex && !hex.isMountain && this.canPlaceAt(hex)) {
      this.state.placedCharacters.push({ hex, card: this.state.selectedCard });
      this.state.selectedCard = undefined;
      // Clear drawn cards after placement
      this.state.drawnCards = [];
      this.state.drawnCardsBackup = undefined;
      // Recompute derived stats after placement so hover info shows correct values
      computeDerivedStats(this.state);
      // Draw event card
      this.drawEventInternal();
      // Check if placement done
      const humanPlaced = this.state.placedCharacters.filter(pc => pc.card.faction === 'human').length;
      const alienPlaced = this.state.placedCharacters.filter(pc => pc.card.faction === 'alien').length;
      if (humanPlaced >= 15 && alienPlaced >= 15) {
        this.state.phase = 'combat';
        this.startCombat();
      } else {
        // If an event is pending, defer turn switch until resolved
        if (!this.state.drawnEvent) {
          this.advanceTurn();
        }
      }
      this.onUpdate();
    }
  }

  resolveEvent() {
    // Simple: auto-resolve or skip if possible
    if (this.state.drawnEvent) {
      // For now, just discard
      this.state.drawnEvent = undefined;
      this.advanceTurn();
      this.onUpdate();
    }
  }

  skipEvent() {
    const skips = this.state.currentPlayer === 'human' ? this.state.humanEventSkips : this.state.alienEventSkips;
    if (skips > 0 && this.state.drawnEvent) {
      if (this.state.currentPlayer === 'human') {
        this.state.humanEventSkips--;
      } else {
        this.state.alienEventSkips--;
      }
      this.state.drawnEvent = undefined;
      this.advanceTurn();
      this.onUpdate();
    }
  }

  toggleEventHistory() {
    this.state.showEventHistory = !this.state.showEventHistory;
    this.onUpdate();
  }

  playEvent() {
    if (!this.state.drawnEvent) return;

    const event = this.state.drawnEvent;

    // Identify event by name and execute effect
    if (event.name === 'Thunderstorm') {
      // Deal 1 damage to up to 3 random characters
      if (this.state.placedCharacters.length > 0) {
        const targets = [...this.state.placedCharacters];
        const numTargets = Math.min(3, targets.length);

        this.state.eventHistory.push('⚡ Thunderstorm strikes!');
        console.log('=== THUNDERSTORM STRIKES! ===');

        const hitTargets: string[] = [];
        const deadTargets: string[] = [];

        for (let i = 0; i < numTargets; i++) {
          const randomIndex = Math.floor(Math.random() * targets.length);
          const target = targets.splice(randomIndex, 1)[0];

          // Track event damage for hover display
          target.eventDamage = (target.eventDamage || 0) + 1;

          const oldHealth = target.card.stats.health;
          target.card.stats.health -= 1;
          // Sync derived health so HP display updates
          if (target.derived) {
            target.derived.health = target.card.stats.health;
          }
          const newHealth = target.card.stats.health;

          // Track which events have affected this character
          if (!target.eventEffects) target.eventEffects = [];
          target.eventEffects.push(event);

          hitTargets.push(`${target.card.name} (${oldHealth} → ${newHealth} HP)`);

          if (newHealth <= 0) {
            deadTargets.push(target.card.name);
          }

          console.log(`⚡ ${target.card.name} hit! Health: ${oldHealth} → ${newHealth}`);
        }

        // Log hits to event history
        this.state.eventHistory.push(`  Hits: ${hitTargets.join(', ')}`);

        // Remove dead characters (health <= 0)
        this.state.placedCharacters = this.state.placedCharacters.filter(pc => pc.card.stats.health > 0);

        // Log deaths to event history
        if (deadTargets.length > 0) {
          deadTargets.forEach(name => {
            this.state.eventHistory.push(`  💀 ${name} died from Thunderstorm`);
          });
        }

        console.log('=============================');

        // Recompute derived stats so hover info shows updated health
        computeDerivedStats(this.state);
      }
    }
    // Sandstorm - player selects a target character
    else if (event.name === 'Sandstorm') {
      if (this.state.placedCharacters.length > 0) {
        // Enter targeting mode - player must click a character
        this.state.eventTargetMode = true;
        // Reset preview scale for fresh animation
        this.state.previewScale = undefined;
        this.state.previewTargetScale = undefined;
        this.state.previewScaleStartTime = undefined;
        this.onUpdate();
        return; // Don't clear event yet, wait for target selection
      }
    }
    // Heavy armor - player selects a friendly character to give 1 block
    else if (event.name === 'Heavy armor') {
      const currentFaction = this.state.currentPlayer === 'human' ? 'human' : 'alien';
      const friendlyChars = this.state.placedCharacters.filter(pc => pc.card.faction === currentFaction);
      if (friendlyChars.length > 0) {
        // Enter targeting mode - player must click a friendly character
        this.state.eventTargetMode = true;
        this.state.eventTargetFriendlyOnly = true;
        // Reset preview scale for fresh animation
        this.state.previewScale = undefined;
        this.state.previewTargetScale = undefined;
        this.state.previewScaleStartTime = undefined;
        this.onUpdate();
        return; // Don't clear event yet, wait for target selection
      }
    }
    // Berserk - player selects a friendly character to give +1 damage and -1 health
    else if (event.name === 'Berserk') {
      const currentFaction = this.state.currentPlayer === 'human' ? 'human' : 'alien';
      const friendlyChars = this.state.placedCharacters.filter(pc => pc.card.faction === currentFaction);
      if (friendlyChars.length > 0) {
        // Enter targeting mode - player must click a friendly character
        this.state.eventTargetMode = true;
        this.state.eventTargetFriendlyOnly = true;
        // Reset preview scale for fresh animation
        this.state.previewScale = undefined;
        this.state.previewTargetScale = undefined;
        this.state.previewScaleStartTime = undefined;
        this.onUpdate();
        return; // Don't clear event yet, wait for target selection
      }
    }
    // Execute - player selects any character to kill instantly
    else if (event.name === 'Execute') {
      if (this.state.placedCharacters.length > 0) {
        // Enter targeting mode - player must click a character
        this.state.eventTargetMode = true;
        // Reset preview scale for fresh animation
        this.state.previewScale = undefined;
        this.state.previewTargetScale = undefined;
        this.state.previewScaleStartTime = undefined;
        this.onUpdate();
        return; // Don't clear event yet, wait for target selection
      }
    }
    // Call for a friend - summon random friendly character to empty adjacent hex
    else if (event.name === 'Call for a friend') {
      // Check if there are any empty hexes adjacent to placed characters
      const hasValidTarget = this.state.placedCharacters.some(pc => {
        return this.getAdjacentHexes(pc.hex.q, pc.hex.r).some(adj => {
          const hex = this.state.board.find(h => h.q === adj.q && h.r === adj.r);
          const occupied = this.state.placedCharacters.some(p => p.hex.q === adj.q && p.hex.r === adj.r);
          return hex && !hex.isMountain && !occupied;
        });
      });

      if (hasValidTarget) {
        // Enter targeting mode - player must click an empty adjacent hex
        this.state.eventTargetMode = true;
        this.state.eventTargetEmptyAdjacent = true;
        // Reset preview scale for fresh animation
        this.state.previewScale = undefined;
        this.state.previewTargetScale = undefined;
        this.state.previewScaleStartTime = undefined;
        this.onUpdate();
        return; // Don't clear event yet, wait for target selection
      }
    }
    // Swap places - select two characters to swap positions
    else if (event.name === 'Swap places') {
      if (this.state.placedCharacters.length >= 2) {
        // Enter targeting mode - player must click two characters
        this.state.eventTargetMode = true;
        // Reset swap state
        this.state.swapFirstTarget = undefined;
        this.state.swapSecondTarget = undefined;
        this.state.swapConfirmMode = false;
        // Reset preview scale for fresh animation
        this.state.previewScale = undefined;
        this.state.previewTargetScale = undefined;
        this.state.previewScaleStartTime = undefined;
        this.onUpdate();
        return; // Don't clear event yet, wait for target selection
      }
    }
    // Other events will be added here

    // Clear event and advance turn
    this.state.drawnEvent = undefined;
    this.advanceTurn();
    this.onUpdate();
  }

  applyEventToTarget(q: number, r: number) {
    if (!this.state.eventTargetMode || !this.state.drawnEvent) return;

    const event = this.state.drawnEvent;

    // Handle Swap places two-step targeting
    if (event.name === 'Swap places') {
      const target = this.state.placedCharacters.find(pc => pc.hex.q === q && pc.hex.r === r);
      if (!target) return;

      if (!this.state.swapFirstTarget) {
        // First selection
        this.state.swapFirstTarget = { q, r };
        this.onUpdate();
        return;
      } else if (!this.state.swapSecondTarget) {
        // Second selection - can't be same as first
        if (this.state.swapFirstTarget.q === q && this.state.swapFirstTarget.r === r) {
          return; // Can't swap with itself
        }
        this.state.swapSecondTarget = { q, r };
        this.state.swapConfirmMode = true;
        this.onUpdate();
        return;
      }
      // If both are selected, do nothing (waiting for confirmation)
      return;
    }

    // Handle empty adjacent hex targeting (Call for a friend)
    if (this.state.eventTargetEmptyAdjacent) {
      const hex = this.state.board.find(h => h.q === q && h.r === r);
      const occupied = this.state.placedCharacters.some(pc => pc.hex.q === q && pc.hex.r === r);

      // Must be a valid, non-mountain, empty hex
      if (!hex || hex.isMountain || occupied) return;

      // Must be adjacent to at least one character
      const isAdjacent = this.state.placedCharacters.some(pc => {
        const adjHexes = this.getAdjacentHexes(pc.hex.q, pc.hex.r);
        return adjHexes.some(adj => adj.q === q && adj.r === r);
      });
      if (!isAdjacent) return;

      if (event.name === 'Call for a friend') {
        const currentFaction = this.state.currentPlayer === 'human' ? 'human' : 'alien';
        const newChar = this.getRandomCharacter(currentFaction);

        // Place the new character
        this.state.placedCharacters.push({ hex, card: newChar });

        this.state.eventHistory.push(`👋 Call for a friend! ${newChar.name} joins the battle!`);

        // Recompute derived stats
        computeDerivedStats(this.state);
      }

      // Clear targeting mode and event, advance turn
      this.state.eventTargetMode = false;
      this.state.eventTargetEmptyAdjacent = false;
      this.state.drawnEvent = undefined;
      this.state.previewScale = undefined;
      this.state.previewTargetScale = undefined;
      this.state.previewScaleStartTime = undefined;
      this.advanceTurn();
      this.onUpdate();
      return;
    }

    // Handle character targeting (Sandstorm, Heavy armor, Execute)
    const target = this.state.placedCharacters.find(pc => pc.hex.q === q && pc.hex.r === r);
    if (!target) return;

    // Check friendly-only restriction
    if (this.state.eventTargetFriendlyOnly) {
      const currentFaction = this.state.currentPlayer === 'human' ? 'human' : 'alien';
      if (target.card.faction !== currentFaction) {
        // Can't target enemy with friendly-only event
        return;
      }
    }

    if (event.name === 'Sandstorm') {
      // Apply -1 range debuff using eventModifiers (so it stacks properly with other modifiers)
      const oldRange = target.derived?.range ?? target.card.stats.range;
      if (!target.eventModifiers) target.eventModifiers = [];
      target.eventModifiers.push({ stat: 'range', value: -1, type: 'modifier', description: 'Sandstorm' });

      // Recompute derived stats to get new value
      computeDerivedStats(this.state);
      const newRange = target.derived?.range ?? target.card.stats.range;

      this.state.eventHistory.push(`🌪️ Sandstorm hits ${target.card.name}!`);
      this.state.eventHistory.push(`  Range: ${oldRange} → ${newRange}`);

      // Track which events have affected this character
      if (!target.eventEffects) target.eventEffects = [];
      target.eventEffects.push(event);
    } else if (event.name === 'Heavy armor') {
      // Give target 1 block
      const oldBlock = target.block || 0;
      target.block = oldBlock + 1;

      this.state.eventHistory.push(`🛡️ Heavy armor applied to ${target.card.name}!`);
      this.state.eventHistory.push(`  Block: ${oldBlock} → ${target.block}`);

      // Track which events have affected this character
      if (!target.eventEffects) target.eventEffects = [];
      target.eventEffects.push(event);
    } else if (event.name === 'Berserk') {
      // Give target +1 damage and -1 health using eventModifiers
      if (!target.eventModifiers) target.eventModifiers = [];
      target.eventModifiers.push({ stat: 'damage', value: 1, type: 'modifier', description: 'Berserk' });
      target.eventModifiers.push({ stat: 'health', value: -1, type: 'modifier', description: 'Berserk' });

      // Recompute derived stats first to get new values
      computeDerivedStats(this.state);

      const newDamage = target.derived?.damage ?? target.card.stats.damage;
      const newHealth = target.derived?.health ?? target.card.stats.health;

      this.state.eventHistory.push(`😤 Berserk! ${target.card.name} goes into a frenzy!`);
      this.state.eventHistory.push(`  Damage: ${target.card.stats.damage} → ${newDamage}`);
      this.state.eventHistory.push(`  Health: ${target.card.stats.health} → ${newHealth}`);

      // Check if character died from health loss
      if (newHealth <= 0) {
        this.state.eventHistory.push(`  💀 ${target.card.name} died from the strain!`);
        this.state.placedCharacters = this.state.placedCharacters.filter(pc => pc !== target);
        computeDerivedStats(this.state);
      } else {
        // Track which events have affected this character
        if (!target.eventEffects) target.eventEffects = [];
        target.eventEffects.push(event);
      }
    } else if (event.name === 'Execute') {
      // Kill target instantly
      this.state.eventHistory.push(`💀 Execute! ${target.card.name} is killed!`);

      // Remove from placedCharacters
      this.state.placedCharacters = this.state.placedCharacters.filter(pc => pc !== target);

      // Recompute derived stats
      computeDerivedStats(this.state);
    }

    // Clear targeting mode and event, advance turn
    this.state.eventTargetMode = false;
    this.state.eventTargetFriendlyOnly = false;
    this.state.drawnEvent = undefined;
    // Reset preview scale states
    this.state.previewScale = undefined;
    this.state.previewTargetScale = undefined;
    this.state.previewScaleStartTime = undefined;
    this.advanceTurn();
    this.onUpdate();
  }

  confirmSwap() {
    if (!this.state.swapConfirmMode || !this.state.swapFirstTarget || !this.state.swapSecondTarget) return;

    const first = this.state.placedCharacters.find(
      pc => pc.hex.q === this.state.swapFirstTarget!.q && pc.hex.r === this.state.swapFirstTarget!.r
    );
    const second = this.state.placedCharacters.find(
      pc => pc.hex.q === this.state.swapSecondTarget!.q && pc.hex.r === this.state.swapSecondTarget!.r
    );

    if (first && second) {
      // Swap the hex references
      const tempHex = first.hex;
      first.hex = second.hex;
      second.hex = tempHex;

      this.state.eventHistory.push(`🔄 Swap places! ${first.card.name} and ${second.card.name} switched positions!`);

      // Recompute derived stats
      computeDerivedStats(this.state);
    }

    // Clear all swap and event state
    this.clearSwapState();
    this.state.eventTargetMode = false;
    this.state.drawnEvent = undefined;
    this.state.previewScale = undefined;
    this.state.previewTargetScale = undefined;
    this.state.previewScaleStartTime = undefined;
    this.advanceTurn();
    this.onUpdate();
  }

  cancelSwap() {
    // Clear swap state but keep the event card (return it to draw position)
    this.clearSwapState();
    this.state.eventTargetMode = false;
    // Don't clear drawnEvent - the card stays visible
    this.onUpdate();
  }

  private clearSwapState() {
    this.state.swapFirstTarget = undefined;
    this.state.swapSecondTarget = undefined;
    this.state.swapConfirmMode = false;
  }

  update() {
    // Trigger a re-render
    this.onUpdate();
  }

  private startCombat() {
    // Sort placed characters by initiative descending
    this.state.combatOrder = [...this.state.placedCharacters].sort((a, b) => b.card.stats.initiative - a.card.stats.initiative);
    this.state.currentCombatIndex = 0;
  }

  private advanceTurn() {
    // Switch player and increment turn counter
    this.state.currentPlayer = this.state.currentPlayer === 'human' ? 'alien' : 'human';
    this.state.turn++;

    // Trigger AI turn if it's now the AI's turn
    if (this.isAITurn()) {
      // Use setTimeout to allow current stack to complete before AI acts
      setTimeout(() => {
        this.triggerAITurn();
      }, 100);
    }
  }

  selectAttacker(q: number, r: number) {
    if (this.state.phase !== 'combat') return;
    const pc = this.state.placedCharacters.find(p => p.hex.q === q && p.hex.r === r);
    if (pc && pc.card.stats.attacks > 0) { // can attack
      this.state.selectedAttacker = pc;
      this.onUpdate();
    }
  }

  attackTarget(q: number, r: number) {
    if (!this.state.selectedAttacker) return;
    const attacker = this.state.selectedAttacker;
    const target = this.state.placedCharacters.find(p => p.hex.q === q && p.hex.r === r);
    if (target && target.card.faction !== attacker.card.faction && this.isInRange(attacker, target)) {
      // Logga attack
      if (this.state.battleLog) {
        this.state.battleLog.push(`${attacker.card.name} attacks ${target.card.name}.`);
      }
      // Deal damage (block absorbs first)
      let damage = attacker.card.stats.attacks;
      if (target.block && target.block > 0) {
        const blockedDamage = Math.min(damage, target.block);
        target.block -= blockedDamage;
        damage -= blockedDamage;
        if (this.state.battleLog) {
          this.state.battleLog.push(`${target.card.name}'s armor blocks ${blockedDamage} damage!`);
        }
        // Remove block from eventEffects if fully consumed
        if (target.block <= 0) {
          target.block = undefined;
          if (target.eventEffects) {
            target.eventEffects = target.eventEffects.filter(e => e.name !== 'Heavy armor');
          }
        }
      }
      if (damage > 0) {
        target.card.stats.health -= damage;
        // Sync derived health so HP display updates
        if (target.derived) {
          target.derived.health = target.card.stats.health;
        }
        if (this.state.battleLog) {
          this.state.battleLog.push(`${target.card.name} loses ${damage} health.`);
        }
      }
      if (target.card.stats.health <= 0) {
        if (this.state.battleLog) {
          this.state.battleLog.push(`${target.card.name} dies.`);
        }
        // Remove from placedCharacters and combatOrder
        this.state.placedCharacters = this.state.placedCharacters.filter(p => p !== target);
        this.state.combatOrder = this.state.combatOrder.filter(co => co !== target);
        // Adjust currentCombatIndex if necessary
        if (this.state.currentCombatIndex >= this.state.combatOrder.length) {
          this.state.currentCombatIndex = this.state.combatOrder.length - 1;
        }
      }
      // Check if one side is eliminated
      const humanAlive = this.state.placedCharacters.some(pc => pc.card.faction === 'human');
      const alienAlive = this.state.placedCharacters.some(pc => pc.card.faction === 'alien');
      if (!humanAlive || !alienAlive) {
        this.calculateScores();
        this.state.phase = 'scoring';
        this.state.selectedAttacker = undefined;
        this.onUpdate();
        return;
      }
      // Clear selectedAttacker
      this.state.selectedAttacker = undefined;
      // Next turn
      this.nextCombatTurn();
      this.onUpdate();
    }
  }

  private nextCombatTurn() {
    this.state.currentCombatIndex++;
    if (this.state.currentCombatIndex >= this.state.combatOrder.length) {
      // All turns done, go to scoring
      this.calculateScores();
      this.state.phase = 'scoring';
    }
  }

  private calculateScores() {
    this.state.humanScore = 0;
    this.state.alienScore = 0;
    for (const pc of this.state.placedCharacters) {
      const hexValue = pc.hex.value;
      if (pc.card.faction === 'human') {
        this.state.humanScore += hexValue;
      } else {
        this.state.alienScore += hexValue;
      }
    }
    if (this.state.humanScore > this.state.alienScore) {
      this.state.winner = 'human';
    } else if (this.state.alienScore > this.state.humanScore) {
      this.state.winner = 'alien';
    } else {
      this.state.winner = 'tie';
    }
  }

  private isInRange(attacker: { hex: Hex; card: CharacterCard }, target: { hex: Hex; card: CharacterCard }): boolean {
    const dq = Math.abs(attacker.hex.q - target.hex.q);
    const dr = Math.abs(attacker.hex.r - target.hex.r);
    const ds = Math.abs((attacker.hex.q + attacker.hex.r) - (target.hex.q + target.hex.r));
    const distance = Math.max(dq, dr, ds);
    return distance <= attacker.card.stats.range;
  }

  private canPlaceAt(hex: any): boolean {
    if (this.state.placedCharacters.length === 0) return true; // First placement anywhere
    // Check adjacency to any existing character
    return this.state.placedCharacters.some(pc =>
      Math.abs(pc.hex.q - hex.q) <= 1 &&
      Math.abs(pc.hex.r - hex.r) <= 1 &&
      Math.abs((pc.hex.q + pc.hex.r) - (hex.q + hex.r)) <= 1
    );
  }

  private getAdjacentHexes(q: number, r: number): { q: number; r: number }[] {
    // The 6 adjacent hexes in axial coordinates
    return [
      { q: q + 1, r: r },
      { q: q - 1, r: r },
      { q: q, r: r + 1 },
      { q: q, r: r - 1 },
      { q: q + 1, r: r - 1 },
      { q: q - 1, r: r + 1 }
    ];
  }

  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private createEventDeck(): EventCard[] {
    const cards: EventCard[] = [];
    // Sandstorm: 8
    for (let i = 0; i < 8; i++) {
      cards.push({ id: `sandstorm_${i}`, name: 'Sandstorm', effect: 'All characters on this tile lose 1 range (to a minimum of 1).' });
    }
    // Swap places: 6
    for (let i = 0; i < 6; i++) {
      cards.push({ id: `swap_${i}`, name: 'Swap places', effect: 'Swap the place of two characters' });
    }
    // Call for a friend: 4
    for (let i = 0; i < 4; i++) {
      cards.push({ id: `friend_${i}`, name: 'Call for a friend', effect: 'Summon a random friendly character to a hex of your choice' });
    }
    // Thunderstorm: 4
    for (let i = 0; i < 4; i++) {
      cards.push({ id: `thunder_${i}`, name: 'Thunderstorm', effect: 'Deal 1 damage to up to 3 random characters, friend or foe.' });
    }
    // Execute: 2
    for (let i = 0; i < 2; i++) {
      cards.push({ id: `execute_${i}`, name: 'Execute', effect: 'Kill a unit' });
    }
    // Heavy armor: 2
    for (let i = 0; i < 2; i++) {
      cards.push({ id: `armor_${i}`, name: 'Heavy armor', effect: 'Give a friendly character 1 block' });
    }
    // Berserk: 2
    for (let i = 0; i < 2; i++) {
      cards.push({ id: `berserk_${i}`, name: 'Berserk', effect: 'Give a friendly character +1 damage and -1 health' });
    }
    return this.shuffle(cards); // Shuffle event deck too
  }

  allCardsPlaced(): boolean {
    // Check if both decks are empty, no drawn cards, no pending event,
    // not in event targeting mode, and not waiting for AI
    const result = this.state.humanDeck.length === 0 &&
           this.state.alienDeck.length === 0 &&
           this.state.drawnCards.length === 0 &&
           !this.state.drawnEvent &&
           !this.state.eventTargetMode &&
           !this.state.aiThinking;

    console.log('allCardsPlaced check:', {
      humanDeck: this.state.humanDeck.length,
      alienDeck: this.state.alienDeck.length,
      drawnCards: this.state.drawnCards.length,
      drawnEvent: !!this.state.drawnEvent,
      eventTargetMode: !!this.state.eventTargetMode,
      aiThinking: !!this.state.aiThinking,
      result
    });

    return result;
  }

  autoPlaceAll() {
    // Automatically place all cards and resolve all events
    while (this.state.humanDeck.length > 0 || this.state.alienDeck.length > 0) {
      // Draw cards for current player
      this.drawCards();
      
      // Pick first card
      if (this.state.drawnCards.length > 0) {
        this.state.selectedCard = this.state.drawnCards[0];
        
        // Find a valid hex to place on
        const availableHexes = this.state.board.filter(h =>
          !h.isMountain &&
          this.canPlaceAt(h) &&
          !this.state.placedCharacters.some(pc => pc.hex.q === h.q && pc.hex.r === h.r)
        );

        if (availableHexes.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableHexes.length);
          const hex = availableHexes[randomIndex];
          this.placeCharacter(hex.q, hex.r);
          
          // Auto-resolve any event that was drawn
          if (this.state.drawnEvent) {
            this.state.drawnEvent = undefined;
            this.advanceTurn();
          }
        }
      }
    }
    
    this.onUpdate();
  }

  startBattle() {
    // Initialize battleLog and combatEvents
    this.state.battleLog = [];
    this.state.combatEvents = [];

    // Compute derived stats with abilities
    computeDerivedStats(this.state);

    // Create names with index for multiple of same type
    const nameCount: Record<string, number> = {};
    const nameMap: Map<CharacterCard, string> = new Map();
    for (const placed of this.state.placedCharacters) {
      const baseName = placed.card.name;
      nameCount[baseName] = (nameCount[baseName] || 0) + 1;
      nameMap.set(placed.card, `${baseName} (${nameCount[baseName]})`);
    }

    // Log abilities based on modifiers (as ability events)
    for (const placed of this.state.placedCharacters) {
      if (placed.modifiers && placed.modifiers.length > 0) {
        for (const modifier of placed.modifiers) {
          if (modifier.source && modifier.stat && modifier.value) {
            const sourceName = nameMap.get(modifier.source.card) || modifier.source.card.name;
            const targetName = nameMap.get(placed.card) || placed.card.name;
            const statName = modifier.stat === 'attacks' ? 'attack' : modifier.stat;
            const isTerrainEffect = modifier.source === placed && modifier.description;

            let message: string;
            if (modifier.type === 'multiplier') {
              message = isTerrainEffect
                ? `${modifier.description} gives ${targetName} x${modifier.value} ${statName}.`
                : `${sourceName} gives ${targetName} x${modifier.value} ${statName}.`;
            } else {
              message = isTerrainEffect
                ? `${modifier.description} gives ${targetName} ${modifier.value > 0 ? '+' : ''}${modifier.value} ${statName}.`
                : `${sourceName} gives ${targetName} ${modifier.value > 0 ? '+' : ''}${modifier.value} ${statName}.`;
            }

            this.state.battleLog.push(message);
            this.state.combatEvents.push({
              type: 'ability',
              message,
              source: modifier.source,
              target: placed,
              abilityName: modifier.description || 'Ability',
              statAffected: statName,
              value: modifier.value,
              isMultiplier: modifier.type === 'multiplier',
            } as AbilityEvent);
          }
        }
      }
    }

    // Sort characters by initiative (highest first)
    const combatOrder = [...this.state.placedCharacters].sort((a, b) => {
      const aInit = a.derived?.initiative ?? a.card.stats.initiative;
      const bInit = b.derived?.initiative ?? b.card.stats.initiative;
      return bInit - aInit;
    });

    // Simulate battle: each character attacks nearest enemy in range
    for (const attacker of combatOrder) {
      // Check if attacker is still alive (not removed and not marked as dead)
      if (!this.state.placedCharacters.includes(attacker) || attacker.isDead) continue;

      const attackerStats = attacker.derived ?? attacker.card.stats;
      const numAttacks = attackerStats.attacks;

      for (let attackNum = 0; attackNum < numAttacks; attackNum++) {
        // Find nearest enemy in range (exclude dead characters)
        const enemies = this.state.placedCharacters.filter(pc => pc.card.faction !== attacker.card.faction && !pc.isDead);
        let closestEnemy: PlacedCharacter | null = null;
        let minDist = Infinity;

        for (const enemy of enemies) {
          const dist = this.hexDistance(attacker.hex, enemy.hex);
          if (dist <= attackerStats.range && dist < minDist) {
            minDist = dist;
            closestEnemy = enemy;
          }
        }

        if (closestEnemy) {
          let damage = attackerStats.damage;
          let bonusDamage = 0;

          // Check for Heavy Gunner Jack ability
          if (attacker.card.name === 'Heavy Gunner Jack' && Math.random() < 0.5) {
            bonusDamage = 1;
            damage += bonusDamage;
          }

          const attackMessage = `${nameMap.get(attacker.card)} attacks ${nameMap.get(closestEnemy.card)} for ${damage} damage.`;
          this.state.battleLog.push(attackMessage);
          this.state.combatEvents.push({
            type: 'attack',
            message: attackMessage,
            attacker,
            attackerHex: { ...attacker.hex },
            target: closestEnemy,
            targetHex: { ...closestEnemy.hex },
            damage,
            bonusDamage: bonusDamage > 0 ? bonusDamage : undefined,
          } as AttackEvent);

          if (bonusDamage > 0) {
            const bonusMessage = `${nameMap.get(attacker.card)} deals ${bonusDamage} bonus damage!`;
            this.state.battleLog.push(bonusMessage);
          }

          // Check for Mutant Vor block
          if (closestEnemy.card.name === 'Mutant Vor' && !closestEnemy.hasBlockedFirstAttack) {
            closestEnemy.hasBlockedFirstAttack = true;
            const blockMessage = `${nameMap.get(closestEnemy.card)} blocks the attack!`;
            this.state.battleLog.push(blockMessage);
            this.state.combatEvents.push({
              type: 'block',
              message: blockMessage,
              blocker: closestEnemy,
              blockerHex: { ...closestEnemy.hex },
            } as BlockEvent);
          } else {
            // Apply damage
            closestEnemy.card.stats.health -= damage;
            // Sync derived health so HP display updates
            if (closestEnemy.derived) {
              closestEnemy.derived.health = closestEnemy.card.stats.health;
            }
            const damageMessage = `${nameMap.get(closestEnemy.card)} loses ${damage} health.`;
            this.state.battleLog.push(damageMessage);
            this.state.combatEvents.push({
              type: 'damage',
              message: damageMessage,
              target: closestEnemy,
              targetHex: { ...closestEnemy.hex },
              damage,
              remainingHealth: closestEnemy.card.stats.health,
            } as DamageEvent);

            // Check for death
            if (closestEnemy.card.stats.health <= 0) {
              const deathMessage = `${nameMap.get(closestEnemy.card)} dies.`;
              this.state.battleLog.push(deathMessage);

              // Check for Nurse Tender resurrection (only living nurses can resurrect)
              let resurrected = false;
              if (closestEnemy.card.faction === 'human') {
                const adjacentNurses = this.state.placedCharacters.filter(pc =>
                  pc.card.name === 'Nurse Tender' &&
                  !pc.isDead &&
                  this.hexDistance(pc.hex, closestEnemy!.hex) === 1
                );

                if (adjacentNurses.length > 0 && Math.random() < 0.2) {
                  closestEnemy.card.stats.health = 1;
                  // Sync derived health so HP display updates
                  if (closestEnemy.derived) {
                    closestEnemy.derived.health = 1;
                  }
                  resurrected = true;
                  const resurrectMessage = `${nameMap.get(closestEnemy.card)} is resurrected by ${nameMap.get(adjacentNurses[0].card)} with 1 HP!`;
                  this.state.battleLog.push(resurrectMessage);
                  this.state.combatEvents.push({
                    type: 'resurrect',
                    message: resurrectMessage,
                    target: closestEnemy,
                    targetHex: { ...closestEnemy.hex },
                    healer: adjacentNurses[0],
                    healerHex: { ...adjacentNurses[0].hex },
                  } as ResurrectEvent);
                }
              }

              if (!resurrected) {
                this.state.combatEvents.push({
                  type: 'death',
                  message: deathMessage,
                  target: closestEnemy,
                  targetHex: { ...closestEnemy.hex },
                } as DeathEvent);
                // Mark as dead but don't remove yet - will be removed after animation
                closestEnemy.isDead = true;
              }
            } else {
              const remainingMessage = `${nameMap.get(closestEnemy.card)} has ${closestEnemy.card.stats.health} remaining.`;
              this.state.battleLog.push(remainingMessage);
            }
          }
        }

        // If no enemies left (excluding dead), break
        if (this.state.placedCharacters.filter(pc => pc.card.faction !== attacker.card.faction && !pc.isDead).length === 0) {
          break;
        }
      }
    }

    // Calculate final scores (only count living characters)
    let humanScore = 0;
    let alienScore = 0;
    for (const placed of this.state.placedCharacters) {
      if (placed.isDead) continue; // Skip dead characters
      const hexPoints = placed.hex.value || 0;
      const cardPoints = placed.card.stats.points;
      const totalPoints = hexPoints + cardPoints;
      if (placed.card.faction === 'human') {
        humanScore += totalPoints;
      } else {
        alienScore += totalPoints;
      }
    }

    let winnerText = '';
    let winner: 'human' | 'alien' | 'tie' = 'tie';
    if (humanScore > alienScore) {
      winnerText = 'Humans win!';
      winner = 'human';
    } else if (alienScore > humanScore) {
      winnerText = 'Aliens win!';
      winner = 'alien';
    } else {
      winnerText = 'Tie!';
    }

    // Add summary to battle log
    this.state.battleLog.push('');
    this.state.battleLog.push('Result:');
    this.state.battleLog.push(`Humans: ${humanScore} points`);
    this.state.battleLog.push(`Aliens: ${alienScore} points`);
    this.state.battleLog.push(winnerText);

    // Add result event
    this.state.combatEvents.push({
      type: 'result',
      message: winnerText,
      humanScore,
      alienScore,
      winner,
    } as ResultEvent);

    // Store scores
    this.state.humanScore = humanScore;
    this.state.alienScore = alienScore;
    this.state.winner = winner;

    // Start combat animation
    this.startCombatAnimation();
  }

  private startCombatAnimation(): void {
    // Create animation queue
    this.combatAnimationQueue = new CombatAnimationQueue(
      () => {
        // Update callback - sync animation state to game state
        if (this.combatAnimationQueue) {
          this.state.combatAnimationState = this.combatAnimationQueue.getState();
        }
        this.onUpdate();
      },
      () => {
        // Complete callback - clean up dead characters and show battle log
        this.state.placedCharacters = this.state.placedCharacters.filter(pc => !pc.isDead);
        this.state.combatAnimationState = undefined;
        this.state.phase = 'battleLog';
        this.onUpdate();
      }
    );

    // Set game state reference for screen shake
    this.combatAnimationQueue.setGameState(this.state);

    // Set events and start playing
    this.combatAnimationQueue.setEvents(this.state.combatEvents || []);
    this.state.phase = 'combatAnimation';
    this.state.combatAnimationState = this.combatAnimationQueue.getState();
    this.combatAnimationQueue.play();
    this.onUpdate();
  }

  // Public methods for animation control
  pauseCombatAnimation(): void {
    this.combatAnimationQueue?.pause();
  }

  resumeCombatAnimation(): void {
    this.combatAnimationQueue?.resume();
  }

  skipCombatAnimation(): void {
    this.combatAnimationQueue?.skip();
  }

  skipCurrentCombatEvent(): void {
    this.combatAnimationQueue?.skipCurrentEvent();
  }

  private hexDistance(a: Hex, b: Hex): number {
    return Math.max(
      Math.abs(a.q - b.q),
      Math.abs(a.r - b.r),
      Math.abs((-a.q - a.r) - (-b.q - b.r))
    );
  }
}