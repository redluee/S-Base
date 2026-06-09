import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="nl" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
