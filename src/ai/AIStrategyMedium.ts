// Medium difficulty AI strategy - uses deterministic rules

import type { AIStrategy } from './AIStrategy';
import type { CharacterCard, EventCard, Hex, PlacedCharacter, GameState } from '../types';

export class AIStrategyMedium implements AIStrategy {
  private aiFaction: 'human' | 'alien';

  constructor(aiFaction: 'human' | 'alien' = 'alien') {
    this.aiFaction = aiFaction;
  }

  chooseWhichDeckToDraw(gameState: GameState): 'human' | 'alien' | 'event' {
    // AI controls aliens by default, so always draw from alien deck
    // unless we want to occasionally draw events
    const aiPlaced = gameState.placedCharacters.filter(pc => pc.card.faction === this.aiFaction).length;
    const deck = this.aiFaction === 'human' ? gameState.humanDeck : gameState.alienDeck;

    // If our deck is empty, we can't draw from it
    if (deck.length === 0) {
      // Try to draw event if available
      if (gameState.eventDeck.length > 0) {
        return 'event';
      }
      // Fallback (shouldn't happen in normal gameplay)
      return this.aiFaction;
    }

    // 15% chance to draw event if available and we have some characters placed
    if (gameState.eventDeck.length > 0 && aiPlaced >= 2 && Math.random() < 0.15) {
      return 'event';
    }

    return this.aiFaction;
  }

