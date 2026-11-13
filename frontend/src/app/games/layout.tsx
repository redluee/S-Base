import { ModuleShell } from "@/components/module-shell";

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return <ModuleShell module="minecraft">{children}</ModuleShell>;
}
