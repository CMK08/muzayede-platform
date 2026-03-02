import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { useAuthStore } from '@/stores/auth-store';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';

interface MenuItemProps {
  label: string;
  subtitle?: string;
  onPress: () => void;
  isDestructive?: boolean;
}

function MenuItem({
  label,
  subtitle,
  onPress,
  isDestructive = false,
}: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
      ]}
    >
      <View style={styles.menuItemContent}>
        <Text
          style={[
            styles.menuItemLabel,
            isDestructive && styles.menuItemDestructive,
          ]}
        >
          {label}
        </Text>
        {subtitle && (
          <Text style={styles.menuItemSubtitle}>{subtitle}</Text>
        )}
      </View>
      <Text style={styles.menuItemArrow}>{'>'}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { isLoading } = useCurrentUser();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    Alert.alert('Cikis Yap', 'Hesabinizdan cikis yapmak istediginize emin misiniz?', [
      { text: 'Iptal', style: 'cancel' },
      {
        text: 'Cikis Yap',
        style: 'destructive',
        onPress: () => logoutMutation.mutate(),
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.notAuthContainer}>
        <View style={styles.notAuthContent}>
          <View style={styles.avatarPlaceholderLarge}>
            <Text style={styles.avatarPlaceholderText}>?</Text>
          </View>
          <Text style={styles.notAuthTitle}>Hosgeldiniz</Text>
          <Text style={styles.notAuthMessage}>
            Hesabiniza erisim saglamak icin giris yapin veya yeni bir hesap olusturun.
          </Text>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.loginButtonPressed,
            ]}
          >
            <Text style={styles.loginButtonText}>Giris Yap</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(auth)/register')}
            style={({ pressed }) => [
              styles.registerButton,
              pressed && styles.registerButtonPressed,
            ]}
          >
            <Text style={styles.registerButtonText}>Kayit Ol</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton variant="profile" />;
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        {user?.avatar ? (
          <Image
            source={{ uri: user.avatar }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </Text>
          </View>
        )}
        <Text style={styles.userName}>
          {user?.name} {user?.surname}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        {user?.isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>Dogrulanmis</Text>
          </View>
        )}
      </View>

      {/* Menu Sections */}
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Hesabim</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            label="Tekliflerim"
            subtitle="Verdiginiz tum teklifler"
            onPress={() => router.push('/my-bids')}
          />
          <MenuItem
            label="Siparislerim"
            subtitle="Kazandiginiz muzayedeler"
            onPress={() => router.push('/my-orders')}
          />
          <MenuItem
            label="Favorilerim"
            subtitle="Takip ettiginiz muzayedeler"
            onPress={() => router.push('/favorites')}
          />
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Ayarlar</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            label="Ayarlar"
            subtitle="Bildirimler, dil, tema ve guvenlik"
            onPress={() => router.push('/settings')}
          />
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Destek</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            label="Yardim Merkezi"
            onPress={() => {}}
          />
          <MenuItem
            label="Bize Ulasin"
            onPress={() => {}}
          />
          <MenuItem
            label="Gizlilik Politikasi"
            onPress={() => {}}
          />
        </View>
      </View>

      <View style={styles.menuSection}>
        <View style={styles.menuGroup}>
          <MenuItem
            label="Cikis Yap"
            onPress={handleLogout}
            isDestructive
          />
        </View>
      </View>

      <Text style={styles.version}>Muzayede v1.0.0</Text>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  notAuthContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
  },
  notAuthContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  avatarPlaceholderLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarPlaceholderText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
  },
  notAuthTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  notAuthMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loginButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonPressed: {
    opacity: 0.8,
  },
  loginButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  registerButton: {
    width: '100%',
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  registerButtonPressed: {
    opacity: 0.8,
  },
  registerButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    gap: 4,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  verifiedBadge: {
    backgroundColor: Colors.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  menuSection: {
    marginTop: 20,
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  menuGroup: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuItemPressed: {
    backgroundColor: Colors.background,
  },
  menuItemContent: {
    flex: 1,
    gap: 2,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  menuItemDestructive: {
    color: Colors.error,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  menuItemArrow: {
    fontSize: 16,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 24,
  },
  bottomSpacer: {
    height: 40,
  },
});
