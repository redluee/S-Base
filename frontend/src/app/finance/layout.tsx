import { ModuleShell } from "@/components/module-shell";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <ModuleShell module="finance">{children}</ModuleShell>;
}
