import type { ResumeLink, ResumeProfile, ResumeSection } from "../../types/shared";

export const RESUME_SECTIONS_MAX = 5;
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const EMPTY_PROFILE: ResumeProfile = {
  fullName: "",
  headline: "",
  photoPath: null,
  photoShape: "circle",
  residence: "",
  phone: "",
  email: "",
  birthDate: "",
  drivingLicense: "",
  links: [],
  sections: [],
};

export const DEFAULT_RESUME_SETTINGS = {
  name: "",
  titleFont: "carlito",
  textFont: "carlito",
  accentColor: "#1f7bc4",
  leftWidthPct: 70,
  swapColumns: false,
  titleScalePct: 100,
  textScalePct: 100,
};

export type ResumeSettings = typeof DEFAULT_RESUME_SETTINGS;

export interface ProfileInput {
  fullName?: string;
  headline?: string;
  photoShape?: string;
  residence?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  drivingLicense?: string;
  links?: Array<Partial<ResumeLink>>;
  sections?: Array<Partial<ResumeSection>>;
}

export interface PeriodInput {
  startMonth?: number | null;
  startYear?: number | null;
  endMonth?: number | null;
  endYear?: number | null;
  isCurrent?: boolean;
}

export interface ExperienceInput extends PeriodInput {
  company?: string;
  jobTitle?: string;
  place?: string;
  description?: string;
  logoPath?: string | null;
}

export interface EducationInput extends PeriodInput {
  institution?: string;
  degree?: string;
  place?: string;
  description?: string;
  logoPath?: string | null;
}

export interface ResumeInput {
  name?: string;
  titleFont?: string;
  textFont?: string;
  accentColor?: string;
  leftWidthPct?: number;
  swapColumns?: boolean;
  titleScalePct?: number;
  textScalePct?: number;
  selectAll?: boolean;
}

export interface ItemInput {
  kind: string;
  refId: number;
  descriptionOverride?: string | null;
}
