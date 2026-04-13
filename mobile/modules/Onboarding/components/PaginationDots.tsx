import React from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

interface PaginationDotsProps {
  count: number;
  progress: SharedValue<number>;
}

export default function PaginationDots({ count, progress }: PaginationDotsProps) {
  return (
    <View className="flex-row items-center justify-center gap-x-2">
      {Array.from({ length: count }).map((_, i) => (
        <DotItem key={i} index={i} progress={progress} />
      ))}
    </View>
  );
}

function DotItem({
  index,
  progress,
}: {
  index: number;
  progress: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const activeProgress = interpolate(
      progress.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      Extrapolation.CLAMP
    );

    const width = interpolate(activeProgress, [0, 1], [8, 24], Extrapolation.CLAMP);
    const opacity = interpolate(activeProgress, [0, 1], [0.35, 1], Extrapolation.CLAMP);

    return { width, opacity };
  });

  return (
    <Animated.View
      style={[animatedStyle]}
      className="h-2 rounded-full bg-primary"
    />
  );
}
