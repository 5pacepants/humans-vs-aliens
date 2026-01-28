// Basic types for Humans vs Aliens MVP

import type { AbilityEffect } from './abilities/types';

export type HexTerrain = 'grass' | 'water' | 'forest' | 'toxic' | 'mountain';

// Card types for both factions
export type CardType = 
  // Human types
  | 'Soldier' | 'Medic' | 'Tank' | 'Sniper' | 'Scout' | 'Commander' | 'Engineer'
  // Alien types
  | 'Drone' | 'Parasite' | 'Beast' | 'Mutant' | 'Overlord' | 'Broodmother' | 'Hunter';

export interface Hex {
  q: number; // axial coordinate q
  r: number; // axial coordinate r
  value: number; // scoring value, 0 if no value
  isMountain?: boolean; // if true, it's a mountain instead of value
  terrain: HexTerrain; // visual terrain type
}

export interface CharacterStats {
  health: number;
  damage: number; // attack damage value
  attacks: number;
  range: number;
  initiative: number;
  points: number; // end-game points
  rareness: number; // 1=common, 4=rare
  ability?: string; // simple passive ability
}

export interface CharacterCard {
  id: string;
  faction: 'human' | 'alien';
  name: string; // Specific name like "General Johnson"
  type: CardType; // Card type like "Commander", "Soldier", etc.
  stats: CharacterStats;
  image?: string; // Optional custom character image filename (without extension)
}

export interface EventCard {
  id: string;
  name: string;
  effect: string; // description of effect
}

export interface PlacedCharacter {
  hex: Hex;
  card: CharacterCard;
  modifiers?: AbilityEffect[]; // ability modifiers applied to this unit
  derived?: CharacterStats; // computed stats after applying modifiers
  hasBlockedFirstAttack?: boolean; // for Mutant Vor ability
  eventDamage?: number; // damage taken from events (for display in hover info)
  eventEffects?: EventCard[]; // events that have affected this character
  block?: number; // damage absorption from Heavy armor event
}

export interface GameState {
  board: Hex[];
  humanDeck: CharacterCard[];
  alienDeck: CharacterCard[];
  eventDeck: EventCard[];
  placedCharacters: PlacedCharacter[];
  currentPlayer: 'human' | 'alien';
  phase: 'placement' | 'combat' | 'battleLog' | 'scoring';
    hoverContinueButton?: boolean; // hovered continue button in battle log modal
  turn: number;
  drawnCards: CharacterCard[]; // current drawn cards for selection
  drawnCardsBackup?: CharacterCard[]; // backup of all drawn cards for right-click restore
  selectedCard?: CharacterCard; // selected for placement
  humanEventSkips: number; // 3 for human
  alienEventSkips: number; // 3 for alien
  drawnEvent?: EventCard; // current drawn event
  eventTargetMode?: boolean; // true when player needs to select a target for an event
  eventTargetFriendlyOnly?: boolean; // true when event can only target friendly characters
  eventTargetEmptyAdjacent?: boolean; // true when event targets empty hex adjacent to any character
  hoverPile?: 'human' | 'alien' | 'event'; // hovered pile
  hoverCardIndex?: number; // index of hovered drawn card
  hoverHex?: { q: number; r: number }; // hovered hex
  hoverDrawnEvent?: boolean; // hovered event card
  hoverSkip?: boolean; // hovered skip button
  hoverBattleButton?: boolean; // hovered battle button
  hoverCardScale?: number; // current scale of hovered card (for animation)
  hoverStartTime?: number; // timestamp when hover started
  previewScale?: number; // current scale of card preview when dragging
  previewTargetScale?: number; // target scale for preview animation
  previewScaleStartTime?: number; // timestamp when preview scale animation started
  mouseX: number;
  mouseY: number;
  combatOrder: PlacedCharacter[]; // sorted by initiative
  currentCombatIndex: number; // index in combatOrder
  selectedAttacker?: PlacedCharacter; // for selecting attacker in combat
  humanScore: number;
  alienScore: number;
  winner?: 'human' | 'alien' | 'tie';
  battleLog?: string[]; // log of battle events
  eventHistory: string[]; // log of pre-battle events (Thunderstorm, etc.)
  showEventHistory?: boolean; // whether to show event history modal
  hoverEventHistoryButton?: boolean; // hovered event history button
}