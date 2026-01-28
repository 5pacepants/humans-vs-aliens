// Ability registry for all character abilities
import type { Ability } from './types';

// Helper: hex distance
function hexDistance(a: any, b: any): number {
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs((-a.q - a.r) - (-b.q - b.r)));
}

export const abilities: Ability[] = [
  {
    id: 'general_johnson_leadership',
    triggers: ['onDerivedStats'],
    description: 'All adjacent humans has +1 attack',
    condition: (unit) => {
      // Only applies if unit is General Johnson
      return unit.card?.name === 'General Johnson';
    },
    effect: (unit, state) => {
      // For each adjacent human, return effect with target set to that human
      const effects = [];
      for (const pc of state.placedCharacters) {
        if (
          pc.card.faction === 'human' &&
          pc !== unit &&
          hexDistance(pc.hex, unit.hex) === 1
        ) {
          effects.push({ stat: 'attacks', value: 1, type: 'modifier' as const, description: 'Johnson leadership', target: pc });
        }
      }
      return effects;
    }
  },
  {
    id: 'pilot_frnuhuh_isolation',
    triggers: ['onDerivedStats'],
    description: 'Double attacks when no adjacent aliens',
    condition: (unit) => {
      // Only applies if unit is Pilot Frnuhuh
      return unit.card?.name === 'Pilot Frnuhuh';
    },
    effect: (unit, state) => {
      // Check if any adjacent aliens exist
      const hasAdjacentAlien = state.placedCharacters.some(
        (pc: any) =>
          pc.card.faction === 'alien' &&
          pc !== unit &&
          hexDistance(pc.hex, unit.hex) === 1
      );

      // If no adjacent aliens, double attacks using multiplier
      if (!hasAdjacentAlien) {
        return {
          stat: 'attacks',
          value: 2, // Multiply by 2 = doubling
          type: 'multiplier' as const,
          description: 'Isolation bonus'
        };
      }

      return [];
    }
  },
  {
    id: 'hannah_honor_focus',
    triggers: ['onDerivedStats'],
    description: 'If only adjacent to one more character, gain +1 damage',
    condition: (unit) => {
      // Only applies if unit is Hannah Honor
      return unit.card?.name === 'Hannah Honor';
    },
    effect: (unit, state) => {
      // Count adjacent characters (any faction)
      const adjacentCount = state.placedCharacters.filter(
        (pc: any) =>
          pc !== unit &&
          hexDistance(pc.hex, unit.hex) === 1
      ).length;

      // If exactly 1 adjacent character, gain +1 damage
      if (adjacentCount === 1) {
        return {
          stat: 'damage',
          value: 1,
          type: 'modifier' as const,
          description: 'Focus bonus'
        };
      }

      return [];
    }
  },
  {
    id: 'elder_ktharr_psychic',
    triggers: ['onDerivedStats'],
    description: 'All adjacent enemies lose 1 range due to psychic interference',
    condition: (unit) => {
      // Only applies if unit is Elder K'tharr
      return unit.card?.name === "Elder K'tharr";
    },
    effect: (unit, state) => {
      // For each adjacent enemy, return -1 range effect
      const effects = [];
      for (const pc of state.placedCharacters) {
        if (
          pc.card.faction !== unit.card.faction &&
          pc !== unit &&
          hexDistance(pc.hex, unit.hex) === 1
        ) {
          effects.push({
            stat: 'range',
            value: -1,
            type: 'modifier' as const,
            description: 'Psychic interference',
            target: pc
          });
        }
      }
      return effects;
    }
  },
  {
    id: 'warlord_vekkor_leadership',
    triggers: ['onDerivedStats'],
    description: 'Increases the range of adjacent friendly aliens by +1',
    condition: (unit) => {
      // Only applies if unit is Warlord Vekkor
      return unit.card?.name === 'Warlord Vekkor';
    },
    effect: (unit, state) => {
      // For each adjacent alien, return +1 range effect
      const effects = [];
      for (const pc of state.placedCharacters) {
        if (
          pc.card.faction === 'alien' &&
          pc !== unit &&
          hexDistance(pc.hex, unit.hex) === 1
        ) {
          effects.push({
            stat: 'range',
            value: 1,
            type: 'modifier' as const,
            description: 'Warlord leadership',
            target: pc
          });
        }
      }
      return effects;
    }
  }
];
