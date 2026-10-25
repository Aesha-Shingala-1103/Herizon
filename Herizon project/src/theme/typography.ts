import { Platform } from 'react-native';

// Optional brand fonts (npx expo install @expo-google-fonts/playfair-display @expo-google-fonts/dm-sans expo-font).
// If the packages are not installed the app falls back to platform serif / system sans.
function loadPlayfair(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@expo-google-fonts/playfair-display');
  } catch {
    return null;
  }
}
function loadDmSans(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@expo-google-fonts/dm-sans');
  } catch {
    return null;
  }
}
export const brandFontModules = {
  playfair: Platform.OS === 'web' ? null : loadPlayfair(),
  dmSans: Platform.OS === 'web' ? null : loadDmSans(),
};
export const brandFontMap: Record<string, any> = {
  ...(brandFontModules.playfair ? { PlayfairDisplay_600SemiBold: brandFontModules.playfair.PlayfairDisplay_600SemiBold } : {}),
  ...(brandFontModules.dmSans ? { DMSans_400Regular: brandFontModules.dmSans.DMSans_400Regular } : {}),
};

export const Typography = {
  // Sophisticated Feminine Heading & Body Font Family Pairing
  heading: Platform.select({
    web: "'Playfair Display', Georgia, 'Times New Roman', serif",
    ios: brandFontModules.playfair ? 'PlayfairDisplay_600SemiBold' : 'Georgia',
    android: brandFontModules.playfair ? 'PlayfairDisplay_600SemiBold' : 'serif',
    default: 'serif',
  }) as string,
  body: Platform.select({
    web: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    ios: brandFontModules.dmSans ? 'DMSans_400Regular' : 'System',
    android: brandFontModules.dmSans ? 'DMSans_400Regular' : 'Roboto',
    default: 'System',
  }) as string,

  // Numbers use the body face: the heading serif has old-style digits (7.5h looks uneven).
  numeric: Platform.select({
    web: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    ios: brandFontModules.dmSans ? 'DMSans_400Regular' : 'System',
    android: brandFontModules.dmSans ? 'DMSans_400Regular' : 'Roboto',
    default: 'System',
  }) as string,

  // Font Scale
  hero: 28,
  pageTitle: 22,
  sectionTitle: 18,
  cardTitle: 16,
  bodyText: 14,
  caption: 12,
  micro: 11,

  // Weights
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

export default Typography;
