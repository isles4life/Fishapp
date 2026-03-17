import React from 'react';
import Svg, { Path, Circle, Ellipse, Line } from 'react-native-svg';

type IconProps = { color?: string; size?: number };

export function FishOnMatIcon({ color = '#CFC29C', size = 32 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Mat rectangle */}
      <Path d="M4 22 L28 22 L28 26 L4 26 Z" stroke={color} strokeWidth="1.5" fill="none" />
      {/* Fish body */}
      <Ellipse cx="16" cy="16" rx="9" ry="5" stroke={color} strokeWidth="1.5" fill="none"/>
      {/* Fish tail */}
      <Path d="M7 16 L2 11 L2 21 Z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      {/* Fish eye */}
      <Circle cx="22" cy="14.5" r="1.5" fill={color}/>
      {/* Arrow down to mat */}
      <Path d="M16 21 L16 22" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </Svg>
  );
}

export function MouthClosedIcon({ color = '#CFC29C', size = 32 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Fish head (side profile) */}
      <Ellipse cx="18" cy="16" rx="8" ry="6" stroke={color} strokeWidth="1.5" fill="none"/>
      {/* Tail */}
      <Path d="M10 16 L4 10 L4 22 Z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      {/* Closed mouth line */}
      <Path d="M24 16 L26 16" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      {/* Eye */}
      <Circle cx="20" cy="14" r="1.5" fill={color}/>
      {/* Check mark */}
      <Path d="M8 26 L11 29 L16 23" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

export function TailPinchedIcon({ color = '#CFC29C', size = 32 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Fish body */}
      <Ellipse cx="18" cy="16" rx="8" ry="5" stroke={color} strokeWidth="1.5" fill="none"/>
      {/* Pinched tail */}
      <Path d="M10 16 L4 12 L7 16 L4 20 Z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      {/* Pinch fingers */}
      <Path d="M3 12 Q1 14 1 16" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <Path d="M3 20 Q1 18 1 16" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      {/* Eye */}
      <Circle cx="22" cy="14.5" r="1.5" fill={color}/>
    </Svg>
  );
}
