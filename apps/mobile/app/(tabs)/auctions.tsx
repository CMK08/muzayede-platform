import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { SearchBar } from '@/components/SearchBar';
import { CategoryChip } from '@/components/CategoryChip';
import { AuctionCard } from '@/components/AuctionCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { useAuctions, useCategories } from '@/hooks/useAuctions';
import type { Auction, AuctionFilters } from '@/types';

type SortOption = {
  label: string;
  sortBy: AuctionFilters['sortBy'];
  sortOrder: AuctionFilters['sortOrder'];
};

const SORT_OPTIONS: SortOption[] = [
  { label: 'En Yeni', sortBy: 'createdAt', sortOrder: 'desc' },
  { label: 'Fiyat (Dusuk)', sortBy: 'currentPrice', sortOrder: 'asc' },
  { label: 'Fiyat (Yuksek)', sortBy: 'currentPrice', sortOrder: 'desc' },
  { label: 'Bitmek Uzere', sortBy: 'endTime', sortOrder: 'asc' },
  { label: 'En Cok Teklif', sortBy: 'bidCount', sortOrder: 'desc' },
];

export default function AuctionsScreen() {
  const [filters, setFilters] = useState<AuctionFilters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null
  );
  const [selectedSort, setSelectedSort] = useState(0);

  const { data: categories } = useCategories();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useAuctions(filters);

  const [refreshing, setRefreshing] = useState(false);

  const auctions: Auction[] =
    data?.pages.flatMap((page) => page.data) ?? [];

  const handleSearch = useCallback(
    (query: string) => {
      setFilters((prev) => ({ ...prev, search: query }));
    },
    []
  );

  const handleCategorySelect = useCallback(
    (categoryId: string | null) => {
      setSelectedCategory(categoryId);
      setFilters((prev) => ({
        ...prev,
        categoryId: categoryId ?? undefined,
      }));
    },
    []
  );

  const handleSortSelect = useCallback(
    (index: number) => {
      setSelectedSort(index);
      const sort = SORT_OPTIONS[index];
      setFilters((prev) => ({
        ...prev,
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
      }));
    },
    []
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <SearchBar
        onSearch={handleSearch}
        placeholder="Muzayede ara..."
      />

      {/* Category Chips */}
      {categories && categories.length > 0 && (
        <FlatList
          data={[{ id: null, name: 'Tumu' }, ...categories] as Array<{
            id: string | null;
            name: string;
          }>}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
          keyExtractor={(item) => item.id ?? 'all'}
          renderItem={({ item }) => (
            <CategoryChip
              label={item.name}
              isSelected={selectedCategory === item.id}
              onPress={() => handleCategorySelect(item.id)}
            />
          )}
        />
      )}

      {/* Sort Options */}
      <FlatList
        data={SORT_OPTIONS}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortList}
        keyExtractor={(_, index) => `sort-${index}`}
        renderItem={({ item, index }) => (
          <Pressable
            style={[
              styles.sortChip,
              selectedSort === index && styles.sortChipSelected,
            ]}
            onPress={() => handleSortSelect(index)}
          >
            <Text
              style={[
                styles.sortChipText,
                selectedSort === index && styles.sortChipTextSelected,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <LoadingSkeleton variant="card" count={3} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={auctions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            title="Muzayede Bulunamadi"
            message="Aramaniza uygun muzayede bulunamadi. Filtreleri degistirmeyi deneyin."
          />
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <AuctionCard auction={item} variant="vertical" />
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
    paddingBottom: 8,
  },
  categoriesList: {
    paddingVertical: 4,
  },
  sortList: {
    paddingVertical: 4,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  sortChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  sortChipTextSelected: {
    color: Colors.textInverse,
  },
  list: {
    paddingBottom: 20,
  },
  cardWrapper: {
    paddingHorizontal: 16,
  },
  loadingMore: {
    padding: 20,
    alignItems: 'center',
  },
});
