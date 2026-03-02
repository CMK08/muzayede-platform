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
import { useLogin } from '@/hooks/useAuth';

type LoginTab = 'email' | 'phone';

export default function LoginScreen() {
  const router = useRouter();
  const loginMutation = useLogin();

  const [activeTab, setActiveTab] = useState<LoginTab>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (activeTab === 'email') {
      if (!email.trim()) {
        newErrors.email = 'E-posta adresi gereklidir';
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = 'Gecerli bir e-posta adresi giriniz';
      }
    } else {
      if (!phone.trim()) {
        newErrors.phone = 'Telefon numarasi gereklidir';
      } else if (phone.replace(/\D/g, '').length < 10) {
        newErrors.phone = 'Gecerli bir telefon numarasi giriniz';
      }
    }

    if (!password) {
      newErrors.password = 'Sifre gereklidir';
    } else if (password.length < 6) {
      newErrors.password = 'Sifre en az 6 karakter olmalidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      await loginMutation.mutateAsync({
        email: activeTab === 'email' ? email : undefined,
        phone: activeTab === 'phone' ? phone : undefined,
        password,
      });
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Giris yapilamadi. Bilgilerinizi kontrol ediniz.';
      Alert.alert('Hata', message);
    }
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
        {/* Logo / Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>Muzayede</Text>
          <Text style={styles.subtitle}>
            Hesabiniza giris yapin
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'email' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('email')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'email' && styles.tabTextActive,
              ]}
            >
              E-posta
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'phone' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('phone')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'phone' && styles.tabTextActive,
              ]}
            >
              Telefon
            </Text>
          </Pressable>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {activeTab === 'email' ? (
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
                  setErrors((e) => ({ ...e, email: '' }));
                }}
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>
          ) : (
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
                  setErrors((e) => ({ ...e, phone: '' }));
                }}
              />
              {errors.phone ? (
                <Text style={styles.errorText}>{errors.phone}</Text>
              ) : null}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sifre</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Sifrenizi giriniz"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrors((e) => ({ ...e, password: '' }));
              }}
            />
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          <Pressable style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Sifremi Unuttum</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.loginButtonPressed,
              loginMutation.isPending && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.loginButtonText}>Giris Yap</Text>
            )}
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Login */}
        <View style={styles.socialContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.socialButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialButtonText}>
              Google ile Giris Yap
            </Text>
          </Pressable>
          {Platform.OS === 'ios' && (
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                styles.socialButtonApple,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.socialIconApple}>A</Text>
              <Text style={styles.socialButtonTextApple}>
                Apple ile Giris Yap
              </Text>
            </Pressable>
          )}
        </View>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Hesabiniz yok mu? </Text>
          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Kayit Ol</Text>
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
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.surface,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  form: {
    gap: 16,
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
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  loginButtonPressed: {
    opacity: 0.8,
  },
  loginButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  socialContainer: {
    gap: 10,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 10,
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  socialButtonApple: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  socialIconApple: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  socialButtonTextApple: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
