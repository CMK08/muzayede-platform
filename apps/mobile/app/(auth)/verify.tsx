import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useVerifyOtp } from '@/hooks/useAuth';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const verifyMutation = useVerifyOtp();

  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(
        () => setResendTimer((t) => t - 1),
        1000
      );
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleChange = useCallback(
    (value: string, index: number) => {
      const digit = value.replace(/[^0-9]/g, '');
      if (digit.length > 1) return;

      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      // Auto-focus next input
      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when complete
      if (newOtp.every((d) => d !== '')) {
        handleVerify(newOtp.join(''));
      }
    },
    [otp]
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      }
    },
    [otp]
  );

  const handleVerify = async (code?: string) => {
    const otpCode = code ?? otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      Alert.alert('Hata', 'Lutfen 6 haneli dogrulama kodunu giriniz.');
      return;
    }

    try {
      await verifyMutation.mutateAsync({
        phone: phone ?? '',
        code: otpCode,
      });
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Dogrulama kodu hatali. Lutfen tekrar deneyiniz.';
      Alert.alert('Hata', message);
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    setCanResend(false);
    setResendTimer(RESEND_COOLDOWN);
    // API call would go here to resend OTP
    Alert.alert('Bilgi', 'Dogrulama kodu tekrar gonderildi.');
  };

  const maskedPhone = phone
    ? `${phone.slice(0, 4)}***${phone.slice(-2)}`
    : '****';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>SMS</Text>
          </View>
          <Text style={styles.title}>Dogrulama Kodu</Text>
          <Text style={styles.subtitle}>
            {maskedPhone} numarasina gonderilen 6 haneli kodu giriniz.
          </Text>
        </View>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpInput,
                digit !== '' && styles.otpInputFilled,
              ]}
              value={digit}
              onChangeText={(value) => handleChange(value, index)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, index)
              }
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              autoFocus={index === 0}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.verifyButton,
            pressed && styles.verifyButtonPressed,
            verifyMutation.isPending && styles.buttonDisabled,
          ]}
          onPress={() => handleVerify()}
          disabled={verifyMutation.isPending}
        >
          {verifyMutation.isPending ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.verifyButtonText}>Dogrula</Text>
          )}
        </Pressable>

        <View style={styles.resendContainer}>
          {canResend ? (
            <Pressable onPress={handleResend}>
              <Text style={styles.resendLink}>Kodu Tekrar Gonder</Text>
            </Pressable>
          ) : (
            <Text style={styles.resendTimer}>
              Tekrar gonderim: {resendTimer}s
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '10',
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  verifyButtonPressed: {
    opacity: 0.8,
  },
  verifyButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  resendTimer: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
});
