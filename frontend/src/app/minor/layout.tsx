import { cookies } from "next/headers";
import { ModuleShell } from "@/components/module-shell";
import { MINOR_THEME_COOKIE } from "./theme-cookie";
import { MinorSubnav } from "./subnav";
import { MinorThemeProvider } from "./theme";

export default async function MinorLayout({ children }: { children: React.ReactNode }) {
  const initialTheme = (await cookies()).get(MINOR_THEME_COOKIE)?.value === "light" ? "light" : "dark";
  return (
    <MinorThemeProvider initialTheme={initialTheme}>
      <ModuleShell module="minor" subnav={<MinorSubnav />}>
        {children}
      </ModuleShell>
    </MinorThemeProvider>
  );
}
