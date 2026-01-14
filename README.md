# Humans vs Aliens

A tactical hex-grid strategy game where humans face off against aliens in turn-based combat.

## Features

- **Hex-grid battlefield** with terrain textures (grass, forest, water)
- **Card-based gameplay** with character cards for both factions
- **Turn-based combat** system with placement and combat phases
- **Event system** with random events affecting gameplay
- **Visual card rendering** with custom frames, icons, and stats

## Tech Stack

- TypeScript
- HTML5 Canvas
- Vite (dev server and build tool)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser at `http://localhost:5173`

### Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## How to Play

1. **Placement Phase**: Click your faction's deck to draw 3 cards, then place units on valid hexes
2. **Combat Phase**: Select your units to attack enemy units within range
3. **Scoring Phase**: Control hexes to score points and win the game

## Project Structure

```
humans-vs-aliens/
├── public/
│   ├── cards/          # Card assets (frames, icons, character images)
│   └── textures/       # Hex terrain textures
├── src/
│   ├── main.ts         # Entry point
│   ├── Board.ts        # Hex grid rendering
│   ├── Game.ts         # Game logic
│   ├── GameUI.ts       # UI rendering (decks, cards)
│   ├── CardRenderer.ts # Card visual rendering
│   ├── CardAssetLoader.ts # Asset loading
│   ├── InputHandler.ts # Mouse input
│   └── types.ts        # TypeScript types
└── index.html
```

## License

MIT
