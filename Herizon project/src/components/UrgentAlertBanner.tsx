import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { AlertTriangle, PhoneCall, X } from 'lucide-react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { UrgentSafetyAlert } from '../types';

interface UrgentAlertBannerProps {
  alert: UrgentSafetyAlert;
  onDismiss?: () => void;
}

export const UrgentAlertBanner: React.FC<UrgentAlertBannerProps> = ({ alert, onDismiss }) => {
  const handleCallEmergency = () => {
    Linking.openURL(`tel:${alert.emergency_number}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <AlertTriangle color={Colors.deepBurgundy} size={20} />
          <Text style={styles.headline}>{alert.headline}</Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={18} color={Colors.mutedText} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.description}>{alert.description}</Text>

      <View style={styles.instructionsContainer}>
        {alert.instructions.map((inst, idx) => (
          <Text key={idx} style={styles.instructionItem}>
            • {inst}
          </Text>
        ))}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleCallEmergency}
        style={styles.callButton}
      >
        <PhoneCall size={16} color={Colors.white} />
        <Text style={styles.callButtonText}>
          Emergency Helpline ({alert.emergency_number})
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.paleRoseWhite,
    borderColor: Colors.blossomRose,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    marginVertical: 10,
    shadowColor: Colors.deepBurgundy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headline: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    fontFamily: Typography.heading,
    flex: 1,
  },
  dismissBtn: {
    padding: 4,
  },
  description: {
    fontSize: 13,
    color: Colors.lavenderSlate,
    lineHeight: 18,
    marginBottom: 10,
    fontFamily: Typography.body,
  },
  instructionsContainer: {
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.3)',
  },
  instructionItem: {
    fontSize: 12,
    color: Colors.lavenderSlate,
    lineHeight: 18,
    marginBottom: 4,
    fontFamily: Typography.body,
  },
  callButton: {
    backgroundColor: Colors.deepBurgundy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 22,
    shadowColor: Colors.deepBurgundy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  callButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
  },
});

export default UrgentAlertBanner;
