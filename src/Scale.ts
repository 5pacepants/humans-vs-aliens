// Scaling utility for responsive rendering
// Reference resolution - the game was designed for this size
const REFERENCE_WIDTH = 1920;
const REFERENCE_HEIGHT = 1080;

// Get scale factor based on current window size
export function getScale(): number {
  const scaleX = window.innerWidth / REFERENCE_WIDTH;
  const scaleY = window.innerHeight / REFERENCE_HEIGHT;
  // Use the smaller scale to ensure everything fits
  return Math.min(scaleX, scaleY);
}

// Base sizes (at reference resolution)
// These are sized to fit: 3 cards in 40% width, hex board in 60% width
export const BASE_HEX_SIZE = 75;
export const BASE_CARD_WIDTH = 220;
export const BASE_CARD_HEIGHT = 353;
export const BASE_SMALL_CARD_WIDTH = 200;
export const BASE_SMALL_CARD_HEIGHT = 320;

// Get scaled sizes
export function getHexSize(): number {
  return BASE_HEX_SIZE * getScale();
}

export function getCardWidth(): number {
  return BASE_CARD_WIDTH * getScale();
}

export function getCardHeight(): number {
  return BASE_CARD_HEIGHT * getScale();
}

export function getSmallCardWidth(): number {
  return BASE_SMALL_CARD_WIDTH * getScale();
}

export function getSmallCardHeight(): number {
  return BASE_SMALL_CARD_HEIGHT * getScale();
}
