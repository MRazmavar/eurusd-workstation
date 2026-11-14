/**
 * Fibonacci Retracement Levels Configuration & Defaults.
 * Standard TradingView Fibonacci ratios, colors, presets, and helpers.
 */
import { FibLevel } from '../types';

export const DEFAULT_FIB_LEVELS: FibLevel[] = [
  { level: 0.0, color: '#787b86', visible: true },
  { level: 0.236, color: '#f23645', visible: true },
  { level: 0.382, color: '#ff9800', visible: true },
  { level: 0.5, color: '#089981', visible: true },
  { level: 0.618, color: '#2962ff', visible: true },
  { level: 0.705, color: '#00bcd4', visible: false }, // OTE (Optimal Trade Entry)
  { level: 0.786, color: '#ab47bc', visible: true },
  { level: 0.886, color: '#e91e63', visible: false },
  { level: 1.0, color: '#787b86', visible: true },
  { level: 1.272, color: '#ff5722', visible: false },
  { level: 1.414, color: '#ff9800', visible: false },
  { level: 1.618, color: '#2962ff', visible: false },
  { level: 2.0, color: '#4caf50', visible: false },
  { level: 2.618, color: '#9c27b0', visible: false },
  { level: -0.27, color: '#00e676', visible: false },
  { level: -0.618, color: '#00b0ff', visible: false },
];

export function getDefaultFibLevels(): FibLevel[] {
  return DEFAULT_FIB_LEVELS.map(f => ({ ...f }));
}

export const FIB_PRESETS: Record<string, { name: string; levels: FibLevel[] }> = {
  standard: {
    name: 'Standard TradingView',
    levels: [
      { level: 0.0, color: '#787b86', visible: true },
      { level: 0.236, color: '#f23645', visible: true },
      { level: 0.382, color: '#ff9800', visible: true },
      { level: 0.5, color: '#089981', visible: true },
      { level: 0.618, color: '#2962ff', visible: true },
      { level: 0.786, color: '#ab47bc', visible: true },
      { level: 1.0, color: '#787b86', visible: true },
    ],
  },
  ote: {
    name: 'ICT / OTE & Targets',
    levels: [
      { level: 0.0, color: '#787b86', visible: true },
      { level: 0.5, color: '#089981', visible: true },
      { level: 0.618, color: '#2962ff', visible: true },
      { level: 0.705, color: '#00bcd4', visible: true }, // Sweet Spot
      { level: 0.786, color: '#ab47bc', visible: true },
      { level: 1.0, color: '#787b86', visible: true },
      { level: -0.27, color: '#00e676', visible: true }, // Target 1
      { level: -0.618, color: '#ffeb3b', visible: true }, // Target 2
    ],
  },
  extensions: {
    name: 'Harmonic & Extensions',
    levels: [
      { level: 0.0, color: '#787b86', visible: true },
      { level: 0.382, color: '#ff9800', visible: true },
      { level: 0.618, color: '#2962ff', visible: true },
      { level: 1.0, color: '#787b86', visible: true },
      { level: 1.272, color: '#ff5722', visible: true },
      { level: 1.414, color: '#ff9800', visible: true },
      { level: 1.618, color: '#2962ff', visible: true },
      { level: 2.0, color: '#4caf50', visible: true },
      { level: 2.618, color: '#9c27b0', visible: true },
    ],
  },
};

/**
 * Calculates the exact price for a given Fibonacci level ratio.
 * In a retracement from Anchor 1 (p1) to Anchor 2 (p2):
 * level 0.0 = p1 (start)
 * level 1.0 = p2 (end)
 * level 0.5 = midpoint
 */
export function calculateFibPrice(p1: number, p2: number, level: number): number {
  return p1 + level * (p2 - p1);
}

/**
 * Format Fibonacci level ratio cleanly (e.g. 0.618, 0.5, 0, 1, 1.272, -0.27)
 */
export function formatFibLevel(level: number): string {
  if (Number.isInteger(level)) return level.toString();
  // Strip trailing zeros after up to 4 decimal places
  const str = level.toFixed(4);
  return parseFloat(str).toString();
}
