import { ModuleShell } from "@/components/module-shell";

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  return <ModuleShell module="pulse">{children}</ModuleShell>;
}
