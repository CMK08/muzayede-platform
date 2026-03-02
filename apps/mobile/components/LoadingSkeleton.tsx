import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors } from '@/constants/colors';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list-item' | 'detail' | 'profile';
  count?: number;
}

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: Colors.skeleton,
          opacity,
        },
        style,
      ]}
    />
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function CardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <SkeletonBox width={SCREEN_WIDTH - 32} height={200} borderRadius={12} />
      <View style={skeletonStyles.cardContent}>
        <SkeletonBox width={'80%' as unknown as number} height={16} />
        <SkeletonBox width={'50%' as unknown as number} height={20} />
        <SkeletonBox width={'30%' as unknown as number} height={14} />
      </View>
    </View>
  );
}

function ListItemSkeleton() {
  return (
    <View style={skeletonStyles.listItem}>
      <SkeletonBox width={60} height={60} borderRadius={8} />
      <View style={skeletonStyles.listItemContent}>
        <SkeletonBox width={200} height={14} />
        <SkeletonBox width={120} height={12} />
        <SkeletonBox width={80} height={16} />
      </View>
    </View>
  );
}

function DetailSkeleton() {
  return (
    <View style={skeletonStyles.detail}>
      <SkeletonBox width={SCREEN_WIDTH} height={300} borderRadius={0} />
      <View style={skeletonStyles.detailContent}>
        <SkeletonBox width={SCREEN_WIDTH - 32} height={22} />
        <SkeletonBox width={150} height={28} />
        <SkeletonBox width={SCREEN_WIDTH - 32} height={14} />
        <SkeletonBox width={SCREEN_WIDTH - 32} height={14} />
        <SkeletonBox width={200} height={14} />
      </View>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View style={skeletonStyles.profile}>
      <SkeletonBox width={80} height={80} borderRadius={40} />
      <SkeletonBox width={160} height={18} />
      <SkeletonBox width={120} height={14} />
      <View style={skeletonStyles.profileMenu}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBox key={i} width={SCREEN_WIDTH - 32} height={50} />
        ))}
      </View>
    </View>
  );
}

export function LoadingSkeleton({
  variant = 'card',
  count = 3,
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  switch (variant) {
    case 'detail':
      return <DetailSkeleton />;
    case 'profile':
      return <ProfileSkeleton />;
    case 'list-item':
      return (
        <View>
          {items.map((i) => (
            <ListItemSkeleton key={i} />
          ))}
        </View>
      );
    case 'card':
    default:
      return (
        <View style={skeletonStyles.container}>
          {items.map((i) => (
            <CardSkeleton key={i} />
          ))}
        </View>
      );
  }
}

const skeletonStyles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  cardContent: {
    padding: 12,
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  listItemContent: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  detail: {
    gap: 0,
  },
  detailContent: {
    padding: 16,
    gap: 10,
  },
  profile: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 8,
  },
  profileMenu: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 8,
  },
});
