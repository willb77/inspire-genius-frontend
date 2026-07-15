/**
 * v2 design-system primitives (Wave 0 of the platform-wide CSS migration).
 *
 * These are the shared building blocks every migrated page consumes so the new
 * navy/orange editorial look comes from ONE source of truth (design tokens in
 * src/index.css) instead of copy-pasted inline hex. Import from "@/components/v2".
 *
 * i18n/RTL: primitives use logical CSS only and take translated strings via
 * props (they never hardcode user-facing text).
 */
export { V2Panel, type V2PanelProps } from "./V2Panel";
export { V2Card, type V2CardProps } from "./V2Card";
export { SectionLabel, type SectionLabelProps } from "./SectionLabel";
export { PrimaryButton, type PrimaryButtonProps } from "./PrimaryButton";
export { AccentButton, type AccentButtonProps } from "./AccentButton";
export { ProgressBar, type ProgressBarProps } from "./ProgressBar";
