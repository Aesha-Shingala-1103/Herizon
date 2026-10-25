import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import Colors from '../theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'rose' | 'outline' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? Colors.white : Colors.deepBurgundy}
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              styles.text,
              styles[`${variant}Text`],
              styles[`${size}Text`],
              disabled && styles.disabledText,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  // Variants
  primary: {
    backgroundColor: Colors.deepBurgundy,
    shadowColor: Colors.deepBurgundy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryText: {
    color: Colors.white,
  },
  secondary: {
    backgroundColor: Colors.softLavender,
    borderWidth: 1,
    borderColor: 'rgba(217, 218, 228, 0.9)',
  },
  secondaryText: {
    color: Colors.lavenderSlate,
  },
  rose: {
    backgroundColor: Colors.blossomRose,
    shadowColor: Colors.blossomRose,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  roseText: {
    color: Colors.white,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.blossomRose,
  },
  outlineText: {
    color: Colors.deepBurgundy,
  },
  danger: {
    backgroundColor: Colors.deepBurgundy,
  },
  dangerText: {
    color: Colors.white,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: Colors.deepBurgundy,
  },
  // Sizes
  small: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  smallText: {
    fontSize: 12,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 46,
    borderRadius: 22,
  },
  mediumText: {
    fontSize: 14,
  },
  large: {
    paddingVertical: 15,
    paddingHorizontal: 26,
    minHeight: 52,
    borderRadius: 26,
  },
  largeText: {
    fontSize: 16,
  },
  // States
  disabled: {
    opacity: 0.45,
  },
  disabledText: {
    color: Colors.mutedText,
  },
});

export default Button;
