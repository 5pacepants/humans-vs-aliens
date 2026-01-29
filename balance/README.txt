BALANCING DATA FOR HUMANS VS ALIENS
====================================

FILES:
------
characters.csv - All character cards with stats
events.csv     - All event cards
terrain.csv    - Terrain types and effects
hex_values.csv - Point values on hexes

COLUMN EXPLANATIONS:
--------------------

CHARACTERS:
- Health: How much damage the character can take before dying
- Damage: Base damage per attack
- Range: How many hexes away the character can attack
- Attacks: Number of attacks per combat turn
- Initiative: Turn order in combat (lower = attacks first)
- Points: Victory points awarded when this character survives
- Rareness: 1-4 scale (1=common, 4=rare)
- Draw Weight: Calculated as 5-Rareness, determines draw probability
  - Weight 4 = very common (rareness 1)
  - Weight 1 = very rare (rareness 4)

DECK COMPOSITION:
-----------------
- Each faction deck has 10 cards total
- Cards are drawn from weighted pool (higher weight = more likely)
- Each draw of 3 cards comes from the deck

EVENTS:
- 2 copies of each event type = 14 total event cards
- Players have 3 event skips each

TERRAIN BONUSES:
- Water: +1 range
- Forest: +1 damage
- Toxic: -1 health
- Mountain: Impassable

HEX POINTS:
- Central hexes (distance <= 2): Random 1-5 points
- Outer hexes: 0 points
- Points from hex + character points = victory points if character survives
