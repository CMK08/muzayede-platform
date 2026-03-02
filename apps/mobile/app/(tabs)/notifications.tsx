import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { NotificationItem } from '@/components/NotificationItem';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api';
import type { Notification } from '@/types';

export default function NotificationsScreen() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: notifications,
    isLoading,
    refetch,
  } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Notification[] }>(
        '/notifications'
      );
      return data.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        markAsRead.mutate(notification.id);
      }
    },
    [markAsRead]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const unreadCount =
    notifications?.filter((n) => !n.isRead).length ?? 0;

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Giris Yapin"
        message="Bildirimlerinizi gormek icin giris yapin."
        actionLabel="Giris Yap"
        onAction={() => {}}
      />
    );
  }

  if (isLoading) {
    return <LoadingSkeleton variant="list-item" count={6} />;
  }

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <View style={styles.headerBar}>
          <Text style={styles.unreadText}>
            {unreadCount} okunmamis bildirim
          </Text>
          <Pressable
            onPress={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <Text style={styles.markAllText}>Tumunu Oku</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={handleNotificationPress}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="Bildirim Yok"
            message="Henuz bildiriminiz bulunmuyor. Muzayedelere teklif verdiginizde bildirimleriniz burada gorunecek."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  unreadText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
