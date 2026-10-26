import { Tabs } from 'expo-router';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/components/useTheme';

function tabColor(color: unknown, fallback: string): string {
  return typeof color === 'string' ? color : fallback;
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabIcon,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Latest',
          tabBarIcon: ({ color }) => (
            <Icon ios="newspaper.fill" android="newspaper" color={tabColor(color, theme.tabIcon)} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ color }) => (
            <Icon ios="magnifyingglass" android="search" color={tabColor(color, theme.tabIcon)} />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ color }) => (
            <Icon ios="info.circle.fill" android="info" color={tabColor(color, theme.tabIcon)} />
          ),
        }}
      />
    </Tabs>
  );
}
