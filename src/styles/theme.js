// Design System: The Curated Fairway
const theme = {
  colors: {
    // Brand
    primary:           '#003629',  // Forest Deep
    primaryContainer:  '#1b4d3e',  // Forest Mid
    secondary:         '#775a19',  // Champagne Metallic
    secondaryContainer:'#f0e6cc',

    // Surface hierarchy (No-Line system)
    surface:                   '#f7f9f7',
    surfaceContainerLowest:    '#ffffff',
    surfaceContainerLow:       '#f4f6f4',
    surfaceContainer:          '#eef0ee',
    surfaceContainerHigh:      '#e8eae8',
    surfaceContainerHighest:   '#e1e3e1',

    // Text
    onBackground: '#191c1b',
    onSurface:    '#191c1b',
    onPrimary:    '#ffffff',
    textSub:      '#4a5568',
    textMuted:    '#6b7280',

    // Outline
    outline:        '#8a9490',
    outlineVariant: '#c0c9c3',

    // Semantic
    error:            '#ba1a1a',
    errorContainer:   '#ffdad6',
    success:          '#1e6e3e',
    successContainer: '#c8f5d8',
    warning:          '#7a5200',
    warningContainer: '#ffdea4',

    // Legacy aliases
    bg_app:  '#f7f9f7',
    bg_card: '#ffffff',
    danger:  '#ba1a1a',
  },

  gradients: {
    primary: 'linear-gradient(135deg, #003629, #1b4d3e)',
  },

  shadows: {
    ambient: '0 12px 40px rgba(25, 28, 27, 0.06)',
    float:   '0 12px 40px rgba(25, 28, 27, 0.10)',
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
