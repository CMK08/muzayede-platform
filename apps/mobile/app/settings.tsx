import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { Colors } from '@/constants/colors';
import { Config } from '@/constants/config';
import { useAuthStore } from '@/stores/auth-store';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  updateUserLanguage,
  type NotificationPreferences,
} from '@/services/api';

type Language = 'TR' | 'EN' | 'AR';
type Theme = 'light' | 'dark' | 'system';

const languageLabels: Record<Language, string> = {
  TR: 'Turkce',
  EN: 'English',
  AR: 'العربية',
};

const themeLabels: Record<Theme, string> = {
  light: 'Acik',
  dark: 'Koyu',
  system: 'Sistem',
};

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description && (
          <Text style={styles.toggleDesc}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.border, true: Colors.primaryLight }}
        thumbColor={value ? Colors.primary : Colors.textTertiary}
        disabled={disabled}
      />
    </View>
  );
}

interface SelectionRowProps {
  label: string;
  options: { key: string; label: string }[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

function SelectionRow({ label, options, selectedKey, onSelect }: SelectionRowProps) {
  return (
    <View style={styles.selectionRow}>
      <Text style={styles.selectionLabel}>{label}</Text>
      <View style={styles.selectionOptions}>
        {options.map((option) => (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            style={[
              styles.selectionOption,
              selectedKey === option.key && styles.selectionOptionSelected,
            ]}
          >
            <Text
              style={[
                styles.selectionOptionText,
                selectedKey === option.key && styles.selectionOptionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuthStore();
  const logoutMutation = useLogout();

  // Local state
  const [language, setLanguage] = useState<Language>('TR');
  const [theme, setTheme] = useState<Theme>('light');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    bidUpdates: true,
    auctionReminders: true,
    priceAlerts: true,
    orderUpdates: true,
    promotions: false,
  });

  // Check biometric availability
  useEffect(() => {
    const checkBiometric = async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      // Load saved preference
      const savedBiometric = await storage.get<boolean>('biometric_enabled');
      setBiometricEnabled(savedBiometric ?? false);
    };
    checkBiometric();
  }, []);

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      const savedLang = await storage.get<Language>('app_language');
      if (savedLang) setLanguage(savedLang);

      const savedTheme = await storage.get<Theme>('app_theme');
      if (savedTheme) setTheme(savedTheme);

      // Load notification preferences from API if authenticated
      if (isAuthenticated) {
        try {
          const prefs = await fetchNotificationPreferences();
          setNotifPrefs(prefs);
        } catch {
          // Use defaults
        }
      }
    };
    loadSettings();
  }, [isAuthenticated]);

  const handleLanguageChange = useCallback(
    async (lang: string) => {
      setLanguage(lang as Language);
      await storage.set('app_language', lang);

      if (isAuthenticated) {
        try {
          await updateUserLanguage(lang);
        } catch {
          // Ignore API errors
        }
      }
    },
    [isAuthenticated]
  );

  const handleThemeChange = useCallback(async (newTheme: string) => {
    setTheme(newTheme as Theme);
    await storage.set('app_theme', newTheme);
  }, []);

  const handleBiometricToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Biyometrik giris icin dogrulayin',
          cancelLabel: 'Iptal',
          disableDeviceFallback: false,
        });

