import React from 'react';
import Svg, { Path, Circle, Text as SvgText, G, Polygon, Ellipse } from 'react-native-svg';
import { View } from 'react-native';

export function FishLeagueLogo({ size = 80 }: { size?: number }) {
  const scale = size / 80;
  return (
    <View style={{ width: size, height: size * 1.2, alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 80 80">
        {/* Shield background */}
        <Path
          d="M40 4 L72 18 L72 48 C72 62 57 74 40 78 C23 74 8 62 8 48 L8 18 Z"
          fill="#1D331D"
          stroke="#C9A450"
          strokeWidth="2"
        />
        {/* Inner shield */}
        <Path
          d="M40 10 L66 22 L66 47 C66 59 53 69 40 72 C27 69 14 59 14 47 L14 22 Z"
          fill="#152515"
        />
        {/* Fish body */}
        <Ellipse cx="40" cy="38" rx="14" ry="7" fill="#C9A450" />
        {/* Fish tail */}
        <Path d="M26 38 L18 30 L18 46 Z" fill="#C9A450" />
        {/* Fish eye */}
        <Circle cx="50" cy="36" r="2" fill="#0D1A0D" />
        {/* Water line */}
        <Path d="M20 48 Q30 44 40 48 Q50 52 60 48" stroke="#C9A45080" strokeWidth="1.5" fill="none" />
      </Svg>
    </View>
  );
}

export function FishLeagueLogoFull({ width = 160 }: { width?: number }) {
  const height = width * 0.5;
  return (
    <Svg width={width} height={height} viewBox="0 0 160 50">
      {/* Shield icon compact */}
      <Path d="M25 2 L44 10 L44 28 C44 36 35 42 25 44 C15 42 6 36 6 28 L6 10 Z" fill="#1D331D" stroke="#C9A450" strokeWidth="1.5" />
      <Ellipse cx="25" cy="23" rx="9" ry="5" fill="#C9A450" />
      <Path d="M16 23 L10 18 L10 28 Z" fill="#C9A450" />
      <Circle cx="31" cy="21" r="1.5" fill="#0D1A0D" />
      {/* FISHLEAGUE text */}
      <SvgText x="52" y="20" fill="#F0EDE4" fontSize="16" fontWeight="900" letterSpacing="1">FISH</SvgText>
      <SvgText x="52" y="38" fill="#C9A450" fontSize="16" fontWeight="900" letterSpacing="1">LEAGUE</SvgText>
    </Svg>
  );
}
