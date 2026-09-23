import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { MinorSubnav } from "./subnav";
import { MinorThemeProvider } from "./theme";
import { MINOR_THEME_COOKIE } from "@/lib/minor-theme";

export default async function MinorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const cookieStore = await cookies();
  const initialTheme = cookieStore.get(MINOR_THEME_COOKIE)?.value === "light" ? "light" : "dark";

  return (
    <MinorThemeProvider initialTheme={initialTheme}>
      <NavHeader username={user.username} />
      <MinorSubnav />
      <main id="main-content" className="flex-1">{children}</main>
    </MinorThemeProvider>
  );
}
