import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Colors } from '@/constants/colors';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState } from '@/components/EmptyState';
import { PriceDisplay } from '@/components/PriceDisplay';
import { CountdownTimer } from '@/components/CountdownTimer';
import { useSearchAuctions, useCategories } from '@/hooks/useAuctions';
import type { Auction, Category } from '@/types';

function SearchResultItem({ auction }: { auction: Auction }) {
  const router = useRouter();
  const imageUrl =
    auction.images?.[0]?.url ?? auction.product?.images?.[0]?.url ?? '';
  const isActive =
    auction.status === 'ACTIVE' || auction.status === 'ENDING_SOON';

  return (
    <Pressable
      onPress={() => router.push(`/auction/${auction.id}`)}
      style={({ pressed }) => [
        styles.resultItem,
        pressed && styles.resultItemPressed,
      ]}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.resultImage}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {auction.title}
        </Text>
        <PriceDisplay amount={auction.currentPrice} size="small" />
        <View style={styles.resultMeta}>
          <Text style={styles.resultBids}>{auction.bidCount} teklif</Text>
          {isActive && (
            <CountdownTimer endTime={auction.endTime} size="small" />
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const { data: categories } = useCategories();
  const { data: results, isLoading } = useSearchAuctions(activeQuery);

  const handleSearch = useCallback((query: string) => {
    setActiveQuery(query);
  }, []);

  const handleChangeText = useCallback((text: string) => {
    setSearchQuery(text);
    if (text.length === 0) {
      setActiveQuery('');
    }
  }, []);

  const hasSearched = activeQuery.length >= 2;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onSearch={handleSearch}
          onChangeText={handleChangeText}
          placeholder="Muzayede, urun veya kategori ara..."
          autoFocus
          showHistory
        />
      </View>

      {!hasSearched ? (
        <View style={styles.browseContainer}>
          <Text style={styles.browseTitle}>Kategoriler</Text>
          <FlatList
            data={categories}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.categoryGrid}
            keyExtractor={(item: Category) => item.id}
            renderItem={({ item }: { item: Category }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.categoryCard,
                  pressed && styles.categoryCardPressed,
                ]}
                onPress={() => {
                  setActiveQuery('');
                  router.push(
                    `/auctions?categoryId=${item.id}` as never
                  );
                }}
              >
                {item.image && (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.categoryImage}
                    contentFit="cover"
                  />
                )}
                <View style={styles.categoryOverlay} />
                <Text style={styles.categoryName}>{item.name}</Text>
                {item._count && (
                  <Text style={styles.categoryCount}>
                    {item._count.products} urun
                  </Text>
                )}
              </Pressable>
            )}
          />
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Araniyor...</Text>
        </View>
      ) : results && results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item: Auction) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsList}
          renderItem={({ item }: { item: Auction }) => (
            <SearchResultItem auction={item} />
          )}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {results.length} sonuc bulundu
            </Text>
          }
        />
      ) : (
        <EmptyState
          title="Sonuc Bulunamadi"
          message={`"${activeQuery}" icin sonuc bulunamadi. Farkli anahtar kelimeler deneyin.`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  browseContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  browseTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 12,
  },
  categoryGrid: {
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    height: 100,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryCardPressed: {
    opacity: 0.9,
  },
  categoryImage: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 64, 175, 0.7)',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    zIndex: 1,
  },
  categoryCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    zIndex: 1,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultItemPressed: {
    opacity: 0.9,
  },
  resultImage: {
    width: 100,
    height: 100,
  },
  resultContent: {
    flex: 1,
    padding: 10,
    gap: 4,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 18,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultBids: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
});
