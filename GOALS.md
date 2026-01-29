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
