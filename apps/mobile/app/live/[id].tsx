import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Colors } from '@/constants/colors';
import { PriceDisplay, formatPrice } from '@/components/PriceDisplay';
import { AuctionTimer } from '@/components/AuctionTimer';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { useAuctionSocket } from '@/hooks/useSocket';
import { useAuctionStore } from '@/stores/auction-store';
import { useAuthStore } from '@/stores/auth-store';
import { usePlaceBid, useAuctionBids } from '@/hooks/useBids';
import { useAuctionDetail } from '@/hooks/useAuctions';
import type { Bid } from '@/types';
import {
  fetchLiveAuctionInfo,
  fetchLiveChatMessages,
  type LiveAuctionInfo,
  type ChatMessage,
} from '@/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function BidHistoryItem({ bid, index }: { bid: Bid; index: number }) {
  const time = format(new Date(bid.createdAt), 'HH:mm:ss', { locale: tr });
  const userName = bid.user
    ? `${bid.user.name} ${bid.user.surname?.charAt(0) ?? ''}.`
    : 'Anonim';

  return (
    <View style={[styles.bidItem, index === 0 && styles.bidItemFirst]}>
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

function ChatMessageItem({ message }: { message: ChatMessage }) {
  const time = format(new Date(message.timestamp), 'HH:mm', { locale: tr });

  return (
    <View style={styles.chatMessageItem}>
      <Text style={styles.chatUserName}>{message.userName}</Text>
      <Text style={styles.chatMessageText}>{message.message}</Text>
      <Text style={styles.chatTime}>{time}</Text>
    </View>
  );
}

export default function LiveAuctionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();
  const { livePrice, liveBidCount, isConnected } = useAuctionStore();
  const setCurrentAuction = useAuctionStore((s) => s.setCurrentAuction);
  const setBids = useAuctionStore((s) => s.setBids);
  const placeBidMutation = usePlaceBid();
  const chatInputRef = useRef<TextInput>(null);

  const [chatMessage, setChatMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'bids' | 'chat'>('bids');

  // Fetch auction detail
  const {
    data: auction,
    isLoading: auctionLoading,
    error: auctionError,
  } = useAuctionDetail(id!);

  // Fetch bids
  const { data: bids, isLoading: bidsLoading } = useAuctionBids(id!);

  // Fetch live info
  const { data: liveInfo } = useQuery<LiveAuctionInfo>({
    queryKey: ['liveAuction', id],
    queryFn: () => fetchLiveAuctionInfo(id!),
    enabled: !!id,
    staleTime: 5000,
    refetchInterval: 10000,
  });

  // Fetch chat messages
  const { data: chatMessages } = useQuery<ChatMessage[]>({
    queryKey: ['liveChat', id],
    queryFn: () => fetchLiveChatMessages(id!),
    enabled: !!id,
    staleTime: 3000,
    refetchInterval: 5000,
  });

  // Set up real-time socket for this auction
  useAuctionSocket(id);

  // Sync fetched data into store
  useEffect(() => {
    if (auction) {
      setCurrentAuction(auction);
    }
    return () => setCurrentAuction(null);
  }, [auction, setCurrentAuction]);

  useEffect(() => {
    if (bids) {
      setBids(bids);
    }
  }, [bids, setBids]);

  const currentPrice = livePrice > 0 ? livePrice : (auction?.currentPrice ?? 0);
  const currentBidCount = liveBidCount > 0 ? liveBidCount : (auction?.bidCount ?? 0);
  const storeBids = useAuctionStore((s) => s.bids);
  const displayBids = storeBids.length > 0 ? storeBids : bids ?? [];

  const handleQuickBid = useCallback(async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }

    const minIncrement = auction?.minBidIncrement ?? 100;
    const bidAmount = currentPrice + minIncrement;

    try {
      await placeBidMutation.mutateAsync({
        auctionId: id!,
        amount: bidAmount,
      });
    } catch {
      // Error handled by mutation
    }
  }, [isAuthenticated, auction, currentPrice, id, placeBidMutation, router]);

  const handleSendChat = useCallback(() => {
    const trimmed = chatMessage.trim();
    if (!trimmed) return;
    // In a real implementation, this would send through WebSocket
    setChatMessage('');
  }, [chatMessage]);

  if (auctionLoading) {
    return <LoadingSkeleton variant="detail" />;
  }

  if (auctionError || !auction) {
    return (
      <EmptyState
        title="Canli Muzayede Bulunamadi"
        message="Bu muzayede bulunamadi veya henuz baslamadi."
        actionLabel="Geri Don"
        onAction={() => router.back()}
      />
    );
  }

  const viewerCount = liveInfo?.viewerCount ?? 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Video Player Area (Placeholder) */}
      <View style={[styles.videoContainer, { paddingTop: insets.top }]}>
        <View style={styles.videoPlaceholder}>
          {auction.images?.[0]?.url ? (
            <Image
              source={{ uri: auction.images[0].url }}
              style={styles.videoImage}
              contentFit="cover"
            />
          ) : null}
          <View style={styles.videoOverlay} />
          <View style={styles.videoContent}>
            <Text style={styles.videoPlaceholderText}>
              WebRTC Canli Yayin
            </Text>
          </View>
        </View>

        {/* Top Bar */}
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>{'<'}</Text>
          </Pressable>

          <View style={styles.liveBadgeContainer}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>CANLI</Text>
            </View>
            <View style={styles.viewerBadge}>
              <Text style={styles.viewerText}>{viewerCount} izleyici</Text>
            </View>
          </View>
        </View>

        {/* Current Lot Info Overlay */}
        <View style={styles.lotOverlay}>
          <Text style={styles.lotTitle} numberOfLines={1}>
            {liveInfo?.currentLot?.title ?? auction.title}
          </Text>
          {liveInfo?.currentLot && (
            <Text style={styles.lotNumber}>
              Lot #{liveInfo.currentLot.lotNumber}
            </Text>
          )}
        </View>
      </View>

      {/* Price & Bid Info */}
      <View style={styles.priceBar}>
        <View style={styles.priceBarLeft}>
          <Text style={styles.priceBarLabel}>Guncel Fiyat</Text>
          <PriceDisplay amount={currentPrice} size="large" />
        </View>
        <View style={styles.priceBarRight}>
          <View style={styles.bidCountBadge}>
            <Text style={styles.bidCountText}>{currentBidCount}</Text>
            <Text style={styles.bidCountLabel}>Teklif</Text>
          </View>
          {auction.endTime && (
            <AuctionTimer endTime={auction.endTime} isLive />
          )}
        </View>
      </View>

      {/* Tabs: Bids / Chat */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'bids' && styles.tabActive]}
          onPress={() => setActiveTab('bids')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'bids' && styles.tabTextActive,
            ]}
          >
            Teklifler ({currentBidCount})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
          onPress={() => setActiveTab('chat')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'chat' && styles.tabTextActive,
            ]}
          >
            Canli Sohbet
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'bids' ? (
          bidsLoading ? (
            <ActivityIndicator
              color={Colors.primary}
              style={styles.loadingIndicator}
            />
          ) : displayBids.length > 0 ? (
            <FlatList
              data={displayBids.slice(0, 50)}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <BidHistoryItem bid={item} index={index} />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.bidsList}
            />
          ) : (
            <View style={styles.emptyTab}>
              <Text style={styles.emptyTabText}>
                Henuz teklif verilmemis
              </Text>
            </View>
          )
        ) : (
          <View style={styles.chatContainer}>
            <FlatList
              data={chatMessages ?? []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ChatMessageItem message={item} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.chatList}
              inverted
              ListEmptyComponent={
                <View style={styles.emptyTab}>
                  <Text style={styles.emptyTabText}>
                    Henuz mesaj yok
                  </Text>
                </View>
              }
            />
            <View style={styles.chatInputContainer}>
              <TextInput
                ref={chatInputRef}
                style={styles.chatInput}
                value={chatMessage}
                onChangeText={setChatMessage}
                placeholder="Mesaj yazin..."
                placeholderTextColor={Colors.textTertiary}
                returnKeyType="send"
                onSubmitEditing={handleSendChat}
              />
              <Pressable
                onPress={handleSendChat}
                style={styles.chatSendButton}
              >
                <Text style={styles.chatSendText}>Gonder</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Quick Bid Button */}
      <View style={[styles.quickBidBar, { paddingBottom: insets.bottom + 8 }]}>
        {!isConnected && (
          <View style={styles.disconnectedBanner}>
            <Text style={styles.disconnectedText}>
              Baglanti kesildi...
            </Text>
          </View>
        )}
        <Pressable
          onPress={handleQuickBid}
          disabled={placeBidMutation.isPending}
          style={({ pressed }) => [
            styles.quickBidButton,
            pressed && styles.quickBidButtonPressed,
            placeBidMutation.isPending && styles.buttonDisabled,
          ]}
        >
          {placeBidMutation.isPending ? (
            <ActivityIndicator color={Colors.textInverse} size="small" />
          ) : (
            <Text style={styles.quickBidButtonText}>
              Teklif Ver - {formatPrice(currentPrice + (auction.minBidIncrement ?? 100))} TL
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: 240,
    backgroundColor: '#000000',
    position: 'relative',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoImage: {
    ...StyleSheet.absoluteFillObject,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  videoContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  liveBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  viewerBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  lotOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  lotTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  lotNumber: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  priceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  priceBarLeft: {
    gap: 2,
  },
  priceBarLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  priceBarRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  bidCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bidCountText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  bidCountLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
  bidsList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
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
  chatContainer: {
    flex: 1,
  },
  chatList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chatMessageItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 6,
    gap: 6,
    flexWrap: 'wrap',
  },
  chatUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  chatMessageText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  chatTime: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  chatSendButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatSendText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTabText: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  loadingIndicator: {
    paddingVertical: 20,
  },
  quickBidBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
  },
  disconnectedBanner: {
    backgroundColor: Colors.warning,
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
  },
  disconnectedText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  quickBidButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  quickBidButtonPressed: {
    backgroundColor: Colors.accentDark,
  },
  quickBidButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
