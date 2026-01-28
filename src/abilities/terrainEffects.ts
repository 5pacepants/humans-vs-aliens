// Terrain effects registry for all hex terrain types
import type { Ability } from './types';

// Note: Terrain effects use the same structure as abilities
// This allows them to integrate seamlessly with the existing AbilityEngine

export const terrainEffects: Ability[] = [
  // GRASS - Neutral terrain (no effects)
  // No entry needed for grass

  // WATER - Character loses 1 health (minimum 1)
  {
    id: 'water_terrain',
    triggers: ['onDerivedStats'],
    description: 'Water gives the character -1 health, to a minimum of 1',
    condition: (unit) => {
      // Check if unit is standing on water
      return unit.hex?.terrain === 'water';
    },
    effect: (_unit, _state) => {
      return { stat: 'health', value: -1, type: 'modifier' as const, description: 'Waterlogged' };
    }
  },

  // TOXIC SWAMP - Aliens gain 1 damage, Humans lose 1 damage (minimum 1)
  {
    id: 'toxic_terrain',
    triggers: ['onDerivedStats'],
    description: 'Aliens gain 1 damage when placed on toxic swamp. Humans lose 1 damage, to a minimum of 1',
    condition: (unit) => {
      return unit.hex?.terrain === 'toxic';
    },
    effect: (unit, _state) => {
      if (unit.card.faction === 'alien') {
        return { stat: 'damage', value: 1, type: 'modifier' as const, description: 'Toxic boost' };
      } else {
        return { stat: 'damage', value: -1, type: 'modifier' as const, description: 'Toxic penalty' };
      }
    }
  },

  // FOREST - Humans gain 1 range, Aliens lose 1 range (minimum 1)
  {
    id: 'forest_terrain',
    triggers: ['onDerivedStats'],
    description: 'Humans gain 1 range when placed on forest. Aliens lose 1 range, to a minimum of 1',
    condition: (unit) => {
      return unit.hex?.terrain === 'forest';
    },
    effect: (unit, _state) => {
      if (unit.card.faction === 'human') {
        return { stat: 'range', value: 1, type: 'modifier' as const, description: 'Forest advantage' };
      } else {
        return { stat: 'range', value: -1, type: 'modifier' as const, description: 'Forest hindrance' };
      }
    }
  },

  // MOUNTAIN - To be defined
  {
    id: 'mountain_terrain',
    triggers: ['onDerivedStats'],
    description: 'Mountain terrain effect',
    condition: (unit) => {
      return unit.hex?.terrain === 'mountain';
    },
    effect: (_unit, _state) => {
      // Effect to be defined by user
      return [];
    }
  }
];
