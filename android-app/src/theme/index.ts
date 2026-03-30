/**
 * OpenDeck — Dark theme (optimized for OLED)
 */

export const theme = {
  // Backgrounds
  bg: '#0a0a0a',
  surface: '#111111',
  surface2: '#1a1a1a',
  surfaceHover: '#222222',
  border: '#2a2a2a',
  divider: '#1e1e1e',

  // Text
  text: '#e8e8e8',
  textMuted: '#888888',
  textFaint: '#444444',

  // Accent — electric blue
  primary: '#4f9eff',
  primaryDark: '#1a6fd4',

  // Status colors
  success: '#4ade80',
  error: '#f87171',
  warning: '#fbbf24',

  // Button
  buttonBg: '#1c1c1c',
  buttonBgActive: '#2a2a2a',
  buttonBgPressed: '#333333',
  buttonBorder: '#2e2e2e',
  buttonBorderActive: '#4f9eff',

  // Grid
  gridBg: '#0d0d0d',
  gridCell: '#161616',

  // Radius
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,

  // Spacing
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 20,
  space6: 24,

  // Typography
  fontSizeXs: 10,
  fontSizeSm: 12,
  fontSizeBase: 14,
  fontSizeLg: 16,

  // Transitions
  transitionFast: 100,
  transitionBase: 180,
};

export type Theme = typeof theme;
