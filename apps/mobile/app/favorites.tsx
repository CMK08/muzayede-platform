import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { AuctionCard } from '@/components/AuctionCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { useMyFavorites } from '@/hooks/useAuctions';
import { useAuthStore } from '@/stores/auth-store';

export default function FavoritesScreen() {
  const { isAuthenticated } = useAuthStore();
  const { data: favorites, isLoading, refetch } = useMyFavorites();
  const [refreshing, setRefreshing] = React.useState(false);
  const router = useRouter();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Giris Yapin"
        message="Favorilerinizi gormek icin giris yapin."
        actionLabel="Giris Yap"
        onAction={() => router.push('/(auth)/login')}
      />
    );
  }

  if (isLoading) {
    return <LoadingSkeleton variant="card" count={3} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <AuctionCard auction={item} variant="vertical" />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title="Favori Yok"
            message="Henuz hicbir muzayedeyi favorilerinize eklemediniz. Begendiginiz muzayedeleri favorilerinize ekleyin!"
            actionLabel="Muzayedelere Git"
            onAction={() => router.push('/(tabs)/auctions')}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
    paddingBottom: 20,
  },
  cardWrapper: {
    marginBottom: 0,
  },
});
