# AI Opponent Implementation Plan

## Overview
Adding a computer-controlled opponent to the game, allowing players to choose between local multiplayer and single-player vs AI.

## Architecture

### Core Components

#### 1. AIStrategy Interface (`src/ai/AIStrategy.ts`)
Abstract interface defining what an AI must implement:
```typescript
interface AIStrategy {
  chooseWhichDeckToDraw(): 'human' | 'alien' | 'event';
  chooseHexForCard(card: CharacterCard, availableHexes: Hex[]): Hex;
  shouldSkipEvent(event: EventCard, skipsRemaining: number): boolean;
  chooseEventTarget(event: EventCard, validTargets: PlacedCharacter[] | Hex[]): target;
}
```

#### 2. AIController (`src/ai/AIController.ts`)
Manages AI turns with delays for user experience:
- Waits for appropriate delays between actions
- Calls strategy methods to make decisions
- Executes actions via Game class methods

#### 3. AIStrategyMedium (`src/ai/AIStrategyMedium.ts`)
First implementation with deterministic rules:
- **Deck selection**: Alternates between human/alien based on balance
- **Hex evaluation**: Scores each hex based on:
  - Hex point value
  - Proximity to enemies (good for short-range units)
  - Terrain bonuses for faction
  - Synergy with nearby allies
- **Event handling**: Simple heuristics for event targeting

### Difficulty Levels (Future)
- **Easy**: Random choices with occasional smart decisions
- **Medium**: Deterministic rules (current implementation)
- **Hard**: More sophisticated evaluation, considers future turns

## Game Mode Selection

### New State Properties
```typescript
// In types.ts - GameState
gameMode?: 'local' | 'vsComputer';
aiDifficulty?: 'easy' | 'medium' | 'hard';
playerFaction?: 'human' | 'alien'; // Which faction the player controls
```

### Menu Flow
```
Game Start
    ↓
[Select Game Mode]
  ├── "Local Play" → Current behavior (2 players)
  └── "vs Computer" → Select difficulty → Start with AI
```

## Implementation Steps

### Phase 1: Core AI (Current)
1. ✅ Document plan in GOALS.md
2. [ ] Create `AIStrategy` interface
3. [ ] Create `AIController` class
4. [ ] Create `AIStrategyMedium` with basic rules
5. [ ] Add game mode to GameState
6. [ ] Integrate AI with game loop

### Phase 2: UI
7. [ ] Create game mode selection menu
8. [ ] Add visual indicator for AI thinking
9. [ ] Show AI's moves with slight delay

### Phase 3: Polish
10. [ ] Add Easy/Hard difficulty variants
11. [ ] Tune AI decision weights
12. [ ] Add AI personality/playstyle options

## AI Decision Logic (Medium Difficulty)

### Hex Scoring Formula
```
score = hexValue * 10
      + terrainBonus * 5
      + proximityToEnemies * (if range >= 2 then -2 else +3)
      + adjacentAllies * 2
```

### Deck Selection Rules
1. If no characters placed yet: draw from own faction
2. If significantly behind in character count: prioritize own faction
3. Occasionally draw events (20% chance if available)

### Event Targeting Rules
- **Sandstorm**: Target enemy with highest range
- **Execute**: Target enemy with highest points or damage
- **Heavy Armor**: Target ally with lowest health
- **Berserk**: Target ally with high health (can afford -1)
- **Swap Places**: Move high-damage ally closer to enemies
- **Call for Friend**: Place near enemies for melee, far for ranged

## File Structure
```
src/
├── ai/
│   ├── AIStrategy.ts        // Interface
│   ├── AIController.ts      // Turn management
│   ├── AIStrategyMedium.ts  // Rule-based AI
│   └── HexEvaluator.ts      // Hex scoring utility
├── types.ts                 // Updated with AI types
├── Game.ts                  // Updated with AI integration
└── GameUI.ts                // Updated with game mode menu
```

## Integration Points

### Game.ts Changes
- Add `setGameMode(mode)` method
- Add `isAITurn()` check
- Modify `advanceTurn()` to trigger AI if needed

### InputHandler.ts Changes
- Block player input during AI turn
- Handle game mode menu clicks

### GameUI.ts Changes
- Render game mode selection screen
- Show "AI thinking..." indicator
- Highlight AI's selected card/hex briefly

---

# Polish & Professional Feel - TODO

## Syfte
Gå från hobbyprojekt till professionell känsla. Följande lista baseras på analys av vad som skiljer spelet från t.ex. Hearthstone och Slay the Spire.

---

## 1. LJUD (Högsta prioritet)

### UI-ljud
- [ ] Hover-ljud på knappar (subtilt)
- [ ] Hover-ljud på kort
- [ ] Klick-ljud på knappar
- [ ] Bekräftelse-ljud vid val
- [ ] Fel-ljud vid ogiltigt drag

