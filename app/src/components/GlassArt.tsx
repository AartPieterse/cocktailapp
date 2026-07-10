import { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Cocktail } from '@cocktailapp/shared';
import { barkastGlassSVG } from '../lib/glass-svg';
import { glassSpecFor } from '../lib/cocktail-visual';

/**
 * Renders a Barkast cocktail glass for a drink as inline SVG. Reuses the same framework-agnostic
 * `barkastGlassSVG` generator as the web app and feeds the string to react-native-svg's `SvgXml`,
 * so it draws identically on native and on the Expo web build. Resolution independent — sharp at
 * 40px in a list row or 190px on a detail hero.
 */
export function GlassArt({
  cocktail,
  width = '100%',
  height,
  style,
}: {
  cocktail: Cocktail;
  width?: number | string;
  height?: number | string;
  style?: StyleProp<ViewStyle>;
}) {
  const xml = useMemo(() => barkastGlassSVG(glassSpecFor(cocktail)), [cocktail]);
  return (
    <View style={style} pointerEvents="none">
      <SvgXml xml={xml} width={width} height={height ?? '100%'} />
    </View>
  );
}
