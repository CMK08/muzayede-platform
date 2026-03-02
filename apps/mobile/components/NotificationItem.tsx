import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Colors } from '@/constants/colors';
import type { Notification } from '@/types';

interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
}

const notificationIcons: Record<Notification['type'], string> = {
  BID_PLACED: '[T]',
  BID_OUTBID: '[!]',
  AUCTION_WON: '[*]',
  AUCTION_ENDING: '[~]',
  AUCTION_STARTED: '[>]',
  ORDER_STATUS: '[S]',
  SYSTEM: '[i]',
};

export function NotificationItem({
  notification,
  onPress,
}: NotificationItemProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress(notification);
      return;
    }

    // Navigate based on notification type
    const auctionId = notification.data?.auctionId as string | undefined;
    if (auctionId) {
      router.push(`/auction/${auctionId}`);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: tr,
  });

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        !notification.isRead && styles.unread,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>
          {notificationIcons[notification.type]}
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.time}>{timeAgo}</Text>
      </View>
      {!notification.isRead && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  unread: {
    backgroundColor: Colors.primaryLight + '08',
  },
  pressed: {
    backgroundColor: Colors.background,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  message: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
});
