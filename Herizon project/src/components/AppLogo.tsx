import React from 'react';
import { Image, StyleProp, ImageStyle } from 'react-native';

interface AppLogoProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/** HerHealth logo (cherry blossom with heart). */
export const AppLogo: React.FC<AppLogoProps> = ({ size = 64, style }) => (
  <Image
    source={require('../../assets/logo.png')}
    style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
    resizeMode="contain"
    accessibilityLabel="HerHealth logo"
  />
);

export default AppLogo;
