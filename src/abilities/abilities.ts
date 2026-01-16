// Ability registry for all character abilities
import { Ability } from './types';

// Helper: checks if adjacent to a friendly human
function isAdjacentToFriendlyHuman(unit: any, state: any): boolean {
  // Assume unit.hex and state.placedCharacters exists
  return state.placedCharacters.some(pc =>
    pc.card.faction === 'human' &&
    pc !== unit &&
    hexDistance(pc.hex, unit.hex) === 1
  );
}

// Helper: hex distance
function hexDistance(a: any, b: any): number {
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs((-a.q - a.r) - (-b.q - b.r)));
}

export const abilities: Ability[] = [
  {
    id: 'general_johnson_leadership',
    triggers: ['onDerivedStats'],
    description: 'All adjacent humans has +1 attack',
    condition: (unit, state) => {
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
          effects.push({ stat: 'attack', value: 1, type: 'modifier', description: 'Johnson leadership', target: pc });
        }
      }
      return effects;
    }
  }
];
