import React from "react";
import { Text, TextProps } from "react-native";

type TypographyVariant =
  | "headline-xl"
  | "headline-lg"
  | "headline-md"
  | "headline-sm"
  | "body-lg"
  | "body-md"
  | "body-sm"
  | "label";

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: "left" | "right" | "center";
}

const variantClassMap: Record<TypographyVariant, string> = {
  "headline-xl": "font-headline text-4xl text-on-surface",
  "headline-lg": "font-headline text-3xl text-on-surface",
  "headline-md": "font-headline text-2xl text-on-surface",
  "headline-sm": "font-headline-semi text-xl text-on-surface",
  "body-lg": "font-body text-base text-on-surface",
  "body-md": "font-body text-sm text-on-surface",
  "body-sm": "font-body text-xs text-on-surface",
  label: "font-label text-sm text-on-surface",
};

export default function AppText({
  variant = "body-md",
  align = "right",
  style,
  children,
  className,
  ...rest
}: AppTextProps) {
  const variantClass = variantClassMap[variant];
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  return (
    <Text
      className={`${variantClass} ${alignClass} ${className ?? ""}`}
      style={style}
      {...rest}
    >
      {children}
    </Text>
  );
}
