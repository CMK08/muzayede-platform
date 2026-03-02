import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Colors } from '@/constants/colors';
import { formatPrice } from '@/components/PriceDisplay';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import {
  fetchOrderById,
  fetchShippingInfo,
  type ShippingInfo,
  type ShippingEvent,
} from '@/services/api';
import type { Order, OrderStatus } from '@/types';

const statusLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Odeme Bekleniyor',
  PAID: 'Odendi',
  SHIPPED: 'Kargolandi',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'Iptal Edildi',
  REFUNDED: 'Iade Edildi',
};

interface StepItem {
  key: OrderStatus;
  label: string;
}

const orderSteps: StepItem[] = [
  { key: 'PENDING_PAYMENT', label: 'Odeme\nBekleniyor' },
  { key: 'PAID', label: 'Odendi' },
  { key: 'SHIPPED', label: 'Kargolandi' },
  { key: 'DELIVERED', label: 'Teslim\nEdildi' },
];

function getStepIndex(status: OrderStatus): number {
  if (status === 'CANCELLED' || status === 'REFUNDED') return -1;
  const index = orderSteps.findIndex((s) => s.key === status);
  return index >= 0 ? index : 0;
}

function ProgressStepper({ currentStatus }: { currentStatus: OrderStatus }) {
  const currentIndex = getStepIndex(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'REFUNDED';

  if (isCancelled) {
    return (
      <View style={styles.cancelledContainer}>
        <View style={styles.cancelledBadge}>
          <Text style={styles.cancelledText}>
            {statusLabels[currentStatus]}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stepperContainer}>
      {orderSteps.map((step, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === orderSteps.length - 1;

        return (
          <View key={step.key} style={styles.stepWrapper}>
            <View style={styles.stepRow}>
              {/* Circle */}
              <View
                style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleCompleted,
                  isCurrent && styles.stepCircleCurrent,
                ]}
              >
                {isCompleted && (
                  <Text style={styles.stepCheckmark}>
                    {isCurrent ? '' : ''}
                  </Text>
                )}
              </View>

              {/* Line */}
              {!isLast && (
                <View
                  style={[
                    styles.stepLine,
                    index < currentIndex && styles.stepLineCompleted,
                  ]}
                />
              )}
            </View>

            {/* Label */}
            <Text
              style={[
                styles.stepLabel,
                isCompleted && styles.stepLabelCompleted,
                isCurrent && styles.stepLabelCurrent,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ShippingEventItem({
  event,
  isFirst,
}: {
  event: ShippingEvent;
  isFirst: boolean;
}) {
  const dateStr = format(new Date(event.date), 'd MMM HH:mm', { locale: tr });

  return (
    <View style={styles.shippingEventItem}>
      <View style={styles.shippingEventTimeline}>
        <View
          style={[
            styles.shippingEventDot,
            isFirst && styles.shippingEventDotActive,
          ]}
        />
        <View style={styles.shippingEventLine} />
      </View>
      <View style={styles.shippingEventContent}>
        <Text
          style={[
            styles.shippingEventStatus,
            isFirst && styles.shippingEventStatusActive,
          ]}
        >
          {event.status}
        </Text>
        <Text style={styles.shippingEventDesc}>{event.description}</Text>
        <View style={styles.shippingEventMeta}>
          <Text style={styles.shippingEventDate}>{dateStr}</Text>
          {event.location ? (
            <Text style={styles.shippingEventLocation}>{event.location}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  // Fetch order
  const {
    data: order,
    isLoading: orderLoading,
    error: orderError,
    refetch: refetchOrder,
  } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: () => fetchOrderById(id!),
    enabled: !!id,
  });

  // Fetch shipping info
  const {
    data: shippingInfo,
    refetch: refetchShipping,
  } = useQuery<ShippingInfo>({
    queryKey: ['shipping', id],
    queryFn: () => fetchShippingInfo(id!),
    enabled: !!id && (order?.status === 'SHIPPED' || order?.status === 'DELIVERED'),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOrder(), refetchShipping()]);
    setRefreshing(false);
  };

  if (orderLoading) {
    return <LoadingSkeleton variant="detail" />;
  }

  if (orderError || !order) {
    return (
      <EmptyState
        title="Siparis Bulunamadi"
        message="Siparis bilgileri yuklenemedi."
        actionLabel="Geri Don"
        onAction={() => router.back()}
      />
    );
  }

  const imageUrl =
    order.auction?.images?.[0]?.url ??
    order.auction?.product?.images?.[0]?.url ??
    '';

  const auctionTitle = order.auction?.title ?? 'Siparis';
  const orderDate = format(new Date(order.createdAt), 'd MMMM yyyy', {
    locale: tr,
  });

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Progress Stepper */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Siparis Durumu</Text>
        <ProgressStepper currentStatus={order.status} />
      </View>

      {/* Product Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Urun Bilgisi</Text>
        <View style={styles.productCard}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.productImage, styles.productImagePlaceholder]}>
              <Text style={styles.placeholderText}>?</Text>
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {auctionTitle}
            </Text>
            <Text style={styles.orderDate}>Siparis Tarihi: {orderDate}</Text>
            <Text style={styles.orderNumber}>Siparis No: {order.id.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Shipping Tracking */}
      {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kargo Takibi</Text>

          {order.trackingNumber && (
            <View style={styles.trackingCard}>
              <View style={styles.trackingRow}>
                <Text style={styles.trackingLabel}>Kargo Firmasi</Text>
                <Text style={styles.trackingValue}>
                  {shippingInfo?.carrier ?? 'Yukleniyor...'}
                </Text>
              </View>
              <View style={styles.trackingRow}>
                <Text style={styles.trackingLabel}>Takip No</Text>
                <Text style={styles.trackingNumber}>
                  {order.trackingNumber}
                </Text>
              </View>
              {shippingInfo?.estimatedDelivery && (
                <View style={styles.trackingRow}>
                  <Text style={styles.trackingLabel}>Tahmini Teslim</Text>
                  <Text style={styles.trackingValue}>
                    {format(
                      new Date(shippingInfo.estimatedDelivery),
                      'd MMMM yyyy',
                      { locale: tr }
                    )}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Shipping Events */}
          {shippingInfo?.events && shippingInfo.events.length > 0 && (
            <View style={styles.shippingEventsContainer}>
              <Text style={styles.subsectionTitle}>Kargo Hareketleri</Text>
              {shippingInfo.events.map((event, index) => (
                <ShippingEventItem
                  key={`${event.date}-${index}`}
                  event={event}
                  isFirst={index === 0}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Price Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fiyat Detaylari</Text>
        <View style={styles.priceBreakdown}>
          <View style={styles.priceRow}>
            <Text style={styles.priceRowLabel}>Dusme Fiyati</Text>
            <Text style={styles.priceRowValue}>
              {formatPrice(order.amount)} TL
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceRowLabel}>Komisyon</Text>
            <Text style={styles.priceRowValue}>
              {formatPrice(order.amount * 0.05)} TL
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceRowLabel}>KDV (%20)</Text>
            <Text style={styles.priceRowValue}>
              {formatPrice(order.amount * 0.05 * 0.20)} TL
            </Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Toplam</Text>
            <Text style={styles.totalValue}>
              {formatPrice(order.amount + order.amount * 0.05 + order.amount * 0.05 * 0.20)} TL
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      {order.status === 'PENDING_PAYMENT' && (
        <View style={styles.section}>
          <Pressable
            onPress={() => router.push(`/checkout/${order.id}`)}
            style={({ pressed }) => [
              styles.payButton,
              pressed && styles.payButtonPressed,
            ]}
          >
            <Text style={styles.payButtonText}>Odeme Yap</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    backgroundColor: Colors.surface,
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  // Stepper
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepCircleCompleted: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
  stepCircleCurrent: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  stepCheckmark: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  stepLine: {
    position: 'absolute',
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: Colors.border,
    zIndex: 0,
  },
  stepLineCompleted: {
    backgroundColor: Colors.success,
  },
  stepLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
    lineHeight: 13,
  },
  stepLabelCompleted: {
    color: Colors.success,
  },
  stepLabelCurrent: {
    color: Colors.primary,
    fontWeight: '700',
  },
  cancelledContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelledBadge: {
    backgroundColor: Colors.error + '15',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelledText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.error,
  },
  // Product Card
  productCard: {
    flexDirection: 'row',
    gap: 14,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  productImagePlaceholder: {
    backgroundColor: Colors.skeleton,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    color: Colors.textTertiary,
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  orderNumber: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  // Tracking
  trackingCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  trackingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  trackingValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  trackingNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  // Shipping Events
  shippingEventsContainer: {
    marginTop: 12,
  },
  shippingEventItem: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 60,
  },
  shippingEventTimeline: {
    alignItems: 'center',
    width: 20,
  },
  shippingEventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
    marginTop: 2,
  },
  shippingEventDotActive: {
    backgroundColor: Colors.success,
  },
  shippingEventLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.borderLight,
    marginTop: 4,
  },
  shippingEventContent: {
    flex: 1,
    paddingBottom: 16,
    gap: 2,
  },
  shippingEventStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  shippingEventStatusActive: {
    color: Colors.success,
  },
  shippingEventDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  shippingEventMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  shippingEventDate: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  shippingEventLocation: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  // Price Breakdown
  priceBreakdown: {
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRowLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  priceRowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  priceDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.accent,
  },
  // Actions
  payButton: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  payButtonPressed: {
    opacity: 0.85,
  },
  payButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 40,
  },
});
