import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import Colors from '../theme/colors';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?:
    | 'elevated'
    | 'outlined'
    | 'subtle'
    | 'mint'
    | 'amber'
    | 'urgent'
    | 'glass'
    | 'lavender'
    | 'rose'
    | 'dusty';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'elevated' }) => {
  return <View style={[styles.card, styles[variant], style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginVertical: 6,
  },
  elevated: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    shadowColor: Colors.lavenderSlate,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  outlined: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.fineBorder,
  },
  subtle: {
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: 'rgba(233, 227, 231, 0.7)',
  },
  mint: {
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: Colors.softLavender,
  },
  amber: {
    backgroundColor: Colors.softLavender,
    borderWidth: 1,
    borderColor: Colors.dustyBlue,
  },
  urgent: {
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1.5,
    borderColor: Colors.deepBurgundy,
  },
  glass: {
    backgroundColor: Colors.glassCard,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      } as any,
      default: {},
    }),
    shadowColor: Colors.lavenderSlate,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    // Android elevation under a translucent background shows as a white box inside the card.
    elevation: 0,
  },
  lavender: {
    backgroundColor: Colors.glassLavender,
    borderWidth: 1,
    borderColor: 'rgba(217, 218, 228, 0.7)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as any,
      default: {},
    }),
  },
  rose: {
    backgroundColor: Colors.glassRose,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as any,
      default: {},
    }),
  },
  dusty: {
    backgroundColor: Colors.glassDustyBlue,
    borderWidth: 1,
    borderColor: 'rgba(145, 160, 189, 0.3)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as any,
      default: {},
    }),
  },
});

export default Card;
