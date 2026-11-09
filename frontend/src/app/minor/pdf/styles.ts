import { StyleSheet } from "@react-pdf/renderer";

// Palette matching Image 1 & Image 2
export const COLOR_CARMINE_RED = "#C00000";
export const COLOR_ODD_BANNER = "#E6302B";
export const COLOR_ODD_SECTION = "#FACAC9";
export const COLOR_ODD_CELL = "#FDF0F0";

export const COLOR_EVEN_BANNER = "#00A1E1";
export const COLOR_EVEN_SECTION = "#B0DEF0";
export const COLOR_EVEN_CELL = "#EDF7FD";

export const COLOR_GREEN_AGENT = "#00A86B";
export const COLOR_TEAL_LINK = "#00E3A4";
export const COLOR_BORDER = "#D3D3D3";
export const COLOR_TEXT_DARK = "#1A1A1A";
export const COLOR_BLACK = "#000000";
export const COLOR_WHITE = "#FFFFFF";

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 7.5,
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 20,
    color: COLOR_BLACK,
    backgroundColor: "#FFFFFF",
  },
  // Table utilities
  tableBorder: {
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_BORDER,
  },
  tableCell: {
    paddingHorizontal: 4,
    paddingVertical: 2.5,
    borderRightWidth: 0.5,
    borderRightColor: COLOR_BORDER,
    justifyContent: "center",
  },
  tableCellLast: {
    paddingHorizontal: 4,
    paddingVertical: 2.5,
    justifyContent: "center",
  },

  // Dashboard Page Styles
  dashHeaderCell: {
    backgroundColor: COLOR_CARMINE_RED,
    paddingHorizontal: 3,
    paddingVertical: 4,
    borderRightWidth: 0.5,
    borderRightColor: COLOR_BORDER,
    justifyContent: "center",
    alignItems: "center",
  },
  dashHeaderCellLeft: {
    backgroundColor: COLOR_CARMINE_RED,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRightWidth: 0.5,
    borderRightColor: COLOR_BORDER,
    justifyContent: "center",
  },
  dashHeaderTextWhite: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLOR_WHITE,
  },
  dashHeaderTextLink: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: COLOR_TEAL_LINK,
    textDecoration: "underline",
  },
  dashDataTextBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLOR_BLACK,
  },
  dashDataText: {
    fontSize: 8,
    color: COLOR_BLACK,
  },

  // Logboek Sprint Page Styles
  sprintBanner: {
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  sprintBannerText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLOR_WHITE,
    textAlign: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: COLOR_BORDER,
  },
  sectionHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    color: COLOR_TEXT_DARK,
  },
  sectionAgentText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLOR_GREEN_AGENT,
  },
  koprijCell: {
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRightWidth: 0.5,
    borderRightColor: COLOR_BORDER,
    justifyContent: "center",
  },
  koprijText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: COLOR_BLACK,
  },
  cellText: {
    fontSize: 7,
    color: COLOR_BLACK,
    lineHeight: 1.25,
  },
  cellTextBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: COLOR_BLACK,
  },
  spacer: {
    height: 4,
  },

  // Portfolio Link Row (Dashboard Page)
  portfolioRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  portfolioLabelCell: {
    backgroundColor: COLOR_CARMINE_RED,
    paddingHorizontal: 6,
    paddingVertical: 5,
    justifyContent: "center",
    width: "20%",
  },
  portfolioLabelText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLOR_WHITE,
  },
  portfolioValueCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: COLOR_BORDER,
    paddingHorizontal: 6,
    paddingVertical: 5,
    justifyContent: "center",
  },
  portfolioValueText: {
    fontSize: 8,
    color: COLOR_BLACK,
  },
  portfolioValueTextPlaceholder: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    color: "#999999",
  },
});
