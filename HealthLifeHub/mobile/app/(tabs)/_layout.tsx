import { Tabs } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 20,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.textPrimary,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />, headerTitle: 'HealthLifeHub' }} />
      <Tabs.Screen name="diary" options={{ title: t('tabs.diary'), tabBarIcon: ({ color }) => <TabIcon icon="📋" color={color} /> }} />
      <Tabs.Screen name="recipes" options={{ title: t('tabs.recipes'), tabBarIcon: ({ color }) => <TabIcon icon="🍳" color={color} /> }} />
      <Tabs.Screen name="pantry" options={{ title: t('tabs.pantry'), tabBarIcon: ({ color }) => <TabIcon icon="🧊" color={color} /> }} />
      <Tabs.Screen name="report" options={{ title: t('tabs.report'), tabBarIcon: ({ color }) => <TabIcon icon="📊" color={color} /> }} />
    </Tabs>
  );
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <span style={{ fontSize: 22, opacity: color === COLORS.primary ? 1 : 0.5 }}>{icon}</span>;
}
