import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { ImageGallery } from '@/components/ImageGallery';
import { PriceDisplay, formatPrice } from '@/components/PriceDisplay';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api';
import { fetchSimilarProducts, type SimilarProduct } from '@/services/api';
import type { Product } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const conditionLabels: Record<Product['condition'], string> = {
  NEW: 'Sifir / Yeni',
  LIKE_NEW: 'Yeni Gibi',
  GOOD: 'Iyi',
  FAIR: 'Orta',
  POOR: 'Kotu',
};

const conditionColors: Record<Product['condition'], string> = {
  NEW: Colors.success,
  LIKE_NEW: Colors.successLight,
  GOOD: Colors.info,
  FAIR: Colors.warning,
  POOR: Colors.error,
};

function SimilarProductCard({ item, onPress }: { item: SimilarProduct; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.similarCard,
        pressed && { opacity: 0.9 },
      ]}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.similarImage}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.similarContent}>
        <Text style={styles.similarTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.similarPrice}>
          {formatPrice(item.estimatedPrice)} TL
        </Text>
      </View>
    </Pressable>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const {
    data: product,
    isLoading,
    error,
  } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Product }>(`/products/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  const { data: similarProducts } = useQuery<SimilarProduct[]>({
    queryKey: ['similarProducts', id],
    queryFn: () => fetchSimilarProducts(id!),
    enabled: !!id,
  });

  const handlePlaceBid = () => {
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

    // Navigate to the auction if available
    // For now, show info
    Alert.alert(
      'Teklif Ver',
      'Bu urun icin aktif bir muzayedeye yonlendirileceksiniz.',
      [{ text: 'Tamam' }]
    );
  };

  if (isLoading) {
    return <LoadingSkeleton variant="detail" />;
  }

  if (error || !product) {
    return (
      <EmptyState
        title="Urun Bulunamadi"
        message="Aradiginiz urun bulunamadi veya kaldirilmis olabilir."
        actionLabel="Geri Don"
        onAction={() => router.back()}
      />
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Image Gallery */}
        <ImageGallery images={product.images} />

        {/* Product Info */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{product.title}</Text>

          {product.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{product.category.name}</Text>
            </View>
          )}

          <View style={styles.conditionRow}>
            <Text style={styles.conditionLabel}>Durum:</Text>
            <View
              style={[
                styles.conditionBadge,
                { backgroundColor: conditionColors[product.condition] + '15' },
              ]}
            >
              <Text
                style={[
                  styles.conditionText,
                  { color: conditionColors[product.condition] },
                ]}
              >
                {conditionLabels[product.condition]}
              </Text>
            </View>
          </View>
        </View>

        {/* Price Estimates */}
        <View style={styles.priceEstimateSection}>
          <Text style={styles.sectionTitle}>Fiyat Tahmini</Text>
          <View style={styles.priceEstimateRow}>
            <View style={styles.priceEstimateItem}>
              <Text style={styles.priceEstimateLabel}>Dusuk</Text>
              <PriceDisplay amount={500} size="small" color={Colors.textSecondary} />
            </View>
            <View style={styles.priceEstimateDivider} />
            <View style={styles.priceEstimateItem}>
              <Text style={styles.priceEstimateLabel}>Ortalama</Text>
              <PriceDisplay amount={1500} size="medium" />
            </View>
            <View style={styles.priceEstimateDivider} />
            <View style={styles.priceEstimateItem}>
              <Text style={styles.priceEstimateLabel}>Yuksek</Text>
              <PriceDisplay amount={3000} size="small" color={Colors.textSecondary} />
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Urun Aciklamasi</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        {/* Artist / Seller Info */}
        {product.seller && (
          <View style={styles.sellerSection}>
            <Text style={styles.sectionTitle}>Sanatci / Satici Bilgileri</Text>
            <View style={styles.sellerRow}>
              <View style={styles.sellerAvatar}>
                <Text style={styles.sellerAvatarText}>
                  {product.seller.name?.charAt(0)?.toUpperCase() ?? 'S'}
                </Text>
              </View>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>
                  {product.seller.name} {product.seller.surname}
                </Text>
                {product.seller.isVerified && (
                  <Text style={styles.sellerVerified}>
                    Dogrulanmis Satici
                  </Text>
                )}
                <Text style={styles.sellerRole}>
                  {product.seller.role === 'SELLER' ? 'Profesyonel Satici' : 'Bireysel Satici'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Similar Products */}
        {similarProducts && similarProducts.length > 0 && (
          <View style={styles.similarSection}>
            <Text style={styles.sectionTitle}>Benzer Urunler</Text>
            <FlatList
              data={similarProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similarList}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SimilarProductCard
                  item={item}
                  onPress={() => router.push(`/product/${item.id}`)}
                />
              )}
            />
          </View>
        )}
      </ScrollView>

      {/* Place Bid Button */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={handlePlaceBid}
          style={({ pressed }) => [
            styles.placeBidButton,
            pressed && styles.placeBidButtonPressed,
          ]}
        >
          <Text style={styles.placeBidButtonText}>Teklif Ver</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  infoSection: {
    padding: 16,
    backgroundColor: Colors.surface,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 26,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conditionLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  conditionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  conditionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceEstimateSection: {
    padding: 16,
    backgroundColor: Colors.surface,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  priceEstimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
  },
  priceEstimateItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  priceEstimateLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  priceEstimateDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  descriptionSection: {
    padding: 16,
    backgroundColor: Colors.surface,
    marginTop: 8,
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarText: {
    color: Colors.textInverse,
    fontSize: 20,
    fontWeight: '700',
  },
  sellerInfo: {
    flex: 1,
    gap: 2,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  sellerVerified: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
  },
  sellerRole: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  similarSection: {
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    marginTop: 8,
  },
  similarList: {
    paddingHorizontal: 16,
  },
  similarCard: {
    width: 150,
    backgroundColor: Colors.background,
    borderRadius: 10,
    marginRight: 12,
    overflow: 'hidden',
  },
  similarImage: {
    width: 150,
    height: 110,
  },
  similarContent: {
    padding: 8,
    gap: 4,
  },
  similarTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    lineHeight: 17,
  },
  similarPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
  },
  bottomBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
  },
  placeBidButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  placeBidButtonPressed: {
    backgroundColor: Colors.accentDark,
  },
  placeBidButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
  },
});
