import type { CSSProperties } from "react";
import type { AppTheme } from "./theme";

export function pageStyle(theme: AppTheme): CSSProperties {
  return {
    padding: 24,
    maxWidth: 1280,
    margin: "0 auto",
    color: theme.text,
    backgroundColor: theme.background,
  };
}

export function cardStyle(theme: AppTheme): CSSProperties {
  return {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    boxShadow: theme.shadow,
  };
}

export function mutedCardStyle(theme: AppTheme): CSSProperties {
  return {
    backgroundColor: theme.surfaceMuted,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
  };
}

export function inputStyle(theme: AppTheme): CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${theme.inputBorder}`,
    backgroundColor: theme.inputBg,
    color: theme.inputText,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  };
}

export function primaryButtonStyle(theme: AppTheme): CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 10,
    border: `1px solid ${theme.borderStrong}`,
    backgroundColor: theme.buttonPrimaryBg,
    color: theme.buttonPrimaryText,
    cursor: "pointer",
    fontWeight: 600,
  };
}

export function secondaryButtonStyle(theme: AppTheme): CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 10,
    border: `1px solid ${theme.borderStrong}`,
    backgroundColor: theme.buttonSecondaryBg,
    color: theme.buttonSecondaryText,
    cursor: "pointer",
    fontWeight: 500,
  };
}

export function tableHeaderStyle(theme: AppTheme): CSSProperties {
  return {
    backgroundColor: theme.surfaceElevated,
    color: theme.textMuted,
    borderBottom: `1px solid ${theme.border}`,
    textAlign: "left",
  };
}

export function tableCellStyle(theme: AppTheme): CSSProperties {
  return {
    borderBottom: `1px solid ${theme.border}`,
    color: theme.text,
    verticalAlign: "top",
  };
}

export function smallMutedTextStyle(theme: AppTheme): CSSProperties {
  return {
    fontSize: 12,
    color: theme.textSoft,
    lineHeight: 1.45,
  };
}