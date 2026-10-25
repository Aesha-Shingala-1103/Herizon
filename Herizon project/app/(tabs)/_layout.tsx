import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Home, HeartHandshake, FileText, CalendarHeart, UserCheck } from 'lucide-react-native';
import Colors from '../../src/theme/colors';
import Typography from '../../src/theme/typography';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.warmPorcelain,
        },
        headerTintColor: Colors.deepBurgundy,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: Colors.lavenderSlate,
          fontFamily: Typography.heading,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.88)' : Colors.white,
          borderTopColor: Colors.fineBorder,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          ...Platform.select({
            web: {
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            } as any,
            default: {},
          }),
          shadowColor: Colors.lavenderSlate,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 4,
        },
        tabBarActiveTintColor: Colors.deepBurgundy,
        tabBarInactiveTintColor: Colors.mutedText,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          fontFamily: Typography.body,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Home color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'My Health',
          headerTitle: 'Daily Health Journal',
          tabBarIcon: ({ color, size }) => <HeartHandshake color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          headerTitle: 'Records & Reports',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="care"
        options={{
          title: 'Care',
          headerTitle: 'Care & Appointments',
          tabBarIcon: ({ color, size }) => <CalendarHeart color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Health Profile & Settings',
          tabBarIcon: ({ color, size }) => <UserCheck color={color} size={21} />,
        }}
      />
    </Tabs>
  );
}
