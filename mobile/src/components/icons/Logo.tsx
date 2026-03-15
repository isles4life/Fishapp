import React from 'react';
import { View, Text, Image } from 'react-native';

// icon.png is 479×450 — aspect ratio 0.939 (height/width)
const IMG_RATIO = 450 / 479;

export function FishLeagueLogo({ size = 80 }: { size?: number }) {
  const imgHeight = size * IMG_RATIO;
  return (
    <View style={{ width: size, height: imgHeight, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../../../assets/icon.png')}
        style={{ width: size, height: imgHeight }}
        resizeMode="contain"
      />
    </View>
  );
}

export function FishLeagueLogoFull({ width = 160 }: { width?: number }) {
  // Shield takes ~40% of the total width; correct height via aspect ratio
  const imgW = width * 0.42;
  const imgH = imgW * IMG_RATIO;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../../../assets/icon.png')}
        style={{ width: imgW, height: imgH }}
        resizeMode="contain"
      />
      <Text style={{ fontSize: 18, fontWeight: '900', letterSpacing: 1 }}>
        <Text style={{ color: '#F0EDE4' }}>FISH</Text>
        <Text style={{ color: '#C9A450' }}>LEAGUE</Text>
      </Text>
    </View>
  );
}
