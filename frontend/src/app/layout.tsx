import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ModuleTransitionProvider } from "@/components/module-transition-provider";
import { OfflineSyncProvider } from "@/app/workouts/offline-sync-provider";

export const metadata: Metadata = {
  title: "S-Base",
  description: "Multi-app platform voor persoonlijk gebruik en ontwikkeling",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className="dark h-full bg-background antialiased" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
      </head>
      <body className="min-h-full flex flex-col">
        <OfflineSyncProvider />
        <ModuleTransitionProvider>{children}</ModuleTransitionProvider>
      </body>
    </html>
  );
}
