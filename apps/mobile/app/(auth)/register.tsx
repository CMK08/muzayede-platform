import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useRegister } from '@/hooks/useAuth';

export default function RegisterScreen() {
  const router = useRouter();
  const registerMutation = useRegister();

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Ad gereklidir';
    if (!surname.trim()) newErrors.surname = 'Soyad gereklidir';

    if (!email.trim()) {
      newErrors.email = 'E-posta adresi gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Gecerli bir e-posta adresi giriniz';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Telefon numarasi gereklidir';
    } else if (phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Gecerli bir telefon numarasi giriniz';
    }

    if (!password) {
      newErrors.password = 'Sifre gereklidir';
    } else if (password.length < 6) {
      newErrors.password = 'Sifre en az 6 karakter olmalidir';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Sifreler eslesmiyor';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      await registerMutation.mutateAsync({
        name,
        surname,
        email,
        phone,
        password,
      });
      router.push({
        pathname: '/(auth)/verify',
        params: { phone },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Kayit yapilamadi. Lutfen tekrar deneyiniz.';
      Alert.alert('Hata', message);
    }
  };

  const clearError = (field: string) => {
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Hesap Olustur</Text>
          <Text style={styles.subtitle}>
            Muzayede platformuna katilmak icin bilgilerinizi giriniz.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={styles.label}>Ad</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Adiniz"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  clearError('name');
                }}
              />
              {errors.name ? (
                <Text style={styles.errorText}>{errors.name}</Text>
              ) : null}
            </View>

            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={styles.label}>Soyad</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.surname && styles.inputError,
                ]}
                placeholder="Soyadiniz"
                placeholderTextColor={Colors.textTertiary}
                value={surname}
                onChangeText={(t) => {
                  setSurname(t);
                  clearError('surname');
                }}
              />
              {errors.surname ? (
                <Text style={styles.errorText}>{errors.surname}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-posta Adresi</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="ornek@email.com"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clearError('email');
              }}
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon Numarasi</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="05XX XXX XX XX"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                clearError('phone');
              }}
            />
            {errors.phone ? (
              <Text style={styles.errorText}>{errors.phone}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sifre</Text>
            <TextInput
              style={[
                styles.input,
                errors.password && styles.inputError,
              ]}
              placeholder="En az 6 karakter"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                clearError('password');
              }}
            />
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sifre Tekrar</Text>
            <TextInput
              style={[
                styles.input,
                errors.confirmPassword && styles.inputError,
              ]}
              placeholder="Sifrenizi tekrar giriniz"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                clearError('confirmPassword');
              }}
            />
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>
                {errors.confirmPassword}
              </Text>
            ) : null}
          </View>

          <Text style={styles.termsText}>
            Kayit olarak{' '}
            <Text style={styles.termsLink}>Kullanim Kosullarini</Text> ve{' '}
            <Text style={styles.termsLink}>Gizlilik Politikasini</Text>{' '}
            kabul etmis olursunuz.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.registerButton,
              pressed && styles.registerButtonPressed,
              registerMutation.isPending && styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.registerButtonText}>Kayit Ol</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Zaten hesabiniz var mi? </Text>
          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>Giris Yap</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
  },
  termsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  registerButtonPressed: {
    opacity: 0.8,
  },
  registerButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
