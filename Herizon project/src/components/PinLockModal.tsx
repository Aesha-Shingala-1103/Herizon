import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { Fingerprint, Delete } from 'lucide-react-native';
import AppLogo from './AppLogo';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { securityService } from '../services/securityService';
import { storage } from '../services/storageService';

interface PinLockModalProps {
  visible: boolean;
  onUnlocked: () => void;
  title?: string;
  subtitle?: string;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  visible,
  onUnlocked,
  title = 'HerHealth Protected',
  subtitle = 'Enter your 4-digit security PIN to access your private health records',
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  const handleBiometricAuth = useCallback(async () => {
    const success = await securityService.authenticateWithBiometrics();
    if (success) {
      await securityService.updateLastActiveTimestamp();
      setEnteredPin('');
      setErrorMessage('');
      onUnlocked();
    }
  }, [onUnlocked]);

  useEffect(() => {
    let active = true;
    if (visible) {
      Promise.all([
        securityService.isBiometricsAvailable(),
        storage.getPreferences(),
      ]).then(([available, prefs]) => {
        if (!active) return;
        setBiometricsAvailable(available);
        // Only auto-trigger if available AND biometrics preference is not explicitly disabled
        if (available && prefs?.biometrics_enabled !== false) {
          handleBiometricAuth();
        }
      }).catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [visible, handleBiometricAuth]);

  const handleKeyPress = async (digit: string) => {
    if (enteredPin.length >= 4) return;
    const newPin = enteredPin + digit;
    setEnteredPin(newPin);
    setErrorMessage('');

    if (newPin.length === 4) {
      const isValid = await securityService.verifyPin(newPin);
      if (isValid) {
        await securityService.updateLastActiveTimestamp();
        onUnlocked();
      } else {
        Vibration.vibrate(100);
        setErrorMessage('Incorrect PIN. Please try again.');
        setTimeout(() => setEnteredPin(''), 300);
      }
    }
  };

  const handleDelete = () => {
    if (enteredPin.length > 0) {
      setEnteredPin(enteredPin.slice(0, -1));
      setErrorMessage('');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppLogo size={88} style={{ marginBottom: 16 }} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* PIN Indicators */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = enteredPin.length > idx;
            return (
              <View
                key={idx}
                style={[styles.dot, isFilled && styles.dotFilled]}
              />
            );
          })}
        </View>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : (
          <View style={{ height: 20 }} />
        )}

        {/* Keypad */}
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
          ].map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((digit) => (
                <TouchableOpacity
                  key={digit}
                  activeOpacity={0.65}
                  onPress={() => handleKeyPress(digit)}
                  style={styles.keyButton}
                >
                  <Text style={styles.keyText}>{digit}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Bottom row: Biometric / 0 / Delete */}
          <View style={styles.keypadRow}>
            {biometricsAvailable ? (
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={handleBiometricAuth}
                style={styles.keyButtonSpecial}
              >
                <Fingerprint size={28} color={Colors.deepBurgundy} />
              </TouchableOpacity>
            ) : (
              <View style={styles.keyButtonPlaceholder} />
            )}

            <TouchableOpacity
              activeOpacity={0.65}
              onPress={() => handleKeyPress('0')}
              style={styles.keyButton}
            >
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.65}
              onPress={handleDelete}
              style={styles.keyButtonSpecial}
            >
              <Delete size={22} color={Colors.lavenderSlate} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmPorcelain,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.softLavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  title: {
    fontSize: Typography.pageTitle,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.mutedText,
    fontFamily: Typography.body,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 19,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.blossomRose,
    backgroundColor: Colors.white,
  },
  dotFilled: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  errorText: {
    fontSize: 13,
    color: Colors.deepBurgundy,
    fontWeight: '600',
    height: 20,
    marginBottom: 10,
  },
  keypad: {
    width: '100%',
    maxWidth: 300,
    marginTop: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.lavenderSlate,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.lavenderSlate,
    fontFamily: Typography.body,
  },
  keyButtonSpecial: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyButtonPlaceholder: {
    width: 72,
    height: 72,
  },
});

export default PinLockModal;
