import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { AuctionCard } from '@/components/AuctionCard';
import { CategoryChip } from '@/components/CategoryChip';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PriceDisplay } from '@/components/PriceDisplay';
import { CountdownTimer } from '@/components/CountdownTimer';
import {
  useFeaturedAuctions,
  useUpcomingAuctions,
  useLatestAuctions,
  useCategories,
} from '@/hooks/useAuctions';
import type { Auction, Category } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function HeroBanner({ auction }: { auction: Auction }) {
  const router = useRouter();
  const imageUrl =
    auction.images?.[0]?.url ?? auction.product?.images?.[0]?.url ?? '';

  return (
    <Pressable
      onPress={() => router.push(`/auction/${auction.id}`)}
      style={({ pressed }) => [
        styles.heroBanner,
        pressed && { opacity: 0.95 },
      ]}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.heroImage}
        contentFit="cover"
        transition={300}
      />
      <View style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>One Cikan</Text>
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {auction.title}
        </Text>
        <View style={styles.heroRow}>
          <PriceDisplay
            amount={auction.currentPrice}
            size="large"
            color="#FFFFFF"
          />
          <CountdownTimer endTime={auction.endTime} size="medium" />
        </View>
      </View>
    </Pressable>
  );
}

function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}>
          <Text style={styles.seeAllText}>Tumunu Gor</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    data: featured,
    isLoading: featuredLoading,
    refetch: refetchFeatured,
  } = useFeaturedAuctions();
  const {
    data: upcoming,
    isLoading: upcomingLoading,
    refetch: refetchUpcoming,
  } = useUpcomingAuctions();
  const {
    data: latest,
    isLoading: latestLoading,
    refetch: refetchLatest,
  } = useLatestAuctions();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchFeatured(), refetchUpcoming(), refetchLatest()]);
    setRefreshing(false);
  };

  const isLoading = featuredLoading && upcomingLoading && latestLoading;

  if (isLoading) {
    return <LoadingSkeleton variant="card" count={3} />;
  }

  const heroAuction = featured?.[0];

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
      {/* Hero Banner */}
      {heroAuction && <HeroBanner auction={heroAuction} />}

      {/* Categories */}
      {!categoriesLoading && categories && categories.length > 0 && (
        <View style={styles.categoriesSection}>
          <SectionHeader title="Kategoriler" />
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
            keyExtractor={(item: Category) => item.id}
            renderItem={({ item }: { item: Category }) => (
              <CategoryChip
                label={item.name}
                onPress={() =>
                  router.push(
                    `/auctions?categoryId=${item.id}` as never
                  )
                }
              />
            )}
          />
        </View>
      )}

      {/* Featured Auctions */}
      {featured && featured.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="One Cikan Muzayedeler"
            onSeeAll={() => router.push('/(tabs)/auctions')}
          />
          <FlatList
            data={featured.slice(0, 6)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            keyExtractor={(item: Auction) => item.id}
            renderItem={({ item }: { item: Auction }) => (
              <AuctionCard auction={item} variant="horizontal" />
            )}
          />
        </View>
      )}

      {/* Upcoming Auctions */}
      {upcoming && upcoming.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Yaklasan Muzayedeler"
            onSeeAll={() => router.push('/(tabs)/auctions')}
          />
          <FlatList
            data={upcoming.slice(0, 6)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            keyExtractor={(item: Auction) => item.id}
            renderItem={({ item }: { item: Auction }) => (
              <AuctionCard auction={item} variant="horizontal" />
            )}
          />
        </View>
      )}

      {/* Latest Auctions */}
      {latest && latest.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Son Eklenenler"
            onSeeAll={() => router.push('/(tabs)/auctions')}
          />
          <View style={styles.latestList}>
            {latest.slice(0, 5).map((auction: Auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                variant="vertical"
              />
            ))}
          </View>
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
  heroBanner: {
    height: 260,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: 260,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    gap: 8,
  },
  heroBadge: {
    backgroundColor: Colors.accent,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroBadgeText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoriesSection: {
    paddingTop: 16,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  latestList: {
    paddingHorizontal: 16,
  },
  bottomSpacer: {
    height: 32,
  },
});
