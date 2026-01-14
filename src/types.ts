// Basic types for Humans vs Aliens MVP

export interface Hex {
  q: number; // axial coordinate q
  r: number; // axial coordinate r
  value: number; // scoring value, 0 if no value
  isMountain?: boolean; // if true, it's a mountain instead of value
}

export interface CharacterStats {
  health: number;
  attacks: number;
  range: number;
  initiative: number;
  points: number; // end-game points
  ability?: string; // simple passive ability
}

export interface CharacterCard {
  id: string;
  faction: 'human' | 'alien';
  name: string;
  stats: CharacterStats;
}

export interface EventCard {
  id: string;
  name: string;
  effect: string; // description of effect
}

export interface GameState {
  board: Hex[];
  humanDeck: CharacterCard[];
  alienDeck: CharacterCard[];
  eventDeck: EventCard[];
  placedCharacters: { hex: Hex; card: CharacterCard }[];
  currentPlayer: 'human' | 'alien';
  phase: 'placement' | 'combat' | 'scoring';
  turn: number;
  drawnCards: CharacterCard[]; // current drawn cards for selection
  selectedCard?: CharacterCard; // selected for placement
  humanEventSkips: number; // 3 for human
  alienEventSkips: number; // 3 for alien
  drawnEvent?: EventCard; // current drawn event
  hoverPile?: 'human' | 'alien' | 'event'; // hovered pile
  hoverCardIndex?: number; // index of hovered drawn card
  hoverHex?: { q: number; r: number }; // hovered hex
  mouseX: number;
  mouseY: number;
  combatOrder: { hex: Hex; card: CharacterCard }[]; // sorted by initiative
  currentCombatIndex: number; // index in combatOrder
  selectedAttacker?: { hex: Hex; card: CharacterCard }; // for selecting attacker in combat
  humanScore: number;
  alienScore: number;
  winner?: 'human' | 'alien' | 'tie';
}