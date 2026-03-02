import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Colors } from '@/constants/colors';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { formatPrice } from '@/components/PriceDisplay';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api';
import type { Order, OrderStatus } from '@/types';

const statusLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Odeme Bekleniyor',
  PAID: 'Odendi',
  SHIPPED: 'Kargolandi',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'Iptal Edildi',
  REFUNDED: 'Iade Edildi',
};

const statusColors: Record<OrderStatus, string> = {
  PENDING_PAYMENT: Colors.warning,
  PAID: Colors.info,
  SHIPPED: Colors.primaryLight,
  DELIVERED: Colors.success,
  CANCELLED: Colors.error,
  REFUNDED: Colors.textTertiary,
};

function OrderItem({ order }: { order: Order }) {
  const router = useRouter();
  const auctionTitle = order.auction?.title ?? 'Siparis';
  const imageUrl =
    order.auction?.images?.[0]?.url ??
    order.auction?.product?.images?.[0]?.url ??
    '';
  const dateStr = format(new Date(order.createdAt), 'd MMM yyyy', {
    locale: tr,
  });

  return (
    <Pressable
      onPress={() => {
        router.push(`/order/${order.id}`);
      }}
      style={({ pressed }) => [
        styles.orderItem,
        pressed && styles.orderItemPressed,
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.orderImage}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.orderImage, styles.orderImagePlaceholder]}>
          <Text style={styles.placeholderText}>?</Text>
        </View>
      )}
      <View style={styles.orderContent}>
        <Text style={styles.orderTitle} numberOfLines={1}>
          {auctionTitle}
        </Text>
        <Text style={styles.orderDate}>{dateStr}</Text>
        <Text style={styles.orderAmount}>
          {formatPrice(order.amount)} TL
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColors[order.status] + '15' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: statusColors[order.status] },
            ]}
          >
            {statusLabels[order.status]}
          </Text>
        </View>
        {order.trackingNumber && (
          <Text style={styles.trackingText}>
            Takip: {order.trackingNumber}
          </Text>
        )}
      </View>
      <Text style={styles.arrow}>{'>'}</Text>
    </Pressable>
  );
}

export default function MyOrdersScreen() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const {
    data: orders,
    isLoading,
    refetch,
  } = useQuery<Order[]>({
    queryKey: ['myOrders'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Order[] }>('/users/orders');
      return data.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Giris Yapin"
        message="Siparislerinizi gormek icin giris yapin."
        actionLabel="Giris Yap"
        onAction={() => router.push('/(auth)/login')}
      />
    );
  }

  if (isLoading) {
    return <LoadingSkeleton variant="list-item" count={4} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderItem order={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="Siparis Yok"
            message="Henuz siparisim bulunmuyor. Muzayede kazandiginizda siparisleriniz burada gorunecek."
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
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  orderItemPressed: {
    backgroundColor: Colors.background,
  },
  orderImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  orderImagePlaceholder: {
    backgroundColor: Colors.skeleton,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 20,
    color: Colors.textTertiary,
  },
  orderContent: {
    flex: 1,
    gap: 3,
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accent,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trackingText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  arrow: {
    fontSize: 16,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
});
