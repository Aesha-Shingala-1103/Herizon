import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image, AccessibilityInfo, useWindowDimensions } from 'react-native';
import Svg, { Ellipse, Circle, G } from 'react-native-svg';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import AppLogo from './AppLogo';


/** Five-petal cherry-blossom emblem drawn in SVG (no external assets). */
export const BlossomEmblem: React.FC<{ size?: number }> = ({ size = 96 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    accessibilityLabel="HerHealth emblem"
  >
    { [0, 72, 144, 216, 288].map((deg) => (
      <Ellipse
        key={deg}
        cx="50"
        cy="27"
        rx="12"
        ry="19"
        fill={Colors.blossomRose}
        opacity={0.92}
        transform={`rotate(${deg} 50 50)`}
        stroke={Colors.white}
        strokeWidth="1.5"
      />
    ))}

    <Circle cx="50" cy="50" r="9" fill={Colors.deepBurgundy} />
    <Circle cx="50" cy="50" r="4" fill={Colors.paleRoseWhite} />
  </Svg>

);

interface Props {
  /** When true the splash fades out and then unmounts. */
  done: boolean;
  /** Called once the splash has fully faded out and is gone. */
  onHidden?: () => void;
  /** Minimum time (ms) the splash stays visible so the logo can actually be seen. */
  minDuration?: number;
}

export const BrandSplash: React.FC<Props> = ({ done, onHidden, minDuration = 1800 }) => {
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), minDuration);
    return () => clearTimeout(t);
  }, [minDuration]);

  const [opacity] = useState(() => new Animated.Value(1));
  const [rise] = useState(() => new Animated.Value(12));
  const [gone, setGone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const { width } = useWindowDimensions();
  const logoSize = Math.round(Math.min(Math.max(width * 0.42, 120), 190));
  const nameSize = width < 360 ? 32 : 38;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (reduceMotion) { rise.setValue(0); return; }
    Animated.timing(rise, { toValue: 0, duration: 450, useNativeDriver: true }).start();
  }, [reduceMotion, rise]);

  useEffect(() => {
    if (!done || !minElapsed) return;
    Animated.timing(opacity, { toValue: 0, duration: reduceMotion ? 0 : 320, useNativeDriver: true }).start(() => {
      setGone(true);
      onHidden?.();
    });
  }, [done, minElapsed, reduceMotion, opacity, onHidden]);

  if (gone) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity }]} pointerEvents={done && minElapsed ? 'none' : 'auto'}>
      <View style={styles.blobA} />
      <View style={styles.blobB} />
      <Image source={require('../../assets/cherry_blossom_hero.jpg')} style={styles.hero} resizeMode="cover" />
      <Animated.View style={[styles.center, { transform: [{ translateY: rise }] }]}>
        <AppLogo size={logoSize} />
        <Text style={[styles.name, { fontSize: nameSize }]} numberOfLines={1} adjustsFontSizeToFit>HerHealth</Text>
        <Text style={styles.tagline}>Your health, your rhythm.</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { backgroundColor: Colors.softLavender, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  blobA: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: Colors.dustyBlue, opacity: 0.35, top: -120, right: -140 },
  blobB: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: Colors.blossomRose, opacity: 0.25, bottom: -110, left: -120 },
  hero: { position: 'absolute', top: 0, left: 0, right: 0, height: '38%', opacity: 0.35 },
  center: { alignItems: 'center', paddingHorizontal: 24, maxWidth: '100%' },
  name: { marginTop: 16, textAlign: 'center', color: Colors.lavenderSlate, fontFamily: Typography.heading, letterSpacing: 0.5 },
  tagline: { marginTop: 6, textAlign: 'center', fontSize: 15, color: Colors.deepBurgundy, fontFamily: Typography.body, letterSpacing: 0.4 },
});

export default BrandSplash;
