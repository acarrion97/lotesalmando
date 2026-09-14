import type { ThemeConfig } from "antd";
import { brand } from "./brand";

const t = brand.light;

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: t.primary,
    colorSuccess: t.success,
    colorWarning: t.warning,
    colorError: t.error,
    colorInfo: t.primary,
    colorBgBase: t.bg,
    colorBgLayout: t.bgSecondary,
    colorBgContainer: t.bgContainer,
    colorBgElevated: t.bgElevated,
    colorText: t.text,
    colorTextSecondary: t.textSecondary,
    colorTextTertiary: t.textTertiary,
    colorTextQuaternary: "#9CA8A9",
    colorBorder: t.border,
    colorBorderSecondary: t.borderSecondary,
    borderRadius: 8,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    colorLink: t.link,
    colorLinkHover: t.linkHover,
    colorLinkActive: t.primary,
    controlHeight: 36,
    controlHeightSM: 28,
    controlHeightLG: 44,
    marginXS: 8,
    marginSM: 12,
    margin: 16,
    marginMD: 20,
    marginLG: 24,
    marginXL: 32,
    padding: 16,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,
    boxShadow:
      "0 1px 3px 0 rgba(8, 43, 51, 0.06), 0 1px 2px -1px rgba(8, 43, 51, 0.06)",
    boxShadowSecondary:
      "0 4px 6px -1px rgba(8, 43, 51, 0.08), 0 2px 4px -2px rgba(8, 43, 51, 0.06)",
  },
  components: {
    Layout: {
      headerBg: t.headerBg,
      siderBg: t.siderBg,
      bodyBg: t.bodyBg,
      headerHeight: 64,
      headerPadding: "0 24px",
    },
    Menu: {
      darkItemBg: t.siderBg,
      darkSubMenuItemBg: brand.azulPetroleoOscuro,
      darkItemSelectedBg: t.siderItemSelectedBg,
      darkItemColor: "rgba(255, 255, 255, 0.65)",
      darkItemSelectedColor: "#ffffff",
      darkItemHoverColor: "#ffffff",
      darkItemHoverBg: "rgba(255, 255, 255, 0.08)",
      itemHeight: 42,
      itemMarginInline: 8,
      itemPaddingInline: 16,
      iconSize: 16,
    },
    Card: {
      headerBg: "transparent",
      paddingLG: 24,
    },
    Table: {
      headerBg: t.tableHeaderBg,
      headerColor: t.text,
      rowHoverBg: t.tableRowHoverBg,
      borderColor: t.borderSecondary,
    },
    Button: {
      primaryShadow: `0 2px 0 ${t.primary}1a`,
      defaultShadow: "0 2px 0 rgba(0, 0, 0, 0.02)",
    },
    Input: {
      activeShadow: `0 0 0 2px ${t.primary}1a`,
    },
    Breadcrumb: {
      separatorColor: t.textTertiary,
      itemColor: t.textTertiary,
      lastItemColor: t.text,
    },
  },
};
