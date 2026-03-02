import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Colors } from '@/constants/colors';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PriceDisplay, formatPrice } from '@/components/PriceDisplay';
import { useMyBids } from '@/hooks/useBids';
import { useAuthStore } from '@/stores/auth-store';
import type { Bid } from '@/types';

function BidItem({ bid }: { bid: Bid }) {
  const router = useRouter();
  const auctionTitle = bid.auction?.title ?? 'Muzayede';
  const dateStr = format(new Date(bid.createdAt), 'd MMM yyyy HH:mm', {
    locale: tr,
  });

  return (
    <Pressable
      onPress={() => {
        if (bid.auctionId) {
          router.push(`/auction/${bid.auctionId}`);
        }
      }}
      style={({ pressed }) => [
        styles.bidItem,
        pressed && styles.bidItemPressed,
      ]}
    >
      <View style={styles.bidItemContent}>
        <Text style={styles.bidItemTitle} numberOfLines={1}>
          {auctionTitle}
        </Text>
        <Text style={styles.bidItemDate}>{dateStr}</Text>
        <View style={styles.bidItemRow}>
          <Text style={styles.bidItemAmount}>
            {formatPrice(bid.amount)} TL
          </Text>
          {bid.isWinning && (
            <View style={styles.winningBadge}>
              <Text style={styles.winningBadgeText}>Kazanan</Text>
            </View>
          )}
          {bid.isAutoBid && (
            <View style={styles.autoBidBadge}>
              <Text style={styles.autoBidBadgeText}>Otomatik</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.arrow}>{'>'}</Text>
    </Pressable>
  );
}

export default function MyBidsScreen() {
  const { isAuthenticated } = useAuthStore();
  const { data: bids, isLoading, refetch } = useMyBids();
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
        message="Tekliflerinizi gormek icin giris yapin."
        actionLabel="Giris Yap"
        onAction={() => router.push('/(auth)/login')}
      />
    );
  }

  if (isLoading) {
    return <LoadingSkeleton variant="list-item" count={6} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bids}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BidItem bid={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="Teklif Yok"
            message="Henuz hicbir muzayedeye teklif vermediniz. Muzayedelere goz atin ve teklif verin!"
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
    paddingBottom: 20,
  },
  bidItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  bidItemPressed: {
    backgroundColor: Colors.background,
  },
  bidItemContent: {
    flex: 1,
    gap: 4,
  },
  bidItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  bidItemDate: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  bidItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  bidItemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accent,
  },
  winningBadge: {
    backgroundColor: Colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  winningBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
  },
  autoBidBadge: {
    backgroundColor: Colors.info + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  autoBidBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.info,
  },
  arrow: {
    fontSize: 16,
    color: Colors.textTertiary,
    fontWeight: '600',
    marginLeft: 8,
  },
});