  chooseCardFromDrawn(drawnCards: CharacterCard[], gameState: GameState): number {
    if (drawnCards.length === 0) return 0;

    // Score each card based on current board state
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < drawnCards.length; i++) {
      const card = drawnCards[i];
      const score = this.scoreCard(card, gameState);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  private scoreCard(card: CharacterCard, gameState: GameState): number {
    let score = 0;

    // Prefer higher damage cards early game
    const totalPlaced = gameState.placedCharacters.length;
    if (totalPlaced < 10) {
      score += card.stats.damage * 3;
    }

    // Prefer higher health cards when we're behind
    const enemyCount = gameState.placedCharacters.filter(pc => pc.card.faction !== this.aiFaction).length;
    const ourCount = gameState.placedCharacters.filter(pc => pc.card.faction === this.aiFaction).length;
    if (ourCount < enemyCount) {
      score += card.stats.health * 2;
    }

    // Value points for late game
    if (totalPlaced >= 15) {
      score += card.stats.points * 5;
    }

    // High initiative is good
    score += card.stats.initiative;

    // Range is valuable
    score += card.stats.range * 1.5;

    return score;
  }

  chooseHexForCard(card: CharacterCard, availableHexes: Hex[], gameState: GameState): Hex {
    if (availableHexes.length === 0) {
      throw new Error('No available hexes to place card');
    }

    let bestHex = availableHexes[0];
    let bestScore = -Infinity;

    for (const hex of availableHexes) {
      const score = this.scoreHex(hex, card, gameState);
      if (score > bestScore) {
        bestScore = score;
        bestHex = hex;
      }
    }

    return bestHex;
  }

  private scoreHex(hex: Hex, card: CharacterCard, gameState: GameState): number {
    let score = 0;

    // Base value from hex points
    score += hex.value * 10;

    // Terrain bonuses
    score += this.getTerrainBonus(hex, card) * 5;

    // Calculate proximity to enemies
    const enemies = gameState.placedCharacters.filter(pc => pc.card.faction !== card.faction);
    if (enemies.length > 0) {
      const minDistToEnemy = Math.min(...enemies.map(e => this.hexDistance(hex, e.hex)));

      // Short-range units want to be close to enemies
      if (card.stats.range <= 2) {
        score += (5 - minDistToEnemy) * 3;
      } else {
        // Long-range units want to be at optimal distance
        const optimalDist = Math.min(card.stats.range, 3);
        const distFromOptimal = Math.abs(minDistToEnemy - optimalDist);
        score -= distFromOptimal * 2;
      }
    }

    // Prefer being adjacent to allies for synergy
    const adjacentAllies = gameState.placedCharacters.filter(
      pc => pc.card.faction === card.faction && this.hexDistance(hex, pc.hex) === 1
    );
    score += adjacentAllies.length * 2;

    // Slight randomness to avoid predictability
    score += Math.random() * 2;

    return score;
  }

  private getTerrainBonus(hex: Hex, card: CharacterCard): number {
    const isAlien = card.faction === 'alien';

    switch (hex.terrain) {
      case 'forest':
        // Humans gain range, aliens lose range
        return isAlien ? -1 : 2;
      case 'toxic':
        // Aliens gain damage, humans lose damage
        return isAlien ? 2 : -1;
      case 'water':
        // Both lose health - avoid
        return -1;
      case 'grass':
        return 0;
      default:
        return 0;
    }
  }

  private hexDistance(a: Hex | { q: number; r: number }, b: Hex | { q: number; r: number }): number {
    return Math.max(
      Math.abs(a.q - b.q),
      Math.abs(a.r - b.r),
      Math.abs((-a.q - a.r) - (-b.q - b.r))
    );
  }

  shouldSkipEvent(event: EventCard, skipsRemaining: number, gameState: GameState): boolean {
    // Never skip if we have no skips
    if (skipsRemaining <= 0) return false;

    // Evaluate if the event is good or bad for us
    const eventScore = this.scoreEvent(event, gameState);

    // Skip if the event is clearly bad (negative score)
    // Save skips for later by being conservative
    if (eventScore < -5 && skipsRemaining >= 2) {
      return true;
    }

    // Always skip very bad events even with 1 skip left
    if (eventScore < -10) {
      return true;
    }

    return false;
  }

  private scoreEvent(event: EventCard, gameState: GameState): number {
    const ourChars = gameState.placedCharacters.filter(pc => pc.card.faction === this.aiFaction);
    const enemyChars = gameState.placedCharacters.filter(pc => pc.card.faction !== this.aiFaction);

    switch (event.name) {
      case 'Thunderstorm':
        // Random damage - slightly bad if we have more characters
        return ourChars.length > enemyChars.length ? -2 : 2;

      case 'Sandstorm':
        // We can target anyone - check if enemies have higher average range
        const ourAvgRange = ourChars.length > 0
          ? ourChars.reduce((sum, c) => sum + c.card.stats.range, 0) / ourChars.length
          : 0;
        const enemyAvgRange = enemyChars.length > 0
          ? enemyChars.reduce((sum, c) => sum + c.card.stats.range, 0) / enemyChars.length
          : 0;
        return enemyAvgRange > ourAvgRange ? 5 : -2;

      case 'Execute':
        // Very powerful - always good if enemies exist
        return enemyChars.length > 0 ? 10 : -5;

      case 'Heavy armor':
        // Good if we have characters
        return ourChars.length > 0 ? 3 : -5;

      case 'Berserk':
        // Risky but can be good
        return ourChars.some(c => c.card.stats.health >= 2) ? 2 : -3;

      case 'Swap places':
        // Situational - generally neutral
        return 0;

      case 'Call for a friend':
        // Always good - free unit
        return 8;

      default:
        return 0;
    }
  }

  chooseEventTarget(
    event: EventCard,
    validTargets: PlacedCharacter[] | Hex[],
    gameState: GameState
  ): PlacedCharacter | Hex | null {
    if (validTargets.length === 0) return null;

    // Check if targets are PlacedCharacters or Hexes
    const isCharacterTargeting = 'card' in validTargets[0];

    if (isCharacterTargeting) {
      const charTargets = validTargets as PlacedCharacter[];
      return this.chooseCharacterTarget(event, charTargets, gameState);
    } else {
      const hexTargets = validTargets as Hex[];
      return this.chooseHexTarget(event, hexTargets, gameState);
    }
  }

  private chooseCharacterTarget(
    event: EventCard,
    targets: PlacedCharacter[],
    _gameState: GameState
  ): PlacedCharacter | null {
    if (targets.length === 0) return null;

    const enemies = targets.filter(t => t.card.faction !== this.aiFaction);
    const allies = targets.filter(t => t.card.faction === this.aiFaction);

    switch (event.name) {
      case 'Sandstorm':
        // Target enemy with highest range
        if (enemies.length > 0) {
          return enemies.reduce((best, curr) =>
            curr.card.stats.range > best.card.stats.range ? curr : best
          );
        }
        // Fallback to ally with lowest range (least harm)
        return allies.length > 0
          ? allies.reduce((best, curr) => curr.card.stats.range < best.card.stats.range ? curr : best)
          : targets[0];

      case 'Execute':
        // Target enemy with highest points or damage
        if (enemies.length > 0) {
          return enemies.reduce((best, curr) => {
            const currValue = curr.card.stats.points * 2 + curr.card.stats.damage;
            const bestValue = best.card.stats.points * 2 + best.card.stats.damage;
            return currValue > bestValue ? curr : best;
          });
        }
        return targets[0];

      case 'Heavy armor':
        // Target ally with lowest health
        if (allies.length > 0) {
          return allies.reduce((best, curr) =>
            curr.card.stats.health < best.card.stats.health ? curr : best
          );
        }
        return targets[0];

      case 'Berserk':
        // Target ally with high health who can afford the -1
        if (allies.length > 0) {
          const viable = allies.filter(a => a.card.stats.health >= 2);
          if (viable.length > 0) {
            // Pick the one with highest damage to make them stronger
            return viable.reduce((best, curr) =>
              curr.card.stats.damage > best.card.stats.damage ? curr : best
            );
          }
        }
        return allies.length > 0 ? allies[0] : targets[0];

      default:
        return targets[0];
    }
  }

  private chooseHexTarget(
    event: EventCard,
    targets: Hex[],
    gameState: GameState
  ): Hex | null {
    if (targets.length === 0) return null;

    // For "Call for a friend" - choose hex close to enemies
    if (event.name === 'Call for a friend') {
      const enemies = gameState.placedCharacters.filter(pc => pc.card.faction !== this.aiFaction);

      if (enemies.length > 0) {
        // Find hex closest to enemies but not too close
        let bestHex = targets[0];
        let bestScore = -Infinity;

        for (const hex of targets) {
          const minDist = Math.min(...enemies.map(e => this.hexDistance(hex, e.hex)));
          // Sweet spot is around distance 2
          const score = -(Math.abs(minDist - 2));
          if (score > bestScore) {
            bestScore = score;
            bestHex = hex;
          }
        }
        return bestHex;
      }
    }

    // Default: pick hex with highest value
    return targets.reduce((best, curr) => curr.value > best.value ? curr : best);
  }

  chooseSwapTargets(gameState: GameState): [PlacedCharacter, PlacedCharacter] | null {
    const chars = gameState.placedCharacters;
    if (chars.length < 2) return null;

    const allies = chars.filter(c => c.card.faction === this.aiFaction);
    const enemies = chars.filter(c => c.card.faction !== this.aiFaction);

    if (allies.length === 0 || enemies.length === 0) {
      // No strategic swap possible, pick random two
      return [chars[0], chars[1]];
    }

    // Find a high-damage ally far from enemies
    let bestSwap: [PlacedCharacter, PlacedCharacter] | null = null;
    let bestImprovement = -Infinity;

    for (const ally of allies) {
      // Calculate current min distance to enemies
      const currentMinDist = Math.min(...enemies.map(e => this.hexDistance(ally.hex, e.hex)));

      // Try swapping with each other character
      for (const other of chars) {
        if (other === ally) continue;

        // Calculate what the min distance would be after swap
        const newMinDist = Math.min(...enemies.map(e => this.hexDistance(other.hex, e.hex)));

        // For high-damage short-range allies, getting closer is good
        if (ally.card.stats.range <= 2 && ally.card.stats.damage >= 2) {
          const improvement = currentMinDist - newMinDist;
          if (improvement > bestImprovement) {
            bestImprovement = improvement;
            bestSwap = [ally, other];
          }
        }
      }
    }

    // If no good improvement found, don't swap strategically
    if (bestImprovement <= 0 || !bestSwap) {
      // Just pick first two characters
      return [chars[0], chars[1]];
    }

    return bestSwap;
  }
}