        if (result.success) {
          setBiometricEnabled(true);
          await storage.set('biometric_enabled', true);
        }
      } else {
        setBiometricEnabled(false);
        await storage.set('biometric_enabled', false);
      }
    },
    []
  );

  const handleNotifPrefChange = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      const newPrefs = { ...notifPrefs, [key]: value };
      setNotifPrefs(newPrefs);

      if (isAuthenticated) {
        try {
          await updateNotificationPreferences({ [key]: value });
        } catch {
          // Revert on error
          setNotifPrefs(notifPrefs);
        }
      }
    },
    [notifPrefs, isAuthenticated]
  );

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Cikis Yap',
      'Hesabinizdan cikis yapmak istediginize emin misiniz?',
      [
        { text: 'Iptal', style: 'cancel' },
        {
          text: 'Cikis Yap',
          style: 'destructive',
          onPress: () => {
            logoutMutation.mutate(undefined, {
              onSuccess: () => {
                router.replace('/(tabs)');
              },
            });
          },
        },
      ]
    );
  }, [logoutMutation, router]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      {/* Profile Info */}
      {isAuthenticated && user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil Bilgileri</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user.name} {user.surname}
              </Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              {user.phone && (
                <Text style={styles.profilePhone}>{user.phone}</Text>
              )}
            </View>
            <Pressable
              onPress={() => {
                // Navigate to profile edit screen (placeholder)
                Alert.alert('Bilgi', 'Profil duzenleme sayfasi yapilandirilacak');
              }}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>Duzenle</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Notification Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bildirim Tercihleri</Text>
        <View style={styles.settingsGroup}>
          <ToggleRow
            label="Teklif Bildirimleri"
            description="Tekliflerinizdeki degisiklikler"
            value={notifPrefs.bidUpdates}
            onValueChange={(v) => handleNotifPrefChange('bidUpdates', v)}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Muzayede Hatirlatmalari"
            description="Takip ettiginiz muzayedeler icin hatirlatmalar"
            value={notifPrefs.auctionReminders}
            onValueChange={(v) => handleNotifPrefChange('auctionReminders', v)}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Fiyat Uyarilari"
            description="Fiyat degisikliklerinde bildirim"
            value={notifPrefs.priceAlerts}
            onValueChange={(v) => handleNotifPrefChange('priceAlerts', v)}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Siparis Guncellemeleri"
            description="Siparis durum degisiklikleri"
            value={notifPrefs.orderUpdates}
            onValueChange={(v) => handleNotifPrefChange('orderUpdates', v)}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Promosyonlar"
            description="Kampanya ve firsatlar"
            value={notifPrefs.promotions}
            onValueChange={(v) => handleNotifPrefChange('promotions', v)}
          />
        </View>
      </View>

      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dil / Language</Text>
        <View style={styles.settingsGroup}>
          <SelectionRow
            label="Uygulama Dili"
            options={Object.entries(languageLabels).map(([key, label]) => ({
              key,
              label,
            }))}
            selectedKey={language}
            onSelect={handleLanguageChange}
          />
        </View>
      </View>

      {/* Theme */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tema</Text>
        <View style={styles.settingsGroup}>
          <SelectionRow
            label="Gorunum"
            options={Object.entries(themeLabels).map(([key, label]) => ({
              key,
              label,
            }))}
            selectedKey={theme}
            onSelect={handleThemeChange}
          />
        </View>
      </View>

      {/* Security */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Guvenlik</Text>
        <View style={styles.settingsGroup}>
          <ToggleRow
            label="Biyometrik Giris"
            description={
              biometricAvailable
                ? 'Parmak izi veya yuz tanima ile giris'
                : 'Cihazinizda biyometrik dogrulama bulunamadi'
            }
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            disabled={!biometricAvailable}
          />
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Uygulama</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Uygulama Adi</Text>
            <Text style={styles.infoValue}>{Config.APP_NAME}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Surum</Text>
            <Text style={styles.infoValue}>{Config.APP_VERSION}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>API Sunucusu</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {Config.API_URL}
            </Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      {isAuthenticated && (
        <View style={styles.section}>
          <Pressable
            onPress={handleLogout}
            disabled={logoutMutation.isPending}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
              logoutMutation.isPending && styles.buttonDisabled,
            ]}
          >
            {logoutMutation.isPending ? (
              <ActivityIndicator color={Colors.error} size="small" />
            ) : (
              <Text style={styles.logoutButtonText}>Cikis Yap</Text>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  settingsGroup: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  toggleDesc: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 16,
  },
  selectionRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  selectionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  selectionOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  selectionOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '15',
  },
  selectionOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  selectionOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: Colors.textInverse,
    fontSize: 22,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  profilePhone: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight + '15',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    maxWidth: 200,
  },
  logoutButton: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonPressed: {
    backgroundColor: Colors.background,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
