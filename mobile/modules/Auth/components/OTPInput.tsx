import React, { useRef, useState, useEffect } from "react";
import {
  View,
  TextInput,
  Dimensions,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
const BOX_SIZE = Math.floor((width - 48 - 5 * 10) / 6);
const BOX_HEIGHT = Math.floor(BOX_SIZE * 1.25);

interface OTPInputProps {
  onComplete: (code: string) => void;
  onChangeValue?: (code: string) => void;
}

interface OTPBoxProps {
  value: string;
  isFilled: boolean;
  isActive: boolean;
  index: number;
  inputRef: (ref: TextInput | null) => void;
  onChangeText: (text: string) => void;
  onKeyPress: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
}

function OTPBox({
  value,
  isFilled,
  isActive,
  index,
  inputRef,
  onChangeText,
  onKeyPress,
}: OTPBoxProps) {
  // Stagger entrance
  const entranceScale = useSharedValue(0);
  const entranceOpacity = useSharedValue(0);

  // Per-digit bounce
  const bounceScale = useSharedValue(1);

  useEffect(() => {
    entranceScale.value = withDelay(
      index * 60,
      withSpring(1, { damping: 12, stiffness: 100 })
    );
    entranceOpacity.value = withDelay(
      index * 60,
      withTiming(1, { duration: 300 })
    );
  }, []);

  useEffect(() => {
    if (value) {
      bounceScale.value = withSequence(
        withSpring(1.2, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
    }
  }, [value]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ scale: entranceScale.value }],
  }));

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceScale.value }],
  }));

  const borderColor = isFilled ? "#F55905" : isActive ? "#F55905" : "#e5e5e5";
  const bgColor = isFilled ? "#FFF3EC" : isActive ? "#FFFAF7" : "#F7F7F7";
  const borderWidth = isActive || isFilled ? 2 : 1.5;

  return (
    <Animated.View style={entranceStyle}>
      <Animated.View
        style={[
          bounceStyle,
          {
            width: BOX_SIZE,
            height: BOX_HEIGHT,
            borderRadius: 14,
            borderWidth,
            borderColor,
            backgroundColor: bgColor,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: isActive || isFilled ? "#F55905" : "transparent",
            shadowOffset: { width: 0, height: isActive ? 4 : 2 },
            shadowOpacity: isActive ? 0.22 : isFilled ? 0.12 : 0,
            shadowRadius: isActive ? 10 : 4,
            elevation: isActive ? 6 : isFilled ? 3 : 0,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onKeyPress={onKeyPress}
          keyboardType="number-pad"
          maxLength={1}
          caretHidden
          selectTextOnFocus
          style={{
            width: "100%",
            height: "100%",
            textAlign: "center",
            fontFamily: "Cairo_700Bold",
            fontSize: 26,
            color: "#F55905",
            includeFontPadding: false,
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}

export default function OTPInput({ onComplete, onChangeValue }: OTPInputProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    onChangeValue?.(next.join(""));

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
    if (next.every((d) => d !== "")) {
      onComplete(next.join(""));
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!digits[index] && index > 0) {
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
        setActiveIndex(index - 1);
      }
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        justifyContent: "center",
        direction: "ltr",
      }}
    >
      {digits.map((digit, i) => (
        <OTPBox
          key={i}
          index={i}
          value={digit}
          isFilled={!!digit}
          isActive={activeIndex === i}
          inputRef={(ref) => {
            inputRefs.current[i] = ref;
          }}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
        />
      ))}
    </View>
  );
}
