import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

export default function SplashLoadingDots() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const config = { duration: 500, easing: Easing.inOut(Easing.ease) };
    const seq = (delay: number, val: SharedValue<number>) => {
      val.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, config),
            withTiming(0.3, config)
          ),
          -1
        )
      );
    };
    seq(0, dot1);
    seq(200, dot2);
    seq(400, dot3);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View className="flex-row items-center gap-x-2">
      <Animated.View style={s1} className="w-2 h-2 rounded-full bg-primary" />
      <Animated.View style={s2} className="w-2.5 h-2.5 rounded-full bg-primary" />
      <Animated.View style={s3} className="w-2 h-2 rounded-full bg-primary" />
    </View>
  );
}
