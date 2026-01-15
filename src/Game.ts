// Game class to manage state and logic

import type { GameState, CharacterCard, EventCard, Hex } from './types';

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
    };
  }

  private createHumanDeck(): CharacterCard[] {
    const cards: CharacterCard[] = [];
    
    // Example cards with specific names and types
    // You can customize these names and create unique characters
    
    // 5 Soldiers
    cards.push({ 
      id: 'h_soldier_0', 
      faction: 'human', 
      name: 'Corporal Hayes', 
      type: 'Soldier',
      stats: { health: 3, attacks: 1, range: 1, initiative: 3, points: 1 } 
    });
    cards.push({ 
      id: 'h_soldier_1', 
      faction: 'human', 
      name: 'Private Martinez', 
      type: 'Soldier',
      stats: { health: 3, attacks: 1, range: 1, initiative: 3, points: 1 } 
    });
    cards.push({ 
      id: 'h_soldier_2', 
      faction: 'human', 
      name: 'Sergeant Liu', 
      type: 'Soldier',
      stats: { health: 3, attacks: 1, range: 1, initiative: 3, points: 1 } 
    });
    cards.push({ 
      id: 'h_soldier_3', 
      faction: 'human', 
      name: 'Private Jackson', 
      type: 'Soldier',
      stats: { health: 3, attacks: 1, range: 1, initiative: 3, points: 1 } 
    });
    cards.push({ 
      id: 'h_soldier_4', 
      faction: 'human', 
      name: 'Corporal Kim', 
      type: 'Soldier',
      stats: { health: 3, attacks: 1, range: 1, initiative: 3, points: 1, ability: 'If adjacent to one or more aliens, gain 2 strength and 1 attack.' } 
    });
    
    // 4 Medics
    cards.push({ 
      id: 'h_medic_0', 
      faction: 'human', 
      name: 'Dr. Chen', 
      type: 'Medic',
      stats: { health: 2, attacks: 0, range: 0, initiative: 5, points: 2, ability: 'Heal adjacent allies' } 
    });
    cards.push({ 
      id: 'h_medic_1', 
      faction: 'human', 
      name: 'Medic Sarah', 
      type: 'Medic',
      stats: { health: 2, attacks: 0, range: 0, initiative: 5, points: 2, ability: 'Heal adjacent allies' } 
    });
    cards.push({ 
      id: 'h_medic_2', 
      faction: 'human', 
      name: 'Dr. Patel', 
      type: 'Medic',
      stats: { health: 2, attacks: 0, range: 0, initiative: 5, points: 2, ability: 'Heal adjacent allies' } 
    });
    cards.push({ 
      id: 'h_medic_3', 
      faction: 'human', 
      name: 'Nurse Williams', 
      type: 'Medic',
      stats: { health: 2, attacks: 0, range: 0, initiative: 5, points: 2, ability: 'Heal adjacent allies' } 
    });
    
    // 3 Tanks
    cards.push({ 
      id: 'h_tank_0', 
      faction: 'human', 
      name: 'Tank Unit Alpha', 
      type: 'Tank',
      stats: { health: 5, attacks: 1, range: 1, initiative: 2, points: 1 } 
    });
    cards.push({ 
      id: 'h_tank_1', 
      faction: 'human', 
      name: 'Heavy Armor Beta', 
      type: 'Tank',
      stats: { health: 5, attacks: 1, range: 1, initiative: 2, points: 1 } 
    });
    cards.push({ 
      id: 'h_tank_2', 
      faction: 'human', 
      name: 'Tank Unit Gamma', 
      type: 'Tank',
      stats: { health: 5, attacks: 1, range: 1, initiative: 2, points: 1 } 
    });
    
    // 2 Snipers
    cards.push({ 
      id: 'h_sniper_0', 
      faction: 'human', 
      name: 'Eagle Eye Morgan', 
      type: 'Sniper',
      stats: { health: 2, attacks: 1, range: 3, initiative: 4, points: 2 } 
    });
    cards.push({ 
      id: 'h_sniper_1', 
      faction: 'human', 
      name: 'Sharpshooter Elena', 
      type: 'Sniper',
      stats: { health: 2, attacks: 1, range: 3, initiative: 4, points: 2 } 
    });
    
    // 1 Scout
    cards.push({ 
      id: 'h_scout_0', 
      faction: 'human', 
      name: 'Scout Rodriguez', 
      type: 'Scout',
      stats: { health: 1, attacks: 0, range: 0, initiative: 7, points: 1 } 
    });
    
    return cards;
  }

  private createAlienDeck(): CharacterCard[] {
    const cards: CharacterCard[] = [];
    
    // 5 Drones
    cards.push({ 
      id: 'a_drone_0', 
      faction: 'alien', 
      name: 'Drone Alpha-7', 
      type: 'Drone',
      stats: { health: 2, attacks: 1, range: 2, initiative: 2, points: 1 } 
    });
    cards.push({ 
      id: 'a_drone_1', 
      faction: 'alien', 
      name: 'Drone Beta-3', 
      type: 'Drone',
      stats: { health: 2, attacks: 1, range: 2, initiative: 2, points: 1 } 
    });
    cards.push({ 
      id: 'a_drone_2', 
      faction: 'alien', 
      name: 'Drone Gamma-9', 
      type: 'Drone',
      stats: { health: 2, attacks: 1, range: 2, initiative: 2, points: 1 } 
    });
    cards.push({ 
      id: 'a_drone_3', 
      faction: 'alien', 
      name: 'Drone Delta-5', 
      type: 'Drone',
      stats: { health: 2, attacks: 1, range: 2, initiative: 2, points: 1 } 
    });
    cards.push({ 
      id: 'a_drone_4', 
      faction: 'alien', 
      name: 'Drone Epsilon-1', 
      type: 'Drone',
      stats: { health: 2, attacks: 1, range: 2, initiative: 2, points: 1 } 
    });
    
    // 4 Parasites
    cards.push({ 
      id: 'a_parasite_0', 
      faction: 'alien', 
      name: 'Creeper', 
      type: 'Parasite',
      stats: { health: 1, attacks: 1, range: 1, initiative: 6, points: 1 } 
    });
    cards.push({ 
      id: 'a_parasite_1', 
      faction: 'alien', 
      name: 'Crawler', 
      type: 'Parasite',
      stats: { health: 1, attacks: 1, range: 1, initiative: 6, points: 1 } 
    });
    cards.push({ 
      id: 'a_parasite_2', 
      faction: 'alien', 
      name: 'Leech', 
      type: 'Parasite',
      stats: { health: 1, attacks: 1, range: 1, initiative: 6, points: 1 } 
    });
    cards.push({ 
      id: 'a_parasite_3', 
      faction: 'alien', 
      name: 'Infestor', 
      type: 'Parasite',
      stats: { health: 1, attacks: 1, range: 1, initiative: 6, points: 1 } 
    });
    
    // 3 Beasts
    cards.push({ 
      id: 'a_beast_0', 
      faction: 'alien', 
      name: 'Ravager', 
      type: 'Beast',
      stats: { health: 4, attacks: 1, range: 2, initiative: 2, points: 2 } 
    });
    cards.push({ 
      id: 'a_beast_1', 
      faction: 'alien', 
      name: 'Devourer', 
      type: 'Beast',
      stats: { health: 4, attacks: 1, range: 2, initiative: 2, points: 2 } 
    });
    cards.push({ 
      id: 'a_beast_2', 
      faction: 'alien', 
      name: 'Stalker', 
      type: 'Beast',
      stats: { health: 4, attacks: 1, range: 2, initiative: 2, points: 2 } 
    });
    
    // 2 Mutants
    cards.push({ 
      id: 'a_mutant_0', 
      faction: 'alien', 
      name: 'Abomination', 
      type: 'Mutant',
      stats: { health: 3, attacks: 2, range: 1, initiative: 3, points: 1 } 
    });
    cards.push({ 
      id: 'a_mutant_1', 
      faction: 'alien', 
      name: 'Monstrosity', 
      type: 'Mutant',
      stats: { health: 3, attacks: 2, range: 1, initiative: 3, points: 1 } 
    });
    
    // 1 Overlord
    cards.push({ 
      id: 'a_overlord_0', 
      faction: 'alien', 
      name: 'Xar\'thul the Eternal', 
      type: 'Overlord',
      stats: { health: 4, attacks: 2, range: 1, initiative: 1, points: 2 } 
    });
    
    return cards;
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
    const target = this.state.placedCharacters.find(p => p.hex.q === q && p.hex.r === r);
    if (target && target.card.faction !== this.state.selectedAttacker.card.faction && this.isInRange(this.state.selectedAttacker, target)) {
      // Deal damage
      target.card.stats.health -= this.state.selectedAttacker.card.stats.attacks;
      if (target.card.stats.health <= 0) {
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
      cards.push({ id: `sandstorm_${i}`, name: 'Sandstorm', effect: 'Reduces visibility or movement' });
    }
    // Swap places: 6
    for (let i = 0; i < 6; i++) {
      cards.push({ id: `swap_${i}`, name: 'Swap places', effect: 'Swap two characters' });
    }
    // Call for a friend: 4
    for (let i = 0; i < 4; i++) {
      cards.push({ id: `friend_${i}`, name: 'Call for a friend', effect: 'Summon an ally' });
    }
    // Thunderstorm: 4
    for (let i = 0; i < 4; i++) {
      cards.push({ id: `thunder_${i}`, name: 'Thunderstorm', effect: 'Damages units' });
    }
    // Execute: 2
    for (let i = 0; i < 2; i++) {
      cards.push({ id: `execute_${i}`, name: 'Execute', effect: 'Kill a unit' });
    }
    // Heavy armor: 2
    for (let i = 0; i < 2; i++) {
      cards.push({ id: `armor_${i}`, name: 'Heavy armor', effect: 'Increase defense' });
    }
    // Stealth: 2
    for (let i = 0; i < 2; i++) {
      cards.push({ id: `stealth_${i}`, name: 'Stealth', effect: 'Become invisible' });
    }
    // Berserk: 2
    for (let i = 0; i < 2; i++) {
      cards.push({ id: `berserk_${i}`, name: 'Berserk', effect: 'Increase attack but reduce defense' });
    }
    return this.shuffle(cards); // Shuffle event deck too
  }
}