import React from 'react';
import { View, Text, Image } from 'react-native';

export function FishLeagueLogo({ size = 80 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../../../assets/icon.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export function FishLeagueLogoFull({ width = 160 }: { width?: number }) {
  const logoSize = width * 0.28;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width }}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../../../assets/icon.png')}
        style={{ width: logoSize, height: logoSize }}
        resizeMode="contain"
      />
      <View>
        <Text style={{ color: '#F0EDE4', fontSize: 16, fontWeight: '900', letterSpacing: 1, lineHeight: 18 }}>FISH</Text>
        <Text style={{ color: '#C9A450', fontSize: 16, fontWeight: '900', letterSpacing: 1, lineHeight: 18 }}>LEAGUE</Text>
      </View>
    </View>
  );
}
