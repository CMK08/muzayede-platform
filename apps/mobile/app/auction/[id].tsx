import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Colors } from '@/constants/colors';
import { ImageGallery } from '@/components/ImageGallery';
import { BidPanel } from '@/components/BidPanel';
import { CountdownTimer } from '@/components/CountdownTimer';
import { PriceDisplay, formatPrice } from '@/components/PriceDisplay';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useAuctionDetail } from '@/hooks/useAuctions';
import { useAuctionBids, usePlaceBid } from '@/hooks/useBids';
import { useAuctionSocket } from '@/hooks/useSocket';
import { useAuctionStore } from '@/stores/auction-store';
import { useAuthStore } from '@/stores/auth-store';
import type { Bid } from '@/types';

function BidHistoryItem({ bid, index }: { bid: Bid; index: number }) {
  const time = format(new Date(bid.createdAt), 'HH:mm:ss', { locale: tr });
  const userName = bid.user
    ? `${bid.user.name} ${bid.user.surname?.charAt(0) ?? ''}.`
    : 'Anonim';

  return (
    <View
      style={[styles.bidItem, index === 0 && styles.bidItemFirst]}
    >
      <View style={styles.bidItemLeft}>
        <Text style={styles.bidUserName}>{userName}</Text>
        <Text style={styles.bidTime}>{time}</Text>
      </View>
      <Text style={[styles.bidAmount, index === 0 && styles.bidAmountWinning]}>
        {formatPrice(bid.amount)} TL
      </Text>
    </View>
  );
}

