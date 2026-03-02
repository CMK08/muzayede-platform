import React from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

function TabIcon({
  label,
  focused,
}: {
  label: string;
  focused: boolean;
}) {
  return (
    <Text
      style={[
        styles.tabIcon,
        { color: focused ? Colors.tabBarActive : Colors.tabBarInactive },
      ]}
    >
      {label}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tabBarActive,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="H" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="auctions"
        options={{
          title: 'Muzayedeler',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="M" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Ara',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="A" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Bildirimler',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="B" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="P" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBarBackground,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 85,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  header: {
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontWeight: '600',
    color: Colors.text,
  },
});
