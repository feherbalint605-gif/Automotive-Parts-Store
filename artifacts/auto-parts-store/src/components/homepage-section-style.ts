import type { CSSProperties } from "react";
import type { HomePageSectionStyle } from "@workspace/api-client-react";

export function sectionStyleVariables(style: HomePageSectionStyle): CSSProperties {
  const accent = style.accentMode === "custom" ? style.accentColor : "#ed6228";
  const text =
    style.textColor === "accent"
      ? accent
      : style.textColor === "muted"
        ? "#a5a6a1"
        : "#eee9df";
  const copy = style.textColor === "light" ? "#aaa9a2" : text;

  return {
    "--section-accent": accent,
    "--section-text": text,
    "--section-copy": copy,
  } as CSSProperties;
}

export function sectionSurfaceClasses(style: HomePageSectionStyle): string {
  const surfaces: Record<HomePageSectionStyle["bgStyle"], string> = {
    slate: "bg-[#17191b] border-y border-white/10",
    black: "bg-black border-y border-white/10",
    outline: "bg-transparent border border-[color:var(--section-accent)]",
    carbon: "carbon bg-[#191b1d] border-y border-white/10",
  };
  return surfaces[style.bgStyle];
}

export function sectionSpacingClasses(style: HomePageSectionStyle): string {
  const spacing: Record<HomePageSectionStyle["padding"], string> = {
    compact: "py-8 md:py-10",
    normal: "py-12 md:py-16",
    large: "py-20 lg:py-28",
    full: "min-h-screen flex flex-col justify-center py-20 md:py-24",
  };
  return spacing[style.padding];
}

export function heroHeightClasses(style: HomePageSectionStyle): string {
  const heights: Record<HomePageSectionStyle["padding"], string> = {
    compact: "min-h-[360px]",
    normal: "min-h-[480px]",
    large: "min-h-[600px]",
    full: "min-h-screen",
  };
  return heights[style.padding];
}

export function contentAlignmentClasses(style: HomePageSectionStyle): string {
  const alignments: Record<HomePageSectionStyle["align"], string> = {
    left: "items-start text-left",
    center: "items-center text-center",
    right: "items-end text-right",
  };
  return alignments[style.align];
}

export function imageColumnsClasses(
  style: HomePageSectionStyle,
  imageOnLeft: boolean,
): string {
  if (style.columns === "one") return "flex flex-col gap-8";
  if (style.columns === "asymmetric") {
    return imageOnLeft
      ? "grid grid-cols-1 gap-8 lg:grid-cols-[3fr_7fr] lg:items-center"
      : "grid grid-cols-1 gap-8 lg:grid-cols-[7fr_3fr] lg:items-center";
  }
  return "grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center";
}

export function featureGridClasses(style: HomePageSectionStyle): string {
  if (style.columns === "one") return "grid grid-cols-1 gap-3";
  if (style.columns === "asymmetric") {
    return "grid grid-cols-1 gap-3 sm:grid-cols-[7fr_3fr]";
  }
  return "grid grid-cols-1 gap-3 sm:grid-cols-2";
}

export const sectionHeadingColor = "text-[color:var(--section-text)]";
export const sectionCopyColor = "text-[color:var(--section-copy)]";
export const sectionAccentColor = "text-[color:var(--section-accent)]";
export const sectionAccentBackground = "bg-[color:var(--section-accent)]";
export const sectionAccentBorder = "border-[color:var(--section-accent)]";
