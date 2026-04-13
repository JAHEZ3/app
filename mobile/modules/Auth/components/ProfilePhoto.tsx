import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ProfilePhotoProps {
  onPress?: () => void;
}

export default function ProfilePhoto({ onPress }: ProfilePhotoProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <AnimatedTouchable
        style={animStyle}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.95, { damping: 15 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 });
        }}
        activeOpacity={1}
      >
        {/* Outer ring */}
        <View
          style={{
            width: 108,
            height: 108,
            borderRadius: 54,
            padding: 3,
            borderWidth: 2.5,
            borderColor: "#F55905",
          }}
        >
          <View
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 50,
              overflow: "hidden",
              backgroundColor: "#eeeeee",
            }}
          >
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
              }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </View>
        </View>

        {/* Edit badge */}
        <View
          style={{
            position: "absolute",
            bottom: 4,
            left: 4,
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: "#F55905",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "#fff",
            shadowColor: "#F55905",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          <Ionicons name="pencil" size={13} color="#fff" />
        </View>
      </AnimatedTouchable>

      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="camera-outline" size={14} color="#F55905" />
          <Animated.Text
            style={{
              fontFamily: "Tajawal_400Regular",
              fontSize: 13,
              color: "#F55905",
              textDecorationLine: "underline",
            }}
          >
            تغيير الصورة الشخصية
          </Animated.Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
