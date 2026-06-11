// ---------------------------------------------------------------------------
// StarScape — design tokens
// ---------------------------------------------------------------------------

export const colors = {
  // Background layers — deep space blues
  bgDeepest: '#000814',
  bgDeep: '#001233',
  bgMid: '#023E8A',

  // Star colours by B-V index (approximate blackbody)
  starBlue: '#CAE0FF',     // B-V < 0 (hot blue/white)
  starWhite: '#FFFFFF',    // B-V 0–0.3
  starYellow: '#FFF4D6',   // B-V 0.3–0.8
  starOrange: '#FFCC99',   // B-V 0.8–1.4
  starRed: '#FF9966',      // B-V > 1.4

  // UI chrome
  textPrimary: '#E8F4FD',
  textSecondary: '#8BAFC9',
  textMuted: '#4A6785',
  accentGold: '#FFD166',
  accentBlue: '#4CC9F0',
  constellationLine: '#1B4F72',

  // Glassmorphism card
  cardBg: 'rgba(0, 18, 51, 0.6)',
  cardBorder: 'rgba(76, 201, 240, 0.15)',
} as const;

export const fonts = {
  heading: "'Inter', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '40px',
  xxl: '64px',
} as const;

export const breakpoints = {
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;
