// Minimal test for General Johnson ability
import { computeDerivedStats } from '../AbilityEngine';

const mockState: any = {
  placedCharacters: [
    {
      card: { name: 'General Johnson', stats: { attack: 2 }, faction: 'human' },
      hex: { q: 0, r: 0 },
    },
    {
      card: { name: 'Soldier', faction: 'human', stats: { attack: 1 } },
      hex: { q: 1, r: 0 },
    },
    {
      card: { name: 'Medic', faction: 'human', stats: { attack: 1 } },
      hex: { q: 0, r: 1 },
    },
    {
      card: { name: 'Drone', faction: 'alien', stats: { attack: 1 } },
      hex: { q: 2, r: 0 },
    }
  ]
};

computeDerivedStats(mockState);

console.log('Soldier derived attack:', mockState.placedCharacters[1].derived.attack); // Expect 2
console.log('Medic derived attack:', mockState.placedCharacters[2].derived.attack);   // Expect 2
console.log('Drone derived attack:', mockState.placedCharacters[3].derived.attack);   // Expect 1
