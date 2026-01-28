// Ability engine: applies abilities based on triggers
import { abilities } from './abilities';
import { terrainEffects } from './terrainEffects';
import type { AbilityTrigger } from './types';

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
            eff.source = unit; // Track who created this effect
            target.modifiers.push(eff);
          }
        } else {
          const target = effect.target || unit;
          if (!target.modifiers) target.modifiers = [];
          effect.source = unit; // Track who created this effect
          target.modifiers.push(effect);
        }
      }
    }
  }
}

export function applyTerrainEffects(state: any, trigger: AbilityTrigger) {
  // For each unit, collect effects from terrain they're standing on
  for (const unit of state.placedCharacters) {
    for (const terrainEffect of terrainEffects) {
      if (terrainEffect.triggers.includes(trigger) && terrainEffect.condition(unit, state)) {
        const effect = terrainEffect.effect(unit, state);
        // Attach effect(s) to unit
        if (Array.isArray(effect)) {
          for (const eff of effect) {
            const target = eff.target || unit;
            if (!target.modifiers) target.modifiers = [];
            eff.source = unit; // Track source (the unit itself for terrain effects)
            target.modifiers.push(eff);
          }
        } else if (effect && Object.keys(effect).length > 0) {
          const target = effect.target || unit;
          if (!target.modifiers) target.modifiers = [];
          effect.source = unit; // Track source
          target.modifiers.push(effect);
        }
      }
    }
  }
}

// Example: recompute derived stats
export function computeDerivedStats(state: any) {
  // Reset modifiers (but preserve eventModifiers)
  for (const unit of state.placedCharacters) {
    unit.modifiers = [];
  }
  // Apply all onDerivedStats abilities (character abilities)
  applyAbilities(state, 'onDerivedStats');
  // Apply all terrain effects
  applyTerrainEffects(state, 'onDerivedStats');
  // Recompute stats
  for (const unit of state.placedCharacters) {
    unit.derived = { ...unit.card.stats };

    // Merge eventModifiers into modifiers for display purposes
    const allModifiers = [...(unit.modifiers || []), ...(unit.eventModifiers || [])];
    unit.modifiers = allModifiers;

    // First: apply all additive modifiers
    for (const mod of allModifiers) {
      if (mod.type === 'modifier' && mod.stat && typeof mod.value === 'number') {
        unit.derived[mod.stat] = (unit.derived[mod.stat] || 0) + mod.value;
      }
    }

    // Second: apply all multiplicative modifiers
    for (const mod of allModifiers) {
      if (mod.type === 'multiplier' && mod.stat && typeof mod.value === 'number') {
        unit.derived[mod.stat] = (unit.derived[mod.stat] || 0) * mod.value;
      }
    }

    // Enforce minimum values for certain stats
    if (unit.derived.range !== undefined && unit.derived.range < 1) {
      unit.derived.range = 1;
    }
    if (unit.derived.damage !== undefined && unit.derived.damage < 1) {
      unit.derived.damage = 1;
    }
    if (unit.derived.health !== undefined && unit.derived.health < 1) {
      unit.derived.health = 1;
    }
  }
}
