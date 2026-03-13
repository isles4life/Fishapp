import React from 'react';
import Svg, { Path, Circle, Polygon, Text as SvgText, G } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

function BadgeShell({ color = '#C9A450', size = 48, children }: { color?: string; size?: number; children?: React.ReactNode }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 48 48" style={{ position: 'absolute' }}>
        {/* Hexagonal badge shape */}
        <Polygon
          points="24,2 44,13 44,35 24,46 4,35 4,13"
          fill={colors.surface}
          stroke={color}
          strokeWidth="2"
        />
      </Svg>
      {children}
    </View>
  );
}

export function FirstCatchBadge({ size = 48 }: { size?: number }) {
  return (
    <BadgeShell size={size}>
      <Text style={{ fontSize: size * 0.35 }}>🎣</Text>
    </BadgeShell>
  );
}

export function BigFishBadge({ size = 48 }: { size?: number }) {
  return (
    <BadgeShell size={size} color="#C9A450">
      <Text style={{ fontSize: size * 0.35 }}>🐟</Text>
    </BadgeShell>
  );
}

export function TournamentWinBadge({ size = 48 }: { size?: number }) {
  return (
    <BadgeShell size={size} color="#FFD700">
      <Text style={{ fontSize: size * 0.35 }}>🏆</Text>
    </BadgeShell>
  );
}

export function VerifiedAnglerBadge({ size = 48 }: { size?: number }) {
  return (
    <BadgeShell size={size} color="#3DAF5A">
      <Text style={{ fontSize: size * 0.35 }}>✓</Text>
    </BadgeShell>
  );
}

export function GenericBadge({ emoji, color, size = 48 }: { emoji: string; color?: string; size?: number }) {
  return (
    <BadgeShell size={size} color={color}>
      <Text style={{ fontSize: size * 0.35 }}>{emoji}</Text>
    </BadgeShell>
  );
}
