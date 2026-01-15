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
    
    // New character design from GOALS.md
    
    cards.push({ 
      id: 'h_commander_0', 
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
    });
    
    cards.push({ 
      id: 'h_sniper_0', 
      faction: 'human', 
      name: 'Hannah Honor', 
      type: 'Sniper',
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
    });
    
    cards.push({ 
      id: 'h_medic_0', 
      faction: 'human', 
      name: 'Nurse Tender', 
      type: 'Medic',
      stats: { 
        health: 5, 
        damage: 1, 
        range: 1, 
        attacks: 1, 
        initiative: 4, 
        points: 0,
        rareness: 1,
        ability: 'Adjacent humans has a 30% chance to ressurect when killed. (Applies one time per adjacent human)' 
      } 
    });
    
    cards.push({ 
      id: 'h_soldier_0', 
      faction: 'human', 
      name: 'Heavy Gunner Jack', 
      type: 'Soldier',
      stats: { 
        health: 1, 
        damage: 4, 
        range: 1, 
        attacks: 1, 
        initiative: 1, 
        points: 2,
        rareness: 2
      } 
    });
    
    return cards;
  }

  private createAlienDeck(): CharacterCard[] {
    const cards: CharacterCard[] = [];
    
    // New character design from GOALS.md
    
    cards.push({ 
      id: 'a_soldier_0', 
      faction: 'alien', 
      name: 'Pilot Frnuhuh', 
      type: 'Soldier',
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
    });
    
    cards.push({ 
      id: 'a_commander_0', 
      faction: 'alien', 
      name: 'Elder K\'tharr', 
      type: 'Commander',
      stats: { 
        health: 3, 
        damage: 2, 
        range: 1, 
        attacks: 1, 
        initiative: 1, 
        points: 2,
        rareness: 4,
        ability: 'All adjacent enemies lose 1 range due to psychic interference.' 
      } 
    });
    
    cards.push({ 
      id: 'a_medic_0', 
      faction: 'alien', 
      name: 'Mutant Vor', 
      type: 'Medic',
      stats: { 
        health: 2, 
        damage: 3, 
        range: 1, 
        attacks: 1, 
        initiative: 4, 
        points: 2,
        rareness: 3,
        ability: 'Heals the first attack he receives' 
      } 
    });
    
    cards.push({ 
      id: 'a_sniper_0', 
      faction: 'alien', 
      name: 'Warlord Vekkor', 
      type: 'Sniper',
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
      // Clear drawn cards after placement
      this.state.drawnCards = [];
      this.state.drawnCardsBackup = undefined;
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
          const hex = availableHexes[0];
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
    // Calculate scores
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

    this.state.humanScore = humanScore;
    this.state.alienScore = alienScore;

    // Determine winner
    if (humanScore > alienScore) {
      this.state.winner = 'human';
    } else if (alienScore > humanScore) {
      this.state.winner = 'alien';
    } else {
      this.state.winner = 'tie';
    }

    this.state.phase = 'scoring';
    this.onUpdate();
  }
}