import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import FormField from "../components/FormField";
import PrivacyCard from "../components/PrivacyCard";
import AppButton from "../../../components/ui/AppButton";
import { useCompleteProfile } from "../hooks/useCompleteProfile";
import { useLocation } from "../hooks/useLocation";
import { mapAuthError } from "../../Auth/utils/mapAuthError";

const ease = Easing.out(Easing.cubic);
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatBirthdayInput(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  const parts: string[] = [];

  if (digits.length > 0) {
    parts.push(digits.slice(0, 2));
  }

  if (digits.length > 2) {
    parts.push(digits.slice(2, 4));
  }

  if (digits.length > 4) {
    parts.push(digits.slice(4, 8));
  }

  return parts.join("/");
}

function parseBirthday(value: string) {
  const [dayText, monthText, yearText] = value.split("/");
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  if (
    !dayText ||
    !monthText ||
    !yearText ||
    dayText.length !== 2 ||
    monthText.length !== 2 ||
    yearText.length !== 4
  ) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getDate() !== day ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getFullYear() !== year
  ) {
    return null;
  }

  return parsedDate;
}

function formatDateValue(date: Date) {
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function buildCalendarDays(displayedMonth: Date) {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let index = 0; index < firstDayIndex; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function PhotoRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.18, { duration: 2400 }),
        withTiming(0.45, { duration: 2400 })
      ),
      -1
    );
  }, [opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          width: 116,
          height: 116,
          borderRadius: 58,
          borderWidth: 2,
          borderColor: "#F55905",
        },
      ]}
    />
  );
}

