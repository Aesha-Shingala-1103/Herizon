import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { Sparkles } from 'lucide-react-native';

interface GlassPanelProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'white' | 'lavender' | 'rose' | 'dusty';
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  style,
  variant = 'white',
}) => {
  return (
    <View style={[styles.glassBase, styles[`glass_${variant}`], style]}>
      {children}
    </View>
  );
};

interface FloralHeroCardProps {
  greeting: string;
  name?: string;
  dateStr: string;
  wellnessQuote?: string;
  onExplorePress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const FloralHeroCard: React.FC<FloralHeroCardProps> = ({
  greeting,
  name,
  dateStr,
  wellnessQuote = 'Your health, your rhythm. A sanctuary to understand your body and care for yourself.',
  onExplorePress,
  style,
}) => {
  return (
    <View style={[styles.heroCardContainer, style]}>
      {/* Background Floral Artwork */}
      <Image
        source={require('../../assets/cherry_blossom_hero.jpg')}
        style={styles.heroBackgroundImage as any}
        resizeMode="cover"
      />

      {/* Layered Glass Overlay */}
      <View style={styles.heroGlassOverlay}>
        <View style={styles.heroContent}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Sparkles size={12} color={Colors.deepBurgundy} />
              <Text style={styles.heroBadgeText}>{dateStr}</Text>
            </View>
          </View>

          <Text style={styles.heroGreetingText}>
            {greeting}
            {name ? `, ${name}` : ''}
          </Text>

          <Text style={styles.heroQuoteText}>{wellnessQuote}</Text>

          {onExplorePress && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onExplorePress}
              style={styles.heroActionButton}
            >
              <Text style={styles.heroActionText}>Explore Today's Health</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

interface FloralEmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const FloralEmptyState: React.FC<FloralEmptyStateProps> = ({
  title,
  message,
  actionLabel,
  onActionPress,
  style,
}) => {
  return (
    <View style={[styles.emptyStateContainer, style]}>
      <View style={styles.emptyImageWrapper}>
        <Image
          source={require('../../assets/floral_empty_state.jpg')}
          style={styles.emptyStateImage as any}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateMessage}>{message}</Text>
      {actionLabel && onActionPress && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onActionPress}
          style={styles.emptyStateButton}
        >
          <Text style={styles.emptyStateButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Glassmorphism System
  glassBase: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      } as any,
      default: {},
    }),
    shadowColor: Colors.lavenderSlate,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  glass_white: {
    backgroundColor: Colors.glassCard,
    borderColor: Colors.glassBorder,
  },
  glass_lavender: {
    backgroundColor: Colors.glassLavender,
    borderColor: 'rgba(217, 218, 228, 0.8)',
  },
  glass_rose: {
    backgroundColor: Colors.glassRose,
    borderColor: 'rgba(219, 161, 165, 0.5)',
  },
  glass_dusty: {
    backgroundColor: Colors.glassDustyBlue,
    borderColor: 'rgba(145, 160, 189, 0.4)',
  },

  // Floral Hero Card
  heroCardContainer: {
    borderRadius: 26,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 180,
    marginVertical: 10,
    backgroundColor: Colors.softLavender,
    shadowColor: Colors.deepBurgundy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  heroBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.88,
  },
  heroGlassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(251, 248, 247, 0.48)',
    padding: 20,
    justifyContent: 'space-between',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      } as any,
      default: {},
    }),
  },
  heroContent: {
    zIndex: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.deepBurgundy,
    letterSpacing: 0.3,
  },
  heroGreetingText: {
    fontSize: Typography.hero,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
    letterSpacing: -0.2,
    marginBottom: 6,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroQuoteText: {
    fontSize: 13,
    color: Colors.lavenderSlate,
    lineHeight: 18,
    fontFamily: Typography.body,
    maxWidth: '85%',
    opacity: 0.92,
  },
  heroActionButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: Colors.deepBurgundy,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: Colors.deepBurgundy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  heroActionText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Empty State System
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginVertical: 16,
    backgroundColor: Colors.glassCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  emptyImageWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.paleRoseWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.3)',
    overflow: 'hidden',
  },
  emptyStateImage: {
    width: 100,
    height: 100,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 13,
    color: Colors.mutedText,
    fontFamily: Typography.body,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: Colors.deepBurgundy,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
    shadowColor: Colors.deepBurgundy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  emptyStateButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
