import React, { useCallback } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore } from '@/store/useLanguageStore';
import type { SupportedLanguage } from '@/lib/i18n';

const OPTIONS: { code: SupportedLanguage; label: string }[] = [
  { code: 'ar', label: 'AR' },
  { code: 'en', label: 'EN' },
];

function Pill({
  label,
  active,
  loading,
  onPress,
}: {
  label: string;
  active: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  const progress = useSharedValue(active ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 220 });
  }, [active, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', '#F55905']
    ),
    borderRadius: 8,
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(255,255,255,0.5)', '#ffffff']
    ),
  }));

  return (
    <Animated.View style={pillStyle}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        disabled={loading}
        style={{ paddingVertical: 5, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', minWidth: 36 }}
      >
        {loading && active ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Animated.Text
            style={[textStyle, { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }]}
          >
            {label}
          </Animated.Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LanguageSwitcher() {
  const { language, isChanging, setLanguage } = useLanguageStore();

  const containerScale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
  }));

  const handleSelect = useCallback(
    async (code: SupportedLanguage) => {
      if (code === language || isChanging) return;
      containerScale.value = withSpring(0.94, { damping: 12 });
      await setLanguage(code);
      containerScale.value = withSpring(1, { damping: 12 });
    },
    [language, isChanging, setLanguage, containerScale]
  );

  return (
    <Animated.View style={scaleStyle}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.38)',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.14)',
          padding: 3,
          gap: 2,
        }}
      >
        <Ionicons
          name="globe-outline"
          size={13}
          color="rgba(255,255,255,0.55)"
          style={{ marginLeft: 6, marginRight: 2 }}
        />
        {OPTIONS.map((opt) => (
          <Pill
            key={opt.code}
            label={opt.label}
            active={opt.code === language}
            loading={isChanging}
            onPress={() => handleSelect(opt.code)}
          />
        ))}
      </View>
    </Animated.View>
  );
}