function Row({ children, delay }: { children: React.ReactNode; delay: number }) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 320, easing: ease }));
    y.value = withDelay(delay, withTiming(0, { duration: 320, easing: ease }));
  }, [delay, opacity, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function CompleteProfileScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const { mutateAsync: completeProfile, isPending, isError, error } = useCompleteProfile();
  const { coords } = useLocation();

  async function handleSubmit() {
    try {
      const parsed = parseBirthday(birthday);
      const isoDate = parsed!.toISOString().split("T")[0];
      await completeProfile({
        firstName,
        lastName,
        dateOfBirth: isoDate,
        locationLat: coords?.lat ?? null,
        locationLng: coords?.lng ?? null,
      });
      router.replace("/home/Home");
      // @NOTE: ADD IN THIS ALERT FOR تم اكمال ملفك الشخصي بامكانك المتالعه
    } catch {
      // error displayed via isError state below
    }
  }

  const pageOpacity = useSharedValue(0);
  const photoScale = useSharedValue(0.9);
  const selectedBirthday = parseBirthday(birthday);
  const calendarDays = buildCalendarDays(displayedMonth);

  useEffect(() => {
    pageOpacity.value = withTiming(1, { duration: 300, easing: ease });
    photoScale.value = withDelay(100, withTiming(1, { duration: 350, easing: ease }));
  }, [pageOpacity, photoScale]);

  const pageStyle = useAnimatedStyle(() => ({ opacity: pageOpacity.value }));
  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoScale.value }],
  }));

  const handleBirthdayChange = (text: string) => {
    setBirthday(formatBirthdayInput(text));
  };

  const openCalendar = () => {
    const baseDate = selectedBirthday ?? new Date();
    setDisplayedMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    setIsCalendarVisible(true);
  };

  const closeCalendar = () => {
    setIsCalendarVisible(false);
  };

  const handleSelectBirthday = (date: Date) => {
    setBirthday(formatDateValue(date));
    closeCalendar();
  };

  const goToPreviousMonth = () => {
    setDisplayedMonth((currentMonth) => {
      const previousMonth = new Date(currentMonth);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      return new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
    });
  };

  const goToNextMonth = () => {
    setDisplayedMonth((currentMonth) => {
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <Animated.View
        style={[
          pageStyle,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 12,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 16, color: "#1E1E1E" }}>
            إكمال الملف الشخصي
          </Text>
          <Ionicons name="arrow-forward" size={17} color="#F55905" />
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: "center", paddingTop: 20, paddingBottom: 24 }}>
            <View
              style={{
                width: 120,
                height: 120,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PhotoRing />

              <Animated.View style={photoStyle}>
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    shadowColor: "#F55905",
                    shadowOffset: { width: 0, height: 5 },
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    elevation: 8,
                    backgroundColor: "#fff",
                  }}
                >
                  <View
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 50,
                      overflow: "hidden",
                      borderWidth: 2.5,
                      borderColor: "#fff",
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

                <View
                  style={{
                    position: "absolute",
                    bottom: 2,
                    left: 2,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "#F55905",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: "#fff",
                  }}
                >
                  <Ionicons name="pencil" size={12} color="#fff" />
                </View>
              </Animated.View>
            </View>

            <Row delay={280}>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 10,
                }}
              >
                <Ionicons name="camera-outline" size={13} color="#F55905" />
                <Text
                  style={{
                    fontFamily: "Tajawal_400Regular",
                    fontSize: 13,
                    color: "#F55905",
                    textDecorationLine: "underline",
                  }}
                >
                  تغيير الصورة الشخصية
                </Text>
              </TouchableOpacity>
            </Row>
          </View>

          <View style={{ paddingHorizontal: 24, gap: 18 }}>
            <Row delay={340}>
              <FormField
                label="الاسم الأول"
                placeholder="أدخل اسمك الأول"
                value={firstName}
                onChangeText={setFirstName}
              />
            </Row>

            <Row delay={400}>
              <FormField
                label="اسم العائلة"
                placeholder="أدخل اسم العائلة"
                value={lastName}
                onChangeText={setLastName}
              />
            </Row>

            <Row delay={460}>
              <FormField
                label="تاريخ الميلاد"
                placeholder="يوم / شهر / سنة"
                value={birthday}
                onChangeText={handleBirthdayChange}
                keyboardType="number-pad"
                iconName="calendar-outline"
                onIconPress={openCalendar}
                maxLength={10}
              />
            </Row>

            <Row delay={520}>
              <PrivacyCard />
            </Row>

            {isError && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 4,
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Tajawal_400Regular",
                    fontSize: 12,
                    color: "#E53935",
                    textAlign: "right",
                  }}
                >
                  {mapAuthError(error as Error)}
                </Text>
                <Ionicons name="alert-circle" size={14} color="#E53935" />
              </View>
            )}

            <Row delay={580}>
              <AppButton
                label="حفظ ومتابعة"
                onPress={handleSubmit}
                disabled={isPending || !firstName || !lastName || !birthday}
                icon={<Ionicons name="arrow-back-circle-outline" size={22} color="#fff" />}
                iconPosition="left"
              />
            </Row>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isCalendarVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCalendar}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(17, 24, 39, 0.4)",
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeCalendar}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
          />

          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 24,
              paddingHorizontal: 18,
              paddingTop: 18,
              paddingBottom: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.12,
              shadowRadius: 22,
              elevation: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <TouchableOpacity
                onPress={goToPreviousMonth}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#FFF3EC",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="chevron-back" size={20} color="#F55905" />
              </TouchableOpacity>

              <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 16, color: "#1E1E1E" }}>
                {`${monthNames[displayedMonth.getMonth()]} ${displayedMonth.getFullYear()}`}
              </Text>

              <TouchableOpacity
                onPress={goToNextMonth}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#FFF3EC",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="chevron-forward" size={20} color="#F55905" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
              {weekdayLabels.map((dayLabel) => (
                <View
                  key={dayLabel}
                  style={{
                    width: "14.2857%",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Tajawal_400Regular",
                      fontSize: 13,
                      color: "#7A7A7A",
                    }}
                  >
                    {dayLabel}
                  </Text>
                </View>
              ))}

              {calendarDays.map((date, index) => {
                const isSelected =
                  !!date &&
                  !!selectedBirthday &&
                  date.getDate() === selectedBirthday.getDate() &&
                  date.getMonth() === selectedBirthday.getMonth() &&
                  date.getFullYear() === selectedBirthday.getFullYear();

                return (
                  <View
                    key={date ? date.toISOString() : `empty-${index}`}
                    style={{
                      width: "14.2857%",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    {date ? (
                      <TouchableOpacity
                        onPress={() => handleSelectBirthday(date)}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isSelected ? "#F55905" : "#fff",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: isSelected
                              ? "Cairo_700Bold"
                              : "Tajawal_400Regular",
                            fontSize: 14,
                            color: isSelected ? "#fff" : "#1E1E1E",
                          }}
                        >
                          {date.getDate()}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ width: 40, height: 40 }} />
                    )}
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={closeCalendar}
              style={{
                alignSelf: "center",
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor: "#F7F7F7",
              }}
            >
              <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 14, color: "#1E1E1E" }}>
                إغلاق
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}