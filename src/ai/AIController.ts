// AI Controller - manages AI turns with appropriate delays

import type { AIStrategy } from './AIStrategy';
import type { Game } from '../Game';
import type { Hex, PlacedCharacter } from '../types';

export class AIController {
  private strategy: AIStrategy;
  private game: Game;
  private aiFaction: 'human' | 'alien';
  private isProcessing: boolean = false;
  private turnDelay: number = 1200; // ms between major actions (slower for visibility)
  private actionDelay: number = 800; // ms between minor actions (slower for visibility)
  private highlightDelay: number = 1000; // ms to show highlight before acting

  constructor(strategy: AIStrategy, game: Game, aiFaction: 'human' | 'alien' = 'alien') {
    this.strategy = strategy;
    this.game = game;
    this.aiFaction = aiFaction;
  }

  /**
   * Check if it's the AI's turn
   */
  isAITurn(): boolean {
    return this.game.state.currentPlayer === this.aiFaction &&
           this.game.state.phase === 'placement';
  }

  /**
   * Check if AI is currently processing
   */
  isThinking(): boolean {
    return this.isProcessing;
  }

  /**
   * Execute the AI's turn
   */
  async executeTurn(): Promise<void> {
    if (this.isProcessing) return;
    if (!this.isAITurn()) return;

    this.isProcessing = true;

    try {
      // Step 1: Draw cards from our deck
      // Note: Events are drawn automatically after card placement, not before
      await this.delay(this.turnDelay);

      // Check if it's still our turn (might have changed if something went wrong)
      if (!this.isAITurn()) {
        return;
      }

      this.simulateDrawCards();

      // Step 2: Wait for cards to be visible
      await this.delay(this.actionDelay);

      // Step 3: Select a card with highlight
      if (this.game.state.drawnCards.length > 0) {
        const cardIndex = this.strategy.chooseCardFromDrawn(
          this.game.state.drawnCards,
          this.game.state
        );

        // Highlight the selected card with neon glow
        this.game.state.aiHighlightedCardIndex = cardIndex;
        this.game.update();
        await this.delay(this.highlightDelay);

        // Now select the card
        this.game.selectCard(cardIndex);
        this.game.state.aiHighlightedCardIndex = undefined;

        await this.delay(this.actionDelay);

        // Step 4: Choose placement hex
        const selectedCard = this.game.state.selectedCard;
        if (selectedCard) {
          const availableHexes = this.getAvailableHexes();

          if (availableHexes.length > 0) {
            const targetHex = this.strategy.chooseHexForCard(
              selectedCard,
              availableHexes,
              this.game.state
            );

            await this.delay(this.actionDelay);

            // Place the card
            this.game.placeCharacter(targetHex.q, targetHex.r);

            // Handle any event that was drawn after placement
            await this.delay(this.actionDelay);
            if (this.game.state.drawnEvent) {
              await this.handleEvent();
            }
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle an event card that was drawn
   */
  private async handleEvent(): Promise<void> {
    const event = this.game.state.drawnEvent;
    if (!event) return;

    const skipsRemaining = this.aiFaction === 'human'
      ? this.game.state.humanEventSkips
      : this.game.state.alienEventSkips;

    // Decide whether to skip
    const shouldSkip = this.strategy.shouldSkipEvent(event, skipsRemaining, this.game.state);

    // Show highlight on event card or skip button based on decision
    if (shouldSkip) {
      this.game.state.aiHighlightedAction = 'skip';
    } else {
      this.game.state.aiHighlightedAction = 'play';
    }
    this.game.update();
    await this.delay(this.highlightDelay);

    // Clear highlight and execute
    this.game.state.aiHighlightedAction = undefined;

    if (shouldSkip) {
      this.game.skipEvent();
      this.game.update();
      return;
    }

    // Play the event
    // For events that need targeting, the playEvent will set eventTargetMode
    this.game.playEvent();

    // Handle targeting if needed
    if (this.game.state.eventTargetMode) {
      await this.delay(this.actionDelay);
      await this.handleEventTargeting(event);
    }
  }

  /**
   * Handle event targeting for events that require it
   */
  private async handleEventTargeting(event: { name: string }): Promise<void> {
    // Handle Swap Places specially (needs two targets)
    if (event.name === 'Swap places') {
      const swapTargets = this.strategy.chooseSwapTargets(this.game.state);
      if (swapTargets) {
        // Select first target
        this.game.applyEventToTarget(swapTargets[0].hex.q, swapTargets[0].hex.r);
        await this.delay(this.actionDelay);

        // Select second target
        this.game.applyEventToTarget(swapTargets[1].hex.q, swapTargets[1].hex.r);
        await this.delay(this.actionDelay);

        // Confirm swap
        this.game.confirmSwap();
      }
      return;
    }

    // Get valid targets based on event type
    const validTargets = this.getValidEventTargets(event);

    if (validTargets.length > 0) {
      const target = this.strategy.chooseEventTarget(
        this.game.state.drawnEvent!,
        validTargets as PlacedCharacter[] | Hex[],
        this.game.state
      );

      if (target) {
        // Apply to target
        if ('card' in target) {
          // It's a PlacedCharacter
          this.game.applyEventToTarget(target.hex.q, target.hex.r);
        } else {
          // It's a Hex
          this.game.applyEventToTarget(target.q, target.r);
        }
      }
    }
  }

  /**
   * Get valid targets for current event
   */
  private getValidEventTargets(_event: { name: string }): PlacedCharacter[] | Hex[] {
    const state = this.game.state;

    // Events targeting empty adjacent hexes
    if (state.eventTargetEmptyAdjacent) {
      const emptyAdjacentHexes: Hex[] = [];
      for (const placed of state.placedCharacters) {
        const adjacents = this.getAdjacentHexes(placed.hex.q, placed.hex.r);
        for (const adj of adjacents) {
          const hex = state.board.find(h => h.q === adj.q && h.r === adj.r);
          const isOccupied = state.placedCharacters.some(p => p.hex.q === adj.q && p.hex.r === adj.r);
          if (hex && !hex.isMountain && !isOccupied) {
            // Avoid duplicates
            if (!emptyAdjacentHexes.some(h => h.q === hex.q && h.r === hex.r)) {
              emptyAdjacentHexes.push(hex);
            }
          }
        }
      }
      return emptyAdjacentHexes;
    }

    // Events targeting characters
    if (state.eventTargetFriendlyOnly) {
      // Only friendly characters
      return state.placedCharacters.filter(pc => pc.card.faction === this.aiFaction);
    }

    // Default: any character can be targeted
    return [...state.placedCharacters];
  }

  /**
   * Get hexes where AI can place a card
   */
  private getAvailableHexes(): Hex[] {
    return this.game.state.board.filter(hex =>
      !hex.isMountain &&
      this.canPlaceAt(hex) &&
      !this.game.state.placedCharacters.some(pc => pc.hex.q === hex.q && pc.hex.r === hex.r)
    );
  }

  /**
   * Check if a hex is adjacent to any placed character
   */
  private canPlaceAt(hex: Hex): boolean {
    if (this.game.state.placedCharacters.length === 0) return true;
    return this.game.state.placedCharacters.some(pc =>
      Math.abs(pc.hex.q - hex.q) <= 1 &&
      Math.abs(pc.hex.r - hex.r) <= 1 &&
      Math.abs((pc.hex.q + pc.hex.r) - (hex.q + hex.r)) <= 1
    );
  }

  /**
   * Get the 6 adjacent hexes in axial coordinates
   */
  private getAdjacentHexes(q: number, r: number): { q: number; r: number }[] {
    return [
      { q: q + 1, r: r },
      { q: q - 1, r: r },
      { q: q, r: r + 1 },
      { q: q, r: r - 1 },
      { q: q + 1, r: r - 1 },
      { q: q - 1, r: r + 1 }
    ];
  }

  /**
   * Simulate drawing cards (triggers game.drawCards())
   */
  private simulateDrawCards(): void {
    this.game.drawCards();
  }

  /**
   * Helper to wait for a specified time
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
