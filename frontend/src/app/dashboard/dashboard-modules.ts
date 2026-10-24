export const DEFAULT_BG = "/karp-350.jpg";
export const DEFAULT_BLUR = 5;
export const DEFAULT_BRIGHTNESS = 80;

export interface ModuleDefinition {
  id: string;
  title: string;
  subtitle: string;
  roles: ("user" | "admin")[];
  accentColor: string;
  glowColor: string;
  href: string;
  external?: boolean;
}

export const MODULES: ModuleDefinition[] = [
  { id: "finance", title: "finance.title", subtitle: "finance.dashboardSubtitle", roles: ["user", "admin"], accentColor: "#00e3a4", glowColor: "rgba(0, 227, 164, 0.35)", href: "/finance" },
  {
    id: "workout",
    title: "Workout Studio",
    subtitle: "Kracht & conditie",
    roles: ["user", "admin"],
    accentColor: "#00E676",
    glowColor: "rgba(0, 230, 118, 0.35)",
    href: "/workouts",
  },
  {
    id: "cashflow",
    title: "Cashflow",
    subtitle: "Facturatie & financieel overzicht",
    roles: ["user", "admin"],
    accentColor: "#00B0FF",
    glowColor: "rgba(0, 176, 255, 0.35)",
    href: "/cashflow",
  },
  {
    id: "recipes",
    title: "Taste Tracker",
    subtitle: "Recipes & Wines",
    roles: ["user", "admin"],
    accentColor: "#FFB300",
    glowColor: "rgba(255, 179, 0, 0.35)",
    href: "/recipes",
  },
  {
    id: "minecraft",
    title: "Lobby Control",
    subtitle: "Game servers",
    roles: ["user", "admin"],
    accentColor: "#76FF03",
    glowColor: "rgba(118, 255, 3, 0.35)",
    href: "/games/minecraft",
  },
  {
    id: "minor",
    title: "Minor",
    subtitle: "Sprints & Log",
    roles: ["user", "admin"],
    accentColor: "#FF9100",
    glowColor: "rgba(255, 145, 0, 0.35)",
    href: "/minor",
  },
  {
    id: "resume",
    title: "CV Builder",
    subtitle: "Resume & PDF",
    roles: ["user", "admin"],
    accentColor: "#E040FB",
    glowColor: "rgba(224, 64, 251, 0.35)",
    href: "/resume",
  },
  {
    id: "lyric_quotes",
    title: "Lyric Quotes",
    subtitle: "Quotes",
    roles: ["user", "admin"],
    accentColor: "#7C4DFF",
    glowColor: "rgba(124, 77, 255, 0.35)",
    href: "https://stevenheijn.nl/lyric_quotes/",
    external: true,
  },
  {
    id: "you",
    title: "You",
    subtitle: "Persoonlijk",
    roles: ["user", "admin"],
    accentColor: "#FF4081",
    glowColor: "rgba(255, 64, 129, 0.35)",
    href: "https://stevenheijn.nl/you",
    external: true,
  },
  {
    id: "pulse",
    title: "Pulse",
    subtitle: "Monitoring & beheer",
    roles: ["admin"],
    accentColor: "#FF1744",
    glowColor: "rgba(255, 23, 68, 0.35)",
    href: "/pulse",
  },
];
