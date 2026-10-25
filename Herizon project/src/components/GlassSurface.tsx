import React from 'react';
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import Colors from '../theme/colors';

function loadBlur(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-blur').BlurView; // npx expo install expo-blur
  } catch {
    return null;
  }
}
const BlurView = loadBlur();

/** Translucent glass panel. Uses native blur when expo-blur is installed, CSS backdrop-filter on web,
 *  and a near-opaque tinted surface otherwise (so text stays readable everywhere). */
export const GlassSurface: React.FC<{ style?: StyleProp<ViewStyle>; intensity?: number; children?: React.ReactNode }> = ({
  style, intensity = 40, children,
}) => {
  const base: ViewStyle = {
    borderRadius: 20, borderWidth: 1, borderColor: Colors.glassBorder, overflow: 'hidden',
    shadowColor: Colors.shadowColor, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  };
  if (BlurView) {
    return (
      <BlurView intensity={intensity} tint="light" style={[base, style]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.glassLavender }]} />
        {children}
      </BlurView>
    );
  }
  const web: any = Platform.OS === 'web' ? { backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } : {};
  return (
    <View style={[base, { backgroundColor: Platform.OS === 'web' ? Colors.glassCard : 'rgba(251,248,247,0.94)' }, web, style]}>
      {children}
    </View>
  );
};

export default GlassSurface;
