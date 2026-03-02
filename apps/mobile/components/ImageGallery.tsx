import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/colors';
import type { ProductImage } from '@/types';

interface ImageGalleryProps {
  images: ProductImage[];
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ImageGallery({ images }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH
    );
    setActiveIndex(index);
  };

  const openFullscreen = (index: number) => {
    setActiveIndex(index);
    setFullscreenVisible(true);
  };

  if (!images || images.length === 0) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Gorsel bulunamadi</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => openFullscreen(index)}>
            <Image
              source={{ uri: item.url }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          </Pressable>
        )}
      />

      {images.length > 1 && (
        <View style={styles.pagination}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}

      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {activeIndex + 1}/{images.length}
        </Text>
      </View>

      <Modal
        visible={fullscreenVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenVisible(false)}
      >
        <View style={styles.fullscreenContainer}>
          <Pressable
            style={styles.closeButton}
            onPress={() => setFullscreenVisible(false)}
          >
            <Text style={styles.closeButtonText}>X</Text>
          </Pressable>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={activeIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            keyExtractor={(item) => `fullscreen-${item.id}`}
            renderItem={({ item }) => (
              <View style={styles.fullscreenImageWrapper}>
                <Image
                  source={{ uri: item.url }}
                  style={styles.fullscreenImage}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  placeholder: {
    width: SCREEN_WIDTH,
    height: 300,
    backgroundColor: Colors.skeleton,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: Colors.textTertiary,
    fontSize: 14,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  counter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  fullscreenImageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
});
