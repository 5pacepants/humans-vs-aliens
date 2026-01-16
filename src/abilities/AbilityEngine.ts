// Ability engine: applies abilities based on triggers
import { abilities } from './abilities';
import { Ability, AbilityTrigger, AbilityEffect } from './types';

export function applyAbilities(state: any, trigger: AbilityTrigger) {
  // For each unit, collect effects from all abilities with matching trigger
  for (const unit of state.placedCharacters) {
    for (const ability of abilities) {
      if (ability.triggers.includes(trigger) && ability.condition(unit, state)) {
        const effect = ability.effect(unit, state);
        // Attach effect(s) to correct target
        if (Array.isArray(effect)) {
          for (const eff of effect) {
            const target = eff.target || unit;
            if (!target.modifiers) target.modifiers = [];
            target.modifiers.push(eff);
          }
        } else {
          const target = effect.target || unit;
          if (!target.modifiers) target.modifiers = [];
          target.modifiers.push(effect);
        }
      }
    }
  }
}

// Example: recompute derived stats
export function computeDerivedStats(state: any) {
  // Reset modifiers
  for (const unit of state.placedCharacters) {
    unit.modifiers = [];
  }
  // Apply all onDerivedStats abilities
  applyAbilities(state, 'onDerivedStats');
  // Recompute stats
  for (const unit of state.placedCharacters) {
    unit.derived = { ...unit.card.stats };
    for (const mod of unit.modifiers) {
      if (mod.stat && typeof mod.value === 'number') {
        unit.derived[mod.stat] = (unit.derived[mod.stat] || 0) + mod.value;
      }
    }
  }
}
