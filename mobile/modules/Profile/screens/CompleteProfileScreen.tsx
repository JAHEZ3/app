import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import FormField from "../components/FormField";
import LocationCard from "../components/LocationCard";
import PrivacyCard from "../components/PrivacyCard";
import AppButton from "../../../components/ui/AppButton";
import { useCompleteProfile } from "../hooks/useCompleteProfile";
import { useLocation } from "../hooks/useLocation";
import { mapAuthError } from "../../Auth/utils/mapAuthError";
import { useAuthT } from "@/hooks/useAppTranslation";
import { useRTL } from "@/hooks/useRTL";

const ease = Easing.out(Easing.cubic);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1923 }, (_, i) => CURRENT_YEAR - i);

function formatBirthdayInput(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  return parts.join("/");
}

function parseBirthday(value: string) {
  const [dayText, monthText, yearText] = value.split("/");
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  if (
    !dayText || !monthText || !yearText ||
    dayText.length !== 2 || monthText.length !== 2 || yearText.length !== 4
  ) return null;

  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) return null;

  return date;
}

function formatDateValue(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function toLocalISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildCalendarDays(displayedMonth: Date): (Date | null)[] {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
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
  const { t } = useAuthT();
  const isRTL = useRTL();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isYearPickerVisible, setIsYearPickerVisible] = useState(false);
  const [monthSlideDir, setMonthSlideDir] = useState<"left" | "right">("left");
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(CURRENT_YEAR - 20, 0, 1)
  );

  const yearsListRef = useRef<FlatList>(null);
  const sheetY = useSharedValue(600);
  const overlayAlpha = useSharedValue(0);

  const { mutateAsync: completeProfile, isPending, isError, error } = useCompleteProfile();
  const {
    coords,
    hasPermission,
    canAskAgain,
    isLoading: isLocationLoading,
    requestLocation,
    refreshLocation,
  } = useLocation();

  const monthNames = useMemo(
    () => t("completeProfile.calendar.months", { returnObjects: true }) as string[],
    [t]
  );
  const weekdayLabels = useMemo(
    () => t("completeProfile.calendar.weekdays", { returnObjects: true }) as string[],
    [t]
  );

  const selectedBirthday = useMemo(() => parseBirthday(birthday), [birthday]);
  const calendarDays = useMemo(() => buildCalendarDays(displayedMonth), [displayedMonth]);

  const pageOpacity = useSharedValue(0);

  useEffect(() => {
    pageOpacity.value = withTiming(1, { duration: 300, easing: ease });
  }, [pageOpacity]);

  useEffect(() => {
    if (coords) {
      console.log("CompleteProfile location:", coords);
    }
  }, [coords]);

  const pageStyle = useAnimatedStyle(() => ({ opacity: pageOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayAlpha.value }));

  const handleBirthdayChange = useCallback((text: string) => setBirthday(formatBirthdayInput(text)), []);

  const openCalendar = useCallback(() => {
    const base = selectedBirthday ?? new Date(CURRENT_YEAR - 20, 0, 1);
    setDisplayedMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setIsCalendarVisible(true);
    sheetY.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });
    overlayAlpha.value = withTiming(1, { duration: 300 });
  }, [selectedBirthday, sheetY, overlayAlpha]);

  const closeCalendar = useCallback(() => {
    sheetY.value = withTiming(600, { duration: 280, easing: Easing.in(Easing.cubic) });
    overlayAlpha.value = withTiming(0, { duration: 280 });
    setTimeout(() => {
      setIsCalendarVisible(false);
      setIsYearPickerVisible(false);
    }, 290);
  }, [sheetY, overlayAlpha]);

  const handleSelectDay = useCallback((date: Date) => {
    setBirthday(formatDateValue(date));
    closeCalendar();
  }, [closeCalendar]);

  const goToPreviousMonth = useCallback(() => {
    setMonthSlideDir("right");
    setDisplayedMonth((cur) => new Date(cur.getFullYear(), cur.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonthSlideDir("left");
    setDisplayedMonth((cur) => new Date(cur.getFullYear(), cur.getMonth() + 1, 1));
  }, []);

  const openYearPicker = useCallback(() => {
    setIsYearPickerVisible(true);
    const idx = YEARS.indexOf(displayedMonth.getFullYear());
    setTimeout(() => {
      yearsListRef.current?.scrollToIndex({ index: Math.max(idx, 0), animated: false, viewPosition: 0.5 });
    }, 60);
  }, [displayedMonth]);

  const selectYear = useCallback((year: number) => {
    setMonthSlideDir("left");
    setDisplayedMonth((cur) => new Date(year, cur.getMonth(), 1));
    setIsYearPickerVisible(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      await completeProfile({
        firstName,
        lastName,
        dateOfBirth: toLocalISODate(selectedBirthday!),
        locationLat: coords?.lat ?? null,
        locationLng: coords?.lng ?? null,
      });
      router.replace("/home/Home");
    } catch {
      // error displayed via isError
    }
  }, [completeProfile, firstName, lastName, selectedBirthday, coords]);

  const textAlign = isRTL ? "right" : "left";
  const align = isRTL ? "flex-end" : "flex-start";

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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: align }}>
          {!isRTL && <Ionicons name="arrow-forward" size={17} color="#F55905" />}
          <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 16, color: "#1E1E1E" }}>
            {t("completeProfile.title")}
          </Text>
          {isRTL && <Ionicons name="arrow-forward" size={17} color="#F55905" />}
        </View>
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingTop: 20, paddingBottom: 24 }} />

          <View style={{ paddingHorizontal: 24, gap: 18 }}>
            <Row delay={340}>
              <FormField
                label={t("completeProfile.firstName")}
                placeholder={t("completeProfile.firstNamePlaceholder")}
                value={firstName}
                onChangeText={setFirstName}
              />
            </Row>

            <Row delay={400}>
              <FormField
                label={t("completeProfile.lastName")}
                placeholder={t("completeProfile.lastNamePlaceholder")}
                value={lastName}
                onChangeText={setLastName}
              />
            </Row>

            <Row delay={460}>
              <FormField
                label={t("completeProfile.birthDate")}
                placeholder={t("completeProfile.birthDatePlaceholder")}
                value={birthday}
                onChangeText={handleBirthdayChange}
                keyboardType="number-pad"
                iconName="calendar-outline"
                onIconPress={openCalendar}
                maxLength={10}
              />
            </Row>

            <Row delay={520}>
              <LocationCard
                coords={coords}
                hasPermission={hasPermission}
                canAskAgain={canAskAgain}
                isLoading={isLocationLoading}
                onAllowLocation={requestLocation}
                onRefreshLocation={refreshLocation}
              />
            </Row>

            <Row delay={560}>
              <PrivacyCard />
            </Row>

            {isError && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: align, gap: 4, marginTop: 4 }}>
                {!isRTL && <Ionicons name="alert-circle" size={14} color="#E53935" />}
                <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#E53935", textAlign }}>
                  {mapAuthError(error as Error)}
                </Text>
                {isRTL && <Ionicons name="alert-circle" size={14} color="#E53935" />}
              </View>
            )}

            <Row delay={620}>
              <AppButton
                label={t("completeProfile.saveAndContinue")}
                onPress={handleSubmit}
                disabled={isPending || !firstName || !lastName || !selectedBirthday}
                icon={<Ionicons name="arrow-back-circle-outline" size={22} color="#fff" />}
                iconPosition={isRTL ? "left" : "right"}
              />
            </Row>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isCalendarVisible} transparent animationType="none" onRequestClose={closeCalendar}>
        <Animated.View style={[overlayStyle, { flex: 1, backgroundColor: "rgba(17,24,39,0.5)" }]}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeCalendar}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />

          <Animated.View
            style={[
              sheetStyle,
              {
                position: "absolute", bottom: 0, left: 0, right: 0,
                backgroundColor: "#fff",
                borderTopLeftRadius: 28, borderTopRightRadius: 28,
                paddingBottom: Platform.OS === "ios" ? 36 : 24,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.08, shadowRadius: 20, elevation: 20,
              },
            ]}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0", alignSelf: "center", marginTop: 12, marginBottom: 4 }} />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 }}>
              <TouchableOpacity
                onPress={goToPreviousMonth}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="chevron-back" size={20} color="#F55905" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={isYearPickerVisible ? () => setIsYearPickerVisible(false) : openYearPicker}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 17, color: "#1E1E1E" }}>
                  {`${monthNames[displayedMonth.getMonth()]} ${displayedMonth.getFullYear()}`}
                </Text>
                <Ionicons name={isYearPickerVisible ? "chevron-up" : "chevron-down"} size={16} color="#F55905" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={goToNextMonth}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFF3EC", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="chevron-forward" size={20} color="#F55905" />
              </TouchableOpacity>
            </View>

            {isYearPickerVisible ? (
              <FlatList
                ref={yearsListRef}
                data={YEARS}
                keyExtractor={(y) => String(y)}
                style={{ height: 280, paddingHorizontal: 16 }}
                numColumns={4}
                showsVerticalScrollIndicator={false}
                onScrollToIndexFailed={() => {}}
                renderItem={({ item: year }) => {
                  const isSelected = year === displayedMonth.getFullYear();
                  return (
                    <TouchableOpacity
                      onPress={() => selectYear(year)}
                      style={{
                        flex: 1, margin: 4, paddingVertical: 10, borderRadius: 12,
                        alignItems: "center",
                        backgroundColor: isSelected ? "#F55905" : "#F7F7F7",
                      }}
                    >
                      <Text style={{ fontFamily: isSelected ? "Cairo_700Bold" : "Tajawal_400Regular", fontSize: 14, color: isSelected ? "#fff" : "#1E1E1E" }}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <View style={{ paddingHorizontal: 16, overflow: "hidden" }}>
                <View style={{ flexDirection: "row", marginBottom: 6 }}>
                  {weekdayLabels.map((label) => (
                    <View key={label} style={{ width: "14.2857%", alignItems: "center" }}>
                      <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#9E9E9E" }}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>

                <Animated.View
                  key={`${displayedMonth.getFullYear()}-${displayedMonth.getMonth()}`}
                  entering={monthSlideDir === "left" ? SlideInRight.duration(220).easing(Easing.out(Easing.cubic)) : SlideInLeft.duration(220).easing(Easing.out(Easing.cubic))}
                  exiting={monthSlideDir === "left" ? SlideOutLeft.duration(220).easing(Easing.in(Easing.cubic)) : SlideOutRight.duration(220).easing(Easing.in(Easing.cubic))}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {calendarDays.map((date, index) => {
                      const isSelected =
                        !!date && !!selectedBirthday &&
                        date.getDate() === selectedBirthday.getDate() &&
                        date.getMonth() === selectedBirthday.getMonth() &&
                        date.getFullYear() === selectedBirthday.getFullYear();

                      return (
                        <View
                          key={date ? date.toISOString() : `e-${index}`}
                          style={{ width: "14.2857%", alignItems: "center", marginBottom: 6 }}
                        >
                          {date ? (
                            <TouchableOpacity
                              onPress={() => handleSelectDay(date)}
                              style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: isSelected ? "#F55905" : "transparent" }}
                            >
                              <Text style={{ fontFamily: isSelected ? "Cairo_700Bold" : "Tajawal_400Regular", fontSize: 14, color: isSelected ? "#fff" : "#1E1E1E" }}>
                                {date.getDate()}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={{ width: 38, height: 38 }} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                </Animated.View>
              </View>
            )}

            <TouchableOpacity
              onPress={closeCalendar}
              style={{ alignSelf: "center", marginTop: 8, paddingHorizontal: 28, paddingVertical: 10, borderRadius: 14, backgroundColor: "#F7F7F7" }}
            >
              <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 14, color: "#1E1E1E" }}>
                {t("completeProfile.calendar.close")}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}
