// Design System: Azure Blue
const theme = {
  colors: {
    // Brand
    primary:           '#0047AB',  // Azure Blue
    primaryContainer:  '#0057d4',  // Azure Blue Light
    secondary:         '#0ea5e9',  // Sky Blue
    secondaryContainer:'#e0f2fe',

    // Surface hierarchy (No-Line system)
    surface:                   '#f8fafc',
    surfaceContainerLowest:    '#ffffff',
    surfaceContainerLow:       '#f1f5f9',
    surfaceContainer:          '#e8edf4',
    surfaceContainerHigh:      '#dde3ee',
    surfaceContainerHighest:   '#d0d8e8',

    // Text
    onBackground: '#1e293b',
    onSurface:    '#1e293b',
    onPrimary:    '#ffffff',
    textSub:      '#334155',
    textMuted:    '#64748b',

    // Outline
    outline:        '#94a3b8',
    outlineVariant: '#cbd5e1',

    // Semantic
    error:            '#ba1a1a',
    errorContainer:   '#ffdad6',
    success:          '#1e6e3e',
    successContainer: '#c8f5d8',
    warning:          '#7a5200',
    warningContainer: '#ffdea4',

    // Legacy aliases
    bg_app:  '#f8fafc',
    bg_card: '#ffffff',
    danger:  '#ba1a1a',
  },

  gradients: {
    primary: 'linear-gradient(135deg, #0047AB, #0057d4)',
  },

  shadows: {
    ambient: '0 12px 40px rgba(0, 71, 171, 0.06)',
    float:   '0 12px 40px rgba(0, 71, 171, 0.12)',
  },

  glass: {
    bg:   'rgba(255, 255, 255, 0.80)',
    blur: 'blur(20px)',
  },

  typography: {
    fontSerif: "'Noto Serif', Georgia, serif",
    fontSans:  "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: {
      xs:  '11px',
      sm:  '12px',
      md:  '14px',
      lg:  '16px',
      xl:  '18px',
      xxl: '20px',
    },
    fontWeight: {
      normal:   '400',
      medium:   '500',
      semibold: '600',
      bold:     '700',
    },
  },

  spacing: {
    xs:          '4px',
    sm:          '8px',
    md:          '12px',
    lg:          '16px',
    xl:          '20px',
    xxl:         '24px',
    cardPadding: '20px',
    cardGap:     '16px',
  },

  borderRadius: {
    sm:   '8px',
    md:   '12px',
    lg:   '16px',
    xl:   '20px',
    full: '9999px',
  },
};

export default theme;
