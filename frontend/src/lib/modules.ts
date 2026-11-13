import type { ModuleName } from "@backend/auth/modules";

export type ModuleId = Extract<
  ModuleName,
  "workout" | "finance" | "cashflow" | "recipes" | "minecraft" | "minor" | "resume" | "lyric_quotes" | "you" | "pulse"
>;

export interface AppModule {
  id: ModuleId;
  title: string;
  subtitle: string;
  permissions: ModuleName[];
  accentColor: string;
  href: string;
  external?: boolean;
  tile: "wide" | "regular" | "compact";
}

export const MODULES: AppModule[] = [
  {
    id: "workout",
    title: "Workout Studio",
    subtitle: "Kracht & conditie",
    permissions: ["workout"],
    accentColor: "#00E676",
    href: "/workouts",
    tile: "wide",
  },
  {
    id: "finance",
    title: "finance.title",
    subtitle: "finance.dashboardSubtitle",
    permissions: ["finance"],
    accentColor: "#a1a1aa",
    href: "/finance",
    tile: "regular",
  },
  {
    id: "cashflow",
    title: "Cashflow",
    subtitle: "Facturatie & financieel overzicht",
    permissions: ["cashflow"],
    accentColor: "#00B0FF",
    href: "/cashflow",
    tile: "regular",
  },
  {
    id: "recipes",
    title: "Taste Tracker",
    subtitle: "Recipes & Wines",
    permissions: ["recipes"],
    accentColor: "#FFB300",
    href: "/recipes",
    tile: "regular",
  },
  {
    id: "minecraft",
    title: "Lobby Control",
    subtitle: "Game servers",
    permissions: ["minecraft", "minecraft:monitor"],
    accentColor: "#76FF03",
    href: "/games/minecraft",
    tile: "regular",
  },
  {
    id: "minor",
    title: "Minor Tracker",
    subtitle: "Sprints & Log",
    permissions: ["minor"],
    accentColor: "#FF9100",
    href: "/minor",
    tile: "regular",
  },
  {
    id: "resume",
    title: "CV Builder",
    subtitle: "Resume & PDF",
    permissions: ["resume"],
    accentColor: "#E040FB",
    href: "/resume",
    tile: "regular",
  },
  {
    id: "lyric_quotes",
    title: "Lyric Quotes",
    subtitle: "Quotes",
    permissions: ["lyric_quotes"],
    accentColor: "#7C4DFF",
    href: "https://stevenheijn.nl/lyric_quotes/",
    external: true,
    tile: "compact",
  },
  {
    id: "you",
    title: "You",
    subtitle: "Persoonlijk",
    permissions: ["you"],
    accentColor: "#FF4081",
    href: "https://stevenheijn.nl/you",
    external: true,
    tile: "compact",
  },
  {
    id: "pulse",
    title: "Pulse",
    subtitle: "Monitoring & beheer",
    permissions: ["pulse"],
    accentColor: "#FF1744",
    href: "/pulse",
    tile: "wide",
  },
];

export const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  ...MODULES.filter((m) => !m.external).map((m) => `/${m.href.split("/")[1]}`),
];

export function moduleById(id: ModuleId): AppModule {
  return MODULES.find((m) => m.id === id)!;
}

export function moduleForPath(pathname: string): AppModule | undefined {
  return MODULES.find((m) => !m.external && (pathname === m.href || pathname.startsWith(`${m.href}/`)));
}

export function canOpen(module: AppModule, userModules: string[]): boolean {
  return module.permissions.some((p) => userModules.includes(p));
}
