# Project Goals & Design

## Current Status
Hex-based tactical card game with placement phase and basic battle scoring system.

## Planned Character System

### New Stats System
- **Health**: Hit points
- **Damage**: Attack damage value
- **Range**: Attack range in hexes
- **Attacks**: Number of attacks per turn
- **Points**: Victory points
- **Initiative**: Turn order (higher = earlier)
- **Rareness**: Card rarity (1=common, 4=rare)

### Planned Characters (from design document)

#### HUMANS
1. **General Johnson** (Commander)
   - Health: 3, Damage: 2, Range: 2, Attacks: 2, Points: 1
   - Initiative: 3, Rareness: 3
   - Ability: "All adjacent humans has +1 attack"

2. **Hannah Honor** (Sniper)
   - Health: 1, Damage: 1, Range: 4, Attacks: 2, Points: 2
   - Initiative: 2, Rareness: 4
   - Ability: "If only adjacent to one more character, gain +1 damage"

3. **Nurse Tender** (Medic)
   - Health: 5, Damage: 1, Range: 1, Attacks: 1, Points: 0
   - Initiative: 4, Rareness: 1
   - Ability: "Adjacent humans has a 30% chance to ressurect when killed. (Applies one time per adjacent human)"

4. **Heavy Gunner Jack** (Solider)
   - Health: 1, Damage: 4, Range: 1, Attacks: 1, Points: 2
   - Initiative: 1, Rareness: 2
   - Ability: (None specified)

#### ALIENS
1. **Pilot Frnuhuh** (Soldier)
   - Health: 2, Damage: 3, Range: 1, Attacks: 2, Points: 1
   - Initiative: 2, Rareness: 1
   - Ability: "If Frnuhuh has no adjacent aliens, he gains double the number of attacks"

2. **Elder K'tharr** (Commander)
   - Health: 3, Damage: 2, Range: 1, Attacks: 1, Points: 2
   - Initiative: 1, Rareness: 4
   - Ability: "All adjacent enemies lose 1 range due to psychic interference."

3. **Mutant Vor** (Medic)
   - Health: 2, Damage: 3, Range: 1, Attacks: 1, Points: 2
   - Initiative: 4, Rareness: 3
   - Ability: "Heals the first attack he receives"

4. **Warlord Vekkor** (Sniper)
   - Health: 2, Damage: 3, Range: 5, Attacks: 1, Points: 0
   - Initiative: 3, Rareness: 2
   - Ability: "Increases the range of adjacent friendly aliens by +1."

## Features to Implement

### Phase 1: Data Structure Update
- [ ] Add Damage stat to CharacterCard
- [ ] Add Rareness stat to CharacterCard
- [ ] Update all existing cards with new stats
- [ ] Add ability field to cards (currently some have it, standardize)

### Phase 2: Ability System
- [ ] Create ability effect system
- [ ] Implement adjacency detection
- [ ] Implement stat modification (buffs/debuffs)
- [ ] Implement special triggers (on-death, on-attack, etc.)

### Phase 3: Combat System
- [ ] Implement actual combat mechanics (currently just scoring)
- [ ] Use Initiative for turn order
- [ ] Use Range for attack validation
- [ ] Use Attacks stat for multiple attacks
- [ ] Use Damage stat instead of generic "attack"
- [ ] Apply abilities during combat

### Phase 4: Advanced Features
- [ ] Resurrection mechanic (Nurse Tender)
- [ ] Percentage-based effects
- [ ] Psychic interference (range reduction)
- [ ] Conditional abilities (adjacency requirements)

## Current Card Types (Old System - To Be Updated)

### Humans (15 total)
- 5 Soldiers (basic melee)
- 4 Medics (healing)
- 3 Tanks (high health)
- 2 Snipers (long range)
- 1 Scout (high initiative)

### Aliens (15 total)
- 5 Drones (ranged attackers)
- 4 Parasites (fast melee)
- 3 Beasts (mid-range bruisers)
- 2 Mutants (multi-attack)
- 1 Overlord (powerful leader)

## Design Notes
- Rareness system suggests deck-building or card pool mechanics
- Many abilities affect "adjacent" units - need robust adjacency system
- Combat should be tactical with positioning mattering
- Mix of offensive buffs (General Johnson, Warlord Vekkor) and defensive/utility (Nurse Tender, Mutant Vor)
