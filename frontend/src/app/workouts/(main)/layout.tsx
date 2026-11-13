import { ModuleShell } from "@/components/module-shell";

export default function WorkoutsLayout({ children }: { children: React.ReactNode }) {
  return <ModuleShell module="workout">{children}</ModuleShell>;
}