export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();
  const { livePrice, liveBidCount, isConnected } = useAuctionStore();
  const setCurrentAuction = useAuctionStore((s) => s.setCurrentAuction);
  const setBids = useAuctionStore((s) => s.setBids);

  const {
    data: auction,
    isLoading: auctionLoading,
    error: auctionError,
  } = useAuctionDetail(id!);
  const { data: bids, isLoading: bidsLoading } = useAuctionBids(id!);
  const placeBidMutation = usePlaceBid();

  // Set up real-time socket for this auction
  useAuctionSocket(id);

  // Sync fetched data into store
  React.useEffect(() => {
    if (auction) {
      setCurrentAuction(auction);
    }
    return () => setCurrentAuction(null);
  }, [auction, setCurrentAuction]);

  React.useEffect(() => {
    if (bids) {
      setBids(bids);
    }
  }, [bids, setBids]);

  const handlePlaceBid = useCallback(
    async (amount: number) => {
      if (!isAuthenticated) {
        Alert.alert(
          'Giris Gerekli',
          'Teklif vermek icin giris yapmaniz gerekmektedir.',
          [
            { text: 'Iptal', style: 'cancel' },
            {
              text: 'Giris Yap',
              onPress: () => router.push('/(auth)/login'),
            },
          ]
        );
        return;
      }

      await placeBidMutation.mutateAsync({
        auctionId: id!,
        amount,
      });
    },
    [isAuthenticated, id, placeBidMutation, router]
  );

  if (auctionLoading) {
    return <LoadingSkeleton variant="detail" />;
  }

  if (auctionError || !auction) {
    return (
      <EmptyState
        title="Muzayede Bulunamadi"
        message="Aradiginiz muzayede bulunamadi veya kaldirilmis olabilir."
        actionLabel="Geri Don"
        onAction={() => router.back()}
      />
    );
  }

  const images = auction.images?.length
    ? auction.images
    : auction.product?.images ?? [];

  const isActive =
    auction.status === 'ACTIVE' || auction.status === 'ENDING_SOON';
  const isEnded = auction.status === 'ENDED' || auction.status === 'SOLD';
  const currentPrice = livePrice > 0 ? livePrice : auction.currentPrice;
  const currentBidCount =
    liveBidCount > 0 ? liveBidCount : auction.bidCount;

  const startDate = format(
    new Date(auction.startTime),
    'd MMMM yyyy HH:mm',
    { locale: tr }
  );
  const endDate = format(
    new Date(auction.endTime),
    'd MMMM yyyy HH:mm',
    { locale: tr }
  );

  const storeBids = useAuctionStore((s) => s.bids);
  const displayBids = storeBids.length > 0 ? storeBids : bids ?? [];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isActive ? 220 : 20 }}
      >
        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { top: insets.top + 8 }]}
        >
          <Text style={styles.backButtonText}>{'<'}</Text>
        </Pressable>

        {/* Image Gallery */}
        <ImageGallery images={images} />

        {/* Auction Info */}
        <View style={styles.infoSection}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                isActive && styles.statusActive,
                isEnded && styles.statusEnded,
              ]}
            >
              <Text style={styles.statusText}>
                {auction.status === 'ACTIVE'
                  ? 'Canli'
                  : auction.status === 'ENDING_SOON'
                  ? 'Bitmek Uzere'
                  : auction.status === 'ENDED'
                  ? 'Sona Erdi'
                  : auction.status === 'SOLD'
                  ? 'Satildi'
                  : auction.status === 'SCHEDULED'
                  ? 'Planlanmis'
                  : auction.status}
              </Text>
            </View>
            {isActive && (
              <CountdownTimer
                endTime={auction.endTime}
                isEndingSoon={auction.status === 'ENDING_SOON'}
                size="medium"
              />
            )}
          </View>

          <Text style={styles.auctionTitle}>{auction.title}</Text>

          <View style={styles.priceSection}>
            <View>
              <Text style={styles.priceLabel}>Guncel Fiyat</Text>
              <PriceDisplay amount={currentPrice} size="large" />
            </View>
            {auction.buyNowPrice && (
              <View>
                <Text style={styles.priceLabel}>Hemen Al</Text>
                <PriceDisplay amount={auction.buyNowPrice} size="medium" />
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentBidCount}</Text>
              <Text style={styles.statLabel}>Teklif</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{auction.viewCount}</Text>
              <Text style={styles.statLabel}>Gorunum</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{auction.watchCount}</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </View>
          </View>

          <View style={styles.timeInfo}>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Baslangic:</Text>
              <Text style={styles.timeValue}>{startDate}</Text>
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Bitis:</Text>
              <Text style={styles.timeValue}>{endDate}</Text>
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Baslangic Fiyati:</Text>
              <Text style={styles.timeValue}>
                {formatPrice(auction.startPrice)} TL
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Aciklama</Text>
          <Text style={styles.description}>{auction.description}</Text>
        </View>

        {/* Seller Info */}
        {auction.seller && (
          <View style={styles.sellerSection}>
            <Text style={styles.sectionTitle}>Satici</Text>
            <View style={styles.sellerRow}>
              <View style={styles.sellerAvatar}>
                <Text style={styles.sellerAvatarText}>
                  {auction.seller.name?.charAt(0)?.toUpperCase() ?? 'S'}
                </Text>
              </View>
              <View>
                <Text style={styles.sellerName}>
                  {auction.seller.name} {auction.seller.surname}
                </Text>
                {auction.seller.isVerified && (
                  <Text style={styles.sellerVerified}>
                    Dogrulanmis Satici
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Bid History */}
        <View style={styles.bidHistorySection}>
          <Text style={styles.sectionTitle}>
            Teklif Gecmisi ({currentBidCount})
          </Text>
          {bidsLoading ? (
            <ActivityIndicator
              color={Colors.primary}
              style={styles.loadingIndicator}
            />
          ) : displayBids.length > 0 ? (
            <FlatList
              data={displayBids.slice(0, 20)}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <BidHistoryItem bid={item} index={index} />
              )}
            />
          ) : (
            <Text style={styles.noBids}>
              Henuz teklif verilmemis. Ilk teklifi siz verin!
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Bid Panel */}
      {isActive && (
        <View style={styles.bidPanelWrapper}>
          <BidPanel
            currentPrice={currentPrice}
            minIncrement={auction.minBidIncrement}
            onPlaceBid={handlePlaceBid}
            isLoading={placeBidMutation.isPending}
            isConnected={isConnected}
          />
        </View>
      )}

      {isEnded && auction.winner && (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerText}>
            Kazanan: {auction.winner.name} {auction.winner.surname} -{' '}
            {formatPrice(currentPrice)} TL
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  infoSection: {
    padding: 16,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.textTertiary,
  },
  statusActive: {
    backgroundColor: Colors.success,
  },
  statusEnded: {
    backgroundColor: Colors.error,
  },
  statusText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  auctionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 26,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  timeInfo: {
    gap: 6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  timeValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  descriptionSection: {
    padding: 16,
    backgroundColor: Colors.surface,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  sellerSection: {
    padding: 16,
    backgroundColor: Colors.surface,
    marginTop: 8,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarText: {
    color: Colors.textInverse,
    fontSize: 18,
    fontWeight: '700',
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  sellerVerified: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
  },
  bidHistorySection: {
    padding: 16,
    backgroundColor: Colors.surface,
    marginTop: 8,
  },
  bidItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  bidItemFirst: {
    backgroundColor: Colors.accent + '10',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  bidItemLeft: {
    gap: 2,
  },
  bidUserName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  bidTime: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  bidAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  bidAmountWinning: {
    color: Colors.accent,
  },
  noBids: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  loadingIndicator: {
    paddingVertical: 20,
  },
  bidPanelWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  winnerBanner: {
    backgroundColor: Colors.success,
    padding: 16,
    alignItems: 'center',
  },
  winnerText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
});
