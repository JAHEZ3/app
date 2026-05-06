import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useCartT, useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import OrderStatusBadge from "../components/OrderStatusBadge";
import OrderStatusTimeline from "../components/OrderStatusTimeline";
import OrderItemRow from "../components/OrderItemRow";
import { useOrderDetails } from "../hooks/useOrderDetails";

const formatPrice = (value: number, currency: string) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

const formatDateTime = (iso: string | undefined, locale: string) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return date.toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date.toLocaleString();
  }
};

function Section({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  const isRTL = useLanguageStore((state) => state.isRTL);
  const writingDirection = isRTL ? "rtl" : "ltr";

  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, isRTL && styles.rowReverse]}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={16} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { writingDirection }]}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const isRTL = useLanguageStore((state) => state.isRTL);
  const writingDirection = isRTL ? "rtl" : "ltr";
  const textAlign = isRTL ? "right" : "left";

  return (
    <View style={[styles.infoRow, isRTL && styles.rowReverse]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.infoBody}>
        <Text style={[styles.infoLabel, { textAlign, writingDirection }]}>
          {label}
        </Text>
        <Text style={[styles.infoValue, { textAlign, writingDirection }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function StateBlock({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  loading = false,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  destructive?: boolean;
}) {
  const isRTL = useLanguageStore((state) => state.isRTL);
  const writingDirection = isRTL ? "rtl" : "ltr";

  return (
    <View style={styles.stateWrap}>
      <View style={styles.stateIcon}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Ionicons
            name={icon}
            size={36}
            color={destructive ? colors.error : colors.primary}
          />
        )}
      </View>
      <Text style={[styles.stateTitle, { writingDirection }]}>{title}</Text>
      <Text style={[styles.stateBody, { writingDirection }]}>{body}</Text>
      {actionLabel && onAction ? (
        <AnimatedPressable
          onPress={onAction}
          haptic="impact"
          scaleTo={0.96}
          style={styles.stateButton}
          accessibilityRole="button"
        >
          <Text style={styles.stateButtonText}>{actionLabel}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = typeof id === "string" ? id : undefined;
  const { t } = useOrdersT();
  const { t: tCart } = useCartT();
  const isRTL = useLanguageStore((state) => state.isRTL);
  const language = useLanguageStore((state) => state.language);
  const writingDirection = isRTL ? "rtl" : "ltr";
  const textAlign = isRTL ? "right" : "left";
  const currency = tCart("price.currency");

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useOrderDetails(orderId);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/orders" as never);
  }, []);

  const placedAt = useMemo(
    () => formatDateTime(order?.createdAt, language === "ar" ? "ar" : "en-GB"),
    [order?.createdAt, language],
  );

  const deliveryAddress = useMemo(() => {
    const d = order?.delivery;
    if (!d) return null;
    if (d.address) return d.address;
    if (d.addressLine) return d.addressLine;
    const parts = [d.street, d.city].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }, [order?.delivery]);

  let content: React.ReactNode;

  if (!orderId) {
    content = (
      <StateBlock
        icon="alert-circle-outline"
        title={t("error.title", { defaultValue: "Could not load order" })}
        body={t("error.missingId", {
          defaultValue: "We couldn't find this order.",
        })}
        actionLabel={t("error.back", { defaultValue: "Go back" })}
        onAction={handleBack}
        destructive
      />
    );
  } else if (isLoading) {
    content = (
      <StateBlock
        icon="receipt-outline"
        title={t("loading.title", { defaultValue: "Loading your order" })}
        body={t("loading.body", { defaultValue: "Just a moment…" })}
        loading
      />
    );
  } else if (isError || !order) {
    content = (
      <StateBlock
        icon="alert-circle-outline"
        title={t("error.title", { defaultValue: "Could not load order" })}
        body={
          error?.message ??
          t("error.body", { defaultValue: "Please try again." })
        }
        actionLabel={t("error.action", { defaultValue: "Retry" })}
        onAction={() => refetch()}
        destructive
      />
    );
  } else {
    const subtotal = order.subtotal ?? 0;
    const deliveryFee = order.deliveryFee ?? 0;
    const total = order.total ?? subtotal + deliveryFee;

    content = (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={[styles.heroTopRow, isRTL && styles.rowReverse]}>
            <View style={styles.heroIcon}>
              <Ionicons name="receipt" size={22} color={colors.primary} />
            </View>
            <View style={styles.heroTitleBlock}>
              <Text
                style={[styles.heroEyebrow, { textAlign, writingDirection }]}
                numberOfLines={1}
              >
                {t("details.title")}
              </Text>
              <Text
                style={[styles.heroTitle, { textAlign, writingDirection }]}
                numberOfLines={1}
              >
                #{order.orderId}
              </Text>
              {order.restaurantName ? (
                <Text
                  style={[styles.heroSubtitle, { textAlign, writingDirection }]}
                  numberOfLines={1}
                >
                  {order.restaurantName}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={[styles.heroMeta, isRTL && styles.rowReverse]}>
            <OrderStatusBadge status={order.status} />
            {placedAt ? (
              <Text
                style={[styles.heroMetaText, { textAlign, writingDirection }]}
                numberOfLines={1}
              >
                {t("details.placedAt")}: {placedAt}
              </Text>
            ) : null}
          </View>
        </View>

        <Section icon="fast-food-outline" title={t("sections.items", { defaultValue: "Items" })}>
          {order.items.length === 0 ? (
            <Text style={[styles.emptyText, { textAlign, writingDirection }]}>
              {t("sections.itemsEmpty", { defaultValue: "No items in this order." })}
            </Text>
          ) : (
            <View style={styles.itemsList}>
              {order.items.map((item, index) => (
                <React.Fragment key={`${item.mealId}-${index}`}>
                  {index > 0 ? <View style={styles.itemDivider} /> : null}
                  <OrderItemRow item={item} />
                </React.Fragment>
              ))}
            </View>
          )}

          <View style={styles.summaryDivider} />

          <View style={[styles.summaryRow, isRTL && styles.rowReverse]}>
            <Text style={[styles.summaryLabel, { textAlign, writingDirection }]}>
              {t("details.subtotal")}
            </Text>
            <Text style={[styles.summaryValue, { textAlign, writingDirection }]}>
              {formatPrice(subtotal, currency)}
            </Text>
          </View>
          <View style={[styles.summaryRow, isRTL && styles.rowReverse]}>
            <Text style={[styles.summaryLabel, { textAlign, writingDirection }]}>
              {t("details.deliveryFee")}
            </Text>
            <Text style={[styles.summaryValue, { textAlign, writingDirection }]}>
              {formatPrice(deliveryFee, currency)}
            </Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={[styles.totalRow, isRTL && styles.rowReverse]}>
            <Text style={[styles.totalLabel, { textAlign, writingDirection }]}>
              {t("details.total")}
            </Text>
            <Text style={[styles.totalValue, { textAlign, writingDirection }]}>
              {formatPrice(total, currency)}
            </Text>
          </View>
        </Section>

        <Section
          icon="time-outline"
          title={t("sections.history", { defaultValue: "Status history" })}
        >
          <OrderStatusTimeline history={order.statusHistory ?? []} />
        </Section>

        <Section
          icon="bicycle-outline"
          title={t("sections.delivery", { defaultValue: "Delivery info" })}
        >
          {deliveryAddress ? (
            <InfoRow
              icon="location-outline"
              label={t("delivery.address", { defaultValue: "Address" })}
              value={deliveryAddress}
            />
          ) : null}
          {order.delivery?.notes ? (
            <InfoRow
              icon="information-circle-outline"
              label={t("delivery.notes", { defaultValue: "Notes" })}
              value={order.delivery.notes}
            />
          ) : null}
          {order.delivery?.contactName || order.delivery?.contactPhone ? (
            <InfoRow
              icon="person-outline"
              label={t("delivery.contact", { defaultValue: "Contact" })}
              value={[order.delivery.contactName, order.delivery.contactPhone]
                .filter(Boolean)
                .join(" · ")}
            />
          ) : null}
          {order.delivery?.courierName || order.delivery?.courierPhone ? (
            <InfoRow
              icon="bicycle-outline"
              label={t("delivery.courier", { defaultValue: "Courier" })}
              value={[order.delivery.courierName, order.delivery.courierPhone]
                .filter(Boolean)
                .join(" · ")}
            />
          ) : null}
          {order.delivery?.estimatedArrival ? (
            <InfoRow
              icon="time-outline"
              label={t("delivery.eta", { defaultValue: "Estimated arrival" })}
              value={
                formatDateTime(
                  order.delivery.estimatedArrival,
                  language === "ar" ? "ar" : "en-GB",
                ) ?? order.delivery.estimatedArrival
              }
            />
          ) : null}
          {order.delivery?.deliveredAt ? (
            <InfoRow
              icon="checkmark-circle-outline"
              label={t("delivery.deliveredAt", { defaultValue: "Delivered at" })}
              value={
                formatDateTime(
                  order.delivery.deliveredAt,
                  language === "ar" ? "ar" : "en-GB",
                ) ?? order.delivery.deliveredAt
              }
            />
          ) : null}
          {!deliveryAddress &&
          !order.delivery?.notes &&
          !order.delivery?.contactName &&
          !order.delivery?.contactPhone &&
          !order.delivery?.courierName &&
          !order.delivery?.courierPhone &&
          !order.delivery?.estimatedArrival &&
          !order.delivery?.deliveredAt ? (
            <Text style={[styles.emptyText, { textAlign, writingDirection }]}>
              {t("delivery.empty", {
                defaultValue: "No delivery details available yet.",
              })}
            </Text>
          ) : null}
        </Section>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <AnimatedPressable
          onPress={handleBack}
          haptic="impact"
          scaleTo={0.92}
          style={styles.iconButton}
          accessibilityRole="button"
        >
          <Ionicons
            name={isRTL ? "chevron-forward" : "chevron-back"}
            size={22}
            color={colors.onSurface}
          />
        </AnimatedPressable>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.headerEyebrow, { writingDirection }]}>
            {t("header.eyebrow", { defaultValue: "Your activity" })}
          </Text>
          <Text style={[styles.headerTitle, { writingDirection }]}>
            {t("details.title")}
          </Text>
        </View>
        <View style={styles.iconButtonGhost} />
      </View>

      <View style={styles.content}>{content}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  header: {
    paddingHorizontal: screen.horizontal,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  iconButtonGhost: {
    width: 42,
    height: 42,
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
  },
  headerEyebrow: {
    fontFamily: typography.bodyBold,
    color: colors.outline,
    fontSize: 11,
    lineHeight: 13,
    textAlign: "center",
  },
  headerTitle: {
    marginTop: 1,
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 20,
    lineHeight: 25,
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: screen.horizontal,
    paddingBottom: 32,
    gap: 14,
  },
  heroCard: {
    padding: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    gap: 14,
    ...shadows.card,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  heroEyebrow: {
    fontFamily: typography.bodyBold,
    color: colors.outline,
    fontSize: 11,
    lineHeight: 14,
  },
  heroTitle: {
    marginTop: 2,
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 18,
    lineHeight: 22,
  },
  heroSubtitle: {
    marginTop: 2,
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 13,
    lineHeight: 17,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroMetaText: {
    flex: 1,
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
    lineHeight: 15,
  },
  section: {
    padding: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    gap: 14,
    ...shadows.soft,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    flex: 1,
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 15,
    lineHeight: 19,
  },
  sectionBody: {
    gap: 8,
  },
  itemsList: {
    gap: 12,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
    marginVertical: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
    marginTop: 6,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 13,
    lineHeight: 18,
  },
  summaryValue: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 13,
    lineHeight: 18,
  },
  totalDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHighest,
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  totalLabel: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 16,
    lineHeight: 20,
  },
  totalValue: {
    fontFamily: typography.headline,
    color: colors.primary,
    fontSize: 18,
    lineHeight: 23,
  },
  emptyText: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 13,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 4,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  infoLabel: {
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 11,
    lineHeight: 14,
  },
  infoValue: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 14,
    lineHeight: 18,
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 10,
  },
  stateIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  stateTitle: {
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
  },
  stateBody: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  stateButton: {
    marginTop: 14,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primary,
  },
  stateButtonText: {
    fontFamily: typography.headlineSemi,
    color: colors.onPrimary,
    fontSize: 15,
    lineHeight: 19,
  },
});

export default OrderDetailsScreen;
