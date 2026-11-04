// Design System: Azure Blue
const theme = {
  colors: {
    // Brand
    primary:           '#14284B',  // Azure Blue
    primaryContainer:  '#24406E',  // Azure Blue Light
    secondary:         '#0ea5e9',  // Sky Blue
    secondaryContainer:'#EEF1F6',

    // Surface hierarchy (No-Line system)
    surface:                   '#F7F5F0',
    surfaceContainerLowest:    '#ffffff',
    surfaceContainerLow:       '#EFEDE7',
    surfaceContainer:          '#EFEDE7',
    surfaceContainerHigh:      '#dde3ee',
    surfaceContainerHighest:   '#d0d8e8',

    // Text
    onBackground: '#1A1D26',
    onSurface:    '#1A1D26',
    onPrimary:    '#ffffff',
    textSub:      '#363A47',
    textMuted:    '#5E6473',

    // Outline
    outline:        '#9A9DA6',
    outlineVariant: '#D5D2CA',

    // Semantic
    error:            '#dc2626',
    errorContainer:   '#ffdad6',
    success:          '#1e6e3e',
    successContainer: '#c8f5d8',
    warning:          '#7a5200',
    warningContainer: '#ffdea4',

    // Legacy aliases
    bg_app:  '#F7F5F0',
    bg_card: '#ffffff',
    danger:  '#dc2626',
  },

  gradients: {
    primary: 'linear-gradient(135deg, #14284B, #24406E)',
  },

  shadows: {
    ambient: '0 12px 40px rgba(20,40,75, 0.06)',
    float:   '0 12px 40px rgba(20,40,75, 0.12)',
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
