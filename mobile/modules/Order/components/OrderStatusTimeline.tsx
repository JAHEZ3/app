import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, typography } from "@/components/ui/theme";
import { useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { OrderStatusHistoryEntry } from "../types";

interface OrderStatusTimelineProps {
  history: OrderStatusHistoryEntry[];
}

const STATUS_KEY_MAP: Record<string, string> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  ON_THE_WAY: "onTheWay",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

const STATUS_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  PENDING: "time-outline",
  CONFIRMED: "checkmark-circle-outline",
  PREPARING: "restaurant-outline",
  ON_THE_WAY: "bicycle-outline",
  DELIVERED: "home-outline",
  CANCELLED: "close-circle-outline",
};

const formatTimestamp = (iso: string, locale: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return date.toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date.toLocaleString();
  }
};

const OrderStatusTimeline = ({ history }: OrderStatusTimelineProps) => {
  const { t } = useOrdersT();
  const isRTL = useLanguageStore((state) => state.isRTL);
  const language = useLanguageStore((state) => state.language);
  const writingDirection = isRTL ? "rtl" : "ltr";
  const textAlign = isRTL ? "right" : "left";

  const sorted = useMemo(() => {
    return [...history].sort(
      (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
    );
  }, [history]);

  if (sorted.length === 0) {
    return (
      <Text style={[styles.empty, { textAlign, writingDirection }]}>
        {t("history.empty", { defaultValue: "No status updates yet." })}
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {sorted.map((entry, index) => {
        const isLast = index === sorted.length - 1;
        const isLatest = index === sorted.length - 1;
        const statusKey = STATUS_KEY_MAP[entry.status as string] ?? "pending";
        const icon = STATUS_ICON_MAP[entry.status as string] ?? "ellipse-outline";
        const label = t(`status.${statusKey}`, {
          defaultValue: entry.status,
        });

        return (
          <View
            key={`${entry.changedAt}-${entry.status}-${index}`}
            style={[styles.row, isRTL && styles.rowReverse]}
          >
            <View style={styles.railColumn}>
              <View
                style={[
                  styles.dot,
                  isLatest ? styles.dotActive : styles.dotInactive,
                ]}
              >
                <Ionicons
                  name={icon}
                  size={12}
                  color={isLatest ? colors.onPrimary : colors.primary}
                />
              </View>
              {!isLast && <View style={styles.line} />}
            </View>

            <View style={styles.body}>
              <Text style={[styles.status, { textAlign, writingDirection }]}>
                {label}
              </Text>
              <Text style={[styles.timestamp, { textAlign, writingDirection }]}>
                {formatTimestamp(entry.changedAt, language === "ar" ? "ar" : "en-GB")}
              </Text>
              {entry.note ? (
                <Text style={[styles.note, { textAlign, writingDirection }]}>
                  {entry.note}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  railColumn: {
    alignItems: "center",
    width: 24,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotInactive: {
    backgroundColor: colors.faintPrimary,
  },
  line: {
    flex: 1,
    minHeight: 18,
    width: 2,
    backgroundColor: colors.surfaceContainerHighest,
    marginVertical: 2,
    borderRadius: radii.sm,
  },
  body: {
    flex: 1,
    paddingBottom: 16,
    gap: 2,
  },
  status: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 14,
    lineHeight: 18,
  },
  timestamp: {
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 12,
    lineHeight: 15,
  },
  note: {
    marginTop: 2,
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
    lineHeight: 16,
  },
  empty: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default OrderStatusTimeline;
