// AI Strategy interface - defines what an AI implementation must provide

import type { CharacterCard, EventCard, Hex, PlacedCharacter, GameState } from '../types';

export interface AIStrategy {
  /**
   * Choose which deck to draw from
   * @param gameState Current game state
   * @returns 'human', 'alien', or 'event'
   */
  chooseWhichDeckToDraw(gameState: GameState): 'human' | 'alien' | 'event';

  /**
   * Choose which card to select from drawn cards
   * @param drawnCards Array of drawn cards to choose from
   * @param gameState Current game state
   * @returns Index of the card to select
   */
  chooseCardFromDrawn(drawnCards: CharacterCard[], gameState: GameState): number;

  /**
   * Choose where to place a card
   * @param card The card being placed
   * @param availableHexes Valid hexes where the card can be placed
   * @param gameState Current game state
   * @returns The hex to place the card on
   */
  chooseHexForCard(card: CharacterCard, availableHexes: Hex[], gameState: GameState): Hex;

  /**
   * Decide whether to skip an event
   * @param event The event card drawn
   * @param skipsRemaining How many skips the AI has left
   * @param gameState Current game state
   * @returns true to skip, false to play
   */
  shouldSkipEvent(event: EventCard, skipsRemaining: number, gameState: GameState): boolean;

  /**
   * Choose a target for an event that requires targeting
   * @param event The event being played
   * @param validTargets Valid targets (characters or hexes depending on event)
   * @param gameState Current game state
   * @returns The chosen target
   */
  chooseEventTarget(
    event: EventCard,
    validTargets: PlacedCharacter[] | Hex[],
    gameState: GameState
  ): PlacedCharacter | Hex | null;

  /**
   * For Swap Places event - choose two characters to swap
   * @param gameState Current game state
   * @returns Tuple of two characters to swap, or null if can't decide
   */
  chooseSwapTargets(gameState: GameState): [PlacedCharacter, PlacedCharacter] | null;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard';
