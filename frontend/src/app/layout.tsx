import type { Metadata } from "next";
import "./globals.css";
import { OfflineSyncProvider } from "@/components/offline-sync-provider";

export const metadata: Metadata = {
  title: "S-Base",
  description: "Multi-app platform voor persoonlijk gebruik en ontwikkeling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <OfflineSyncProvider />
        {children}
      </body>
    </html>
  );
}
