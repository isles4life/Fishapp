import { TextStyle } from 'react-native';

// Font family constants
export const F = {
  display:  'Oswald_700Bold',
  displaySm:'Oswald_600SemiBold',
  body:     'Inter_400Regular',
  bodyMed:  'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
};

export const typography = {
  // Display / headers — Oswald Bold, uppercase
  displayLg:  { fontFamily: F.display,   fontSize: 32, letterSpacing: 0.5,  textTransform: 'uppercase' } as TextStyle,
  displayMd:  { fontFamily: F.display,   fontSize: 24, letterSpacing: 0.3,  textTransform: 'uppercase' } as TextStyle,
  displaySm:  { fontFamily: F.displaySm, fontSize: 18, letterSpacing: 0.5,  textTransform: 'uppercase' } as TextStyle,
  // Numbers — Oswald Bold
  numLg:      { fontFamily: F.display,   fontSize: 28, letterSpacing: -0.5 } as TextStyle,
  numMd:      { fontFamily: F.display,   fontSize: 20, letterSpacing: -0.3 } as TextStyle,
  // Labels — Inter SemiBold, uppercase
  label:      { fontFamily: F.bodySemi,  fontSize: 11, letterSpacing: 1.2,  textTransform: 'uppercase' } as TextStyle,
  labelSm:    { fontFamily: F.bodySemi,  fontSize: 10, letterSpacing: 1.5,  textTransform: 'uppercase' } as TextStyle,
  // Body — Inter Regular/Medium
  bodyLg:     { fontFamily: F.body,      fontSize: 16, lineHeight: 24 } as TextStyle,
  bodyMd:     { fontFamily: F.body,      fontSize: 14, lineHeight: 20 } as TextStyle,
  bodySm:     { fontFamily: F.body,      fontSize: 12, lineHeight: 16 } as TextStyle,
  // UI
  button:     { fontFamily: F.display,   fontSize: 14, letterSpacing: 0.8,  textTransform: 'uppercase' } as TextStyle,
  caption:    { fontFamily: F.body,      fontSize: 11, letterSpacing: 0.2 } as TextStyle,
};
