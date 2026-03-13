import { TextStyle } from 'react-native';

export const typography = {
  // Display / headers — bold condensed feel
  displayLg:  { fontSize: 32, fontWeight: '900', letterSpacing: -0.5, textTransform: 'uppercase' } as TextStyle,
  displayMd:  { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, textTransform: 'uppercase' } as TextStyle,
  displaySm:  { fontSize: 18, fontWeight: '800', letterSpacing: 0.5,  textTransform: 'uppercase' } as TextStyle,
  // Numbers
  numLg:      { fontSize: 28, fontWeight: '900', letterSpacing: -1 } as TextStyle,
  numMd:      { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 } as TextStyle,
  // Labels
  label:      { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' } as TextStyle,
  labelSm:    { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' } as TextStyle,
  // Body
  bodyLg:     { fontSize: 16, fontWeight: '400', lineHeight: 24 } as TextStyle,
  bodyMd:     { fontSize: 14, fontWeight: '400', lineHeight: 20 } as TextStyle,
  bodySm:     { fontSize: 12, fontWeight: '400', lineHeight: 16 } as TextStyle,
  // UI
  button:     { fontSize: 14, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' } as TextStyle,
  caption:    { fontSize: 11, fontWeight: '400', letterSpacing: 0.2 } as TextStyle,
};
