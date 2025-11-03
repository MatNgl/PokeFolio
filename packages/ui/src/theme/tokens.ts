/**
 * Design tokens for PokéFolio dark theme
 * Inspired by UIverse glassmorphism & neon aesthetics
 */

export const colors = {
  // Background
  bg: '#0b0f1a',
  bgSecondary: '#0f1424',
  glass: '#0f1424cc',
  glassLight: '#1a2030cc',

  // Text
  text: '#e6edff',
  textMuted: '#94a3b8',
  textDim: '#64748b',

  // Primary (Cyan/Neon)
  primary: '#7cf3ff',
  primaryGlow: '#7cf3ff80',
  primaryDark: '#4dd8e6',

  // Accent colors
  violet: '#a78bfa',
  violetGlow: '#a78bfa80',
  rose: '#ff6ad5',
  roseGlow: '#ff6ad580',
  emerald: '#10b981',
  emeraldGlow: '#10b98180',
  amber: '#fbbf24',
  amberGlow: '#fbbf2480',

  // Semantic
  success: '#10b981',
  warning: '#fbbf24',
  error: '#ef4444',
  info: '#7cf3ff',

  // Border
  border: '#ffffff1a',
  borderLight: '#ffffff33',
  borderGlow: '#7cf3ff33',
} as const;

export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
  '3xl': '4rem', // 64px
} as const;

export const radii = {
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  full: '9999px',
} as const;

export const blur = {
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
} as const;

export const shadows = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.1)',
  md: '0 4px 16px rgba(0, 0, 0, 0.2)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.3)',
  xl: '0 16px 64px rgba(0, 0, 0, 0.4)',

  // Glow effects
  glowPrimary: '0 0 16px rgba(124, 243, 255, 0.5)',
  glowPrimaryLg: '0 0 32px rgba(124, 243, 255, 0.6)',
  glowViolet: '0 0 16px rgba(167, 139, 250, 0.5)',
  glowRose: '0 0 16px rgba(255, 106, 213, 0.5)',
} as const;

export const transitions = {
  fast: '150ms cubic-bezier(0.22, 1, 0.36, 1)',
  normal: '250ms cubic-bezier(0.22, 1, 0.36, 1)',
  slow: '350ms cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const zIndex = {
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

/**
 * Complete theme object
 */
export const theme = {
  colors,
  spacing,
  radii,
  blur,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  typography,
} as const;

export type Theme = typeof theme;
