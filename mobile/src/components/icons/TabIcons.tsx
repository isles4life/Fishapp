import React from 'react';
import Svg, { Path, Circle, Rect, Polyline, Line } from 'react-native-svg';

type IconProps = { color: string; size?: number };

export function HomeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9L12 2L21 9V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

export function CameraIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2"/>
    </Svg>
  );
}

export function LeaderboardIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="14" width="4" height="8" rx="1" stroke={color} strokeWidth="2"/>
      <Rect x="9" y="9" width="4" height="13" rx="1" stroke={color} strokeWidth="2"/>
      <Rect x="16" y="4" width="4" height="18" rx="1" stroke={color} strokeWidth="2"/>
    </Svg>
  );
}

export function TrophyIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 21H16M12 17V21M7 3H17V10C17 12.7614 14.7614 15 12 15C9.23858 15 7 12.7614 7 10V3Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M7 5H4C4 5 3 12 7 12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <Path d="M17 5H20C20 5 21 12 17 12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </Svg>
  );
}

export function ProfileIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2"/>
      <Path d="M4 20C4 17.8 7.58172 16 12 16C16.4183 16 20 17.8 20 20" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </Svg>
  );
}

export function SubmitButtonIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Circle cx="14" cy="14" r="13" stroke="#C9A450" strokeWidth="1.5" fill="none" />
      <Circle cx="14" cy="14" r="8" fill="#C9A450" fillOpacity="0.2" />
      <Path d="M10 10L14 6L18 10" stroke="#C9A450" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M14 6V18" stroke="#C9A450" strokeWidth="2" strokeLinecap="round"/>
      <Path d="M9 21H19" stroke="#C9A450" strokeWidth="2" strokeLinecap="round"/>
    </Svg>
  );
}