### Kortljud
- [ ] Kortdragningsljud ("fwipp") när kort dras från deck
- [ ] Kort-placeringsljud när kort landar på brädet
- [ ] Kort-välj-ljud när man plockar upp ett kort

### Stridsljud
- [ ] Attack-ljud med träffkänsla
- [ ] Damage-ljud (olika för lite/mycket skada)
- [ ] Dödsljud/försvinnande
- [ ] Ability-aktiveringsljud
- [ ] Block-ljud (när armor absorberar)

### Ambient & Musik
- [ ] Bakgrundsmusik för placement phase
- [ ] Intensivare musik för combat phase
- [ ] Vinnarfanfar
- [ ] Ambient ljud på brädet

---

## 2. ANIMATIONER

### Attack-animation (saknas nu)
- [ ] Attackerande enhet rör sig MOT målet (krockar in)
- [ ] Anticipation: Enheten "laddar upp" innan attack (drar sig bakåt)
- [ ] Follow-through efter träff

### Kort-animationer
- [ ] Overshoot/bounce: Kort som landar studsar lite
- [ ] Squash & stretch: Kort som plockas upp deformeras subtilt
- [ ] Kort flyger från draw pile till visningsposition (inte "poofar" fram)
- [ ] Ease-out och spring-funktioner på alla kortförflyttningar

### Impact-effekter
- [ ] Skärmskakning vid kraftiga slag
- [ ] Hex-skakning vid damage
- [ ] Partikeleffekter vid attacker (gnistor, damm)
- [ ] Partikeleffekter vid abilities
- [ ] Partikeleffekter vid död

---

## 3. "LEVANDE" KÄNSLA (Tomrummet mellan handlingar)

- [ ] Spelbara kort "andas" (pulserar subtilt)
- [ ] Interagerbara element har pulsande glow
- [ ] Brädet har ambient rörelse (subtila ljuseffekter som rör sig)
- [ ] Karaktärer på brädet har idle-animation (subtil rörelse)
- [ ] Hovrade element reagerar INNAN klick (förstoring börjar direkt)

---

## 4. FEEDBACK & TYDLIGHET

### Visuell feedback
- [ ] HP-siffra synlig på varje karaktär på hexbrädet
- [ ] HP räknas ner visuellt under strid (inte bara byter värde)
- [ ] Tydligare indikation på "vad händer just nu"

### Fokus under strid
- [ ] När karaktär attackerar: ALLA andra karaktärer tonas ner/blurras
- [ ] Endast attackerare och mål har full färg och skärpa
- [ ] Spotlight-effekt på aktiva enheter

---

## 5. ÖVERGÅNGAR & FLÖDE

- [ ] Kort kommer in sekventiellt (inte alla samtidigt) vid draw
- [ ] Fasbyte har smooth övergång (fade eller slide)
- [ ] Easing-funktioner på alla animationer (ease-out, spring)
- [ ] Delay mellan varje kort som dras för dramatisk effekt

---

## 6. VIKTAT VÄRDE PÅ KORT

- [ ] Sällsynta kort har speciella rameffekter
- [ ] Högre rareness = mer dramatisk animation vid draw
- [ ] Glitter/shimmer-effekt på unika kort
- [ ] Speciella ljud för sällsynta kort

---

## Prioriterad implementationsordning

### Fas 1: Ljud (störst impact)
1. Grundläggande UI-ljud (hover, klick)
2. Kortljud (dra, placera)
3. Stridsljud (attack, damage)
4. Bakgrundsmusik

### Fas 2: Core "juice"
5. Attack-animation (krocka in i mål)
6. Kort-draw-animation (flyger från deck)
7. Skärmskakning vid damage
8. HP-siffror på hexbrädet

### Fas 3: Fokus & clarity
9. Mörka ner icke-relevanta karaktärer under strid
10. Pulsande glow på interagerbara element
11. Sekventiell kortanimation

### Fas 4: Polish
12. Partikeleffekter
13. Ambient rörelse på brädet
14. Viktat värde på kort (rareness-effekter)
15. Alla easing-funktioner

---

## Tekniska noter

### Ljudsystem
Skapa en `SoundManager` klass som:
- Preloadar alla ljud
- Har volymkontroll
- Kan spela flera ljud samtidigt
- Stödjer looping för musik

### Partikelsystem
Skapa en enkel `ParticleSystem` klass som:
- Spawnar partiklar vid position
- Stödjer olika typer (spark, dust, magic)
- Hanterar livstid och fade-out
- Integreras med requestAnimationFrame

### Animation utilities
Skapa easing-funktioner:
- `easeOutCubic`
- `easeOutElastic` (bounce)
- `spring` (för kort-animationer)
