import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { CountdownTimer } from './CountdownTimer';
import { PriceDisplay } from './PriceDisplay';
import type { Auction } from '@/types';

interface AuctionCardProps {
  auction: Auction;
  variant?: 'horizontal' | 'vertical';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_CARD_WIDTH = SCREEN_WIDTH * 0.7;

export function AuctionCard({ auction, variant = 'vertical' }: AuctionCardProps) {
  const router = useRouter();

  const imageUrl =
    auction.images?.[0]?.url ??
    auction.product?.images?.[0]?.url ??
    '';

  const isActive = auction.status === 'ACTIVE' || auction.status === 'ENDING_SOON';
  const isEndingSoon = auction.status === 'ENDING_SOON';

  const handlePress = () => {
    router.push(`/auction/${auction.id}`);
  };

  if (variant === 'horizontal') {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.horizontalCard,
          pressed && styles.cardPressed,
        ]}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.horizontalImage}
          contentFit="cover"
          transition={200}
          placeholder={{ blurhash: 'LKN]Rv%2Tw=w]~RBVZRi};RTxufl' }}
        />
        <View style={styles.horizontalContent}>
          <Text style={styles.title} numberOfLines={2}>
            {auction.title}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Guncel Fiyat</Text>
            <PriceDisplay amount={auction.currentPrice} size="medium" />
          </View>
          {isActive && (
            <View style={styles.timerContainer}>
              <CountdownTimer
                endTime={auction.endTime}
                isEndingSoon={isEndingSoon}
              />
            </View>
          )}
          <View style={styles.statsRow}>
            <Text style={styles.statText}>{auction.bidCount} teklif</Text>
            <Text style={styles.statDot}>-</Text>
            <Text style={styles.statText}>{auction.viewCount} gorunum</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.verticalCard,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.verticalImage}
          contentFit="cover"
          transition={200}
          placeholder={{ blurhash: 'LKN]Rv%2Tw=w]~RBVZRi};RTxufl' }}
        />
        {isActive && (
          <View
            style={[
              styles.statusBadge,
              isEndingSoon && styles.statusBadgeUrgent,
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {isEndingSoon ? 'Bitmek Uzere' : 'Canli'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.verticalContent}>
        <Text style={styles.title} numberOfLines={2}>
          {auction.title}
        </Text>
        <PriceDisplay amount={auction.currentPrice} size="medium" />
        {isActive && (
          <CountdownTimer
            endTime={auction.endTime}
            isEndingSoon={isEndingSoon}
          />
        )}
        <Text style={styles.bidCount}>{auction.bidCount} teklif</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  horizontalCard: {
    width: HORIZONTAL_CARD_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginRight: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  horizontalImage: {
    width: '100%',
    height: 160,
  },
  horizontalContent: {
    padding: 12,
  },
  verticalCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    position: 'relative',
  },
  verticalImage: {
    width: '100%',
    height: 200,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeUrgent: {
    backgroundColor: Colors.error,
  },
  statusBadgeText: {
    color: Colors.textInverse,
    fontSize: 11,
    fontWeight: '700',
  },
  verticalContent: {
    padding: 12,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  timerContainer: {
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  statDot: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginHorizontal: 6,
  },
  bidCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
