// Game class to manage state and logic

import type { GameState, CharacterCard, EventCard, Hex } from './types';
import { computeDerivedStats } from './abilities/AbilityEngine';

export class Game {
  state: GameState;
  private onUpdate: () => void;

  constructor(onUpdate: () => void) {
    this.onUpdate = onUpdate;
    this.state = {
      board: [], // Will be set by Board
      humanDeck: this.shuffle(this.createHumanDeck()),
      alienDeck: this.shuffle(this.createAlienDeck()),
      eventDeck: this.createEventDeck(),
      placedCharacters: [],
      currentPlayer: 'human',
      phase: 'placement',
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

  private createHumanDeck(): CharacterCard[] {
    // Pool av möjliga human-kort
    const pool: CharacterCard[] = [
      {
        id: 'h_commander',
        faction: 'human',
        name: 'General Johnson',
        type: 'Commander',
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
      { id: 'h_commander', faction: 'human', name: 'General Johnson', type: 'Commander', stats: { health: 3, damage: 2, range: 2, attacks: 2, initiative: 3, points: 1, rareness: 3, ability: 'All adjacent humans has +1 attack' } },
      { id: 'h_sniper', faction: 'human', name: 'Hannah Honor', type: 'Sniper', image: 'hannah-honor', stats: { health: 1, damage: 1, range: 4, attacks: 2, initiative: 2, points: 2, rareness: 4, ability: 'If only adjacent to one more character, gain +1 damage' } },
      { id: 'h_medic', faction: 'human', name: 'Nurse Tender', type: 'Medic', image: 'nurse-tender', stats: { health: 5, damage: 1, range: 1, attacks: 1, initiative: 4, points: 0, rareness: 1, ability: 'Adjacent humans has a 20% chance to ressurect with one HP when killed.' } },
      { id: 'h_soldier', faction: 'human', name: 'Heavy Gunner Jack', type: 'Soldier', image: 'heavy-gunner', stats: { health: 1, damage: 4, range: 1, attacks: 1, initiative: 1, points: 2, rareness: 2, ability: 'Has a 50% chance to deal 1 extra damage.' } }
    ];

    const alienPool: CharacterCard[] = [
      { id: 'a_soldier', faction: 'alien', name: 'Pilot Frnuhuh', type: 'Soldier', image: 'Pilot-Frnuhuh', stats: { health: 2, damage: 3, range: 1, attacks: 2, initiative: 2, points: 1, rareness: 1, ability: 'If Frnuhuh has no adjacent aliens, he gains double the number of attacks' } },
      { id: 'a_commander', faction: 'alien', name: "Elder K'tharr", type: 'Commander', stats: { health: 3, damage: 2, range: 1, attacks: 1, initiative: 1, points: 2, rareness: 4, ability: 'All adjacent enemies lose 1 range due to psychic interference. (To a minimum of 1 range)' } },
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
      this.drawEvent();
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

  private drawEvent() {
    if (this.state.eventDeck.length > 0) {
      this.state.drawnEvent = this.state.eventDeck.shift()!;
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
    // Other events will be added here

    // Clear event and advance turn
    this.state.drawnEvent = undefined;
    this.advanceTurn();
    this.onUpdate();
  }

  applyEventToTarget(q: number, r: number) {
    if (!this.state.eventTargetMode || !this.state.drawnEvent) return;

    const event = this.state.drawnEvent;

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
      // Apply -1 range debuff (stored permanently on the character's base stats)
      const oldRange = target.card.stats.range;
      target.card.stats.range = Math.max(1, oldRange - 1);
      const newRange = target.card.stats.range;

      this.state.eventHistory.push(`🌪️ Sandstorm hits ${target.card.name}!`);
      this.state.eventHistory.push(`  Range: ${oldRange} → ${newRange}`);

      // Track which events have affected this character
      if (!target.eventEffects) target.eventEffects = [];
      target.eventEffects.push(event);

      // Recompute derived stats
      computeDerivedStats(this.state);
    } else if (event.name === 'Heavy armor') {
      // Give target 1 block
      const oldBlock = target.block || 0;
      target.block = oldBlock + 1;

      this.state.eventHistory.push(`🛡️ Heavy armor applied to ${target.card.name}!`);
      this.state.eventHistory.push(`  Block: ${oldBlock} → ${target.block}`);

      // Track which events have affected this character
      if (!target.eventEffects) target.eventEffects = [];
      target.eventEffects.push(event);
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
      cards.push({ id: `berserk_${i}`, name: 'Berserk', effect: 'Give a character 1 damage and -1 health' });
    }
    return this.shuffle(cards); // Shuffle event deck too
  }

  allCardsPlaced(): boolean {
    // Check if both decks are empty, no drawn cards, and no drawn event
    const result = this.state.humanDeck.length === 0 && 
           this.state.alienDeck.length === 0 && 
           this.state.drawnCards.length === 0 &&
           !this.state.drawnEvent;
    
    console.log('allCardsPlaced check:', {
      humanDeck: this.state.humanDeck.length,
      alienDeck: this.state.alienDeck.length,
      drawnCards: this.state.drawnCards.length,
      drawnEvent: !!this.state.drawnEvent,
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
    // Initiera battleLog
    this.state.battleLog = [];

    // Beräkna derived stats med abilities
    computeDerivedStats(this.state);

    // Skapa namn med index om flera av samma typ finns
    const nameCount: Record<string, number> = {};
    const nameMap: Map<CharacterCard, string> = new Map();
    for (const placed of this.state.placedCharacters) {
      const baseName = placed.card.name;
      nameCount[baseName] = (nameCount[baseName] || 0) + 1;
      nameMap.set(placed.card, `${baseName} (${nameCount[baseName]})`);
    }

    // Logga abilities baserat på modifiers
    for (const placed of this.state.placedCharacters) {
      if (placed.modifiers && placed.modifiers.length > 0) {
        for (const modifier of placed.modifiers) {
          if (modifier.source && modifier.stat && modifier.value) {
            const sourceName = nameMap.get(modifier.source.card);
            const targetName = nameMap.get(placed.card);
            // Convert stat name to readable form (e.g., 'attacks' -> 'attack')
            const statName = modifier.stat === 'attacks' ? 'attack' : modifier.stat;

            // Check if this is a terrain effect (source === target with description)
            const isTerrainEffect = modifier.source === placed && modifier.description;

            // Format based on type
            if (modifier.type === 'multiplier') {
              if (isTerrainEffect) {
                this.state.battleLog.push(`${modifier.description} gives ${targetName} x${modifier.value} ${statName}.`);
              } else {
                this.state.battleLog.push(`${sourceName} gives ${targetName} x${modifier.value} ${statName}.`);
              }
            } else {
              if (isTerrainEffect) {
                this.state.battleLog.push(`${modifier.description} gives ${targetName} ${modifier.value > 0 ? '+' : ''}${modifier.value} ${statName}.`);
              } else {
                this.state.battleLog.push(`${sourceName} gives ${targetName} ${modifier.value > 0 ? '+' : ''}${modifier.value} ${statName}.`);
              }
            }
          }
        }
      }
    }

    // Sortera alla placerade karaktärer efter initiativ (högst först)
    let combatOrder = [...this.state.placedCharacters].sort((a, b) => {
      const aInit = a.derived?.initiative ?? a.card.stats.initiative;
      const bInit = b.derived?.initiative ?? b.card.stats.initiative;
      return bInit - aInit;
    });

    // Simulera striden: varje karaktär attackerar närmast motståndare inom range
    for (const attacker of combatOrder) {
      const attackerStats = attacker.derived ?? attacker.card.stats;
      const numAttacks = attackerStats.attacks;
      for (let attackNum = 0; attackNum < numAttacks; attackNum++) {
        // Hitta närmaste motståndare inom range
        const enemies = this.state.placedCharacters.filter(pc => pc.card.faction !== attacker.card.faction);
        let closestEnemy = null;
        let minDist = Infinity;
        for (const enemy of enemies) {
          const dist = this.hexDistance(attacker.hex, enemy.hex);
          if (dist <= attackerStats.range && dist < minDist) {
            minDist = dist;
            closestEnemy = enemy;
          }
        }
        if (closestEnemy) {
          // Logga attack med damage och indexnamn
          let damage = attackerStats.damage;

          // Check for Heavy Gunner Jack ability - 50% chance for +1 damage
          let bonusDamage = 0;
          if (attacker.card.name === 'Heavy Gunner Jack' && Math.random() < 0.5) {
            bonusDamage = 1;
            damage += bonusDamage;
          }

          this.state.battleLog.push(`${nameMap.get(attacker.card)} attacks ${nameMap.get(closestEnemy.card)} for ${damage} damage.`);

          // Log bonus damage if it procced
          if (bonusDamage > 0) {
            this.state.battleLog.push(`${nameMap.get(attacker.card)} deals ${bonusDamage} bonus damage!`);
          }

          // Check for Mutant Vor block ability
          if (closestEnemy.card.name === 'Mutant Vor' && !closestEnemy.hasBlockedFirstAttack) {
            // Block the first attack completely
            closestEnemy.hasBlockedFirstAttack = true;
            this.state.battleLog.push(`${nameMap.get(closestEnemy.card)} blocks the attack!`);
          } else {
            // Skada
            closestEnemy.card.stats.health -= damage;
            this.state.battleLog.push(`${nameMap.get(closestEnemy.card)} loses ${damage} health.`);

            // Dödsfall eller återstående health
            if (closestEnemy.card.stats.health <= 0) {
              this.state.battleLog.push(`${nameMap.get(closestEnemy.card)} dies.`);

              // Check for Nurse Tender resurrection
              let resurrected = false;
              if (closestEnemy.card.faction === 'human') {
                // Find adjacent Nurse Tenders
                const adjacentNurses = this.state.placedCharacters.filter(pc =>
                  pc.card.name === 'Nurse Tender' &&
                  this.hexDistance(pc.hex, closestEnemy.hex) === 1
                );

                // If there's at least one adjacent Nurse Tender, try resurrection
                if (adjacentNurses.length > 0) {
                  // 20% chance to resurrect
                  if (Math.random() < 0.2) {
                    closestEnemy.card.stats.health = 1;
                    resurrected = true;
                    this.state.battleLog.push(`${nameMap.get(closestEnemy.card)} is resurrected by ${nameMap.get(adjacentNurses[0].card)} with 1 HP!`);
                  }
                }
              }

              // Remove from placed characters if not resurrected
              if (!resurrected) {
                this.state.placedCharacters = this.state.placedCharacters.filter(pc => pc !== closestEnemy);
              }
            } else {
              this.state.battleLog.push(`${nameMap.get(closestEnemy.card)} has ${closestEnemy.card.stats.health} remaining.`);
            }
          }
        }
        // Om inga fiender kvar, bryt attacker
        if (this.state.placedCharacters.filter(pc => pc.card.faction !== attacker.card.faction).length === 0) {
          break;
        }
      }
    }

    // Beräkna slutpoäng och vinnare efter striden
    let humanScore = 0;
    let alienScore = 0;
    for (const placed of this.state.placedCharacters) {
      const hexPoints = placed.hex.value || 0;
      const cardPoints = placed.card.stats.points;
      const totalPoints = hexPoints + cardPoints;
      if (placed.card.faction === 'human') {
        humanScore += totalPoints;
      } else {
        alienScore += totalPoints;
      }
    }
    let winner = '';
    if (humanScore > alienScore) {
      winner = 'Humans win!';
    } else if (alienScore > humanScore) {
      winner = 'Aliens win!';
    } else {
      winner = 'Tie!';
    }
    // Lägg till summering i battle log
    this.state.battleLog.push('');
    this.state.battleLog.push('Result:');
    this.state.battleLog.push(`Humans: ${humanScore} points`);
    this.state.battleLog.push(`Aliens: ${alienScore} points`);
    this.state.battleLog.push(winner);

    // När loggen är klar, visa den för spelaren innan scoring
    this.state.phase = 'battleLog';
    this.onUpdate();
  }

  private hexDistance(a: Hex, b: Hex): number {
    return Math.max(
      Math.abs(a.q - b.q),
      Math.abs(a.r - b.r),
      Math.abs((-a.q - a.r) - (-b.q - b.r))
    );
  }
}