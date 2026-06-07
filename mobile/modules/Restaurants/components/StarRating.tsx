import React, { memo } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "@/components/ui/theme";

const STAR_GOLD = "#FFB300";
const STAR_EMPTY = "#E2E2E2";

interface StarRowProps {
  /** 0–5, fractional values render a partially-filled star. */
  value: number;
  size?: number;
  gap?: number;
  style?: ViewStyle;
}

/**
 * A row of 5 stars where the active rating is rendered with a precise
 * partial fill (e.g. 4.3 fills four stars and 30% of the fifth) by
 * clipping a gold star layer over a grey base.
 */
function StarRowBase({ value, size = 14, gap = 2, style }: StarRowProps) {
  const clamped = Math.max(0, Math.min(5, value));
  return (
    <View style={[styles.row, { gap }, style]}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, clamped - i));
        return (
          <View key={i} style={{ width: size, height: size }}>
            <Ionicons name="star" size={size} color={STAR_EMPTY} />
            {fill > 0 ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { width: size * fill, overflow: "hidden" },
                ]}
              >
                <Ionicons name="star" size={size} color={STAR_GOLD} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export const StarRow = memo(StarRowBase);

interface StarRatingProps {
  rating: number;
  totalRatings?: number;
  /** Optional caption shown under the stars, e.g. "120 reviews". */
  caption?: string;
  starSize?: number;
  align?: "flex-start" | "center" | "flex-end";
}

/**
 * Premium inline rating block: a large score, a partial-fill star row and
 * an optional review-count caption. Replaces the old flat "4.5 (12)" cell.
 */
function StarRatingBase({
  rating,
  caption,
  starSize = 15,
  align = "flex-start",
}: StarRatingProps) {
  return (
    <View style={[styles.block, { alignItems: align }]}>
      <View style={styles.scoreRow}>
        <Text style={styles.score}>{rating.toFixed(1)}</Text>
        <StarRow value={rating} size={starSize} gap={2.5} />
      </View>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  block: {
    gap: 4,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  score: {
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 17,
    lineHeight: 20,
  },
  caption: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 11,
  },
});

export default memo(StarRatingBase);
