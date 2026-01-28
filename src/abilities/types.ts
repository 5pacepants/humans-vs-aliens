// Ability types and triggers for ability engine

export type AbilityTrigger =
  | 'onDerivedStats'
  | 'onInitStepStart'
  | 'onBeforeAttack'
  | 'onAfterAttack'
  | 'onKill'
  | 'onPlace'
  | 'onMove'
  | 'onTurnStart'
  | 'onTurnEnd'
  | 'onScoring';

export interface AbilityEffect {
  stat?: 'attack' | 'range' | 'health' | 'damage' | string;
  value?: number;
  type: 'modifier' | 'multiplier' | 'heal' | 'custom';
  description?: string;
  target?: any; // PlacedCharacter to apply effect to
  source?: any; // PlacedCharacter that created this effect
}

export interface Ability {
  id: string;
  triggers: AbilityTrigger[];
  condition: (unit: any, state: any) => boolean;
  effect: (unit: any, state: any) => AbilityEffect | AbilityEffect[];
  description?: string;
}
